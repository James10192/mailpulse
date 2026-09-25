import type { Prisma } from "@/generated/prisma";

import { classifyConsentReply } from "@/lib/external-applications/consent-policy";
import { recordConsentReply, type ConsentScope } from "@/lib/external-applications/consent-store";
import type { InboundMessage } from "@/lib/external-applications/meta-webhook";

export type InboundConsentOutcome = {
  /** A consumed reply settled a pending request and is not forwarded as an inbound message. */
  consumed: boolean;
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
  if (!reply) return { consumed: false };

  await recordConsentReply(tx, { ...scope, recipient: message.sender }, reply, {
    text: message.text,
    providerMessageId: message.providerMessageId,
    occurredAt: message.occurredAt,
  }, now);
  return { consumed: false };
}
