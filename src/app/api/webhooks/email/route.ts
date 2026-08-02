import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

import type { Prisma } from "@/generated/prisma";
import { recalculateCampaignAnalytics } from "@/lib/campaign-analytics";
import { convexServer } from "@/lib/convex-server";
import { resendMessageTransition } from "@/lib/mailpulse/resend-message-status";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { api } from "../../../../../convex/_generated/api";

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    headers?: { name: string; value: string }[];
    tags?: Record<string, string> | { name: string; value: string }[];
  };
}

type EventTagSet = {
  recipientId: string | null;
  campaignId: string | null;
  messageId: string | null;
};

const convexEventMap: Record<string, "delivered" | "bounced" | "complained"> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

const eventTypeMap: Partial<Record<string, "DELIVERED" | "OPENED" | "CLICKED" | "BOUNCED_HARD" | "COMPLAINED">> = {
  "email.delivered": "DELIVERED",
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.bounced": "BOUNCED_HARD",
  "email.complained": "COMPLAINED",
};

const campaignRecipientTimestamp: Partial<Record<string, "deliveredAt" | "openedAt" | "clickedAt" | "bouncedAt" | "complainedAt">> = {
  "email.delivered": "deliveredAt",
  "email.opened": "openedAt",
  "email.clicked": "clickedAt",
  "email.bounced": "bouncedAt",
  "email.complained": "complainedAt",
};

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) return new Response("Webhook not configured", { status: 500 });

  const verification = await verifyWebhook(request, webhookSecret);
  if (verification instanceof Response) return verification;

  try {
    console.log("Webhook event:", verification.type, verification.data.email_id);
    await processEvent(verification);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processEvent error:", String(error));
    return new Response("Webhook processing failed", { status: 500 });
  }
}

async function verifyWebhook(request: NextRequest, webhookSecret: string) {
  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return new Response("Missing headers", { status: 400 });

  try {
    return resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    }) as unknown as ResendWebhookEvent;
  } catch (error) {
    console.error("Webhook verify error:", String(error));
    return new Response("Invalid signature", { status: 400 });
  }
}

async function processEvent(event: ResendWebhookEvent) {
  const tags = eventTags(event.data.tags);
  const result = await prisma.$transaction(
    (tx) => processDatabaseEvent(tx, event, tags),
    { isolationLevel: "Serializable" },
  );
  if (result.changed) await syncExternalEffects(event.type, result.organizationId, tags.campaignId);
}

async function processDatabaseEvent(
  tx: Prisma.TransactionClient,
  event: ResendWebhookEvent,
  tags: EventTagSet,
) {
  const communication = await reconcileCommunicationMessage(tx, event, tags.messageId);
  const recipient = tags.recipientId
    ? await tx.campaignRecipient.findFirst({
        where: { id: tags.recipientId, ...(tags.campaignId ? { campaignId: tags.campaignId } : {}) },
        select: { contactId: true },
      })
    : null;
  const contactId = communication.contactId ?? recipient?.contactId ?? null;
  const contact = contactId ? await tx.contact.findUnique({ where: { id: contactId } }) : null;
  if (!contact) return { changed: communication.changed, organizationId: communication.organizationId };

  const campaignChanged = tags.recipientId
    ? await applyCampaignEvent(tx, event, contact.id, tags.recipientId)
    : false;
  await applyContactPreferenceEvent(tx, event.type, contact.id);
  return { changed: communication.changed || campaignChanged, organizationId: contact.organizationId };
}

async function reconcileCommunicationMessage(
  tx: Prisma.TransactionClient,
  event: ResendWebhookEvent,
  messageId: string | null,
) {
  const message = await tx.communicationMessage.findFirst({
    where: messageId
      ? {
          id: messageId,
          channel: "EMAIL",
          provider: { in: ["RESEND", "UNSPECIFIED"] },
          OR: [{ providerMessageId: null }, { providerMessageId: event.data.email_id }],
        }
      : { channel: "EMAIL", provider: "RESEND", providerMessageId: event.data.email_id },
    select: {
      id: true,
      status: true,
      contactId: true,
      organizationId: true,
      providerMessageId: true,
      deliveredAt: true,
      readAt: true,
    },
  });
  if (!message) return { changed: false, contactId: null, organizationId: null };

  const occurredAt = new Date(event.created_at);
  const transition = resendMessageTransition(
    event.type,
    Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
    message,
  );
  const update = await tx.communicationMessage.updateMany({
    where: { id: message.id, status: message.status },
    data: { provider: "RESEND", providerMessageId: event.data.email_id, ...(transition ?? {}) },
  });
  return {
    changed: update.count === 1 && (Boolean(transition) || message.providerMessageId !== event.data.email_id),
    contactId: message.contactId,
    organizationId: message.organizationId,
  };
}

async function applyCampaignEvent(
  tx: Prisma.TransactionClient,
  event: ResendWebhookEvent,
  contactId: string,
  recipientId: string,
) {
  const mappedType = eventTypeMap[event.type];
  if (!mappedType) return false;
  const existing = await tx.emailEvent.findFirst({
    where: { type: mappedType, recipientId, contactId },
    select: { id: true },
  });
  if (!existing) {
    await tx.emailEvent.create({
      data: { type: mappedType, contactId, recipientId, metadata: { emailId: event.data.email_id } },
    });
  }

  const timestampField = campaignRecipientTimestamp[event.type];
  if (timestampField) {
    const occurredAt = new Date(event.created_at);
    await tx.campaignRecipient.updateMany({
      where: { id: recipientId },
      data: { [timestampField]: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt },
    });
  }
  return !existing;
}

async function applyContactPreferenceEvent(
  tx: Prisma.TransactionClient,
  eventType: string,
  contactId: string,
) {
  if (eventType === "email.bounced") {
    await tx.contact.update({
      where: { id: contactId },
      data: { subscribed: false, bounceType: "hard" },
    });
  } else if (eventType === "email.complained") {
    await tx.contact.update({ where: { id: contactId }, data: { subscribed: false } });
  }
}

async function syncExternalEffects(
  eventType: string,
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

function eventTags(tags: ResendWebhookEvent["data"]["tags"]): EventTagSet {
  return {
    recipientId: getTagValue(tags, "recipient_id"),
    campaignId: getTagValue(tags, "campaign_id"),
    messageId: getTagValue(tags, "message_id"),
  };
}

function getTagValue(tags: ResendWebhookEvent["data"]["tags"], name: string) {
  if (!tags) return null;
  if (Array.isArray(tags)) return tags.find((tag) => tag.name === name)?.value ?? null;
  return tags[name] ?? null;
}
