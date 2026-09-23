import assert from "node:assert/strict";
import test from "node:test";

import type { MessageStatus } from "@/generated/prisma";

import { classifyResendEvent, isOutcomeOpen, type ResendClassification } from "./resend-message-status";
import type { ResendEventType } from "./resend-webhook-payload";

const occurredAt = new Date("2026-08-02T10:45:00.000Z");
const earlier = new Date("2026-08-02T10:40:00.000Z");

function messageIn(status: MessageStatus) {
  const reached = status === "DELIVERED" || status === "READ";
  return { status, deliveredAt: reached ? earlier : null, readAt: status === "READ" ? earlier : null };
}

function statusChange(result: ResendClassification) {
  assert.equal(result?.kind, "status");
  return result?.kind === "status" ? result.data : null;
}

function outcome(eventType: ResendEventType, status: MessageStatus, reason: string | null = null) {
  const result = classifyResendEvent(eventType, messageIn(status), occurredAt, reason);
  if (!result) return null;
  return result.kind === "status" ? result.data.status : "delay";
}

test("delivery and engagement move a sent message forward", () => {
  assert.deepEqual(classifyResendEvent("email.delivered", messageIn("SENT"), occurredAt, null), {
    kind: "status",
    data: { status: "DELIVERED", deliveredAt: occurredAt, errorCode: null, errorMessage: null },
  });
  const read = statusChange(classifyResendEvent("email.opened", messageIn("DELIVERED"), occurredAt, null));
  assert.equal(read?.status, "READ");
  assert.equal(read && "readAt" in read ? read.deliveredAt : null, earlier, "keeps the original delivery time");
  assert.equal(read && "readAt" in read ? read.readAt : null, occurredAt);
});

test("each failure event carries its own error code and message", () => {
  const cases = [
    ["email.bounced", "Mailbox does not exist", "email_bounced", "Resend signale que l'email a rebondi. Motif : Mailbox does not exist"],
    ["email.complained", null, "email_complained", "Resend signale une plainte du destinataire."],
    ["email.suppressed", "On suppression list", "email_suppressed", "Resend n'a pas envoyé l'email : l'adresse figure sur sa liste de suppression. Motif : On suppression list"],
    ["email.failed", "reached_daily_quota", "email_failed", "Resend n'a pas pu envoyer l'email. Motif : reached_daily_quota"],
    ["email.failed", null, "email_failed", "Resend n'a pas pu envoyer l'email."],
  ] as const;
  for (const [eventType, reason, errorCode, errorMessage] of cases) {
    const result = classifyResendEvent(eventType, messageIn("SENT"), occurredAt, reason);
    assert.equal(result?.kind, "status", eventType);
    assert.deepEqual(result?.data, { status: "FAILED", failedAt: occurredAt, errorCode, errorMessage }, eventType);
  }
});

test("an oversized provider reason is truncated", () => {
  const result = classifyResendEvent("email.failed", messageIn("SENT"), occurredAt, "x".repeat(2_000));
  const change = statusChange(result);
  assert.equal(change && "failedAt" in change ? change.errorMessage.length : 0, 500);
});

const EVENTS: ResendEventType[] = [
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.suppressed",
  "email.failed",
];
const FAILURES: ResendEventType[] = ["email.bounced", "email.complained", "email.suppressed", "email.failed"];
const OPEN: MessageStatus[] = ["QUEUED", "PROCESSING", "RETRYING", "SUBMISSION_UNKNOWN", "SENT"];
const SETTLED: MessageStatus[] = ["FAILED", "CANCELLED", "RECONCILED", "DUPLICATE_CONFIRMED", "TEMPLATE_REQUIRED"];
const REACHED: MessageStatus[] = ["DELIVERED", "READ"];
const ALL: MessageStatus[] = [...OPEN, ...REACHED, ...SETTLED];

// Expected outcome of every event on every status: a status name, "delay", or
// null when the event is ignored. Late events never move a message backwards.
function expected(status: MessageStatus, eventType: ResendEventType): string | null {
  if (eventType === "email.sent") return null;
  if (OPEN.includes(status)) {
    if (eventType === "email.delivered") return "DELIVERED";
    if (eventType === "email.opened" || eventType === "email.clicked") return "READ";
    if (eventType === "email.delivery_delayed") return "delay";
    if (FAILURES.includes(eventType)) return "FAILED";
  }
  if (status === "DELIVERED" && (eventType === "email.opened" || eventType === "email.clicked")) return "READ";
  return null;
}

test("transition matrix over every message status and Resend event", () => {
  for (const status of ALL) {
    for (const eventType of EVENTS) {
      assert.equal(outcome(eventType, status, "r"), expected(status, eventType), `${eventType} on ${status}`);
    }
  }
  // Spot checks of the cases the matrix exists to protect.
  assert.equal(outcome("email.delivery_delayed", "DELIVERED"), null);
  assert.equal(outcome("email.suppressed", "DELIVERED"), null);
  assert.equal(outcome("email.delivered", "FAILED"), null);
  assert.equal(outcome("email.failed", "RETRYING"), "FAILED");
  assert.equal(outcome("email.delivered", "RECONCILED"), null);
});

test("only unsettled statuses keep an open outcome", () => {
  for (const status of OPEN) assert.equal(isOutcomeOpen(status), true, status);
  for (const status of [...REACHED, ...SETTLED]) assert.equal(isOutcomeOpen(status), false, status);
});
