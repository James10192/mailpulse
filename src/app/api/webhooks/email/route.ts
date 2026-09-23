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

  const verification = await verifyWebhook(request, webhookSecret);
  if (verification instanceof Response) return verification;

  try {
    console.log("Webhook event:", verification.event.type, verification.event.data.email_id);
    await processDelivery(verification);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processEvent error:", String(error));
    return new Response("Webhook processing failed", { status: 500 });
  }
}

async function verifyWebhook(request: NextRequest, webhookSecret: string): Promise<ResendDelivery | Response> {
  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return new Response("Missing headers", { status: 400 });

  let verified: unknown;
  try {
    verified = resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret });
  } catch (error) {
    console.error("Webhook verify error:", String(error));
    return new Response("Invalid signature", { status: 400 });
  }

  const parsed = parseResendWebhookPayload(verified);
  if (parsed.kind === "unsupported") return new Response("Event ignored", { status: 200 });
  if (parsed.kind === "invalid") {
    console.error("Webhook payload invalid:", parsed.issues);
    return new Response("Invalid payload", { status: 400 });
  }
  return { event: parsed.event, deliveryId: id, receivedAt: new Date() };
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
