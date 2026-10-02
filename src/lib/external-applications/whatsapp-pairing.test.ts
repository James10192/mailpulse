import assert from "node:assert/strict";
import test from "node:test";

import { inboundWebhookUrl, isPairingInstanceOf, ownerNumberOf, pairingApplicationOf, pairingInstanceName } from "./whatsapp-pairing";

test("a pairing instance belongs to its application only", () => {
  const name = pairingInstanceName("cmapp123", Date.UTC(2026, 9, 1));
  assert.match(name, /^mpa-cmapp123-[a-z0-9]+$/);
  assert.ok(name.length <= 64, "Evolution caps instance names");
  assert.equal(isPairingInstanceOf(name, "cmapp123"), true);
  assert.equal(isPairingInstanceOf(name, "cmapp12"), false, "a prefix of another id does not match");
  assert.equal(isPairingInstanceOf("mp-cmorg-abc", "cmapp123"), false, "the organization's own instance is never ours");
  assert.equal(isPairingInstanceOf("mpa-cmapp123-../x", "cmapp123"), false);
});

test("a moved number still tells which application it was paired for", () => {
  assert.equal(pairingApplicationOf(pairingInstanceName("cmapp123")), "cmapp123");
  assert.equal(pairingApplicationOf("mp-cmorg-abc"), null);
  assert.equal(pairingApplicationOf("mpa-cmapp123-../x"), null);
  assert.equal(pairingApplicationOf("ecole-yakro"), null, "an instance linked by hand is not ours");
});

test("the connected number is read from any Evolution version", () => {
  assert.equal(ownerNumberOf({ ownerJid: "2250701020304@s.whatsapp.net" }), "2250701020304");
  assert.equal(ownerNumberOf({ owner: "2250701020304:12@s.whatsapp.net" }), "2250701020304");
  assert.equal(ownerNumberOf({ number: "+225 07 01 02 03 04" }), "2250701020304");
  assert.equal(ownerNumberOf({ ownerJid: null, owner: undefined }), null);
});

test("the inbound URL is public HTTPS or nothing", () => {
  assert.equal(
    inboundWebhookUrl("app1", { NEXT_PUBLIC_APP_URL: "https://mailpulse-two.vercel.app/" }),
    "https://mailpulse-two.vercel.app/api/webhooks/whatsapp/baileys/app1",
  );
  assert.equal(
    inboundWebhookUrl("app1", { VERCEL_PROJECT_PRODUCTION_URL: "mailpulse-two.vercel.app" }),
    "https://mailpulse-two.vercel.app/api/webhooks/whatsapp/baileys/app1",
  );
  assert.equal(inboundWebhookUrl("app1", { NEXT_PUBLIC_APP_URL: "http://localhost:3000" }), null);
  assert.equal(inboundWebhookUrl("app1", {}), null);
});
