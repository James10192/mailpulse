import type { EmailEventType, Prisma } from "@/generated/prisma";

import { recordDeliveryDelay } from "./message-delivery-delays";
import { classifyResendEvent } from "./resend-message-status";
import {
  resendEventReason,
  resendEventTag,
  resendEventTime,
  type ResendEventType,
  type ResendWebhookEvent,
} from "./resend-webhook-payload";

/** A verified Resend event, with the webhook delivery id (`svix-id`) that identifies it. */
export type ResendDelivery = {
  event: ResendWebhookEvent;
  deliveryId: string;
  receivedAt: Date;
};

type CampaignEffect = {
  eventType: EmailEventType;
  timestamp?: "deliveredAt" | "openedAt" | "clickedAt" | "bouncedAt" | "complainedAt";
};

// Resend excludes suppressions from the bounce rate, so a suppression is
// recorded as its own event without stamping bouncedAt.
const CAMPAIGN_EFFECTS: Partial<Record<ResendEventType, CampaignEffect>> = {
  "email.delivered": { eventType: "DELIVERED", timestamp: "deliveredAt" },
  "email.opened": { eventType: "OPENED", timestamp: "openedAt" },
  "email.clicked": { eventType: "CLICKED", timestamp: "clickedAt" },
  "email.bounced": { eventType: "BOUNCED_HARD", timestamp: "bouncedAt" },
  "email.complained": { eventType: "COMPLAINED", timestamp: "complainedAt" },
  "email.suppressed": { eventType: "SUPPRESSED" },
};

// Resend only suppresses an address after a hard bounce or a complaint.
const CONTACT_EFFECTS: Partial<Record<ResendEventType, Prisma.ContactUpdateInput>> = {
  "email.bounced": { subscribed: false, bounceType: "hard" },
  "email.suppressed": { subscribed: false, bounceType: "suppressed" },
  "email.complained": { subscribed: false },
};

export async function processResendDelivery(tx: Prisma.TransactionClient, delivery: ResendDelivery) {
  const { event } = delivery;
  const recipientId = resendEventTag(event, "recipient_id");
  const campaignId = resendEventTag(event, "campaign_id");
  const communication = await reconcileCommunicationMessage(tx, delivery);
  const recipient = recipientId
    ? await tx.campaignRecipient.findFirst({
        where: { id: recipientId, ...(campaignId ? { campaignId } : {}) },
        select: { contactId: true },
      })
    : null;
  const contactId = communication.contactId ?? recipient?.contactId ?? null;
  const contact = contactId ? await tx.contact.findUnique({ where: { id: contactId }, select: { id: true, organizationId: true } }) : null;
  if (!contact) return { changed: communication.changed, organizationId: communication.organizationId, campaignId };

  const campaignChanged = recipientId ? await applyCampaignEffect(tx, delivery, contact.id, recipientId) : false;
  const contactUpdate = CONTACT_EFFECTS[event.type];
  if (contactUpdate) await tx.contact.update({ where: { id: contact.id }, data: contactUpdate });
  return { changed: communication.changed || campaignChanged, organizationId: contact.organizationId, campaignId };
}

async function reconcileCommunicationMessage(tx: Prisma.TransactionClient, delivery: ResendDelivery) {
  const { event } = delivery;
  const emailId = event.data.email_id;
  const messageId = resendEventTag(event, "message_id");
  const message = await tx.communicationMessage.findFirst({
    where: messageId
      ? {
          id: messageId,
          channel: "EMAIL",
          provider: { in: ["RESEND", "UNSPECIFIED"] },
          OR: [{ providerMessageId: null }, { providerMessageId: emailId }],
        }
      : { channel: "EMAIL", provider: "RESEND", providerMessageId: emailId },
    select: { id: true, status: true, contactId: true, organizationId: true, providerMessageId: true, deliveredAt: true, readAt: true },
  });
  if (!message) return { changed: false, contactId: null, organizationId: null };

  const occurredAt = resendEventTime(event, delivery.receivedAt);
  const classification = classifyResendEvent(event.type, message, occurredAt, resendEventReason(event));
  let statusChange = {};
  switch (classification?.kind) {
    case "status":
      statusChange = classification.data;
      break;
    case "delay":
      // Resend documents no reason for a delay; the column stays for providers that give one.
      await recordDeliveryDelay(tx, {
        organizationId: message.organizationId,
        messageId: message.id,
        provider: "RESEND",
        providerEventId: delivery.deliveryId,
        occurredAt,
        reason: null,
      });
      break;
  }

  const update = await tx.communicationMessage.updateMany({
    where: { id: message.id, status: message.status },
    data: { provider: "RESEND", providerMessageId: emailId, ...statusChange },
  });
  return {
    changed: update.count === 1 && (classification?.kind === "status" || message.providerMessageId !== emailId),
    contactId: message.contactId,
    organizationId: message.organizationId,
  };
}

async function applyCampaignEffect(
  tx: Prisma.TransactionClient,
  delivery: ResendDelivery,
  contactId: string,
  recipientId: string,
) {
  const effect = CAMPAIGN_EFFECTS[delivery.event.type];
  if (!effect) return false;
  const existing = await tx.emailEvent.findFirst({
    where: { type: effect.eventType, recipientId, contactId },
    select: { id: true },
  });
  if (!existing) {
    await tx.emailEvent.create({
      data: { type: effect.eventType, contactId, recipientId, metadata: { emailId: delivery.event.data.email_id } },
    });
  }
  if (effect.timestamp) {
    await tx.campaignRecipient.updateMany({
      where: { id: recipientId },
      data: { [effect.timestamp]: resendEventTime(delivery.event, delivery.receivedAt) },
    });
  }
  return !existing;
}
