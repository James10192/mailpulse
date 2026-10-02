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

function whatsappOf(scope: Scope) {
  return { organizationId: scope.organizationId, applicationId: scope.applicationId, channel: "WHATSAPP" as const };
}

/**
 * After any change: if no active number is the default, the oldest active one
 * becomes it. A lone number is therefore the default too, and stays so when a
 * second number is added beside it.
 */
export async function settleDefaultNumber(tx: Tx, scope: Scope) {
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
  const now = new Date();
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
  await requireNumber(tx, scope, accountId);
  await tx.providerAccount.update({ where: { id: accountId }, data: active ? { active } : { active, isDefault: false } });
  await settleDefaultNumber(tx, scope);
}
