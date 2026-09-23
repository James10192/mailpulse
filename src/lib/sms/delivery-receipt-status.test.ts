import assert from "node:assert/strict";
import test from "node:test";

import { orangeSmsReceiptTargetStatus, preferredOrangeSmsDeliveryStatus } from "./delivery-receipt-status";

test("maps terminal Orange delivery receipts without treating unknown values as failures", () => {
  assert.equal(orangeSmsReceiptTargetStatus("DeliveredToTerminal"), "DELIVERED");
  assert.equal(orangeSmsReceiptTargetStatus("DeliveryImpossible"), "SUBMISSION_UNKNOWN");
  assert.equal(orangeSmsReceiptTargetStatus("DeliveryPending"), null);
});

test("replayed and out-of-order receipts cannot replace confirmed delivery", () => {
  assert.equal(
    preferredOrangeSmsDeliveryStatus("DeliveredToTerminal", "DeliveryImpossible"),
    "DeliveredToTerminal",
  );
  assert.equal(
    preferredOrangeSmsDeliveryStatus("DeliveryImpossible", "DeliveredToTerminal"),
    "DeliveredToTerminal",
  );
});
