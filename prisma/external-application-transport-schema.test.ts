import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(root, "prisma/migrations/20260801120000_add_external_application_transport_core/migration.sql"),
  "utf8",
);
const smsPage = readFileSync(resolve(root, "src/app/(dashboard)/dashboard/sms/page.tsx"), "utf8");

test("template configurations support one default and one override per provider account", () => {
  assert.doesNotMatch(schema, /@@unique\(\[applicationId, operationKey, locale, providerAccountId\]\)/);
  assert.match(schema, /partial unique indexes in the transport-core migration/);
  assert.match(migration, /Prisma must not declare a nullable @@unique here/);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "application_template_config_default_key" ON "application_template_config"\("applicationId", "operationKey", "locale"\) WHERE "providerAccountId" IS NULL;/,
  );
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "application_template_config_provider_account_key" ON "application_template_config"\("applicationId", "operationKey", "locale", "providerAccountId"\) WHERE "providerAccountId" IS NOT NULL;/,
  );
});

test("an external application has at most one active account for each provider channel", () => {
  assert.doesNotMatch(schema, /@@unique\(\[applicationId, channel, provider\]\)/);
  assert.match(migration, /provider_account_active_application_channel_provider_key/);
  assert.match(
    migration,
    /ON "provider_account"\("applicationId", "channel", "provider"\) WHERE "active" = true AND "applicationId" IS NOT NULL;/,
  );
});

test("external conversation windows are tenant-scoped and never persist recipient plaintext", () => {
  assert.match(schema, /model ExternalConversationWindow/);
  assert.match(schema, /recipientHash String/);
  assert.doesNotMatch(schema, /model ExternalConversationWindow[\s\S]*recipient(?:Phone|Value|Ciphertext) String/);
  assert.match(migration, /CREATE TABLE "external_conversation_window"/);
  assert.match(migration, /external_conversation_window_scope_recipient_key/);
});

test("SMS reconciliation history includes external transport closures", () => {
  assert.match(smsPage, /"EXTERNAL_TRANSPORT_RECONCILIATION_CLOSED"/);
});

test("the generic transport migration contains no client-specific backfill", () => {
  assert.doesNotMatch(migration, /klassci/i);
});
