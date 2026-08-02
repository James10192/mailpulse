import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const webhook = readFileSync(resolve(process.cwd(), "src/lib/external-applications/meta-webhook.ts"), "utf8");

test("inbound idempotency and conversation-window updates share a serializable transaction", () => {
  assert.match(webhook, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
  assert.match(webhook, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(webhook, /extendExternalWhatsAppConversationWindow\(tx,/);
  assert.match(webhook, /\{ isolationLevel: "Serializable" \}/);
  assert.match(webhook, /error\.code === "P2002"/);
  assert.match(webhook, /error\.code === "P2034"/);
});

test("the WhatsApp window uses the validated Meta message timestamp, not processing time", () => {
  assert.match(webhook, /parseMetaMessageTimestamp\(timestamp, now\)/);
  assert.match(webhook, /\}, message\.occurredAt, recordedAt\)/);
});

test("callback processing has a bounded concurrent batch and a sub-55-second deadline", () => {
  assert.match(webhook, /CALLBACK_CRON_CONCURRENCY = 4/);
  assert.match(webhook, /CALLBACK_CRON_DEADLINE_MS = 52_000/);
  assert.match(webhook, /processBoundedCallbackBatch\(deliveries/);
  assert.match(webhook, /timeoutMs: Math\.min\(CALLBACK_TIMEOUT_MS, remainingMs\)/);
});
