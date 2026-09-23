import assert from "node:assert/strict";
import test from "node:test";
import {
  parseResendWebhookPayload,
  resendEventReason,
  resendEventTag,
  resendEventTime,
  // @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
} from "./resend-webhook-payload.ts";

const receivedAt = new Date("2026-09-23T12:00:00.000Z");

function payload(type: string, extra: Record<string, unknown> = {}) {
  return {
    type,
    created_at: "2026-09-23T11:59:00.000Z",
    data: { email_id: "email_1", from: "a@b.test", to: ["c@d.test"], subject: "s", ...extra },
  };
}

function parsedEvent(type: string, extra: Record<string, unknown> = {}) {
  const parsed = parseResendWebhookPayload(payload(type, extra));
  assert.equal(parsed.kind, "event", type);
  return parsed.event;
}

test("reads the reason Resend documents for each failure event", () => {
  assert.equal(resendEventReason(parsedEvent("email.suppressed", {
    suppressed: { message: " On the account suppression list ", type: "OnAccountSuppressionList" },
  })), "On the account suppression list");
  assert.equal(resendEventReason(parsedEvent("email.failed", { failed: { reason: "reached_daily_quota" } })), "reached_daily_quota");
  assert.equal(resendEventReason(parsedEvent("email.bounced", { bounce: { message: "Mailbox does not exist" } })), "Mailbox does not exist");
  assert.equal(resendEventReason(parsedEvent("email.failed", { failed: { reason: "  " } })), null);
  assert.equal(resendEventReason(parsedEvent("email.delivery_delayed")), null);
  assert.equal(resendEventReason(parsedEvent("email.delivered")), null);
});

test("acknowledges event types the platform does not handle", () => {
  assert.deepEqual(parseResendWebhookPayload(payload("contact.created")), { kind: "unsupported", type: "contact.created" });
  assert.deepEqual(parseResendWebhookPayload(payload("constructor")), { kind: "unsupported", type: "constructor" });
});

test("rejects a malformed payload for a handled event type", () => {
  assert.equal(parseResendWebhookPayload({ type: "email.failed", created_at: "x", data: {} }).kind, "invalid");
  assert.equal(parseResendWebhookPayload(payload("email.failed", { failed: { reason: 42 } })).kind, "invalid");
  assert.equal(parseResendWebhookPayload(null).kind, "invalid");
  assert.equal(parseResendWebhookPayload({ data: {} }).kind, "invalid");
});

test("reads tags in both shapes Resend sends", () => {
  const record = parsedEvent("email.delivered", { tags: { message_id: "msg_1" } });
  const list = parsedEvent("email.delivered", { tags: [{ name: "message_id", value: "msg_2" }] });
  assert.equal(resendEventTag(record, "message_id"), "msg_1");
  assert.equal(resendEventTag(list, "message_id"), "msg_2");
  assert.equal(resendEventTag(record, "campaign_id"), null);
  assert.equal(resendEventTag(record, "toString"), null);
});

test("dates the event from its payload, falling back to reception time", () => {
  assert.equal(resendEventTime(parsedEvent("email.delivered"), receivedAt).toISOString(), "2026-09-23T11:59:00.000Z");
  const undated = parseResendWebhookPayload({ ...payload("email.delivered"), created_at: "not a date" });
  assert.equal(undated.kind, "event");
  assert.equal(resendEventTime(undated.event, receivedAt), receivedAt);
});
