import type { Prisma } from "@/generated/prisma";

import { CONSENT_PENDING_STATUS, QUEUED_STATUS } from "@/lib/external-applications/consent-hold";
import { CONSENT_REFUSED_CODE, classifyConsentReply, isConsumedConsentReply, type ConsentReply } from "@/lib/external-applications/consent-policy";
import { readRecipientConsent, recordConsentReply, type ConsentScope } from "@/lib/external-applications/consent-store";
import type { InboundMessage } from "@/lib/external-applications/meta-webhook";

export type SettledConsent = {
  consentId: string;
  reply: ConsentReply;
  /** The held operations released or cancelled by this reply. */
  operationIds: string[];
};

export type InboundConsentOutcome = {
  /** A consumed reply settled a pending request and is not forwarded as an inbound message. */
  consumed: boolean;
  settled: SettledConsent | null;
};

/**
 * Runs inside the transaction that records the inbound message, so a webhook
 * redelivery, which finds the message already recorded, never replays it.
 */
export async function applyInboundConsentReply(
  tx: Prisma.TransactionClient,
  scope: Omit<ConsentScope, "recipient">,
  message: InboundMessage,
  now: Date,
): Promise<InboundConsentOutcome> {
  const reply = classifyConsentReply(message.text);
  if (!reply) return { consumed: false, settled: null };

  const recipientScope = { ...scope, recipient: message.sender };
  const before = await readRecipientConsent(tx, recipientScope);
  const consent = await recordConsentReply(tx, recipientScope, reply, {
    text: message.text,
    providerMessageId: message.providerMessageId,
    occurredAt: message.occurredAt,
  }, now);

  const operationIds = await settleHeldContents(tx, consent.id, reply, now);
  const consumed = isConsumedConsentReply(before);
  const settled = before?.status === "PENDING" || operationIds.length > 0 ? { consentId: consent.id, reply, operationIds } : null;
  return { consumed, settled };
}

/**
 * A yes releases every held content into the sending account's paced queue; a
 * no cancels them. Either way the pending request is settled for good.
 */
async function settleHeldContents(tx: Prisma.TransactionClient, consentId: string, reply: ConsentReply, now: Date) {
  const held = await tx.externalConsentHeldContent.findMany({
    where: { consentId, status: "HELD" },
    select: { id: true, operationId: true },
  });
  if (held.length === 0) return [];

  const operationIds = held.map((item) => item.operationId);
  const ids = held.map((item) => item.id);
  if (reply === "grant") {
    await tx.externalConsentHeldContent.updateMany({ where: { id: { in: ids }, status: "HELD" }, data: { status: "RELEASED", releasedAt: now } });
    await tx.externalTransportOperation.updateMany({
      where: { id: { in: operationIds }, status: CONSENT_PENDING_STATUS },
      data: { status: QUEUED_STATUS },
    });
  } else {
    await tx.externalConsentHeldContent.updateMany({ where: { id: { in: ids }, status: "HELD" }, data: { status: "CANCELLED", settledAt: now } });
    await tx.externalTransportOperation.updateMany({
      where: { id: { in: operationIds }, status: CONSENT_PENDING_STATUS },
      data: { status: "REJECTED", rejectionCode: CONSENT_REFUSED_CODE, failedAt: now },
    });
  }
  return operationIds;
}
