import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEligibilityResponse } from "./announcement-suppression-check";
test("suppression verification never guesses when provider is down", () => {
  assert.deepEqual(normalizeEligibilityResponse(200), { eligible:false, suppressed:true });
  assert.deepEqual(normalizeEligibilityResponse(404), { eligible:true, suppressed:false });
  for (const status of [0, 401, 403, 429, 500, 502]) assert.equal(normalizeEligibilityResponse(status), null);
});
