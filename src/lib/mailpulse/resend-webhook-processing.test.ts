import assert from "node:assert/strict";
import test from "node:test";

import type { MessageStatus } from "@/generated/prisma";

import { parseResendWebhookPayload } from "./resend-webhook-payload";
import { processResendDelivery, type ResendDelivery, type ResendWebhookStore } from "./resend-webhook-processing";

const createdAt = "2026-09-23T11:59:00.000Z";

type StoreOptions = {
  /** Status of the stored message, or null when no message matches. */
  status: MessageStatus | null;
  /** Whether a campaign recipient matches the recipient_id tag. */
  recipient?: boolean;
};

function fakeStore({ status, recipient = false }: StoreOptions) {
  const calls: { method: string; args: unknown }[] = [];
  const record = (method: string, args: unknown) => calls.push({ method, args });
  const messageLookups: unknown[] = [];
  const store: ResendWebhookStore = {
    communicationMessage: {
      async findFirst(args) {
        messageLookups.push(args.where);
        if (!status) return null;
        return {
          id: "msg_1",
          status,
          contactId: "contact_1",
          organizationId: "org_1",
          providerMessageId: "email_1",
          deliveredAt: status === "DELIVERED" ? new Date(createdAt) : null,
          readAt: null,
        };
      },
      async updateMany(args) {
        record("communicationMessage.updateMany", args);
        return { count: 1 };
      },
    },
    campaignRecipient: {
      async findFirst(args) {
        record("campaignRecipient.findFirst", args);
        return recipient ? { contactId: "contact_2" } : null;
      },
      async updateMany(args) {
        record("campaignRecipient.updateMany", args);
        return { count: 1 };
      },
    },
    contact: {
      async findUnique(args) {
        record("contact.findUnique", args);
        return { id: args.where.id, organizationId: "org_1" };
      },
      async update(args) {
        record("contact.update", args);
        return args;
      },
    },
    emailEvent: {
      async findFirst(args) {
        record("emailEvent.findFirst", args);
        return null;
      },
      async create(args) {
        record("emailEvent.create", args);
        return args;
      },
    },
    communicationMessageEvent: {
      async createMany(args) {
        record("communicationMessageEvent.createMany", args);
        return { count: args.data.length };
      },
    },
  };
  const argsOf = (method: string) => calls.filter((call) => call.method === method).map((call) => call.args);
  return { store, argsOf, messageLookups };
}

function delivery(type: string, extra: Record<string, unknown> = {}, tags?: Record<string, string>): ResendDelivery {
  const parsed = parseResendWebhookPayload({
    type,
    created_at: createdAt,
    data: { email_id: "email_1", ...(tags ? { tags } : {}), ...extra },
  });
  if (parsed.kind !== "event") throw new Error(`fixture ${type} did not parse`);
  return { event: parsed.event, deliveryId: "svix_delivery_1" };
}

test("a delay is stored under the webhook delivery id and leaves the status alone", async () => {
  const { store, argsOf } = fakeStore({ status: "SENT" });
  const result = await processResendDelivery(store, delivery("email.delivery_delayed"));

  assert.deepEqual(argsOf("communicationMessageEvent.createMany"), [{
    data: [{
      type: "DELIVERY_DELAYED",
      organizationId: "org_1",
      messageId: "msg_1",
      provider: "RESEND",
      providerEventId: "svix_delivery_1",
      occurredAt: new Date(createdAt),
    }],
    skipDuplicates: true,
  }]);
  assert.deepEqual(argsOf("communicationMessage.updateMany"), [{
    where: { id: "msg_1", status: "SENT" },
    data: { provider: "RESEND", providerMessageId: "email_1" },
  }]);
  assert.deepEqual(argsOf("contact.update"), []);
  assert.equal(result.changed, false, "a delay triggers no external side effect");
});

test("a suppression fails the message, unsubscribes the contact and logs a campaign event", async () => {
  const { store, argsOf } = fakeStore({ status: "SENT", recipient: true });
  const result = await processResendDelivery(
    store,
    delivery("email.suppressed", { suppressed: { message: "On suppression list" } }, { recipient_id: "rcpt_1" }),
  );

  assert.deepEqual(argsOf("communicationMessage.updateMany"), [{
    where: { id: "msg_1", status: "SENT" },
    data: {
      provider: "RESEND",
      providerMessageId: "email_1",
      status: "FAILED",
      failedAt: new Date(createdAt),
      errorCode: "email_suppressed",
      errorMessage: "Resend n'a pas envoyé l'email : l'adresse figure sur sa liste de suppression. Motif : On suppression list",
    },
  }]);
  assert.deepEqual(argsOf("contact.update"), [{
    where: { id: "contact_1" },
    data: { subscribed: false, bounceType: "suppressed" },
  }]);
  assert.deepEqual(argsOf("emailEvent.create"), [{
    data: { type: "SUPPRESSED", contactId: "contact_1", recipientId: "rcpt_1", metadata: { emailId: "email_1" } },
  }]);
  assert.deepEqual(argsOf("campaignRecipient.updateMany"), [], "a suppression is not counted as a bounce");
  assert.deepEqual(argsOf("communicationMessageEvent.createMany"), []);
  assert.equal(result.changed, true);
});

test("a sending failure logs a campaign event but leaves the contact subscribed", async () => {
  const { store, argsOf } = fakeStore({ status: "SENT", recipient: true });
  await processResendDelivery(
    store,
    delivery("email.failed", { failed: { reason: "reached_daily_quota" } }, { recipient_id: "rcpt_1" }),
  );

  assert.deepEqual(argsOf("emailEvent.create"), [{
    data: { type: "FAILED", contactId: "contact_1", recipientId: "rcpt_1", metadata: { emailId: "email_1" } },
  }]);
  assert.deepEqual(argsOf("contact.update"), []);
  assert.deepEqual(argsOf("campaignRecipient.updateMany"), []);
});

test("a stale event on a delivered message changes nothing but the provider link", async () => {
  const { store, argsOf } = fakeStore({ status: "DELIVERED" });
  const result = await processResendDelivery(store, delivery("email.failed", { failed: { reason: "reached_daily_quota" } }));

  assert.deepEqual(argsOf("communicationMessage.updateMany"), [{
    where: { id: "msg_1", status: "DELIVERED" },
    data: { provider: "RESEND", providerMessageId: "email_1" },
  }]);
  assert.deepEqual(argsOf("contact.update"), [], "a sending failure does not touch the contact");
  assert.deepEqual(argsOf("communicationMessageEvent.createMany"), []);
  assert.equal(result.changed, false);
});

test("a late complaint unsubscribes the contact without touching a delivered message", async () => {
  const { store, argsOf } = fakeStore({ status: "DELIVERED" });
  await processResendDelivery(store, delivery("email.complained"));

  assert.deepEqual(argsOf("communicationMessage.updateMany"), [{
    where: { id: "msg_1", status: "DELIVERED" },
    data: { provider: "RESEND", providerMessageId: "email_1" },
  }]);
  assert.deepEqual(argsOf("contact.update"), [{ where: { id: "contact_1" }, data: { subscribed: false } }]);
});

test("a message_id tag finds the message even before its provider id is known", async () => {
  const { store, messageLookups } = fakeStore({ status: "SENT" });
  await processResendDelivery(store, delivery("email.delivered", {}, { message_id: "msg_1" }));

  assert.deepEqual(messageLookups, [{
    id: "msg_1",
    channel: "EMAIL",
    provider: { in: ["RESEND", "UNSPECIFIED"] },
    OR: [{ providerMessageId: null }, { providerMessageId: "email_1" }],
  }]);
});

test("without a message_id tag the message is found by its Resend email id", async () => {
  const { store, messageLookups } = fakeStore({ status: "SENT" });
  await processResendDelivery(store, delivery("email.delivered"));

  assert.deepEqual(messageLookups, [{
    channel: "EMAIL",
    provider: "RESEND",
    providerMessageId: "email_1",
  }]);
});

test("an event for an unknown message still reaches the campaign contact", async () => {
  const { store, argsOf } = fakeStore({ status: null, recipient: true });
  const result = await processResendDelivery(
    store,
    delivery("email.bounced", {}, { recipient_id: "rcpt_1", campaign_id: "camp_1" }),
  );

  assert.deepEqual(argsOf("communicationMessage.updateMany"), [], "no message, no status write");
  assert.deepEqual(argsOf("campaignRecipient.findFirst"), [{
    where: { id: "rcpt_1", campaignId: "camp_1" },
    select: { contactId: true },
  }]);
  assert.deepEqual(argsOf("contact.update"), [{
    where: { id: "contact_2" },
    data: { subscribed: false, bounceType: "hard" },
  }]);
  assert.deepEqual(argsOf("campaignRecipient.updateMany"), [{
    where: { id: "rcpt_1" },
    data: { bouncedAt: new Date(createdAt) },
  }]);
  assert.deepEqual(result, { changed: true, organizationId: "org_1", campaignId: "camp_1" });
});

test("an event matching neither a message nor a recipient does nothing", async () => {
  const { store, argsOf } = fakeStore({ status: null });
  const result = await processResendDelivery(store, delivery("email.delivered"));

  assert.deepEqual(argsOf("contact.findUnique"), []);
  assert.deepEqual(argsOf("communicationMessage.updateMany"), []);
  assert.deepEqual(result, { changed: false, organizationId: null, campaignId: null });
});
