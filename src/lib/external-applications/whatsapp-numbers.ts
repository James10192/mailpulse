// The WhatsApp numbers of an application, as the dashboard edits them.
//
// An application may hold several numbers; one is its default. Every change
// here keeps one invariant: an application with several active numbers always
// has exactly one active default, so a request that names no number is never
// left ambiguous (chooseWhatsAppSender would refuse it).

import type { Prisma } from "@/generated/prisma";

import { abandonPendingConsent } from "@/lib/external-applications/consent-settlement";

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

/**
 * Outbound commands of a number that have not reached an outcome yet. QUEUED is
 * a command released by a consent and waiting for the number's pace;
 * CONSENT_PENDING one held until the recipient answers.
 */
const OPEN_OUTBOUND = ["PENDING", "PROCESSING", "SUBMISSION_UNKNOWN", "QUEUED", "CONSENT_PENDING"];
export const SENDER_MOVED_CODE = "sender_moved";

export type OpenSend = {
  id: string;
  kind: "operation" | "consent";
  status: string;
  operationKey: string | null;
  createdAt: Date;
  /** False while a worker holds it: it may be leaving right now. */
  stoppable: boolean;
};

/** What still runs on a number, oldest first. */
export async function openSendsOf(db: Tx, organizationId: string, accountId: string, now = new Date()): Promise<OpenSend[]> {
  const [operations, consents] = await Promise.all([
    db.externalTransportOperation.findMany({
      where: { organizationId, providerAccountId: accountId, direction: "OUTBOUND", status: { in: OPEN_OUTBOUND } },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true, status: true, operationKey: true, createdAt: true, leaseExpiresAt: true },
    }),
    db.externalRecipientConsent.findMany({
      where: { organizationId, providerAccountId: accountId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true, createdAt: true },
    }),
  ]);
  return [
    ...operations.map((operation) => ({
      id: operation.id,
      kind: "operation" as const,
      status: operation.status,
      operationKey: operation.operationKey,
      createdAt: operation.createdAt,
      stoppable: !(operation.leaseExpiresAt && operation.leaseExpiresAt > now),
    })),
    ...consents.map((consent) => ({
      id: consent.id,
      kind: "consent" as const,
      status: "PENDING",
      operationKey: null,
      createdAt: consent.createdAt,
      stoppable: true,
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** The number still has sends without an outcome; the caller may offer to stop them. */
export class NumberBusyError extends WhatsAppNumberError {
  readonly sends: OpenSend[];
  constructor(sends: OpenSend[]) {
    super("Des envois de ce numéro n'ont pas encore abouti.");
    this.sends = sends;
  }
}

/**
 * Closes what still runs on a number before it changes hands, the way each
 * kind is closed elsewhere: an unanswered consent request expires and the
 * content held behind it is rejected; a command whose outcome is unknown is
 * reconciled without further action, as an operator would in SMS › À vérifier;
 * a command that never left is rejected with `sender_moved`. Returns the
 * rejected commands, whose client is told after commit.
 */
async function stopOpenSends(tx: Tx, organizationId: string, sends: OpenSend[], actorId: string, now: Date) {
  const rejected: string[] = [];
  for (const send of sends.filter((item) => item.kind === "consent")) {
    rejected.push(...((await abandonPendingConsent(tx, send.id, SENDER_MOVED_CODE, now)) ?? []));
  }
  const operations = sends.filter((item) => item.kind === "operation");
  const unknown = operations.filter((item) => item.status === "SUBMISSION_UNKNOWN").map((item) => item.id);
  const neverLeft = operations.filter((item) => item.status !== "SUBMISSION_UNKNOWN").map((item) => item.id);

  if (unknown.length > 0) {
    await tx.externalTransportOperation.updateMany({
      where: { organizationId, id: { in: unknown }, status: "SUBMISSION_UNKNOWN" },
      data: {
        status: "RECONCILED",
        reconciliationDecision: "NO_FURTHER_ACTION",
        reconciledAt: now,
        reconciledById: actorId,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
  }
  if (neverLeft.length > 0) {
    await tx.externalConsentHeldContent.updateMany({
      where: { operationId: { in: neverLeft }, status: "HELD" },
      data: { status: "CANCELLED", settledAt: now },
    });
    const closed = await tx.externalTransportOperation.updateMany({
      where: { organizationId, id: { in: neverLeft }, status: { in: OPEN_OUTBOUND.filter((status) => status !== "SUBMISSION_UNKNOWN") } },
      data: { status: "REJECTED", rejectionCode: SENDER_MOVED_CODE, failedAt: now, leaseToken: null, leaseExpiresAt: null },
    });
    if (closed.count > 0) rejected.push(...neverLeft);
  }
  return rejected;
}

/**
 * Hands a number from one application to another of the same organization.
 *
 * What travels with the number: the recipients' consents and refusals (a parent
 * who answered STOP to this phone must stay refused, whichever application now
 * speaks through it) and the open conversation windows. What stays behind: the
 * history (operations, messages) of the application that sent them.
 *
 * Sends without an outcome block the move (NumberBusyError) unless
 * `stopOpenSends` names the person stopping them; one a worker holds right now
 * always blocks. A forwarding endpoint or a template pinned to the number
 * belongs to the source application and blocks too.
 */
export async function moveNumber(
  tx: Tx,
  scope: Scope & { toApplicationId: string },
  accountId: string,
  options: { stopOpenSendsBy?: string; now?: Date } = {},
): Promise<{ stopped: number; rejectedOperationIds: string[] }> {
  const { organizationId, applicationId: fromApplicationId, toApplicationId } = scope;
  const now = options.now ?? new Date();
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

  const [endpoints, templates] = await Promise.all([
    tx.applicationForwardEndpoint.count({ where: { organizationId, providerAccountId: accountId } }),
    tx.applicationTemplateConfig.count({ where: { organizationId, providerAccountId: accountId } }),
  ]);
  if (endpoints > 0 || templates > 0) {
    throw new WhatsAppNumberError(
      "Une adresse de transfert ou un modèle de message de l'application est rattaché à ce numéro. Détachez-les dans les réglages de l'application avant de le déplacer.",
    );
  }

  const open = await openSendsOf(tx, organizationId, accountId, now);
  let rejectedOperationIds: string[] = [];
  if (open.length > 0) {
    if (!options.stopOpenSendsBy) throw new NumberBusyError(open);
    if (open.some((send) => !send.stoppable)) {
      throw new WhatsAppNumberError("Un envoi part de ce numéro en ce moment même. Réessayez dans une minute.");
    }
    rejectedOperationIds = await stopOpenSends(tx, organizationId, open, options.stopOpenSendsBy, now);
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
  return { stopped: open.length, rejectedOperationIds };
}
