import assert from "node:assert/strict";
import test from "node:test";
import { isDeterministicRejection, retryAfterSeconds } from "./http-status";

test("a 4xx is a deterministic rejection, except request timeout and rate limiting", () => {
  for (const status of [400, 401, 403, 404, 409, 422, 499]) assert.equal(isDeterministicRejection(status), true, String(status));
  for (const status of [200, 399, 408, 429, 500, 503]) assert.equal(isDeterministicRejection(status), false, String(status));
});

test("Retry-After is read in whole seconds only", () => {
  assert.equal(retryAfterSeconds(new Headers({ "retry-after": "30" })), 30);
  assert.equal(retryAfterSeconds(new Headers({ "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" })), null);
  assert.equal(retryAfterSeconds(new Headers({ "retry-after": "0" })), null);
  assert.equal(retryAfterSeconds(new Headers()), null);
});
