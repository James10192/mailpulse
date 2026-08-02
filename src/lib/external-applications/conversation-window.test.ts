import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const policy = readFileSync(resolve(process.cwd(), "src/lib/external-applications/conversation-window-policy.ts"), "utf8");
const window = readFileSync(resolve(process.cwd(), "src/lib/external-applications/conversation-window.ts"), "utf8");

test("an inbound external WhatsApp message opens exactly a 24-hour window", () => {
  assert.match(policy, /EXTERNAL_WHATSAPP_WINDOW_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(policy, /new Date\(receivedAt\.getTime\(\) \+ EXTERNAL_WHATSAPP_WINDOW_MS\)/);
  assert.match(policy, /expiresAt\.getTime\(\) > now\.getTime\(\)/);
});

test("an expired provider-time window is never recreated from a delayed webhook", () => {
  assert.match(window, /const expiresAt = externalWhatsAppWindowExpiresAt\(inboundAt\)/);
  assert.match(window, /if \(!isExternalWhatsAppWindowOpen\(expiresAt, now\)\) return/);
});
