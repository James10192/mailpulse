import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

// Server actions run inside Next.js and cannot be imported here: this checks
// that every action deciding an identity refuses non-managers before writing.
const GUARDED: Record<string, string[]> = {
  "src/app/(dashboard)/dashboard/platform/actions.ts": [
    "generateMailPulseApiKey",
    "renameMailPulseApiKey",
    "updateMailPulseApiKeySender",
    "updateMailPulseApiKeyApplication",
    "revokeMailPulseApiKey",
  ],
  "src/app/(dashboard)/dashboard/platform/webhook-actions.ts": ["rotateWebhookSigningSecret", "setWebhookActive", "resendWebhook"],
  "src/app/(dashboard)/dashboard/settings/integrations/actions.ts": [
    "generateFilonIntegrationKey",
    "revokeFilonIntegrationKey",
    "renameFilonIntegrationKey",
  ],
  "src/app/(dashboard)/dashboard/senders/actions.ts": ["createSender", "updateSender", "setDefaultSender", "deleteSender"],
  "src/app/(dashboard)/dashboard/messaging/actions.ts": [
    "activateBaileys",
    "getQrCode",
    "resetBaileysConnection",
    "saveMetaConfig",
    "switchWhatsAppMode",
    "disconnectWhatsApp",
  ],
};

test("the webhook actions' helper refuses non-managers", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/(dashboard)/dashboard/platform/webhook-actions.ts"), "utf8");
  const helper = source.slice(source.indexOf("async function managedOrganization("), source.indexOf("/** The new secret"));
  assert.ok(helper.includes("managerOnlyRefusal(context)"));
  assert.ok(helper.indexOf("if (refusal) return refusal;") < helper.indexOf("return { organizationId"));
});

for (const [file, actions] of Object.entries(GUARDED)) {
  const source = readFileSync(resolve(process.cwd(), file), "utf8");
  for (const action of actions) {
    test(`${action} refuses non-managers before any write`, () => {
      const start = source.indexOf(`export async function ${action}(`);
      assert.ok(start >= 0, `${action} not found in ${file}`);
      const next = source.indexOf("\nexport async function ", start + 1);
      const body = source.slice(start, next === -1 ? undefined : next);
      // Either the guard itself, or this file's helper that applies it first.
      const guard = Math.max(body.indexOf("managerOnlyRefusal(context)"), body.indexOf("managedOrganization()"));
      // Direct writes, transaction writes, and the helpers that write for an action.
      const write = body.search(/(prisma|tx)\.\w+\.(create|update|updateMany|delete|deleteMany|upsert)\(|prisma\.\$transaction\(|createFreshBaileysInstance|baileys\.\w+\(|renameIntegrationApiKey\(|rotateWebhookSecret\(|resendWebhookDelivery\(/);
      assert.ok(guard > 0, `${action} has no manager guard`);
      assert.ok(write > 0, `${action}: no write found, the check would prove nothing`);
      assert.ok(write === -1 || guard < write, `${action} writes before checking the role`);
    });
  }
}
