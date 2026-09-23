import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

import { recalculateCampaignAnalytics } from "@/lib/campaign-analytics";
import { convexServer } from "@/lib/convex-server";
import { parseResendWebhookPayload, type ResendEventType } from "@/lib/mailpulse/resend-webhook-payload";
import { processResendDelivery, type ResendDelivery } from "@/lib/mailpulse/resend-webhook-processing";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { api } from "../../../../../convex/_generated/api";

const convexEventMap: Partial<Record<ResendEventType, "delivered" | "bounced" | "complained">> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) return new Response("Webhook not configured", { status: 500 });

  const signed = await verifySignature(request, webhookSecret);
  if (signed instanceof Response) return signed;
  const delivery = readDelivery(signed.payload, signed.deliveryId);
  if (delivery instanceof Response) return delivery;

  try {
    console.log("Webhook event:", delivery.event.type, delivery.event.data.email_id);
    await processDelivery(delivery);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processEvent error:", String(error));
    return new Response("Webhook processing failed", { status: 500 });
  }
}

/** Checks the svix signature and returns the verified payload with its delivery id. */
async function verifySignature(request: NextRequest, webhookSecret: string) {
  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return new Response("Missing headers", { status: 400 });

  try {
    const verified: unknown = resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret });
    return { payload: verified, deliveryId: id };
  } catch (error) {
    console.error("Webhook verify error:", String(error));
    return new Response("Invalid signature", { status: 400 });
  }
}

/** Validates a verified payload; event types the platform does not handle are acknowledged. */
function readDelivery(payload: unknown, deliveryId: string): ResendDelivery | Response {
  const parsed = parseResendWebhookPayload(payload);
  if (parsed.kind === "unsupported") {
    console.info("Webhook event ignored:", parsed.type);
    return new Response("Event ignored", { status: 200 });
  }
  if (parsed.kind === "invalid") {
    console.error("Webhook payload invalid:", parsed.issues);
    return new Response("Invalid payload", { status: 400 });
  }
  return { event: parsed.event, deliveryId, receivedAt: new Date() };
}

async function processDelivery(delivery: ResendDelivery) {
  const result = await prisma.$transaction(
    (tx) => processResendDelivery(tx, delivery),
    { isolationLevel: "Serializable" },
  );
  if (result.changed) await syncExternalEffects(delivery.event.type, result.organizationId, result.campaignId);
}

async function syncExternalEffects(
  eventType: ResendEventType,
  organizationId: string | null,
  campaignId: string | null,
) {
  const effects: Promise<unknown>[] = [];
  const convexEvent = convexEventMap[eventType];
  if (convexEvent && organizationId) {
    effects.push(convexServer.mutation(api.dashboard.updateStats, { organizationId, event: convexEvent }));
  }
  if (campaignId) effects.push(updateCampaignAnalytics(campaignId));

  const results = await Promise.allSettled(effects);
  results.forEach((result) => {
    if (result.status === "rejected") console.error("Webhook side effect failed:", String(result.reason));
  });
}

async function updateCampaignAnalytics(campaignId: string) {
  const analytics = await recalculateCampaignAnalytics(campaignId);
  if (analytics.bounceRate > 5 || analytics.unsubscribeRate > 2) {
    console.warn(
      `[ALERT] High bounce/unsub rate for campaign ${campaignId}: bounce=${analytics.bounceRate.toFixed(1)}%, unsub=${analytics.unsubscribeRate.toFixed(1)}%`,
    );
  }
  revalidatePath("/dashboard/campaigns");
}
