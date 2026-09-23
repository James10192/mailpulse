import assert from "node:assert/strict";
import test from "node:test";
import { CONTACT_METADATA_MAX_KEYS, contactMetadataInputSchema, mergeContactMetadata } from "./contact-metadata";

test("keeps the stored channel consent even if the client sends another one", () => {
  const stored = { company: "Ancienne", channel_opt_in: { sms: false } };
  const submitted = { company: "Nouvelle", channel_opt_in: { sms: true } };
  assert.deepEqual(mergeContactMetadata(stored, submitted), { company: "Nouvelle", channel_opt_in: { sms: false } });
});

test("a client that drops the consent key cannot erase it", () => {
  const stored = { channel_opt_in: { whatsapp: false }, city: "Abidjan" };
  assert.deepEqual(mergeContactMetadata(stored, {}), { channel_opt_in: { whatsapp: false } });
});

test("editable fields are replaced as submitted", () => {
  assert.deepEqual(mergeContactMetadata({ city: "Abidjan", old: "x" }, { city: "Bouaké" }), { city: "Bouaké" });
  assert.deepEqual(mergeContactMetadata(null, { city: "Bouaké" }), { city: "Bouaké" });
});

test("validates the submitted metadata", () => {
  assert.equal(contactMetadataInputSchema.safeParse({ city: "Abidjan", score: 3, tags: ["a"] }).success, true);
  assert.equal(contactMetadataInputSchema.safeParse(["not", "an", "object"]).success, false);
  assert.equal(contactMetadataInputSchema.safeParse({ "": "empty key" }).success, false);
  const tooMany = Object.fromEntries(Array.from({ length: CONTACT_METADATA_MAX_KEYS + 1 }, (_, i) => [`k${i}`, i]));
  assert.equal(contactMetadataInputSchema.safeParse(tooMany).success, false);
});
