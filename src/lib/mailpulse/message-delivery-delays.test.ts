import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { deliveryDelayRow, recordDeliveryDelay } from "./message-delivery-delays.ts";

const notice = {
  organizationId: "org_1",
  messageId: "msg_1",
  provider: "RESEND" as const,
  providerEventId: "msg_2mKq9ZsvixDeliveryId",
  occurredAt: new Date("2026-09-23T10:45:00.000Z"),
  reason: null,
};

test("a delay row is keyed by the provider's webhook delivery id", () => {
  assert.deepEqual(deliveryDelayRow(notice), {
    type: "DELIVERY_DELAYED",
    organizationId: "org_1",
    messageId: "msg_1",
    provider: "RESEND" as const,
    providerEventId: "msg_2mKq9ZsvixDeliveryId",
    occurredAt: notice.occurredAt,
    reason: null,
  });
});

test("recording relies on the unique key instead of a prior lookup", async () => {
  const calls: unknown[] = [];
  const stored = new Set<string>();
  const fake = {
    communicationMessageEvent: {
      async createMany(args: { data: { provider: string; providerEventId: string }[]; skipDuplicates: boolean }) {
        calls.push(args);
        let count = 0;
        for (const row of args.data) {
          const key = `${row.provider}:${row.providerEventId}`;
          if (args.skipDuplicates && stored.has(key)) continue;
          stored.add(key);
          count += 1;
        }
        return { count };
      },
    },
  };

  const tx = fake as unknown as Parameters<typeof recordDeliveryDelay>[0];
  assert.equal(await recordDeliveryDelay(tx, notice), true);
  assert.equal(await recordDeliveryDelay(tx, notice), false, "a redelivered webhook is a no-op");
  assert.equal(await recordDeliveryDelay(tx, { ...notice, providerEventId: "msg_other" }), true);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => (call as { skipDuplicates: boolean }).skipDuplicates));
});
