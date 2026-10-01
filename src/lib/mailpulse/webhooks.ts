import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { previewSecret, randomSecret, sha256 } from "./crypto";
import { toPrismaJson } from "./json";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import {
  WEBHOOK_LEASE_MS,
  WEBHOOK_SECRET_OVERLAP_MS,
  WEBHOOK_TIMEOUT_MS,
  decideAfterAttempt,
  describeAttempt,
  signatureHeader,
  webhookUrlProblem,
  type AttemptResult,
} from "./webhook-policy";

export type WebhookEventPayload = {
  event_id: string;
  type: string;
  tenant_id: string;
  created_at: string;
  data: Record<string, unknown>;
};

export function createWebhookSecret() {
  return `whsec_${randomSecret()}`;
}

export async function createWebhookEndpoint(params: {
  organizationId: string;
  name: string;
  url: string;
  events: string[];
}) {
  const secret = createWebhookSecret();
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      url: params.url,
      events: params.events,
      signingSecret: secret,
      secretHash: sha256(secret),
      secretPreview: previewSecret(secret),
    },
  });

  return { endpoint, secret };
}

/**
 * A new secret, shown once. The previous one keeps signing alongside it for
 * WEBHOOK_SECRET_OVERLAP_MS, so a receiver can switch without missing events.
 */
export async function rotateWebhookSecret(organizationId: string, endpointId: string, now = new Date()) {
  const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id: endpointId, organizationId }, select: { id: true, signingSecret: true } });
  if (!endpoint) return null;
  const secret = createWebhookSecret();
  const updated = await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: {
      signingSecret: secret,
      secretHash: sha256(secret),
      secretPreview: previewSecret(secret),
      previousSigningSecret: endpoint.signingSecret,
      previousSecretExpiresAt: new Date(now.getTime() + WEBHOOK_SECRET_OVERLAP_MS),
    },
  });
  return { endpoint: updated, secret };
}

export async function emitWebhookEvent(params: {
  organizationId: string;
  type: string;
  data: Record<string, unknown>;
  messageId?: string | null;
}) {
  const organization = await prisma.organization.findUnique({
    where: { id: params.organizationId },
    select: { plan: true },
  });
  if (!organization || !canAccessFeature(organization.plan as PlanTier, "webhooks")) return;

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId: params.organizationId,
      active: true,
      events: { has: params.type },
    },
    select: { id: true },
  });

  const event: WebhookEventPayload = {
    event_id: randomUUID(),
    type: params.type,
    tenant_id: params.organizationId,
    created_at: new Date().toISOString(),
    data: params.data,
  };

  await Promise.all(
    endpoints.map(async (endpoint) => {
      // Created already leased: if this process dies before the attempt
      // settles, the retry run picks the delivery up once the lease expires.
      const delivery = await prisma.webhookDelivery.create({
        data: {
          organizationId: params.organizationId,
          endpointId: endpoint.id,
          messageId: params.messageId ?? null,
          eventId: event.event_id,
          eventType: event.type,
          payload: toPrismaJson(event),
          status: "PENDING",
          nextRetryAt: new Date(Date.now() + WEBHOOK_LEASE_MS),
        },
        select: { id: true },
      });
      await attemptDelivery(delivery.id);
    })
  );
}

/** One HTTP call. Never throws: every outcome is a result the log can read. */
async function post(url: string, headers: Record<string, string>, body: string): Promise<AttemptResult> {
  const problem = webhookUrlProblem(url);
  if (problem) return { kind: "blocked", reason: problem };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      // A redirect could lead anywhere, an internal address included.
      redirect: "manual",
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    return response.ok ? { kind: "delivered" } : { kind: "http", status: response.status };
  } catch (error) {
    return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? { kind: "timeout" } : { kind: "network" };
  }
}

/**
 * Sends one delivery the caller has claimed, and records the outcome. The
 * event is resent as stored, with its original event id: a receiver that saw
 * it already recognises the duplicate.
 */
async function attemptDelivery(deliveryId: string, now = () => new Date()) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      attempts: true,
      eventId: true,
      payload: true,
      endpoint: { select: { url: true, active: true, signingSecret: true, previousSigningSecret: true, previousSecretExpiresAt: true } },
    },
  });
  if (!delivery) return null;

  let result: AttemptResult;
  if (!delivery.endpoint.active) {
    result = { kind: "blocked", reason: "Webhook désactivé" };
  } else {
    const body = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(now().getTime() / 1000).toString();
    result = await post(delivery.endpoint.url, {
      "content-type": "application/json",
      "mailpulse-event-id": delivery.eventId,
      "mailpulse-timestamp": timestamp,
      "mailpulse-signature": signatureHeader(
        { current: delivery.endpoint.signingSecret, previous: delivery.endpoint.previousSigningSecret, previousExpiresAt: delivery.endpoint.previousSecretExpiresAt },
        timestamp,
        body,
        now(),
      ),
    }, body);
  }

  const attempts = delivery.attempts + 1;
  const decision = decideAfterAttempt(result, attempts, now());
  return prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      attempts,
      status: decision.status,
      nextRetryAt: decision.nextRetryAt,
      deliveredAt: decision.status === "DELIVERED" ? now() : null,
      lastError: describeAttempt(result),
    },
    select: { id: true, status: true, attempts: true, lastError: true, nextRetryAt: true },
  });
}

/**
 * Takes a delivery for this run only if it is still in the state it was read
 * in: two runs reading the same row cannot both send it.
 */
export async function claimWebhookDelivery(delivery: { id: string; status: "PENDING" | "RETRYING"; nextRetryAt: Date | null }, now: Date) {
  const result = await prisma.webhookDelivery.updateMany({
    where: { id: delivery.id, status: delivery.status, nextRetryAt: delivery.nextRetryAt },
    data: { status: "RETRYING", nextRetryAt: new Date(now.getTime() + WEBHOOK_LEASE_MS) },
  });
  return result.count === 1;
}

/** The retry run: deliveries due again, and those whose sender died mid-attempt. */
export async function processDueWebhookDeliveries(limit = 50, now = new Date()) {
  const due = await prisma.webhookDelivery.findMany({
    where: { status: { in: ["PENDING", "RETRYING"] }, nextRetryAt: { lte: now } },
    orderBy: { nextRetryAt: "asc" },
    take: Math.min(Math.max(limit, 1), 200),
    select: { id: true, status: true, nextRetryAt: true },
  });

  let delivered = 0;
  let retrying = 0;
  let failed = 0;
  for (const delivery of due) {
    if (!(await claimWebhookDelivery(delivery as { id: string; status: "PENDING" | "RETRYING"; nextRetryAt: Date | null }, now))) continue;
    const outcome = await attemptDelivery(delivery.id);
    if (outcome?.status === "DELIVERED") delivered += 1;
    else if (outcome?.status === "RETRYING") retrying += 1;
    else if (outcome?.status === "FAILED") failed += 1;
  }
  return { examined: due.length, delivered, retrying, failed };
}

/**
 * A manager asks for a delivery to be sent again now: one that failed for
 * good, or one waiting for its next try. A delivered event is not resent.
 */
export async function resendWebhookDelivery(organizationId: string, deliveryId: string, now = new Date()) {
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, organizationId, status: { in: ["FAILED", "RETRYING"] } },
    select: { id: true, status: true, nextRetryAt: true },
  });
  if (!delivery) return null;
  // The attempt count is history and stays: a resend of a delivery that used
  // up its retries is one more try, not a new automatic series.
  const claimed = await prisma.webhookDelivery.updateMany({
    where: { id: delivery.id, status: delivery.status, nextRetryAt: delivery.nextRetryAt },
    data: { status: "RETRYING", nextRetryAt: new Date(now.getTime() + WEBHOOK_LEASE_MS) },
  });
  if (claimed.count !== 1) return null;
  return attemptDelivery(delivery.id);
}
