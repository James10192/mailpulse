import { prisma } from "@/lib/prisma";
import type { WebhookEndpoint } from "@/generated/prisma";
import { randomUUID } from "node:crypto";
import { previewSecret, randomSecret, sha256 } from "./crypto";
import { toPrismaJson } from "./json";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import {
  WEBHOOK_INLINE_TIMEOUT_MS,
  WEBHOOK_LEASE_MS,
  WEBHOOK_SECRET_OVERLAP_MS,
  WEBHOOK_TIMEOUT_MS,
  decideAfterAttempt,
  describeAttempt,
  signatureHeader,
  type AttemptResult,
} from "./webhook-policy";
import { webhookTransport } from "./webhook-transport";

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
type RotationResult = { endpoint: WebhookEndpoint; secret: string } | { conflict: true } | null;

export async function rotateWebhookSecret(organizationId: string, endpointId: string, now = new Date()): Promise<RotationResult> {
  const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id: endpointId, organizationId }, select: { id: true, signingSecret: true } });
  if (!endpoint) return null;
  const secret = createWebhookSecret();
  // Written only if nobody rotated in between: two rotations at once must not
  // hand out a secret that was never stored.
  const written = await prisma.webhookEndpoint.updateMany({
    where: { id: endpoint.id, organizationId, signingSecret: endpoint.signingSecret },
    data: {
      signingSecret: secret,
      secretHash: sha256(secret),
      secretPreview: previewSecret(secret),
      previousSigningSecret: endpoint.signingSecret,
      previousSecretExpiresAt: new Date(now.getTime() + WEBHOOK_SECRET_OVERLAP_MS),
    },
  });
  if (written.count !== 1) return { conflict: true };
  const updated = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } });
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
      // Short here: this runs inside the request that sent the message. A slow
      // receiver gets its full time on the retry run instead.
      await attemptDelivery(delivery.id, WEBHOOK_INLINE_TIMEOUT_MS);
    })
  );
}

/**
 * Sends one delivery the caller has claimed, and records the outcome. The
 * event is resent as stored, with its original event id: a receiver that saw
 * it already recognises the duplicate.
 */
async function attemptDelivery(deliveryId: string, timeoutMs = WEBHOOK_TIMEOUT_MS, now = () => new Date()) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      attempts: true,
      eventId: true,
      payload: true,
      endpoint: { select: { url: true, active: true, signingSecret: true, previousSigningSecret: true, previousSecretExpiresAt: true, organization: { select: { plan: true } } } },
    },
  });
  if (!delivery) return null;

  let result: AttemptResult;
  if (!delivery.endpoint.active) {
    result = { kind: "blocked", reason: "Webhook désactivé" };
  } else if (!canAccessFeature(delivery.endpoint.organization.plan as PlanTier, "webhooks")) {
    // Checked at every attempt, not only when the event was emitted: a plan
    // that loses webhooks stops its retries too.
    result = { kind: "blocked", reason: "Webhooks non inclus dans le plan" };
  } else {
    const body = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(now().getTime() / 1000).toString();
    result = await webhookTransport.post(delivery.endpoint.url, {
      "content-type": "application/json",
      "mailpulse-event-id": delivery.eventId,
      "mailpulse-timestamp": timestamp,
      "mailpulse-signature": signatureHeader(
        { current: delivery.endpoint.signingSecret, previous: delivery.endpoint.previousSigningSecret, previousExpiresAt: delivery.endpoint.previousSecretExpiresAt },
        timestamp,
        body,
        now(),
      ),
    }, body, timeoutMs);
  }

  const attempts = delivery.attempts + 1;
  const decision = decideAfterAttempt(result, attempts, now());
  const updated = await prisma.webhookDelivery.update({
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
  return { ...updated, unreachable: result.kind === "timeout" || result.kind === "network" };
}

/**
 * Takes a delivery for this run only if it is still in the state it was read
 * in: two runs reading the same row cannot both send it.
 */
export async function claimWebhookDelivery(delivery: { id: string; status: "PENDING" | "RETRYING"; nextRetryAt: Date | null }, now = new Date()) {
  const result = await prisma.webhookDelivery.updateMany({
    where: { id: delivery.id, status: delivery.status, nextRetryAt: delivery.nextRetryAt },
    data: { status: "RETRYING", nextRetryAt: new Date(now.getTime() + WEBHOOK_LEASE_MS) },
  });
  return result.count === 1;
}

const RETRY_CONCURRENCY = 5;
/** Stop claiming past this, to finish inside the route's 60 seconds. */
const RETRY_RUN_BUDGET_MS = 40_000;

/**
 * The retry run: deliveries due again, and those whose sender died
 * mid-attempt. A few at a time; a receiver that times out or cannot be reached
 * is skipped for the rest of the run, so one dead endpoint cannot hold the
 * queue of every organization.
 */
export type RetryRunOptions = {
  limit?: number;
  now?: Date;
  deadline?: number;
  /** Restricts the run to these organizations. The cron leaves it unset: every organization. */
  organizationIds?: string[];
};

export async function processDueWebhookDeliveries({
  limit = 50,
  now = new Date(),
  deadline = Date.now() + RETRY_RUN_BUDGET_MS,
  organizationIds,
}: RetryRunOptions = {}) {
  const inScope = organizationIds ? { organizationId: { in: organizationIds } } : {};

  // Secrets past their overlap are no longer needed anywhere: drop them.
  await prisma.webhookEndpoint.updateMany({
    where: { ...inScope, previousSecretExpiresAt: { lt: now } },
    data: { previousSigningSecret: null, previousSecretExpiresAt: null },
  });

  const due = await prisma.webhookDelivery.findMany({
    where: {
      ...inScope,
      OR: [
        { status: { in: ["PENDING", "RETRYING"] }, nextRetryAt: { lte: now } },
        // Written before deliveries were leased: no retry time at all.
        { status: "PENDING", nextRetryAt: null, createdAt: { lt: new Date(now.getTime() - WEBHOOK_LEASE_MS) } },
      ],
    },
    orderBy: { nextRetryAt: { sort: "asc", nulls: "first" } },
    take: Math.min(Math.max(limit, 1), 200),
    select: { id: true, status: true, nextRetryAt: true, endpointId: true },
  });

  const unreachable = new Set<string>();
  const counts = { delivered: 0, retrying: 0, failed: 0, skipped: 0 };
  const queue = [...due];
  async function worker() {
    for (let delivery = queue.shift(); delivery; delivery = queue.shift()) {
      if (Date.now() > deadline || unreachable.has(delivery.endpointId)) {
        counts.skipped += 1;
        continue;
      }
      if (!(await claimWebhookDelivery(delivery as { id: string; status: "PENDING" | "RETRYING"; nextRetryAt: Date | null }, new Date()))) continue;
      const outcome = await attemptDelivery(delivery.id);
      if (outcome?.status === "DELIVERED") counts.delivered += 1;
      else if (outcome?.status === "RETRYING") counts.retrying += 1;
      else if (outcome?.status === "FAILED") counts.failed += 1;
      if (outcome?.unreachable) unreachable.add(delivery.endpointId);
    }
  }
  await Promise.all(Array.from({ length: RETRY_CONCURRENCY }, worker));
  return { examined: due.length, ...counts };
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
