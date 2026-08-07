import assert from "node:assert/strict";
import test from "node:test";

import {
  MESSAGE_STATUS_EVENT,
  isProviderConfirmedOperationStatus,
  isProviderRejectedOperationStatus,
  metaCommunicationMessageTransition,
  metaOperationStatusTransition,
  metaStatusEventId,
  parseMetaStatusUpdates,
  // @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
} from "./message-status.ts";

const SENDER_ID = "106540352242922";
const NOW = new Date("2026-08-07T12:00:00.000Z");
const TIMESTAMP = String(Math.floor(NOW.getTime() / 1000) - 60);

function statusPayload(statuses: unknown[], senderId = SENDER_ID) {
  return {
    object: "whatsapp_business_account",
    entry: [{ id: "1", changes: [{ field: "messages", value: { metadata: { phone_number_id: senderId }, statuses } }] }],
  };
}

function status(overrides: Record<string, unknown> = {}) {
  return { id: "wamid.ABC", status: "delivered", timestamp: TIMESTAMP, recipient_id: "2250700000000", ...overrides };
}

test("parses a delivered status and normalizes the recipient", () => {
  const [update] = parseMetaStatusUpdates(statusPayload([status()]), SENDER_ID);
  assert.equal(update.providerMessageId, "wamid.ABC");
  assert.equal(update.status, "delivered");
  assert.equal(update.recipient, "+2250700000000");
  assert.equal(update.timestamp, TIMESTAMP);
  assert.equal(update.operationHint, null);
});

test("keeps the echoed operation hint and the first provider error", () => {
  const [update] = parseMetaStatusUpdates(
    statusPayload([status({ status: "failed", biz_opaque_callback_data: "op_123", errors: [{ code: 131047, title: "Re-engagement message" }] })]),
    SENDER_ID,
  );
  assert.equal(update.status, "failed");
  assert.equal(update.operationHint, "op_123");
  assert.equal(update.errorCode, "131047");
  assert.equal(update.errorMessage, "Re-engagement message");
});

test("treats played as read and ignores unknown or malformed statuses", () => {
  const updates = parseMetaStatusUpdates(
    statusPayload([
      status({ status: "played" }),
      status({ status: "deleted" }),
      status({ recipient_id: "not-a-number" }),
      status({ timestamp: 1750030073 }),
      status({ id: "" }),
    ]),
    SENDER_ID,
  );
  assert.equal(updates.length, 1);
  assert.equal(updates[0].status, "read");
});

test("ignores statuses addressed to another sender or another payload shape", () => {
  assert.deepEqual(parseMetaStatusUpdates(statusPayload([status()], "999"), SENDER_ID), []);
  assert.deepEqual(parseMetaStatusUpdates({ object: "page", entry: [] }, SENDER_ID), []);
  assert.deepEqual(parseMetaStatusUpdates(null, SENDER_ID), []);
});

test("advances the operation status forward only", () => {
  const delivered = metaOperationStatusTransition("ACCEPTED", { status: "delivered", occurredAt: NOW });
  assert.equal(delivered?.status, "DELIVERED");
  assert.equal(delivered?.completedAt?.getTime(), NOW.getTime());

  assert.equal(metaOperationStatusTransition("DELIVERED", { status: "sent", occurredAt: NOW }), null);
  assert.equal(metaOperationStatusTransition("READ", { status: "delivered", occurredAt: NOW }), null);
  assert.equal(metaOperationStatusTransition("DELIVERED", { status: "delivered", occurredAt: NOW }), null);
  assert.equal(metaOperationStatusTransition("READ", { status: "read", occurredAt: NOW }), null);
});

test("promotes a lost submission out of SUBMISSION_UNKNOWN", () => {
  const transition = metaOperationStatusTransition("SUBMISSION_UNKNOWN", { status: "sent", occurredAt: NOW });
  assert.equal(transition?.status, "ACCEPTED");
  assert.equal(transition?.acceptedAt?.getTime(), NOW.getTime());
});

test("never regresses a delivered message to failed and never revives a terminal one", () => {
  assert.equal(metaOperationStatusTransition("DELIVERED", { status: "failed", occurredAt: NOW }), null);
  assert.equal(metaOperationStatusTransition("READ", { status: "failed", occurredAt: NOW }), null);
  assert.equal(metaOperationStatusTransition("REJECTED", { status: "delivered", occurredAt: NOW }), null);
  assert.equal(metaOperationStatusTransition("RECONCILED", { status: "read", occurredAt: NOW }), null);

  const failed = metaOperationStatusTransition("ACCEPTED", { status: "failed", occurredAt: NOW });
  assert.equal(failed?.status, "FAILED");
  assert.equal(failed?.failedAt?.getTime(), NOW.getTime());
});

test("mirrors the transition onto the platform message vocabulary", () => {
  const base = { errorCode: null, errorMessage: null };
  const read = metaCommunicationMessageTransition("SENT", { status: "read", occurredAt: NOW, ...base });
  assert.equal(read?.status, "READ");
  assert.equal(read?.deliveredAt?.getTime(), NOW.getTime());
  assert.equal(read?.readAt?.getTime(), NOW.getTime());

  assert.equal(metaCommunicationMessageTransition("READ", { status: "delivered", occurredAt: NOW, ...base }), null);
  assert.equal(metaCommunicationMessageTransition("CANCELLED", { status: "delivered", occurredAt: NOW, ...base }), null);
  assert.equal(metaCommunicationMessageTransition("DELIVERED", { status: "failed", occurredAt: NOW, ...base }), null);

  const failed = metaCommunicationMessageTransition("SENT", { status: "failed", occurredAt: NOW, errorCode: "131047", errorMessage: "Re-engagement" });
  assert.equal(failed?.status, "FAILED");
  assert.equal(failed?.errorCode, "131047");
});

test("keeps a recorded delivery timestamp when a read status follows it", () => {
  const later = new Date(NOW.getTime() + 60_000);
  const base = { errorCode: null, errorMessage: null };

  const afterDelivered = metaCommunicationMessageTransition("DELIVERED", { status: "read", occurredAt: later, ...base });
  assert.equal(afterDelivered?.status, "READ");
  assert.equal(afterDelivered?.readAt?.getTime(), later.getTime());
  assert.equal(afterDelivered?.deliveredAt, undefined);

  // A read that arrives without any prior delivery still needs a delivery time.
  const withoutDelivered = metaCommunicationMessageTransition("SENT", { status: "read", occurredAt: later, ...base });
  assert.equal(withoutDelivered?.deliveredAt?.getTime(), later.getTime());
});

test("treats every provider confirmation as an accepted submission", () => {
  for (const status of ["ACCEPTED", "DELIVERED", "READ"]) {
    assert.equal(isProviderConfirmedOperationStatus(status), true, status);
    assert.equal(isProviderRejectedOperationStatus(status), false, status);
  }
  for (const status of ["PENDING", "PROCESSING", "SUBMISSION_UNKNOWN", "COMPLETED"]) {
    assert.equal(isProviderConfirmedOperationStatus(status), false, status);
    assert.equal(isProviderRejectedOperationStatus(status), false, status);
  }
  assert.equal(isProviderRejectedOperationStatus("REJECTED"), true);
  assert.equal(isProviderRejectedOperationStatus("FAILED"), true);
});

test("derives a stable idempotency key per message and status", () => {
  assert.equal(metaStatusEventId({ providerMessageId: "wamid.ABC", status: "read" }), "wamid.ABC:read");
  assert.notEqual(
    metaStatusEventId({ providerMessageId: "wamid.ABC", status: "read" }),
    metaStatusEventId({ providerMessageId: "wamid.ABC", status: "delivered" }),
  );
  assert.equal(MESSAGE_STATUS_EVENT, "whatsapp.message_status");
});
