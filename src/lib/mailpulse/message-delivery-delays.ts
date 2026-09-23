import type { Prisma } from "@/generated/prisma";

/**
 * Delivery delays are provider notices, not status changes: the message stays
 * SENT while the provider keeps retrying. They are kept in the audit log, tied
 * to the message, so an integrator can see why a message is slow to deliver.
 */
const DELIVERY_DELAYED_ACTION = "message.delivery_delayed";
const MESSAGE_RESOURCE_TYPE = "communication_message";
const MAX_LISTED_DELAYS = 20;

type DelayNotice = {
  organizationId: string;
  messageId: string;
  provider: string;
  providerMessageId: string;
  occurredAt: Date;
  reason: string | null;
};

type AuditLogReader = Pick<Prisma.TransactionClient, "auditLog">;

/** Records a delay once per provider event: a redelivered webhook is a no-op. */
export async function recordDeliveryDelay(tx: Prisma.TransactionClient, notice: DelayNotice) {
  const occurredAt = notice.occurredAt.toISOString();
  const existing = await tx.auditLog.findFirst({
    where: {
      organizationId: notice.organizationId,
      action: DELIVERY_DELAYED_ACTION,
      resourceType: MESSAGE_RESOURCE_TYPE,
      resourceId: notice.messageId,
      metadata: { path: ["occurred_at"], equals: occurredAt },
    },
    select: { id: true },
  });
  if (existing) return false;

  await tx.auditLog.create({
    data: {
      organizationId: notice.organizationId,
      actorType: "provider",
      actorId: notice.provider.toLowerCase(),
      action: DELIVERY_DELAYED_ACTION,
      resourceType: MESSAGE_RESOURCE_TYPE,
      resourceId: notice.messageId,
      metadata: {
        occurred_at: occurredAt,
        reason: notice.reason,
        provider: notice.provider.toLowerCase(),
        provider_message_id: notice.providerMessageId,
      },
    },
  });
  return true;
}

export async function listDeliveryDelays(db: AuditLogReader, organizationId: string, messageId: string) {
  const entries = await db.auditLog.findMany({
    where: {
      organizationId,
      action: DELIVERY_DELAYED_ACTION,
      resourceType: MESSAGE_RESOURCE_TYPE,
      resourceId: messageId,
    },
    orderBy: { createdAt: "desc" },
    take: MAX_LISTED_DELAYS,
    select: { metadata: true, createdAt: true },
  });
  return entries.map((entry) => serializeDelay(entry.metadata, entry.createdAt));
}

function serializeDelay(metadata: unknown, recordedAt: Date) {
  const record = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
  return {
    occurred_at: typeof record.occurred_at === "string" ? record.occurred_at : recordedAt.toISOString(),
    reason: typeof record.reason === "string" ? record.reason : null,
  };
}
