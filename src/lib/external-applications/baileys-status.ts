import type { ExternalApplicationContext } from "@/lib/external-applications/application";
import type { BaileysStatusUpdate } from "@/lib/external-applications/baileys-status-update";
import { messageEventForStatus } from "@/lib/external-applications/event-payload";
import { recordOperationEvents } from "@/lib/external-applications/events";
import { metaOperationStatusTransition } from "@/lib/external-applications/message-status";
import { prisma } from "@/lib/prisma";

/**
 * Moves an outbound command along the same status ladder as the Meta rail and
 * tells the client. The ladder only goes forward, so a replayed or late ack is
 * a no-op and never produces a second event.
 */
export async function applyBaileysStatusUpdates(
  application: ExternalApplicationContext,
  providerAccountId: string,
  updates: readonly BaileysStatusUpdate[],
  now = new Date(),
) {
  const scope = { organizationId: application.organizationId, applicationId: application.id, providerAccountId };
  for (const update of updates) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await prisma.$transaction(async (tx) => {
          const target = await tx.externalTransportOperation.findFirst({
            where: { ...scope, providerMessageId: update.providerMessageId, direction: "OUTBOUND" },
            select: { id: true, status: true },
          });
          // An ack for a message this application never sent, such as a
          // consent request, has no command to move.
          if (!target) return;
          const transition = metaOperationStatusTransition(target.status, { status: update.status, occurredAt: now });
          if (!transition) return;
          const applied = await tx.externalTransportOperation.updateMany({ where: { id: target.id, status: target.status }, data: transition });
          if (applied.count !== 1) return;
          await recordOperationEvents(tx, scope, messageEventForStatus(update.status), [target.id], {
            occurredAt: now,
            failureCode: update.status === "failed" ? "whatsapp_delivery_failed" : null,
          });
        }, { isolationLevel: "Serializable" });
        break;
      } catch (error) {
        if (!isSerializationFailure(error) || attempt === 2) throw error;
      }
    }
  }
}

function isSerializationFailure(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error.code === "P2034" || error.code === "P2002");
}
