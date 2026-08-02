import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const receipts = readFileSync(resolve(process.cwd(), "src/lib/sms/delivery-receipts.ts"), "utf8");
const queue = readFileSync(resolve(process.cwd(), "src/lib/sms/queue.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20260801140000_add_sms_delivery_receipt_inbox/migration.sql"), "utf8");

test("receipt reconciliation is retried as a serializable transaction", () => {
  assert.match(receipts, /prisma\.\$transaction\(operation, \{ isolationLevel: "Serializable" \}\)/);
  assert.match(receipts, /error\.code === "P2034"/);
});

test("a callback that commits before message finalization is reconciled durably", () => {
  assert.match(queue, /SMS_FINALIZATION_TRANSACTION_MAX_RETRIES = 3/);
  assert.match(queue, /reconcilePersistedOrangeSmsProviderMessage\(tx, persisted\)/);
  assert.match(queue, /reconcileUnmatchedOrangeSmsDeliveryReceipts/);
  assert.match(queue, /await reconcileUnmatchedOrangeSmsReceipts\(\)/);
});

test("receipt correlations enforce the organization-scoped message foreign key", () => {
  assert.match(schema, /@@unique\(\[organizationId, id\]\)/);
  assert.match(schema, /fields: \[organizationId, messageId\], references: \[organizationId, id\], onDelete: NoAction/);
  assert.match(migration, /FOREIGN KEY \("organizationId", "messageId"\) REFERENCES "communication_message"\("organizationId", "id"\)/);
  assert.match(migration, /ON DELETE SET NULL \("messageId"\)/);
});

test("receipt deletion clears only the message reference and preserves tenant ownership", () => {
  assert.match(migration, /ON DELETE SET NULL \("messageId"\)/);
  assert.match(schema, /onDelete: NoAction/);
});
