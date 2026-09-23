import assert from "node:assert/strict";
import test from "node:test";
import {
  resendEventReason,
  resendMessageTransition,
  shouldRecordDeliveryDelay,
  // @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
} from "./resend-message-status.ts";

const occurredAt = new Date("2026-08-02T10:45:00.000Z");
const earlier = new Date("2026-08-02T10:40:00.000Z");

function messageIn(status: string) {
  const reached = status === "DELIVERED" || status === "READ";
  return {
    status,
    deliveredAt: reached ? earlier : null,
    readAt: status === "READ" ? earlier : null,
  };
}

test("reconciles Resend delivery, engagement, bounce and complaint events", () => {
  const current = messageIn("SENT");

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

test("a suppressed email fails with the provider explanation", () => {
  const reason = "Resend has suppressed sending to this address because it is on the account-level suppression list.";
  const transition = resendMessageTransition("email.suppressed", occurredAt, messageIn("SENT"), { reason });

  assert.equal(transition?.status, "FAILED");
  assert.equal(transition?.errorCode, "email_suppressed");
  assert.equal(transition?.failedAt, occurredAt);
  assert.match(transition?.errorMessage ?? "", /liste de suppression/);
  assert.ok(transition?.errorMessage?.includes(reason));
});

test("a failed email carries the Resend reason in its error message", () => {
  const transition = resendMessageTransition("email.failed", occurredAt, messageIn("SENT"), {
    reason: "reached_daily_quota",
  });

  assert.equal(transition?.status, "FAILED");
  assert.equal(transition?.errorCode, "email_failed");
  assert.equal(transition?.errorMessage, "Resend n'a pas pu envoyer l'email (motif : reached_daily_quota).");
});

test("a failure without a reason still gets a readable message", () => {
  const transition = resendMessageTransition("email.failed", occurredAt, messageIn("SENT"));
  assert.equal(transition?.errorMessage, "Resend n'a pas pu envoyer l'email.");
});

test("an oversized provider reason is truncated", () => {
  const transition = resendMessageTransition("email.failed", occurredAt, messageIn("SENT"), {
    reason: "x".repeat(2_000),
  });
  assert.equal(transition?.errorMessage?.length, 500);
});

test("a delivery delay never changes the message status", () => {
  for (const status of ["SENT", "PROCESSING", "DELIVERED", "READ", "FAILED"]) {
    assert.equal(resendMessageTransition("email.delivery_delayed", occurredAt, messageIn(status)), null, status);
  }
});

// Expected outcome of each Resend event applied to each current status:
// a status name means the message moves there, null means the event is ignored.
const TRANSITION_MATRIX: Record<string, Record<string, string | null>> = {
  SENT: {
    "email.delivered": "DELIVERED",
    "email.opened": "READ",
    "email.clicked": "READ",
    "email.bounced": "FAILED",
    "email.complained": "FAILED",
    "email.suppressed": "FAILED",
    "email.failed": "FAILED",
    "email.delivery_delayed": null,
    "email.sent": null,
  },
  PROCESSING: {
    "email.delivered": "DELIVERED",
    "email.opened": "READ",
    "email.clicked": "READ",
    "email.bounced": "FAILED",
    "email.complained": "FAILED",
    "email.suppressed": "FAILED",
    "email.failed": "FAILED",
    "email.delivery_delayed": null,
    "email.sent": null,
  },
  DELIVERED: {
    "email.delivered": null,
    "email.opened": "READ",
    "email.clicked": "READ",
    "email.bounced": null,
    "email.complained": null,
    "email.suppressed": null,
    "email.failed": null,
    "email.delivery_delayed": null,
    "email.sent": null,
  },
  READ: {
    "email.delivered": null,
    "email.opened": null,
    "email.clicked": null,
    "email.bounced": null,
    "email.complained": null,
    "email.suppressed": null,
    "email.failed": null,
    "email.delivery_delayed": null,
    "email.sent": null,
  },
  FAILED: {
    "email.delivered": null,
    "email.opened": null,
    "email.clicked": null,
    "email.bounced": null,
    "email.complained": null,
    "email.suppressed": null,
    "email.failed": null,
    "email.delivery_delayed": null,
    "email.sent": null,
  },
  CANCELLED: {
    "email.delivered": null,
    "email.opened": null,
    "email.clicked": null,
    "email.bounced": null,
    "email.complained": null,
    "email.suppressed": null,
    "email.failed": null,
    "email.delivery_delayed": null,
    "email.sent": null,
  },
};

test("transition matrix: late events never move a message backwards", () => {
  for (const [status, events] of Object.entries(TRANSITION_MATRIX)) {
    for (const [eventType, expected] of Object.entries(events)) {
      const transition = resendMessageTransition(eventType, occurredAt, messageIn(status), { reason: "r" });
      assert.equal(transition?.status ?? null, expected, `${eventType} on ${status}`);
    }
  }
});

test("an engagement event keeps the original delivery time", () => {
  const transition = resendMessageTransition("email.opened", occurredAt, messageIn("DELIVERED"));
  assert.equal(transition?.deliveredAt, earlier);
  assert.equal(transition?.readAt, occurredAt);
});

test("delivery delays are recorded only while the outcome is still open", () => {
  const expected: Record<string, boolean> = {
    QUEUED: true,
    PROCESSING: true,
    SUBMISSION_UNKNOWN: true,
    SENT: true,
    DELIVERED: false,
    READ: false,
    FAILED: false,
    CANCELLED: false,
  };
  for (const [status, record] of Object.entries(expected)) {
    assert.equal(shouldRecordDeliveryDelay("email.delivery_delayed", status), record, status);
  }
  assert.equal(shouldRecordDeliveryDelay("email.delivered", "SENT"), false);
});

test("extracts the provider reason from each event payload shape", () => {
  assert.equal(
    resendEventReason("email.suppressed", { suppressed: { message: " On suppression list ", type: "OnAccountSuppressionList" } }),
    "On suppression list",
  );
  assert.equal(resendEventReason("email.failed", { failed: { reason: "reached_daily_quota" } }), "reached_daily_quota");
  assert.equal(resendEventReason("email.bounced", { bounce: { message: "Mailbox does not exist" } }), "Mailbox does not exist");
  assert.equal(resendEventReason("email.delivery_delayed", { email_id: "e1" }), null);
  assert.equal(resendEventReason("email.failed", { failed: { reason: 42 } }), null);
  assert.equal(resendEventReason("email.failed", null), null);
  assert.equal(resendEventReason("constructor", {}), null);
});
