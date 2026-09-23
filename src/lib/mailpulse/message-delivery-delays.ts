import type { Prisma, PrismaClient } from "@/generated/prisma";

/**
 * Delivery delays are provider notices, not status changes: the message stays
 * SENT while the provider keeps retrying. Each one is stored once, keyed by the
 * provider's own event identifier, so a redelivered webhook is a no-op.
 */
export type DelayNotice = {
  organizationId: string;
  messageId: string;
  provider: "RESEND";
  providerEventId: string;
  occurredAt: Date;
  reason: string | null;
};

const MAX_LISTED_DELAYS = 20;

export function deliveryDelayRow(notice: DelayNotice): Prisma.CommunicationMessageEventCreateManyInput {
  return {
    type: "DELIVERY_DELAYED",
    organizationId: notice.organizationId,
    messageId: notice.messageId,
    provider: notice.provider,
    providerEventId: notice.providerEventId,
    occurredAt: notice.occurredAt,
    reason: notice.reason,
  };
}

export async function recordDeliveryDelay(tx: Prisma.TransactionClient, notice: DelayNotice) {
  const result = await tx.communicationMessageEvent.createMany({
    data: [deliveryDelayRow(notice)],
    skipDuplicates: true,
  });
  return result.count === 1;
}

export function listDeliveryDelays(db: Pick<PrismaClient, "communicationMessageEvent">, messageId: string) {
  return db.communicationMessageEvent.findMany({
    where: { messageId, type: "DELIVERY_DELAYED" },
    orderBy: { occurredAt: "desc" },
    take: MAX_LISTED_DELAYS,
    select: { occurredAt: true, reason: true },
  });
}

export type DeliveryDelay = Awaited<ReturnType<typeof listDeliveryDelays>>[number];
