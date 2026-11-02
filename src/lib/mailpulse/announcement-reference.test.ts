import assert from "node:assert/strict";
import test from "node:test";
import { parseAnnouncementReference, referenceBelongsToTenant } from "./announcement-reference";

test("school-qualified references never overlap, with legacy history still readable", () => {
  const abidjan = "klassci-v2-esbtp-abidjan-annonce-12-courriel-581";
  const yakro = "klassci-v2-esbtp-yakro-annonce-12-courriel-581";
  assert.notEqual(abidjan, yakro);
  assert.deepEqual(parseAnnouncementReference(abidjan), { version: 2, tenant: "esbtp-abidjan", announcementId: "12", deliveryId: "581", attemptNumber: null });
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

test("attempt v3 binds the school, delivery and strict positive retry sequence", () => {
  const key = "klassci-v3-esbtp-abidjan-annonce-12-courriel-581-essai-2";
  assert.deepEqual(parseAnnouncementReference(key), {
    version: 3, tenant: "esbtp-abidjan", announcementId: "12", deliveryId: "581", attemptNumber: "2",
  });
  assert.equal(referenceBelongsToTenant(key, "esbtp-abidjan"), true);
  assert.equal(referenceBelongsToTenant(key, "esbtp-yakro"), false);
  for (const invalid of [
    "klassci-v3-default-annonce-12-courriel-581-essai-2",
    "klassci-v3-esbtp-abidjan-annonce-12-courriel-581-essai-1",
    "klassci-v3-esbtp-abidjan-annonce-12-courriel-581-essai-0",
    "klassci-v3-esbtp-abidjan-annonce-12-courriel-581-essai-02",
    "klassci-v3-esbtp-abidjan-annonce-12-courriel-581-essai-999999999999999999",
    "klassci-v3-esbtp-abidjan-annonce-12-courriel-581-essai-2-extra",
    "klassci-v3-esbtp-abidjan-annonce-012-courriel-581-essai-2",
  ]) assert.equal(parseAnnouncementReference(invalid), null, invalid);
});
