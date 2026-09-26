import assert from "node:assert/strict";
import test from "node:test";

import { campaignMessageKey, cancelQueuedCampaignMessages, type QueuedCampaignMessageWriter } from "./campaign-messages";

type Row = { organizationId: string; origin: string; idempotencyKey: string; status: string; cancelledAt?: Date; errorCode?: string };

/** An in-memory communication_message table applying the filter it is given. */
function messageTable(rows: Row[]): QueuedCampaignMessageWriter {
  return {
    communicationMessage: {
      async updateMany({ where, data }) {
        const matched = rows.filter((row) => row.organizationId === where.organizationId
          && row.origin === where.origin
          && row.idempotencyKey.startsWith(where.idempotencyKey.startsWith)
          && (where.status.in as string[]).includes(row.status));
        for (const row of matched) Object.assign(row, data);
        return { count: matched.length };
      },
    },
  };
}

const NOW = new Date("2026-09-26T10:00:00Z");

test("deleting a campaign cancels its messages still waiting in the queue", async () => {
  const rows: Row[] = [
    { organizationId: "org-a", origin: "CAMPAIGN", idempotencyKey: campaignMessageKey("abc", "r1"), status: "QUEUED" },
    { organizationId: "org-a", origin: "CAMPAIGN", idempotencyKey: campaignMessageKey("abc", "r2"), status: "RETRYING" },
  ];

  const count = await cancelQueuedCampaignMessages(messageTable(rows), "org-a", "abc", NOW);

  assert.equal(count, 2);
  assert.deepEqual(rows.map((row) => row.status), ["CANCELLED", "CANCELLED"]);
  assert.deepEqual(rows.map((row) => row.cancelledAt), [NOW, NOW]);
  assert.equal(rows[0].errorCode, "campaign_deleted");
});

test("messages already claimed, sent or failed are left as they are", async () => {
  const rows: Row[] = ["PROCESSING", "SUBMISSION_UNKNOWN", "SENT", "FAILED"].map((status, index) => ({
    organizationId: "org-a", origin: "CAMPAIGN", idempotencyKey: campaignMessageKey("abc", `r${index}`), status,
  }));

  assert.equal(await cancelQueuedCampaignMessages(messageTable(rows), "org-a", "abc", NOW), 0);
  assert.deepEqual(rows.map((row) => row.status), ["PROCESSING", "SUBMISSION_UNKNOWN", "SENT", "FAILED"]);
});

test("another campaign, another organization or an API message is never touched", async () => {
  const rows: Row[] = [
    // "abcd" starts with "abc": the key separator is what keeps it apart.
    { organizationId: "org-a", origin: "CAMPAIGN", idempotencyKey: campaignMessageKey("abcd", "r1"), status: "QUEUED" },
    { organizationId: "org-b", origin: "CAMPAIGN", idempotencyKey: campaignMessageKey("abc", "r1"), status: "QUEUED" },
    { organizationId: "org-a", origin: "API", idempotencyKey: campaignMessageKey("abc", "r9"), status: "QUEUED" },
  ];

  assert.equal(await cancelQueuedCampaignMessages(messageTable(rows), "org-a", "abc", NOW), 0);
  assert.deepEqual(rows.map((row) => row.status), ["QUEUED", "QUEUED", "QUEUED"]);
});
