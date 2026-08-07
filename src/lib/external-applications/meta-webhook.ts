import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma";

import { processBoundedCallbackBatch } from "@/lib/external-applications/callback-batch";
import {
  resolveExternalApplicationRequestTarget,
  resolveMetaApplicationBySenderHmac,
  resolveMetaProviderAccount,
  type ExternalApplicationContext,
} from "@/lib/external-applications/application";
import {
  ExternalCallbackError,
  CALLBACK_TIMEOUT_MS,
  postExternalApplicationCallback,
  snapshotExternalApplicationCallbackDeliveries,
} from "@/lib/external-applications/callback";
import { encryptExternalApplicationValue, hashExternalApplicationPayload } from "@/lib/external-applications/crypto";
import { extendExternalWhatsAppConversationWindow } from "@/lib/external-applications/conversation-window";
import {
  MESSAGE_STATUS_EVENT,
  metaCommunicationMessageTransition,
  metaOperationStatusTransition,
  metaStatusEventId,
  parseMetaStatusUpdates,
  type MetaStatusEvent,
} from "@/lib/external-applications/message-status";
import { parseMetaMessageTimestamp } from "@/lib/external-applications/meta-timestamp";
import { applyInboundStopToPhoneContacts } from "@/lib/mailpulse/inbound-consent";
import { prisma } from "@/lib/prisma";
import { hasValidMetaHmac } from "@/lib/external-applications/signatures";

const INBOUND_EVENT = "whatsapp.inbound_message";
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;
const MAX_STATUS_UPDATES_PER_REQUEST = 100;
const MAX_CALLBACK_ATTEMPTS = 8;
const CALLBACK_RETRY_BASE_MS = 30_000;
const CALLBACK_RETRY_MAX_MS = 6 * 60 * 60 * 1000;
const CALLBACK_LEASE_MS = 45_000;
export const CALLBACK_CRON_CONCURRENCY = 4;
export const CALLBACK_CRON_DEADLINE_MS = 52_000;

type InboundMessage = {
  sender: string;
  text: string;
  providerMessageId: string;
  timestamp: string;
  occurredAt: Date;
};

export async function verifyMetaWebhook(application: ExternalApplicationContext, params: URLSearchParams) {
  const mode = params.get("hub.mode");
  const challenge = params.get("hub.challenge");
  const verifyToken = params.get("hub.verify_token");
  if (mode !== "subscribe" || !challenge || !verifyToken) return null;

  const provider = await resolveMetaProviderAccount(application);
  return provider?.verifyToken === verifyToken ? challenge : null;
}

export async function verifyMetaWebhookRequest(request: Request, applicationKey: string) {
  const application = await resolveExternalApplicationRequestTarget(
    applicationKey,
    request.headers.get("x-external-organization-id"),
  );
  if (!application) return new Response("Forbidden", { status: 403 });

  const challenge = await verifyMetaWebhook(application, new URL(request.url).searchParams);
  return challenge
    ? new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } })
    : new Response("Forbidden", { status: 403 });
}

export async function receiveMetaWebhook(application: ExternalApplicationContext, request: Request, rawBody?: string) {
  const body = rawBody ?? await readBoundedRequestText(request);
  const payload = parseJson(body);
  if (!payload) return { status: 400 as const };
  const senderIds = getMetaWebhookSenderIds(body);
  if (senderIds.length !== 1) return { status: 400 as const };
  const provider = await resolveMetaProviderAccount(application, senderIds[0]);
  if (!provider) return { status: 503 as const };
  if (!hasValidMetaHmac(request.headers.get("x-hub-signature-256"), provider.appSecret, body)) return { status: 401 as const };

  for (const message of getInboundTextMessages(payload, provider.senderId)) {
    await findOrCreateInboundOperation(application, provider.id, message);
    if (isStopCommand(message.text)) {
      await applyInboundStopToPhoneContacts({ organizationId: application.organizationId, phone: message.sender, channel: "WHATSAPP" });
    }
  }
  // Each status opens its own serializable transaction, so a single oversized
  // Meta batch must not run past the function timeout and be redelivered whole.
  for (const update of parseMetaStatusUpdates(payload, provider.senderId).slice(0, MAX_STATUS_UPDATES_PER_REQUEST)) {
    const occurredAt = parseMetaMessageTimestamp(update.timestamp);
    if (!occurredAt) continue;
    await applyMetaStatusUpdate(application, provider.id, { ...update, occurredAt });
  }
  return { status: 200 as const };
}

export async function receiveMetaWebhookRequest(request: Request, applicationKey?: string) {
  try {
    const rawBody = await readBoundedRequestText(request.clone());
    const application = applicationKey
      ? await resolveRequestApplicationByKey(request, applicationKey)
      : await resolveBySenderHmac(request, rawBody);
    if (!application) return new Response("Unauthorized", { status: 401 });

    const result = await receiveMetaWebhook(application, request, rawBody);
    return new Response(result.status === 200 ? null : "Webhook unavailable", { status: result.status });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return new Response("Payload too large", { status: 413 });
    return new Response("Service unavailable", { status: 503 });
  }
}

async function resolveRequestApplicationByKey(request: Request, applicationKey: string) {
  return resolveExternalApplicationRequestTarget(applicationKey, request.headers.get("x-external-organization-id"));
}

async function resolveBySenderHmac(request: Request, rawBody: string) {
  return resolveMetaApplicationBySenderHmac(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    getMetaWebhookSenderIds(rawBody),
  );
}

export async function processDueExternalApplicationCallbacks(
  limit = 50,
  now = new Date(),
  deadline = Date.now() + CALLBACK_CRON_DEADLINE_MS,
) {
  const deliveries = await prisma.externalCallbackDelivery.findMany({
    where: {
      // The delivery row's own status is the source of truth. Filtering on a
      // literal operationKey here would silently strand every new event type.
      operation: { is: { direction: "INBOUND", status: "PENDING" } },
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "PENDING", nextAttemptAt: null },
        { status: "PROCESSING", leaseExpiresAt: { lt: now } },
      ],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      id: true,
      operationId: true,
      event: true,
      payloadCiphertext: true,
      destinationUrl: true,
      keyId: true,
      secretCiphertext: true,
      status: true,
      attempts: true,
      nextAttemptAt: true,
    },
  });

  const results = await processBoundedCallbackBatch(deliveries, {
    deadline,
    concurrency: CALLBACK_CRON_CONCURRENCY,
    run: (delivery) => processExternalCallbackDelivery(delivery, deadline),
  });
  const completed = results.filter((result) => result?.completedOperation).length;
  const retried = results.filter((result) => result?.outcome === "retry_scheduled").length;
  const failed = results.filter((result) => result?.outcome === "failed").length;
  return { examined: deliveries.length, completed, retried, failed };
}

export function callbackRetryDelayMs(attempt: number) {
  const safeAttempt = Math.max(1, Math.min(attempt, MAX_CALLBACK_ATTEMPTS));
  return Math.min(CALLBACK_RETRY_BASE_MS * 2 ** (safeAttempt - 1), CALLBACK_RETRY_MAX_MS);
}

export function callbackDeliveryRetryDecision(input: { attempts: number; error: unknown; now: Date }) {
  const attempts = input.attempts + 1;
  const retryable = input.error instanceof ExternalCallbackError && input.error.retryable;
  const failed = !retryable || attempts >= MAX_CALLBACK_ATTEMPTS;
  return {
    attempts,
    failed,
    nextAttemptAt: failed ? null : new Date(input.now.getTime() + callbackRetryDelayMs(attempts)),
    lastError: input.error instanceof ExternalCallbackError && input.error.ambiguous
      ? "Callback delivery outcome is ambiguous."
      : "External application callback failed.",
  };
}

export async function readBoundedRequestText(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BODY_BYTES) throw new RequestBodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_WEBHOOK_BODY_BYTES) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export class RequestBodyTooLargeError extends Error {}

export function getMetaWebhookSenderIds(rawBody: string) {
  const payload = parseJson(rawBody);
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return [];

  const senderIds = new Set<string>();
  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      const value = isRecord(change) && isRecord(change.value) ? change.value : null;
      const metadata = value && isRecord(value.metadata) ? value.metadata : null;
      if (typeof metadata?.phone_number_id === "string" && /^\d{4,32}$/.test(metadata.phone_number_id)) senderIds.add(metadata.phone_number_id);
    }
  }
  return [...senderIds];
}

function getInboundTextMessages(payload: unknown, senderId: string, now = new Date()) {
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return [] as InboundMessage[];
  const messages: InboundMessage[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      const value = isRecord(change) && isRecord(change.value) ? change.value : null;
      const metadata = value && isRecord(value.metadata) ? value.metadata : null;
      if (!metadata || metadata.phone_number_id !== senderId || !Array.isArray(value?.messages)) continue;
      for (const candidate of value.messages) {
        if (!isRecord(candidate) || candidate.type !== "text" || !isRecord(candidate.text)) continue;
        const sender = normalizeSender(candidate.from);
        const text = candidate.text.body;
        const providerMessageId = candidate.id;
        const timestamp = candidate.timestamp;
        const occurredAt = parseMetaMessageTimestamp(timestamp, now);
        if (sender && typeof text === "string" && text && typeof providerMessageId === "string" && providerMessageId && typeof timestamp === "string" && occurredAt) {
          messages.push({ sender, text, providerMessageId, timestamp, occurredAt });
        }
      }
    }
  }
  return messages;
}

async function findOrCreateInboundOperation(application: ExternalApplicationContext, providerAccountId: string, message: InboundMessage) {
  const payload = JSON.stringify({ event_id: message.providerMessageId, sender: { phone: message.sender }, message: { text: message.text }, timestamp: message.timestamp });
  const recordedAt = new Date();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.externalTransportOperation.findFirst({
          where: { organizationId: application.organizationId, applicationId: application.id, idempotencyKey: message.providerMessageId },
        });
        if (existing) return existing;

        const callbackDeliveries = await snapshotExternalApplicationCallbackDeliveries(tx, {
          applicationId: application.id,
          providerAccountId,
          event: INBOUND_EVENT,
          payload,
          now: recordedAt,
        });
        const operation = await tx.externalTransportOperation.create({
          data: {
            direction: "INBOUND",
            operationKey: "whatsapp.inbound_message",
            idempotencyKey: message.providerMessageId,
            payloadHash: hashExternalApplicationPayload(payload),
            payloadCiphertext: encryptExternalApplicationValue(payload),
            providerMessageId: message.providerMessageId,
            status: callbackDeliveries.length === 0 ? "COMPLETED" : "PENDING",
            completedAt: callbackDeliveries.length === 0 ? recordedAt : null,
            organizationId: application.organizationId,
            applicationId: application.id,
            providerAccountId,
            callbackDeliveries: { create: callbackDeliveries },
          },
        });
        await extendExternalWhatsAppConversationWindow(tx, {
          organizationId: application.organizationId,
          applicationId: application.id,
          providerAccountId,
          recipient: message.sender,
        }, message.occurredAt, recordedAt);
        return operation;
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!isRetryableInboundTransactionError(error) || attempt === 2) throw error;
    }
  }
  throw new Error("Inbound operation transaction retries exhausted.");
}

/**
 * Records a provider status as its own inbound operation so it reuses the
 * callback outbox, its retries, and its idempotency. The status never lands on
 * the original operation's `providerMessageId`, which the sent path owns.
 */
async function applyMetaStatusUpdate(application: ExternalApplicationContext, providerAccountId: string, update: MetaStatusEvent) {
  const eventId = metaStatusEventId(update);
  const recordedAt = new Date();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const alreadyProcessed = await tx.externalTransportOperation.findFirst({
          where: { organizationId: application.organizationId, applicationId: application.id, idempotencyKey: eventId },
          select: { id: true },
        });
        if (alreadyProcessed) return;

        const target = await resolveStatusTargetOperation(tx, application, providerAccountId, update);
        // A shared Meta number also carries platform traffic. Forwarding a
        // status for a message the application never sent would disclose the
        // recipient of somebody else's message, so it is dropped here.
        if (!target) return;

        const payload = JSON.stringify({
          event_id: eventId,
          operation_id: target.id,
          idempotency_key: target.idempotencyKey,
          message: { provider_message_id: update.providerMessageId, status: update.status },
          recipient: { phone: update.recipient },
          error: update.errorCode || update.errorMessage ? { code: update.errorCode, message: update.errorMessage } : null,
          timestamp: update.timestamp,
        });

        await applyOperationStatusTransition(tx, target, update);

        const callbackDeliveries = await snapshotExternalApplicationCallbackDeliveries(tx, {
          applicationId: application.id,
          providerAccountId,
          event: MESSAGE_STATUS_EVENT,
          payload,
          now: recordedAt,
        });
        await tx.externalTransportOperation.create({
          data: {
            direction: "INBOUND",
            operationKey: MESSAGE_STATUS_EVENT,
            idempotencyKey: eventId,
            payloadHash: hashExternalApplicationPayload(payload),
            payloadCiphertext: encryptExternalApplicationValue(payload),
            status: callbackDeliveries.length === 0 ? "COMPLETED" : "PENDING",
            completedAt: callbackDeliveries.length === 0 ? recordedAt : null,
            organizationId: application.organizationId,
            applicationId: application.id,
            providerAccountId,
            callbackDeliveries: { create: callbackDeliveries },
          },
        });
      }, { isolationLevel: "Serializable" });

      await applyPlatformMessageStatus(application.organizationId, update);
      return;
    } catch (error) {
      if (!isRetryableInboundTransactionError(error) || attempt === 2) throw error;
    }
  }
  throw new Error("Status operation transaction retries exhausted.");
}

type StatusTargetOperation = { id: string; idempotencyKey: string; status: string; providerMessageId: string | null };

/**
 * A submission whose provider response was lost has no `providerMessageId`, so
 * the echoed `biz_opaque_callback_data` is the only way back to it.
 */
async function resolveStatusTargetOperation(
  tx: Prisma.TransactionClient,
  application: ExternalApplicationContext,
  providerAccountId: string,
  update: MetaStatusEvent,
): Promise<StatusTargetOperation | null> {
  const select = { id: true, idempotencyKey: true, status: true, providerMessageId: true };
  const byProviderMessageId = await tx.externalTransportOperation.findFirst({
    where: {
      organizationId: application.organizationId,
      applicationId: application.id,
      providerAccountId,
      providerMessageId: update.providerMessageId,
      direction: "OUTBOUND",
    },
    select,
  });
  if (byProviderMessageId) return byProviderMessageId;
  if (!update.operationHint) return null;

  const hinted = await tx.externalTransportOperation.findFirst({
    where: {
      id: update.operationHint,
      organizationId: application.organizationId,
      applicationId: application.id,
      providerAccountId,
      direction: "OUTBOUND",
      providerMessageId: null,
    },
    select,
  });
  if (!hinted) return null;

  // Checking for an existing owner rather than catching the unique violation:
  // a constraint error would abort this transaction, and Serializable already
  // turns a concurrent claim into a retryable serialization failure.
  const owner = await tx.externalTransportOperation.findFirst({
    where: {
      organizationId: application.organizationId,
      providerAccountId,
      providerMessageId: update.providerMessageId,
    },
    select: { id: true },
  });
  if (owner) return null;

  const reconciled = await tx.externalTransportOperation.updateMany({
    where: { id: hinted.id, providerMessageId: null },
    data: { providerMessageId: update.providerMessageId, reconciliationDecision: "provider_status_confirmed", reconciledAt: new Date() },
  });
  return reconciled.count === 1 ? { ...hinted, providerMessageId: update.providerMessageId } : null;
}

/**
 * The dispatcher owns `leaseToken`; a status webhook that cleared it would make
 * an in-flight submission report itself as needing reconciliation.
 */
async function applyOperationStatusTransition(tx: Prisma.TransactionClient, target: StatusTargetOperation, update: MetaStatusEvent) {
  const transition = metaOperationStatusTransition(target.status, update);
  if (!transition) return;
  await tx.externalTransportOperation.updateMany({
    where: { id: target.id, status: target.status },
    data: transition,
  });
}

/**
 * A Meta number can also carry platform traffic, whose lifecycle lives on
 * CommunicationMessage. This is best effort: the external rail already holds
 * the durable record.
 */
async function applyPlatformMessageStatus(organizationId: string, update: MetaStatusEvent) {
  try {
    const message = await prisma.communicationMessage.findUnique({
      where: {
        organizationId_channel_provider_providerMessageId: {
          organizationId,
          channel: "WHATSAPP",
          provider: "META_CLOUD",
          providerMessageId: update.providerMessageId,
        },
      },
      select: { id: true, status: true },
    });
    if (!message) return;
    const transition = metaCommunicationMessageTransition(message.status, update);
    if (!transition) return;
    await prisma.communicationMessage.updateMany({ where: { id: message.id, status: message.status }, data: transition });
  } catch {
    // Platform mirroring must never fail the provider webhook.
  }
}

async function processExternalCallbackDelivery(
  delivery: {
    id: string;
    operationId: string;
    event: string;
    payloadCiphertext: string;
    destinationUrl: string;
    keyId: string;
    secretCiphertext: string;
    status: string;
    attempts: number;
    nextAttemptAt: Date | null;
  },
  deadline: number,
) {
  const now = new Date();
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) return { outcome: "skipped" as const, completedOperation: false };
  if (delivery.status === "PENDING" && delivery.nextAttemptAt && delivery.nextAttemptAt > now) return { outcome: "skipped" as const, completedOperation: false };

  const leaseToken = randomUUID();
  const claimed = await prisma.externalCallbackDelivery.updateMany({
    where: {
      id: delivery.id,
      OR: [
        { status: "PENDING", OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        { status: "PROCESSING", leaseExpiresAt: { lt: now } },
      ],
    },
    data: {
      status: "PROCESSING",
      leaseToken,
      leaseAcquiredAt: now,
      leaseExpiresAt: new Date(now.getTime() + CALLBACK_LEASE_MS),
    },
  });
  if (claimed.count !== 1) return { outcome: "skipped" as const, completedOperation: false };

  try {
    await postExternalApplicationCallback({ ...delivery, timeoutMs: Math.min(CALLBACK_TIMEOUT_MS, remainingMs) });
    const delivered = await prisma.externalCallbackDelivery.updateMany({
      where: { id: delivery.id, status: "PROCESSING", leaseToken },
      data: {
        status: "DELIVERED",
        attempts: delivery.attempts + 1,
        deliveredAt: now,
        lastError: null,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
    const completedOperation = delivered.count === 1 && await completeInboundOperationIfTerminal(delivery.operationId, now);
    return { outcome: "delivered" as const, completedOperation };
  } catch (error) {
    const decision = callbackDeliveryRetryDecision({ attempts: delivery.attempts, error, now });
    const updated = await prisma.externalCallbackDelivery.updateMany({
      where: { id: delivery.id, status: "PROCESSING", leaseToken },
      data: decision.failed
        ? {
          status: "FAILED",
          attempts: decision.attempts,
          lastError: decision.lastError,
          failedAt: now,
          nextAttemptAt: null,
          leaseToken: null,
          leaseExpiresAt: null,
        }
        : {
          status: "PENDING",
          attempts: decision.attempts,
          lastError: decision.lastError,
          nextAttemptAt: decision.nextAttemptAt,
          leaseToken: null,
          leaseExpiresAt: null,
        },
    });
    const completedOperation = decision.failed && updated.count === 1 && await completeInboundOperationIfTerminal(delivery.operationId, now);
    return { outcome: decision.failed ? "failed" as const : "retry_scheduled" as const, completedOperation };
  }
}

async function completeInboundOperationIfTerminal(operationId: string, now: Date) {
  const outstanding = await prisma.externalCallbackDelivery.count({
    where: { operationId, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (outstanding !== 0) return false;
  const completed = await prisma.externalTransportOperation.updateMany({
    where: { id: operationId, direction: "INBOUND", status: "PENDING" },
    data: { status: "COMPLETED", completedAt: now, leaseToken: null, leaseExpiresAt: null, nextCallbackAttemptAt: null },
  });
  return completed.count === 1;
}

function isStopCommand(value: string) {
  return /^(stop|arr[êe]t|désabonner|desabonner)$/iu.test(value.trim());
}

function normalizeSender(value: unknown) {
  return typeof value === "string" && /^[1-9]\d{6,14}$/.test(value) ? `+${value}` : null;
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function isRetryableInboundTransactionError(error: unknown) {
  return isUniqueConstraintError(error)
    || (typeof error === "object" && error !== null && "code" in error && error.code === "P2034");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
