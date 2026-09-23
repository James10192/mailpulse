import assert from "node:assert/strict";
import test from "node:test";

import type { MessageStatus } from "@/generated/prisma";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { parseResendWebhookPayload } from "./resend-webhook-payload.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { processResendDelivery, type ResendDelivery, type ResendWebhookStore } from "./resend-webhook-processing.ts";

const receivedAt = new Date("2026-09-23T12:00:00.000Z");
const createdAt = "2026-09-23T11:59:00.000Z";

type Call = { method: string; args: unknown };

function fakeStore(status: MessageStatus, options: { recipient?: boolean } = {}) {
  const calls: Call[] = [];
  const record = (method: string, args: unknown) => calls.push({ method, args });
  const store: ResendWebhookStore = {
    communicationMessage: {
      async findFirst(args) {
        record("communicationMessage.findFirst", args);
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
        return options.recipient ? { contactId: "contact_1" } : null;
      },
      async updateMany(args) {
        record("campaignRecipient.updateMany", args);
        return { count: 1 };
      },
    },
    contact: {
      async findUnique(args) {
        record("contact.findUnique", args);
        return { id: "contact_1", organizationId: "org_1" };
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
  return { store, argsOf };
}

function delivery(type: string, extra: Record<string, unknown> = {}, tags?: Record<string, string>): ResendDelivery {
  const parsed = parseResendWebhookPayload({
    type,
    created_at: createdAt,
    data: { email_id: "email_1", ...(tags ? { tags } : {}), ...extra },
  });
  assert.equal(parsed.kind, "event");
  if (parsed.kind !== "event") throw new Error("unreachable");
  return { event: parsed.event, deliveryId: "svix_delivery_1", receivedAt };
}

test("a delay is stored under the webhook delivery id and leaves the status alone", async () => {
  const { store, argsOf } = fakeStore("SENT");
  const result = await processResendDelivery(store, delivery("email.delivery_delayed"));

  assert.deepEqual(argsOf("communicationMessageEvent.createMany"), [{
    data: [{
      type: "DELIVERY_DELAYED",
      organizationId: "org_1",
      messageId: "msg_1",
      provider: "RESEND",
      providerEventId: "svix_delivery_1",
      occurredAt: new Date(createdAt),
      reason: null,
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
  const { store, argsOf } = fakeStore("SENT", { recipient: true });
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

test("a stale event on a delivered message changes nothing but the provider link", async () => {
  const { store, argsOf } = fakeStore("DELIVERED");
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
  const { store, argsOf } = fakeStore("DELIVERED");
  await processResendDelivery(store, delivery("email.complained"));

  assert.deepEqual(argsOf("communicationMessage.updateMany"), [{
    where: { id: "msg_1", status: "DELIVERED" },
    data: { provider: "RESEND", providerMessageId: "email_1" },
  }]);
  assert.deepEqual(argsOf("contact.update"), [{ where: { id: "contact_1" }, data: { subscribed: false } }]);
});
