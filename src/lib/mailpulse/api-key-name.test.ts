import assert from "node:assert/strict";
import test from "node:test";
import { API_KEY_NAME_MAX_LENGTH, normalizeApiKeyName } from "./api-key-name";

test("trims and collapses whitespace in a key name", () => {
  assert.deepEqual(normalizeApiKeyName("  Application   mobile \n"), { ok: true, name: "Application mobile" });
});

test("refuses an empty or missing name", () => {
  assert.equal(normalizeApiKeyName("   ").ok, false);
  assert.equal(normalizeApiKeyName(null).ok, false);
  assert.equal(normalizeApiKeyName(42).ok, false);
});

test("refuses a name longer than the limit, accepts one at the limit", () => {
  assert.equal(normalizeApiKeyName("a".repeat(API_KEY_NAME_MAX_LENGTH)).ok, true);
  assert.equal(normalizeApiKeyName("a".repeat(API_KEY_NAME_MAX_LENGTH + 1)).ok, false);
});
