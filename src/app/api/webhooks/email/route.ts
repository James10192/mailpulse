import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { resend } from "@/lib/resend";
import { recalculateCampaignAnalytics } from "@/lib/campaign-analytics";

// Resend webhook events
// https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests

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

function getTagValue(tags: Record<string, string> | { name: string; value: string }[] | undefined, name: string): string | null {
  if (!tags) return null;
  // Resend webhooks send tags as an object { key: value }, not an array
  if (Array.isArray(tags)) {
    return tags.find((t) => t.name === name)?.value ?? null;
  }
  return (tags as Record<string, string>)[name] ?? null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  let event: ResendWebhookEvent;

  if (webhookSecret) {
    const payload = await request.text();

    const id = request.headers.get("svix-id");
    const timestamp = request.headers.get("svix-timestamp");
    const signature = request.headers.get("svix-signature");

    if (!id || !timestamp || !signature) {
      console.error("Webhook missing svix headers");
      return new Response("Missing headers", { status: 400 });
    }

    try {
      const result = resend.webhooks.verify({
        payload,
        headers: { id, timestamp, signature },
        webhookSecret,
      });
      event = result as unknown as ResendWebhookEvent;
    } catch (e) {
      console.error("Webhook verify error:", String(e));
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    event = (await request.json()) as ResendWebhookEvent;
  }

  try {
    console.log("Webhook event:", event.type, event.data?.to?.[0]);
    await processEvent(event);
  } catch (e) {
    console.error("Webhook processEvent error:", String(e));
  }

  return new Response("OK", { status: 200 });
}

async function processEvent(event: ResendWebhookEvent) {
  const recipientId = getTagValue(event.data.tags, "recipient_id");
  const campaignId = getTagValue(event.data.tags, "campaign_id");
  const toEmail = event.data.to[0];

  // Find contact by email
  const contact = await prisma.contact.findFirst({
    where: { email: toEmail },
  });

  if (!contact) return;

  // Map Resend event types to Convex stat event names
  const convexEventMap: Record<string, "delivered" | "bounced" | "complained"> = {
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
  };

  // Map Resend event type to our EmailEventType for idempotency check
  const eventTypeMap: Record<string, string> = {
    "email.delivered": "DELIVERED",
    "email.opened": "OPENED",
    "email.clicked": "CLICKED",
    "email.bounced": "BOUNCED_HARD",
    "email.complained": "COMPLAINED",
  };

  const mappedType = eventTypeMap[event.type];

  // Idempotency: skip if we already processed this exact event
  if (mappedType && recipientId) {
    const existing = await prisma.emailEvent.findFirst({
      where: {
        type: mappedType as never,
        recipientId,
        contactId: contact.id,
      },
    });
    if (existing) {
      console.log(`Duplicate webhook skipped: ${event.type} for recipient ${recipientId}`);
      return;
    }
  }

  switch (event.type) {
    case "email.sent":
      // Email accepted by Resend — no DB action needed (sentAt set during send)
      break;

    case "email.delivered":
      await prisma.emailEvent.create({
        data: {
          type: "DELIVERED",
          contactId: contact.id,
          recipientId,
          metadata: { emailId: event.data.email_id },
        },
      });
      if (recipientId) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { deliveredAt: new Date() },
        });
      }
      break;

    case "email.opened":
      await prisma.emailEvent.create({
        data: {
          type: "OPENED",
          contactId: contact.id,
          recipientId,
          metadata: { emailId: event.data.email_id },
        },
      });
      if (recipientId) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { openedAt: new Date() },
        });
      }
      break;

    case "email.clicked":
      await prisma.emailEvent.create({
        data: {
          type: "CLICKED",
          contactId: contact.id,
          recipientId,
          metadata: { emailId: event.data.email_id },
        },
      });
      if (recipientId) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { clickedAt: new Date() },
        });
      }
      break;

    case "email.bounced":
      await prisma.emailEvent.create({
        data: {
          type: "BOUNCED_HARD",
          contactId: contact.id,
          recipientId,
          metadata: { emailId: event.data.email_id },
        },
      });
      await prisma.contact.update({
        where: { id: contact.id },
        data: { subscribed: false, bounceType: "hard" },
      });
      if (recipientId) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { bouncedAt: new Date() },
        });
      }
      break;

    case "email.complained":
      await prisma.emailEvent.create({
        data: {
          type: "COMPLAINED",
          contactId: contact.id,
          recipientId,
          metadata: { emailId: event.data.email_id },
        },
      });
      await prisma.contact.update({
        where: { id: contact.id },
        data: { subscribed: false },
      });
      if (recipientId) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { complainedAt: new Date() },
        });
      }
      break;

    default:
      console.log("Unhandled webhook event type:", event.type);
  }

  // Sync to Convex real-time dashboard
  const convexEvent = convexEventMap[event.type];
  if (convexEvent && contact.organizationId) {
    await convexServer.mutation(api.dashboard.updateStats, {
      organizationId: contact.organizationId,
      event: convexEvent,
    });
  }

  // Update campaign analytics if applicable
  if (campaignId) {
    await recalculateCampaignAnalytics(campaignId);
    revalidatePath("/dashboard/campaigns");
  }
}
