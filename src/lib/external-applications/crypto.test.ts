import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { decryptExternalApplicationValue, encryptExternalApplicationValue, hashExternalApplicationPayload } from "./crypto.ts";

process.env.EXTERNAL_APPLICATION_KEK = Buffer.alloc(32, 7).toString("base64");

test("encrypts external application secrets with an authenticated versioned envelope", () => {
  const encrypted = encryptExternalApplicationValue("secret value");
  assert.match(encrypted, /^v1\./);
  assert.equal(decryptExternalApplicationValue(encrypted), "secret value");
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
  assert.throws(() => decryptExternalApplicationValue(tampered));
});

test("hashes payloads with the root encryption key without exposing the payload", () => {
  assert.equal(hashExternalApplicationPayload("same"), hashExternalApplicationPayload("same"));
  assert.notEqual(hashExternalApplicationPayload("same"), hashExternalApplicationPayload("other"));
});
