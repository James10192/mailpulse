import type { EmailEventType, Prisma } from "@/generated/prisma";

import { recordDeliveryDelay, type DelayNotice } from "./message-delivery-delays";
import { classifyResendEvent, type ResendClassification, type StatusChange } from "./resend-message-status";
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
};

const MESSAGE_SELECT = {
  id: true,
  status: true,
  contactId: true,
  organizationId: true,
  providerMessageId: true,
  deliveredAt: true,
  readAt: true,
} as const satisfies Prisma.CommunicationMessageSelect;

type ReconcilableMessage = Prisma.CommunicationMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;
type RecipientTimestamp = "deliveredAt" | "openedAt" | "clickedAt" | "bouncedAt" | "complainedAt";

/** The slice of a Prisma transaction this processing needs. */
export type ResendWebhookStore = {
  communicationMessage: {
    findFirst(args: { where: Prisma.CommunicationMessageWhereInput; select: typeof MESSAGE_SELECT }): PromiseLike<ReconcilableMessage | null>;
    updateMany(args: {
      where: Prisma.CommunicationMessageWhereInput;
      data: Prisma.CommunicationMessageUpdateManyMutationInput;
    }): PromiseLike<{ count: number }>;
  };
  campaignRecipient: {
    findFirst(args: { where: Prisma.CampaignRecipientWhereInput; select: { contactId: true } }): PromiseLike<{ contactId: string } | null>;
    updateMany(args: {
      where: Prisma.CampaignRecipientWhereInput;
      data: Partial<Record<RecipientTimestamp, Date>>;
    }): PromiseLike<{ count: number }>;
  };
  contact: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; organizationId: true };
    }): PromiseLike<{ id: string; organizationId: string } | null>;
    update(args: { where: { id: string }; data: Prisma.ContactUpdateInput }): PromiseLike<unknown>;
  };
  emailEvent: {
    findFirst(args: { where: Prisma.EmailEventWhereInput; select: { id: true } }): PromiseLike<{ id: string } | null>;
    create(args: { data: Prisma.EmailEventUncheckedCreateInput }): PromiseLike<unknown>;
  };
  communicationMessageEvent: {
    createMany(args: {
      data: Prisma.CommunicationMessageEventCreateManyInput[];
      skipDuplicates: boolean;
    }): PromiseLike<{ count: number }>;
  };
};

type CampaignEffect = { eventType: EmailEventType; timestamp?: RecipientTimestamp };

// Resend excludes suppressions from the bounce rate, so suppressions and sending
// failures are recorded as their own events without stamping bouncedAt.
const CAMPAIGN_EFFECTS: Partial<Record<ResendEventType, CampaignEffect>> = {
  "email.delivered": { eventType: "DELIVERED", timestamp: "deliveredAt" },
  "email.opened": { eventType: "OPENED", timestamp: "openedAt" },
  "email.clicked": { eventType: "CLICKED", timestamp: "clickedAt" },
  "email.bounced": { eventType: "BOUNCED_HARD", timestamp: "bouncedAt" },
  "email.complained": { eventType: "COMPLAINED", timestamp: "complainedAt" },
  "email.suppressed": { eventType: "SUPPRESSED" },
  "email.failed": { eventType: "FAILED" },
};

// Resend only suppresses an address after a hard bounce or a complaint.
const CONTACT_EFFECTS: Partial<Record<ResendEventType, Prisma.ContactUpdateInput>> = {
  "email.bounced": { subscribed: false, bounceType: "hard" },
  "email.suppressed": { subscribed: false, bounceType: "suppressed" },
  "email.complained": { subscribed: false },
};

export async function processResendDelivery(store: ResendWebhookStore, delivery: ResendDelivery) {
  const { event } = delivery;
  const recipientId = resendEventTag(event, "recipient_id");
  const campaignId = resendEventTag(event, "campaign_id");
  const communication = await reconcileCommunicationMessage(store, delivery);
  const recipient = recipientId
    ? await store.campaignRecipient.findFirst({
        where: { id: recipientId, ...(campaignId ? { campaignId } : {}) },
        select: { contactId: true },
      })
    : null;
  const contactId = communication.contactId ?? recipient?.contactId ?? null;
  const contact = contactId
    ? await store.contact.findUnique({ where: { id: contactId }, select: { id: true, organizationId: true } })
    : null;
  if (!contact) return { changed: communication.changed, organizationId: communication.organizationId, campaignId };

  const campaignChanged = recipientId ? await applyCampaignEffect(store, delivery, contact.id, recipientId) : false;
  const contactUpdate = CONTACT_EFFECTS[event.type];
  if (contactUpdate) await store.contact.update({ where: { id: contact.id }, data: contactUpdate });
  return { changed: communication.changed || campaignChanged, organizationId: contact.organizationId, campaignId };
}

async function reconcileCommunicationMessage(store: ResendWebhookStore, delivery: ResendDelivery) {
  const { event } = delivery;
  const emailId = event.data.email_id;
  const messageId = resendEventTag(event, "message_id");
  const message = await store.communicationMessage.findFirst({
    where: messageId
      ? {
          id: messageId,
          channel: "EMAIL",
          provider: { in: ["RESEND", "UNSPECIFIED"] },
          OR: [{ providerMessageId: null }, { providerMessageId: emailId }],
        }
      : { channel: "EMAIL", provider: "RESEND", providerMessageId: emailId },
    select: MESSAGE_SELECT,
  });
  if (!message) return { changed: false, contactId: null, organizationId: null };

  const occurredAt = resendEventTime(event);
  const classification = classifyResendEvent(event.type, message, occurredAt, resendEventReason(event));
  const statusChange = await applyClassification(store, classification, {
    organizationId: message.organizationId,
    messageId: message.id,
    provider: "RESEND",
    providerEventId: delivery.deliveryId,
    occurredAt,
  });

  const update = await store.communicationMessage.updateMany({
    where: { id: message.id, status: message.status },
    data: { provider: "RESEND", providerMessageId: emailId, ...statusChange },
  });
  return {
    changed: update.count === 1 && (statusChange !== null || message.providerMessageId !== emailId),
    contactId: message.contactId,
    organizationId: message.organizationId,
  };
}

async function applyClassification(
  store: ResendWebhookStore,
  classification: ResendClassification,
  delay: DelayNotice,
): Promise<StatusChange | null> {
  switch (classification?.kind) {
    case "status":
      return classification.data;
    case "delay":
      await recordDeliveryDelay(store, delay);
      return null;
    default:
      return null;
  }
}

async function applyCampaignEffect(
  store: ResendWebhookStore,
  delivery: ResendDelivery,
  contactId: string,
  recipientId: string,
) {
  const effect = CAMPAIGN_EFFECTS[delivery.event.type];
  if (!effect) return false;
  const existing = await store.emailEvent.findFirst({
    where: { type: effect.eventType, recipientId, contactId },
    select: { id: true },
  });
  if (!existing) {
    await store.emailEvent.create({
      data: { type: effect.eventType, contactId, recipientId, metadata: { emailId: delivery.event.data.email_id } },
    });
  }
  if (effect.timestamp) {
    await store.campaignRecipient.updateMany({
      where: { id: recipientId },
      data: { [effect.timestamp]: resendEventTime(delivery.event) },
    });
  }
  return !existing;
}
