import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { hmacSha256, previewSecret, randomSecret, sha256 } from "./crypto";
import { toPrismaJson } from "./json";

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

export async function emitWebhookEvent(params: {
  organizationId: string;
  type: string;
  data: Record<string, unknown>;
  messageId?: string | null;
}) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId: params.organizationId,
      active: true,
      events: { has: params.type },
    },
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
      const delivery = await prisma.webhookDelivery.create({
        data: {
          organizationId: params.organizationId,
          endpointId: endpoint.id,
          messageId: params.messageId ?? null,
          eventId: event.event_id,
          eventType: event.type,
          payload: toPrismaJson(event),
          status: "PENDING",
        },
      });

      await deliverWebhook(endpoint, delivery.id, event);
    })
  );
}

async function deliverWebhook(
  endpoint: { id: string; url: string; signingSecret: string },
  deliveryId: string,
  event: WebhookEventPayload
) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = hmacSha256(endpoint.signingSecret, `${timestamp}.${payload}`);

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mailpulse-event-id": event.event_id,
        "mailpulse-timestamp": timestamp,
        "mailpulse-signature": `v1=${signature}`,
      },
      body: payload,
    });

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: { increment: 1 },
        status: response.ok ? "DELIVERED" : "FAILED",
        deliveredAt: response.ok ? new Date() : null,
        lastError: response.ok ? null : `HTTP ${response.status}`,
      },
    });
  } catch (error) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: { increment: 1 },
        status: "FAILED",
        lastError: error instanceof Error ? error.message : "Webhook delivery failed",
      },
    });
  }
}
