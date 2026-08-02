import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { isSmsReconciliationTerminalStatus, smsMetrics } from "./metrics.ts";

test("counts GSM-7 basic and extension-table characters in septets", () => {
  assert.deepEqual(smsMetrics("Café à Abidjan"), { encoding: "GSM-7", units: 14, segmentCount: 1 });
  assert.deepEqual(smsMetrics("{}[]\\^~|€"), { encoding: "GSM-7", units: 18, segmentCount: 1 });
  assert.deepEqual(smsMetrics("^".repeat(81)), { encoding: "GSM-7", units: 162, segmentCount: 2 });
});

test("uses UCS-2 units and concatenated limits for emoji and non-GSM accents", () => {
  assert.deepEqual(smsMetrics("ê".repeat(70)), { encoding: "UCS-2", units: 70, segmentCount: 1 });
  assert.deepEqual(smsMetrics("ê".repeat(71)), { encoding: "UCS-2", units: 71, segmentCount: 2 });
  assert.deepEqual(smsMetrics("😀".repeat(35)), { encoding: "UCS-2", units: 70, segmentCount: 1 });
  assert.deepEqual(smsMetrics("😀".repeat(36)), { encoding: "UCS-2", units: 72, segmentCount: 2 });
});

test("recognizes all terminal reconciliation outcomes for SMS helpers", () => {
  assert.equal(isSmsReconciliationTerminalStatus("RECONCILED"), true);
  assert.equal(isSmsReconciliationTerminalStatus("DUPLICATE_CONFIRMED"), true);
  assert.equal(isSmsReconciliationTerminalStatus("SUBMISSION_UNKNOWN"), false);
});
