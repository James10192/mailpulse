import type { CommunicationMessageEvent, Prisma } from "@/generated/prisma";

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
};

export type DeliveryDelay = Pick<CommunicationMessageEvent, "occurredAt">;

type EventWriter = {
  communicationMessageEvent: {
    createMany(args: { data: Prisma.CommunicationMessageEventCreateManyInput[]; skipDuplicates: boolean }): PromiseLike<unknown>;
  };
};

/** Loads a message's latest delays in the same query as the message itself. */
export const DELIVERY_DELAYS_INCLUDE = {
  events: {
    where: { type: "DELIVERY_DELAYED" },
    orderBy: { occurredAt: "desc" },
    take: 20,
    select: { occurredAt: true },
  },
} satisfies Prisma.CommunicationMessageInclude;

export async function recordDeliveryDelay(tx: EventWriter, notice: DelayNotice) {
  await tx.communicationMessageEvent.createMany({
    data: [{ type: "DELIVERY_DELAYED", ...notice }],
    skipDuplicates: true,
  });
}
