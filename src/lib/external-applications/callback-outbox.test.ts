import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(resolve(root, "prisma/migrations/20260801130000_add_external_callback_delivery_outbox/migration.sql"), "utf8");
const callback = readFileSync(resolve(root, "src/lib/external-applications/callback.ts"), "utf8");
const webhook = readFileSync(resolve(root, "src/lib/external-applications/meta-webhook.ts"), "utf8");

test("callback deliveries persist an immutable endpoint and credential snapshot", () => {
  assert.match(schema, /model ExternalCallbackDelivery/);
  assert.match(schema, /sourceEndpointId String/);
  assert.match(schema, /destinationUrl   String/);
  assert.match(schema, /secretCiphertext String/);
  assert.match(schema, /@@unique\(\[operationId, sourceEndpointId\]\)/);
  assert.doesNotMatch(schema, /model ExternalCallbackDelivery[\s\S]*endpoint\s+ApplicationForwardEndpoint/);
  assert.match(migration, /FOREIGN KEY \("operationId"\)/);
  assert.match(callback, /snapshotExternalApplicationCallbackDeliveries/);
  assert.match(callback, /payloadCiphertext: encryptExternalApplicationValue\(input\.payload\)/);
});

test("each callback delivery uses a conditional lease and endpoint-local retry state", () => {
  assert.match(webhook, /prisma\.externalCallbackDelivery\.updateMany\(/);
  assert.match(webhook, /status: "PROCESSING", leaseExpiresAt: \{ lt: now \}/);
  assert.match(webhook, /where: \{ id: delivery\.id, status: "PROCESSING", leaseToken \}/);
  assert.match(webhook, /status: "DELIVERED"/);
  assert.match(webhook, /status: "FAILED"/);
  assert.match(webhook, /callbackRetryDelayMs\(attempts\)/);
});

test("ambiguous transport outcomes retry, while terminal client errors do not", () => {
  assert.match(callback, /new ExternalCallbackError\(\{ ambiguous: true, retryable: true \}\)/);
  assert.match(callback, /status === 408 \|\| status === 425 \|\| status === 429 \|\| status >= 500/);
  assert.match(webhook, /input\.error instanceof ExternalCallbackError && input\.error\.retryable/);
  assert.match(webhook, /Callback delivery outcome is ambiguous\./);
});

test("an inbound operation becomes complete only after every callback delivery is terminal", () => {
  assert.match(webhook, /status: \{ in: \["PENDING", "PROCESSING"\] \}/);
  assert.match(webhook, /if \(outstanding !== 0\) return false/);
  assert.match(webhook, /where: \{ id: operationId, direction: "INBOUND", status: "PENDING" \}/);
});
