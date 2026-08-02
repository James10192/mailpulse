import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const application = readFileSync(resolve(process.cwd(), "src/lib/external-applications/application.ts"), "utf8");

test("Meta provider resolution fails closed if the active-account invariant is violated", () => {
  assert.match(application, /provider: META_PROVIDER/);
  assert.match(application, /active: true/);
  assert.match(application, /take: 2/);
  assert.match(application, /const account = accounts\.length === 1 \? accounts\[0\] : null/);
});
