import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { describeFailure, groupFailures } from "./failure-reasons";

test("an unknown code is shown as is, never hidden", () => {
  assert.deepEqual(describeFailure("brand_new_code"), { code: "brand_new_code", family: null, label: "brand_new_code", remediation: null });
  assert.equal(describeFailure(null).label, "Cause non renseignée");
});

test("the codes raised by the sending code all have a French reading", () => {
  const root = new URL("../", import.meta.url);
  const files = ["mailpulse/messages.ts", "mailpulse/message-direct-dispatch.ts", "messaging/whatsapp-sender.ts", "external-applications/commands.ts", "external-applications/command-submission.ts", "external-applications/consent-inbound.ts"];
  const source = files.map((file) => readFileSync(new URL(file, root), "utf8")).join("\n");
  const codes = new Set([...source.matchAll(/(?:errorCode|rejectionCode|_CODE\s*=)\s*:?\s*"([a-z_]+)"/g)].map((match) => match[1]));
  assert.ok(codes.size > 0, "aucun code trouvé : le motif de recherche est à revoir");
  const unread = [...codes].filter((code) => describeFailure(code).family === null);
  assert.deepEqual(unread, []);
  // Guard against a renamed directory silently emptying the scan.
  assert.ok(readdirSync(new URL("external-applications/", root)).includes("commands.ts"));
});

test("codes with one meaning count together, most frequent first", () => {
  const groups = groupFailures([
    { errorCode: "provider_error", count: 2 },
    { errorCode: "provider_rejected", count: 3 },
    { errorCode: "sender_unavailable", count: 4 },
    { errorCode: "consent_denied", count: 0 },
  ]);
  assert.deepEqual(groups.map((group) => [group.label, group.count]), [["Refus du fournisseur", 5], ["Numéro d'envoi indisponible", 4]]);
  assert.ok(groups[1].remediation);
});
