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
  const submission = commands.indexOf("submitMetaCommand(application, provider, payload)");

  assert.ok(windowCheck >= 0, "text commands check the external conversation window");
  assert.ok(rejected > windowCheck, "a closed window transitions the operation to rejected");
  assert.ok(submission > rejected, "Meta submission happens only after the window gate");
  assert.match(commands, /catch \{\n    \/\/ A failed lookup must never permit a free-form WhatsApp command\.\n    return false;/);
});
