import assert from "node:assert/strict";
import { test } from "node:test";

import { buildExternalEventPayload, messageEventForStatus } from "./event-payload";

const SUBJECT = { operationId: "op_1", operationKey: "notice.sent", idempotencyKey: "k-1" };
const AT = new Date("2026-09-25T16:00:00Z");

test("a consent event carries the common fields and nothing else", () => {
  assert.deepEqual(buildExternalEventPayload({ event: "consent.granted", subject: SUBJECT, recipient: "+2250700000000", occurredAt: AT }), {
    event: "consent.granted",
    operationKey: "notice.sent",
    idempotencyKey: "k-1",
    operationId: "op_1",
    recipient: "+2250700000000",
    occurredAt: "2026-09-25T16:00:00.000Z",
  });
});

test("a decision with no command waiting names no operation", () => {
  const payload = buildExternalEventPayload({ event: "consent.refused", subject: null, recipient: "+2250700000000", occurredAt: AT });
  assert.equal(payload.operationId, null);
  assert.equal(payload.idempotencyKey, null);
});

test("a message event carries its message id, and a failure its code", () => {
  const delivered = buildExternalEventPayload({ event: "message.delivered", subject: SUBJECT, recipient: "+2250700000000", occurredAt: AT, messageId: "wamid.1" });
  assert.equal(delivered.messageId, "wamid.1");
  assert.equal("failureCode" in delivered, false);

  const failed = buildExternalEventPayload({ event: "message.failed", subject: SUBJECT, recipient: "+2250700000000", occurredAt: AT, failureCode: "consent_request_failed" });
  assert.equal(failed.failureCode, "consent_request_failed");
  assert.equal(failed.messageId, null);
});

test("provider statuses map onto the message events", () => {
  assert.equal(messageEventForStatus("sent"), "message.sent");
  assert.equal(messageEventForStatus("read"), "message.read");
  assert.equal(messageEventForStatus("failed"), "message.failed");
});
