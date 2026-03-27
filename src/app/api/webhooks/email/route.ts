import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Webhook } from "svix";

// Resend webhook events
// https://resend.com/docs/dashboard/webhooks/introduction

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    headers?: { name: string; value: string }[];
    tags?: { name: string; value: string }[];
  };
}

function getTagValue(tags: { name: string; value: string }[] | undefined, name: string) {
  return tags?.find((t) => t.name === name)?.value ?? null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = request.headers.get("svix-signature");
    const timestamp = request.headers.get("svix-timestamp");
    const svixId = request.headers.get("svix-id");

    if (!signature || !timestamp || !svixId) {
      return new Response("Missing webhook headers", { status: 400 });
    }

    // Verify with Resend's webhook library
    try {
      const body = await request.text();
      const wh = new Webhook(webhookSecret);
      wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      });
      // Parse verified body
      const event = JSON.parse(body) as ResendWebhookEvent;
      await processEvent(event);
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    // Dev mode: no signature verification
    const event = (await request.json()) as ResendWebhookEvent;
    await processEvent(event);
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

  switch (event.type) {
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
      // Immediate suppression
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
  }

  // Update campaign analytics if applicable
  if (campaignId) {
    await updateCampaignAnalytics(campaignId);
  }
}

async function updateCampaignAnalytics(campaignId: string) {
  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: {
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
      bouncedAt: true,
      complainedAt: true,
      unsubscribedAt: true,
    },
  });

  const totalSent = recipients.length;
  const totalDelivered = recipients.filter((r: { deliveredAt: Date | null }) => r.deliveredAt !== null).length;
  const totalOpened = recipients.filter((r: { openedAt: Date | null }) => r.openedAt !== null).length;
  const totalClicked = recipients.filter((r: { clickedAt: Date | null }) => r.clickedAt !== null).length;
  const totalBounced = recipients.filter((r: { bouncedAt: Date | null }) => r.bouncedAt !== null).length;
  const totalComplaints = recipients.filter((r: { complainedAt: Date | null }) => r.complainedAt !== null).length;
  const totalUnsubscribed = recipients.filter((r: { unsubscribedAt: Date | null }) => r.unsubscribedAt !== null).length;

  await prisma.campaignAnalytics.upsert({
    where: { campaignId },
    create: {
      campaignId,
      totalSent,
      totalDelivered,
      totalOpened,
      uniqueOpens: totalOpened,
      totalClicked,
      uniqueClicks: totalClicked,
      totalBounced,
      totalComplaints,
      totalUnsubscribed,
      openRate: totalDelivered > 0 ? totalOpened / totalDelivered : 0,
      clickRate: totalDelivered > 0 ? totalClicked / totalDelivered : 0,
      bounceRate: totalSent > 0 ? totalBounced / totalSent : 0,
    },
    update: {
      totalSent,
      totalDelivered,
      totalOpened,
      uniqueOpens: totalOpened,
      totalClicked,
      uniqueClicks: totalClicked,
      totalBounced,
      totalComplaints,
      totalUnsubscribed,
      openRate: totalDelivered > 0 ? totalOpened / totalDelivered : 0,
      clickRate: totalDelivered > 0 ? totalClicked / totalDelivered : 0,
      bounceRate: totalSent > 0 ? totalBounced / totalSent : 0,
    },
  });
}
