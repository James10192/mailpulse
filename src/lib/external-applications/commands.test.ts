import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const commands = readFileSync(resolve(process.cwd(), "src/lib/external-applications/commands.ts"), "utf8");

test("template dispatch resolves a provider override before the default configuration", () => {
  const providerLookup = commands.indexOf("providerAccountId,\n    },\n    select: { providerTemplateId: true },\n  });");
  const defaultLookup = commands.indexOf("providerAccountId: null,");

  assert.ok(providerLookup >= 0, "provider-specific template lookup is present");
  assert.ok(defaultLookup > providerLookup, "default template lookup follows the provider-specific lookup");
  assert.doesNotMatch(commands, /orderBy: \{ providerAccountId:/);
});

test("free-form commands are fail-closed before Meta submission when no window is active", () => {
  const windowCheck = commands.indexOf("hasOpenConversationWindow(application, provider.id, command.recipient)");
  const rejected = commands.indexOf('rejectionCode: "whatsapp_service_window_closed"');
  const submission = commands.indexOf("submitMetaCommand(application, provider, payload, operation.id)");

  assert.ok(windowCheck >= 0, "text commands check the external conversation window");
  assert.ok(rejected > windowCheck, "a closed window transitions the operation to rejected");
  assert.ok(submission > rejected, "Meta submission happens only after the window gate");
  assert.match(commands, /catch \{\n    \/\/ A failed lookup must never permit a free-form WhatsApp command\.\n    return false;/);
});

test("a provider-confirmed operation short-circuits before the window gate", () => {
  const confirmed = commands.indexOf("isProviderConfirmedOperationStatus(operation.status)");
  const windowCheck = commands.indexOf("hasOpenConversationWindow(application, provider.id, command.recipient)");

  // Otherwise an idempotent retry of a delivered message would be answered with
  // whatsapp_service_window_closed once its 24h window elapsed.
  assert.ok(confirmed >= 0, "the early return uses the provider-confirmed set");
  assert.ok(windowCheck > confirmed, "the window gate runs after the confirmation short-circuit");
  assert.doesNotMatch(commands, /operation\.status === "ACCEPTED"/);
});

test("a status webhook confirmation is honoured when the dispatcher write loses the race", () => {
  assert.match(commands, /if \(accepted\.count === 1\) return \{ status: "accepted"/);
  assert.match(commands, /current && isProviderConfirmedOperationStatus\(current\.status\)/);
});

test("every Meta submission carries the operation id as opaque callback data", () => {
  // Without this echo, a status webhook cannot reconcile a submission whose
  // provider response was lost.
  assert.equal(commands.match(/biz_opaque_callback_data: operationId/g)?.length, 2);
});
