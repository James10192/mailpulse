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

for (const [file, actions] of Object.entries(GUARDED)) {
  const source = readFileSync(resolve(process.cwd(), file), "utf8");
  for (const action of actions) {
    test(`${action} refuses non-managers before any write`, () => {
      const start = source.indexOf(`export async function ${action}(`);
      assert.ok(start >= 0, `${action} not found in ${file}`);
      const next = source.indexOf("\nexport async function ", start + 1);
      const body = source.slice(start, next === -1 ? undefined : next);
      const guard = body.indexOf("managerOnlyRefusal(context)");
      const write = body.search(/prisma\.\w+\.(create|update|updateMany|delete|deleteMany|upsert)\(|createFreshBaileysInstance|baileys\.\w+\(/);
      assert.ok(guard > 0, `${action} has no manager guard`);
      assert.ok(write === -1 || guard < write, `${action} writes before checking the role`);
    });
  }
}
