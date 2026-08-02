import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { directProvider } from "./direct-provider.ts";

test("records the actual provider used for direct dispatch", () => {
  assert.equal(directProvider("EMAIL"), "RESEND");
  assert.equal(directProvider("WHATSAPP", "BAILEYS"), "EVOLUTION_API");
  assert.equal(directProvider("WHATSAPP", "META"), "META_CLOUD");
});
