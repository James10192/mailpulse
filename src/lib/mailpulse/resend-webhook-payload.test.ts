import assert from "node:assert/strict";
import test from "node:test";
import {
  parseResendWebhookPayload,
  resendEventReason,
  resendEventTag,
  resendEventTime,
} from "./resend-webhook-payload";


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

test("dates the event from the ISO timestamp Resend sends", () => {
  assert.equal(resendEventTime(parsedEvent("email.delivered")).toISOString(), "2026-09-23T11:59:00.000Z");
  const withOffset = parseResendWebhookPayload({ ...payload("email.delivered"), created_at: "2026-11-22T23:41:12.126+00:00" });
  assert.equal(withOffset.kind, "event");
});

test("rejects a handled event whose timestamp is not an ISO date", () => {
  for (const createdAt of ["not a date", "2026-09-23", "", 1_695_470_400]) {
    const parsed = parseResendWebhookPayload({ ...payload("email.delivered"), created_at: createdAt });
    assert.equal(parsed.kind, "invalid", String(createdAt));
  }
});
