import assert from "node:assert/strict";
import test from "node:test";
import { isAnnouncementLookupMatch } from "./announcement-message-lookup";

const message = {
  origin: "API", channel: "EMAIL", recipientType: "EMAIL", recipientValue: "a@example.ci",
  idempotencyKey: "klassci-annonce-1-courriel-2", externalTenantId: "esbtp-abidjan",
  metadata: {
    source: "klassci", workflow_event: "announcement_email",
    external_reference: "klassci-annonce-1-courriel-2",
  },
};
test("an exact original key, tenant and KLASSCI purpose qualifies for read-only recovery", () => {
  assert.equal(isAnnouncementLookupMatch(message, "klassci-annonce-1-courriel-2", "esbtp-abidjan"), true);
});
test("never share another institution, sender, purpose or idempotency reference", () => {
  const key = message.idempotencyKey;
  for (const changes of [
    { origin: null }, { origin: "CAMPAIGN" }, { channel: "SMS" },
    { recipientType: "PHONE" }, { externalTenantId: "esbtp-yakro" },
    { idempotencyKey: "another-key" }, { metadata: null },
    { metadata: { ...message.metadata, workflow_event: "other" } },
    { metadata: { ...message.metadata, external_reference: "another-key" } },
  ]) assert.equal(isAnnouncementLookupMatch({ ...message, ...changes }, key, "esbtp-abidjan"), false);
  assert.equal(isAnnouncementLookupMatch(message, key, "esbtp-yakro"), false);
});
