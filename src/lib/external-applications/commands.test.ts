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

// The dispatcher reaches Prisma and the Evolution client through the "@/" alias,
// which Node's type-strip runner cannot resolve, so its wiring is asserted on the
// source. The rules it delegates to are covered behaviourally in
// whatsapp-transport-policy.test.ts.

test("the transport branch is chosen from the resolved provider kind", () => {
  assert.match(commands, /const provider = await resolveWhatsAppProvider\(application\);/);
  assert.match(commands, /provider\.kind === "meta"\n\s+\? await submitMetaCommand\(application, provider, payload, operation\.id\)\n\s+: await submitBaileysCommand\(application, provider, payload\);/);
  // Meta-only resolution would silently ignore an application running on Baileys.
  assert.doesNotMatch(commands, /resolveMetaProviderAccount/);
});

test("the 24h service window gate stays specific to the Meta rail", () => {
  const gate = commands.indexOf("requiresWhatsAppServiceWindow(provider.kind, command.content.type)");
  const rejected = commands.indexOf('rejectionCode: "whatsapp_service_window_closed"');

  assert.ok(gate >= 0, "the window gate is delegated to the transport policy");
  assert.ok(rejected > gate, "a closed window still rejects before any submission");
  // A raw content check here would re-apply the Meta window to WhatsApp Web.
  assert.doesNotMatch(commands, /if \(command\.content\.type === "text"\) \{\n\s+const windowOpen/);
});

test("a Baileys template that cannot be rendered is rejected with its own code", () => {
  assert.match(commands, /const rendered = renderWhatsAppTextTemplate\(body, command\.content\.parameters\);/);
  assert.match(commands, /rendered\.ok \? \{ ok: true as const, text: rendered\.text \} : \{ ok: false as const, rejectionCode: rendered\.rejectionCode \}/);
  assert.match(commands, /if \(!body\.ok\) return \{ outcome: "rejected", rejectionCode: body\.rejectionCode \};/);
  // The durable rejection has to reach the caller instead of the generic code.
  assert.match(commands, /return \{ status: "rejected" as const, operationId: operation\.id, rejectionCode: submission\.rejectionCode \};/);
});

test("a Baileys submission we cannot prove failed stays reconcilable", () => {
  const send = commands.indexOf("await sendText(provider.instanceName, command.recipient, body.text)");
  const unknown = commands.indexOf('return { outcome: "unknown" };\n  }\n}');

  assert.ok(send >= 0, "text is sent through the Evolution client");
  assert.ok(unknown > send, "a throw from the Evolution client resolves to unknown, never to a rejection");
  assert.match(commands, /const messageId = typeof result\.key\?\.id === "string" && result\.key\.id \? result\.key\.id : null;/);
});

test("an unconfigured Evolution endpoint is refused before an operation exists", () => {
  const guard = commands.indexOf('if (provider.kind === "baileys" && !isEvolutionConfigured()) return { status: "unavailable" as const };');
  const operation = commands.indexOf("const operation = await findOrCreateOperation(");

  assert.ok(guard >= 0, "a Baileys dispatch requires a configured Evolution endpoint");
  // Past this point the command would be stranded in SUBMISSION_UNKNOWN, which
  // an idempotent retry can never resubmit.
  assert.ok(operation > guard, "the guard runs before any operation row is created");
});

test("a durable Baileys rejection is persisted before the caller is answered", () => {
  const rejected = commands.indexOf('if (submission.outcome === "rejected")');
  const finalize = commands.indexOf('await finalizeOperation(operation.id, leaseToken, "REJECTED")');

  assert.ok(rejected >= 0, "the submission outcome drives the rejection branch");
  assert.ok(finalize > rejected, "the operation is finalized before returning the rejection");
});
