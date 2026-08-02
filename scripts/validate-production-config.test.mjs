import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = join(process.cwd(), "scripts", "validate-production-config.mjs");
const validKey = Buffer.alloc(32, 7).toString("base64");
const validCronSecret = "scheduled-dispatch-secret";

test("accepts the generic configuration without client-specific variables", () => {
  const result = runPreflight({ EXTERNAL_APPLICATION_KEK: validKey, CRON_SECRET: validCronSecret });
  assert.equal(result.status, 0);
  assert.match(result.output, /Configuration de production : OK/);
});

test("requires a valid generic external application key", () => {
  assert.match(runPreflight({}).output, /EXTERNAL_APPLICATION_KEK doit être défini/);
  assert.match(runPreflight({ EXTERNAL_APPLICATION_KEK: "invalid" }).output, /clé Base64 de 32 octets/);
});

test("requires CRON_SECRET for scheduled dispatch routes", () => {
  assert.match(runPreflight({ EXTERNAL_APPLICATION_KEK: validKey }).output, /CRON_SECRET doit être défini/);
  assert.match(runPreflight({ EXTERNAL_APPLICATION_KEK: validKey, CRON_SECRET: "   " }).output, /CRON_SECRET doit être défini/);
});

function runPreflight(environment) {
  const directory = mkdtempSync(join(tmpdir(), "mailpulse-config-"));
  const env = { ...process.env };
  delete env.EXTERNAL_APPLICATION_KEK;
  delete env.CRON_SECRET;
  delete env.LEGACY_EXTERNAL_APPLICATION_KEY;
  try {
    execFileSync(process.execPath, [script], {
      cwd: directory,
      encoding: "utf8",
      env: { ...env, ...environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, output: "Configuration de production : OK" };
  } catch (error) {
    return { status: error.status ?? 1, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
