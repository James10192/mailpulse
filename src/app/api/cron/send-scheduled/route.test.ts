import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const route = readFileSync(resolve(process.cwd(), "src/app/api/cron/send-scheduled/route.ts"), "utf8");

test("scheduled dispatch rejects requests when CRON_SECRET is absent or does not match", () => {
  assert.match(route, /const secret = process\.env\.CRON_SECRET\?\.trim\(\);/);
  assert.match(route, /if \(!secret \|\| authHeader !== `Bearer \$\{secret\}`\)/);
});
