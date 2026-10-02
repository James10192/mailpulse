// The WhatsApp numbers of an application, as the dashboard edits them.
//
// An application may hold several numbers; one is its default. Every change
// here keeps one invariant: an application with several active numbers always
// has exactly one active default, so a request that names no number is never
// left ambiguous (chooseWhatsAppSender would refuse it).

import type { Prisma } from "@/generated/prisma";

export const BAILEYS_WHATSAPP = "BAILEYS_WHATSAPP";

type Tx = Prisma.TransactionClient;
type Scope = { organizationId: string; applicationId: string };

export class WhatsAppNumberError extends Error {}

/**
 * Serializes the writes of one application's numbers: two pairings or a
 * default change racing a deactivation would otherwise both see "no default"
 * and trip the one-default unique index. Held until the transaction ends.
 */
export async function lockApplicationNumbers(tx: Tx, applicationId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`whatsapp-numbers:${applicationId}`}))`;
}

function whatsappOf(scope: Scope) {
  return { organizationId: scope.organizationId, applicationId: scope.applicationId, channel: "WHATSAPP" as const };
}

/**
 * After any change: if no active number is the default, the oldest active one
 * becomes it. A lone number is therefore the default too, and stays so when a
 * second number is added beside it.
 */
export async function settleDefaultNumber(tx: Tx, scope: Scope) {
  await lockApplicationNumbers(tx, scope.applicationId);
  const active = await tx.providerAccount.findMany({
    where: { ...whatsappOf(scope), active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, isDefault: true },
  });
  if (active.length === 0 || active.some((account) => account.isDefault)) return;
  await tx.providerAccount.updateMany({ where: { ...whatsappOf(scope), isDefault: true }, data: { isDefault: false } });
  await tx.providerAccount.update({ where: { id: active[0].id }, data: { isDefault: true } });
}

/**
 * Records a number whose QR code was just scanned. `replaceAccountId` swaps the
 * instance under an existing account (its name and history stay); without it,
 * a new number is added beside the others. Returns the instance it replaced.
 */
export async function recordPairedNumber(
  tx: Tx,
  scope: Scope & { instanceName: string; senderId: string | null; replaceAccountId?: string | null },
): Promise<string | null> {
  await lockApplicationNumbers(tx, scope.applicationId);
  const now = new Date();

  // The same scan seen twice (a poll retried, a second tab): already recorded.
  const sameInstance = await tx.providerAccount.findFirst({
    where: { ...whatsappOf(scope), provider: BAILEYS_WHATSAPP, externalAccountId: scope.instanceName },
    select: { id: true },
  });
  if (sameInstance) return null;

  if (scope.senderId) {
    const holder = await tx.providerAccount.findFirst({
      where: { ...whatsappOf(scope), provider: BAILEYS_WHATSAPP, senderId: scope.senderId },
      select: { id: true },
    });
    if (holder && scope.replaceAccountId && holder.id !== scope.replaceAccountId) {
      throw new WhatsAppNumberError("Ce téléphone est déjà un autre numéro de cette application. Remplacez celui-là, ou désactivez-le d'abord.");
    }
  }

  if (scope.replaceAccountId) {
    const current = await tx.providerAccount.findFirst({
      where: { ...whatsappOf(scope), id: scope.replaceAccountId, provider: BAILEYS_WHATSAPP },
      select: { id: true, externalAccountId: true },
    });
    if (!current) throw new WhatsAppNumberError("Ce numéro n'appartient pas à cette application.");
    await tx.providerAccount.update({
      where: { id: current.id },
      data: { externalAccountId: scope.instanceName, senderId: scope.senderId, active: true, pairedAt: now },
    });
    await settleDefaultNumber(tx, scope);
    return current.externalAccountId;
  }

  // The same phone scanned again under a new instance: reuse its account
  // rather than holding the number twice.
  const sameNumber = scope.senderId
    ? await tx.providerAccount.findFirst({
        where: { ...whatsappOf(scope), provider: BAILEYS_WHATSAPP, senderId: scope.senderId },
        select: { id: true, externalAccountId: true },
      })
    : null;
  if (sameNumber) {
    await tx.providerAccount.update({
      where: { id: sameNumber.id },
      data: { externalAccountId: scope.instanceName, active: true, pairedAt: now },
    });
    await settleDefaultNumber(tx, scope);
    return sameNumber.externalAccountId;
  }

  await tx.providerAccount.create({
    data: {
      ...whatsappOf(scope),
      provider: BAILEYS_WHATSAPP,
      externalAccountId: scope.instanceName,
      senderId: scope.senderId,
      credentialsCiphertext: null,
      pairedAt: now,
      active: true,
    },
  });
  await settleDefaultNumber(tx, scope);
  return null;
}

async function requireNumber(tx: Tx, scope: Scope, accountId: string) {
  const account = await tx.providerAccount.findFirst({
    where: { ...whatsappOf(scope), id: accountId },
    select: { id: true, active: true, isDefault: true },
  });
  if (!account) throw new WhatsAppNumberError("Ce numéro n'appartient pas à cette application.");
  return account;
}

/** Makes an active number the one requests use when they name none. */
export async function setDefaultNumber(tx: Tx, scope: Scope, accountId: string) {
  await lockApplicationNumbers(tx, scope.applicationId);
  const account = await requireNumber(tx, scope, accountId);
  if (!account.active) throw new WhatsAppNumberError("Réactivez ce numéro avant d'en faire le numéro par défaut.");
  await tx.providerAccount.updateMany({ where: { ...whatsappOf(scope), isDefault: true, NOT: { id: accountId } }, data: { isDefault: false } });
  await tx.providerAccount.update({ where: { id: accountId }, data: { isDefault: true } });
}

/**
 * Stops or resumes sending from a number. Disabling the default hands the role
 * to another active number; disabling the last one stops the application's
 * WhatsApp sends rather than falling back to the organization's number.
 */
export async function setNumberActive(tx: Tx, scope: Scope, accountId: string, active: boolean) {
  await lockApplicationNumbers(tx, scope.applicationId);
  await requireNumber(tx, scope, accountId);
  await tx.providerAccount.update({ where: { id: accountId }, data: active ? { active } : { active, isDefault: false } });
  await settleDefaultNumber(tx, scope);
}

/** Operations that are still being sent: a number cannot change hands under them. */
const IN_FLIGHT_OPERATIONS = ["PENDING", "PROCESSING", "SUBMISSION_UNKNOWN", "HELD"];

/**
 * Hands a number from one application to another of the same organization.
 *
 * What travels with the number: the recipients' consents and refusals (a parent
 * who answered STOP to this phone must stay refused, whichever application now
 * speaks through it) and the open conversation windows. What stays behind: the
 * history (operations, messages) of the application that sent them.
 *
 * Refused while a send is in flight, or while a forwarding endpoint or a
 * template is pinned to the number: those belong to the source application.
 */
export async function moveNumber(tx: Tx, scope: Scope & { toApplicationId: string }, accountId: string) {
  const { organizationId, applicationId: fromApplicationId, toApplicationId } = scope;
  if (fromApplicationId === toApplicationId) throw new WhatsAppNumberError("Ce numéro appartient déjà à cette application.");

  // Always lock in the same order, so two opposite moves cannot deadlock.
  for (const id of [fromApplicationId, toApplicationId].sort()) await lockApplicationNumbers(tx, id);

  const account = await requireNumber(tx, scope, accountId);
  const target = await tx.externalApplication.findFirst({
    where: { id: toApplicationId, organizationId },
    select: { active: true },
  });
  if (!target) throw new WhatsAppNumberError("Application de destination introuvable.");
  if (!target.active) throw new WhatsAppNumberError("L'application de destination est désactivée : réactivez-la d'abord.");

  const [inFlight, pendingConsents, endpoints, templates] = await Promise.all([
    tx.externalTransportOperation.count({ where: { organizationId, providerAccountId: accountId, status: { in: IN_FLIGHT_OPERATIONS } } }),
    tx.externalRecipientConsent.count({ where: { organizationId, providerAccountId: accountId, status: "PENDING" } }),
    tx.applicationForwardEndpoint.count({ where: { organizationId, providerAccountId: accountId } }),
    tx.applicationTemplateConfig.count({ where: { organizationId, providerAccountId: accountId } }),
  ]);
  if (inFlight > 0 || pendingConsents > 0) {
    throw new WhatsAppNumberError("Des envois partent encore de ce numéro. Réessayez une fois qu'ils sont terminés.");
  }
  if (endpoints > 0 || templates > 0) {
    throw new WhatsAppNumberError(
      "Une adresse de transfert ou un modèle de message de l'application est rattaché à ce numéro. Détachez-les dans les réglages de l'application avant de le déplacer.",
    );
  }

  await tx.providerAccount.update({
    where: { id: account.id },
    data: { applicationId: toApplicationId, isDefault: false },
  });
  await tx.externalRecipientConsent.updateMany({
    where: { organizationId, applicationId: fromApplicationId, providerAccountId: accountId },
    data: { applicationId: toApplicationId },
  });
  await tx.externalConversationWindow.updateMany({
    where: { organizationId, applicationId: fromApplicationId, providerAccountId: accountId },
    data: { applicationId: toApplicationId },
  });

  await settleDefaultNumber(tx, { organizationId, applicationId: fromApplicationId });
  await settleDefaultNumber(tx, { organizationId, applicationId: toApplicationId });
}
