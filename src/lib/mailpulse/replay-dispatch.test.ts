import assert from "node:assert/strict";
import test from "node:test";

import { replayResumesDispatch } from "./replay-dispatch";

test("a replay resumes only a WhatsApp or email message nobody has submitted yet", () => {
  assert.equal(replayResumesDispatch({ channel: "WHATSAPP", status: "QUEUED" }), true);
  assert.equal(replayResumesDispatch({ channel: "EMAIL", status: "PROCESSING" }), true);
});

test("a replay of a submitted or settled message only reports its current state", () => {
  for (const status of ["SUBMISSION_UNKNOWN", "SENT", "DELIVERED", "READ", "FAILED", "CANCELLED", "RECONCILED", "TEMPLATE_REQUIRED", "RETRYING"] as const) {
    assert.equal(replayResumesDispatch({ channel: "WHATSAPP", status }), false, status);
  }
});

test("a queued SMS is left to its own queue on replay", () => {
  assert.equal(replayResumesDispatch({ channel: "SMS", status: "QUEUED" }), false);
});
