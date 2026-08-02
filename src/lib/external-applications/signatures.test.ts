import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { createVersionedSignature, hasValidVersionedSignature, isFreshExternalApplicationTimestamp, parseVersionedSignature } from "./signatures.ts";

test("accepts only a versioned signature for the matching key id", () => {
  const signature = createVersionedSignature("rotation-2", "a secret", "1700000000", "payload");
  assert.deepEqual(parseVersionedSignature(signature), { keyId: "rotation-2", digest: signature.split("=")[1] });
  assert.equal(hasValidVersionedSignature(signature, "rotation-2", "a secret", "1700000000", "payload"), true);
  assert.equal(hasValidVersionedSignature(signature, "rotation-1", "a secret", "1700000000", "payload"), false);
  assert.equal(hasValidVersionedSignature(`${signature}0`, "rotation-2", "a secret", "1700000000", "payload"), false);
});

test("bounds external application request timestamps", () => {
  const now = 1_700_000_000_000;
  assert.equal(isFreshExternalApplicationTimestamp("1700000000", now), true);
  assert.equal(isFreshExternalApplicationTimestamp("1699999699", now), false);
  assert.equal(isFreshExternalApplicationTimestamp("1700000031", now), false);
});
