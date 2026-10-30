import assert from "node:assert/strict";
import test from "node:test";
import { parseAnnouncementReference, referenceBelongsToTenant } from "./announcement-reference";

test("school-qualified references never overlap, with legacy history still readable", () => {
  const abidjan = "klassci-v2-esbtp-abidjan-annonce-12-courriel-581";
  const yakro = "klassci-v2-esbtp-yakro-annonce-12-courriel-581";
  assert.notEqual(abidjan, yakro);
  assert.deepEqual(parseAnnouncementReference(abidjan), { version: 2, tenant: "esbtp-abidjan", announcementId: "12", deliveryId: "581" });
  assert.equal(referenceBelongsToTenant(abidjan, "esbtp-abidjan"), true);
  assert.equal(referenceBelongsToTenant(abidjan, "esbtp-yakro"), false);
  assert.equal(referenceBelongsToTenant(yakro, "esbtp-abidjan"), false);
  assert.equal(referenceBelongsToTenant("klassci-annonce-12-courriel-581", "esbtp-abidjan"), true);
  assert.equal(referenceBelongsToTenant("klassci-annonce-12-courriel-581", "default"), false);
});
test("reject missing, generic and forged references", () => {
  for (const key of [
    "", "klassci-annonce-0-courriel-5", "klassci-v2-default-annonce-1-courriel-2",
    "klassci-v2-ESBTP-annonce-1-courriel-2", "klassci-v2-esbtp-yakro-annonce-01-courriel-2",
    "klassci-v2-esbtp-abidjan-annonce-1-courriel-0", "klassci-v2-esbtp-abidjan-annonce-1-courriel-2-extra",
    "klassci-v2-" + "x".repeat(100) + "-annonce-1-courriel-2",
  ]) assert.equal(parseAnnouncementReference(key), null, key);
});
