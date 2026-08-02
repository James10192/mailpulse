import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { resendMessageTransition } from "./resend-message-status.ts";

const occurredAt = new Date("2026-08-02T10:45:00.000Z");

test("reconciles Resend delivery, engagement, bounce and complaint events", () => {
  const current = { status: "SENT", deliveredAt: null, readAt: null };

  assert.deepEqual(resendMessageTransition("email.delivered", occurredAt, current), {
    status: "DELIVERED",
    deliveredAt: occurredAt,
    errorCode: null,
    errorMessage: null,
  });
  assert.equal(resendMessageTransition("email.opened", occurredAt, current)?.status, "READ");
  assert.equal(resendMessageTransition("email.clicked", occurredAt, current)?.status, "READ");
  assert.equal(resendMessageTransition("email.bounced", occurredAt, current)?.errorCode, "email_bounced");
  assert.equal(resendMessageTransition("email.complained", occurredAt, current)?.errorCode, "email_complained");
});

test("keeps terminal and stronger delivery states idempotent", () => {
  assert.equal(resendMessageTransition("email.delivered", occurredAt, {
    status: "READ",
    deliveredAt: occurredAt,
    readAt: occurredAt,
  }), null);
  assert.equal(resendMessageTransition("email.bounced", occurredAt, {
    status: "FAILED",
    deliveredAt: null,
    readAt: null,
  }), null);
  assert.equal(resendMessageTransition("email.bounced", occurredAt, {
    status: "DELIVERED",
    deliveredAt: occurredAt,
    readAt: null,
  }), null);
  assert.equal(resendMessageTransition("email.complained", occurredAt, {
    status: "READ",
    deliveredAt: occurredAt,
    readAt: occurredAt,
  }), null);
  assert.equal(resendMessageTransition("email.sent", occurredAt, {
    status: "SENT",
    deliveredAt: null,
    readAt: null,
  }), null);
});
