import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const webhook = readFileSync(resolve(process.cwd(), "src/lib/external-applications/meta-webhook.ts"), "utf8");
const applicationRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/webhooks/whatsapp/meta/[applicationKey]/route.ts"),
  "utf8",
);
const compatibilityRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/webhooks/whatsapp/meta/route.ts"),
  "utf8",
);

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

test("Meta route modules only export supported HTTP handlers", () => {
  assert.deepEqual(routeExports(applicationRoute), ["GET", "POST", "runtime"]);
  assert.deepEqual(routeExports(compatibilityRoute), ["GET", "POST", "runtime"]);
  assert.match(applicationRoute, /receiveMetaWebhookRequest, verifyMetaWebhook/);
  assert.match(compatibilityRoute, /receiveMetaWebhookRequest.*external-applications\/meta-webhook/);
});

function routeExports(source: string) {
  const sourceFile = ts.createSourceFile("route.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names: string[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      names.push("re-export");
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      names.push("default");
      continue;
    }
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) names.push("default");
    else if (ts.isFunctionDeclaration(statement)) names.push(statement.name?.text ?? "anonymous-function");
    else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
    } else names.push("unsupported-export");
  }
  return names.sort();
}
