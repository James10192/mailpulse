import type { Prisma } from "@/generated/prisma";

import { snapshotExternalApplicationCallbackDeliveries } from "@/lib/external-applications/callback";
import { decryptExternalApplicationValue, encryptExternalApplicationValue, hashExternalApplicationPayload } from "@/lib/external-applications/crypto";
import {
  buildExternalEventPayload,
  type ExternalEventName,
  type ExternalEventPayloadInput,
  type ExternalEventSubject,
} from "@/lib/external-applications/event-payload";

type EventDatabase = Pick<Prisma.TransactionClient, "applicationForwardEndpoint" | "externalTransportOperation">;

export type EventScope = { organizationId: string; applicationId: string; providerAccountId: string };

export type EventOperation = ExternalEventSubject & { recipient: string | null; providerMessageId: string | null };

/**
 * Queues one signed callback per subscribed endpoint, through the same outbox,
 * retries and cron as inbound messages. `eventKey` makes the event idempotent:
 * a replayed webhook or a second queue run records nothing new. An event no
 * endpoint subscribed to leaves no row behind.
 */
export async function recordExternalEvent(db: EventDatabase, scope: EventScope, eventKey: string, input: ExternalEventPayloadInput, now = new Date()) {
  const idempotencyKey = `evt:${eventKey}`;
  const existing = await db.externalTransportOperation.findFirst({
    where: { organizationId: scope.organizationId, applicationId: scope.applicationId, idempotencyKey },
    select: { id: true },
  });
  if (existing) return;

  const payload = JSON.stringify(buildExternalEventPayload(input));
  const callbackDeliveries = await snapshotExternalApplicationCallbackDeliveries(db, {
    applicationId: scope.applicationId,
    providerAccountId: scope.providerAccountId,
    event: input.event,
    payload,
    now,
  });
  if (callbackDeliveries.length === 0) return;

  await db.externalTransportOperation.create({
    data: {
      direction: "INBOUND",
      operationKey: input.event,
      idempotencyKey,
      payloadHash: hashExternalApplicationPayload(payload),
      payloadCiphertext: encryptExternalApplicationValue(payload),
      status: "PENDING",
      organizationId: scope.organizationId,
      applicationId: scope.applicationId,
      providerAccountId: scope.providerAccountId,
      callbackDeliveries: { create: callbackDeliveries },
    },
  });
}

/**
 * For paths that already committed what they did: losing a notification must
 * never undo, or make the caller retry, a message that already left.
 */
export async function recordEventsAfterCommit(label: string, record: () => Promise<void>) {
  try {
    await record();
  } catch (error) {
    if (isUniqueConstraintError(error)) return;
    console.error("External application event could not be recorded.", { event: label });
  }
}

/** The command fields every event names, recipient read back from the encrypted command. */
export async function loadEventOperations(db: Pick<Prisma.TransactionClient, "externalTransportOperation">, operationIds: readonly string[]): Promise<EventOperation[]> {
  if (operationIds.length === 0) return [];
  const operations = await db.externalTransportOperation.findMany({
    where: { id: { in: [...operationIds] } },
    select: { id: true, operationKey: true, idempotencyKey: true, payloadCiphertext: true, providerMessageId: true },
  });
  return operations.map((operation) => ({
    operationId: operation.id,
    operationKey: operation.operationKey,
    idempotencyKey: operation.idempotencyKey,
    providerMessageId: operation.providerMessageId,
    recipient: readRecipient(operation.payloadCiphertext),
  }));
}

/** One event per command, each keyed on its own operation. */
export async function recordOperationEvents(
  db: EventDatabase,
  scope: EventScope,
  event: ExternalEventName,
  operationIds: readonly string[],
  details: { occurredAt: Date; failureCode?: string | null; fallbackRecipient?: string },
) {
  for (const operation of await loadEventOperations(db, operationIds)) {
    const recipient = operation.recipient ?? details.fallbackRecipient;
    if (!recipient) continue;
    await recordExternalEvent(db, scope, `${event}:${operation.operationId}`, {
      event,
      subject: operation,
      recipient,
      occurredAt: details.occurredAt,
      messageId: operation.providerMessageId,
      failureCode: details.failureCode,
    }, details.occurredAt);
  }
}

function readRecipient(payloadCiphertext: string | null) {
  if (!payloadCiphertext) return null;
  try {
    const parsed: unknown = JSON.parse(decryptExternalApplicationValue(payloadCiphertext));
    return typeof parsed === "object" && parsed !== null && "recipient" in parsed && typeof parsed.recipient === "string" ? parsed.recipient : null;
  } catch {
    return null;
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
