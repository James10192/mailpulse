import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { MESSAGE_STATUSES, OUTCOME_ORDER, messageStatusLabel, messageStatusTone, statusesForOutcome } from "./message-outcomes.ts";

test("every MessageStatus of the Prisma schema has a French label and an outcome", () => {
  const schema = readFileSync(new URL("../../../prisma/schema.prisma", import.meta.url), "utf8");
  const block = schema.match(/enum MessageStatus \{([^}]*)\}/)?.[1] ?? "";
  const statuses = block.split("\n").map((line) => line.trim()).filter(Boolean);
  assert.ok(statuses.length > 0);
  assert.deepEqual([...statuses].sort(), Object.keys(MESSAGE_STATUSES).sort());
});

test("outcomes partition the statuses without overlap", () => {
  const all = OUTCOME_ORDER.flatMap((outcome) => statusesForOutcome(outcome));
  assert.equal(new Set(all).size, all.length);
  assert.equal(all.length, Object.keys(MESSAGE_STATUSES).length);
});

test("reads the lowercase API status", () => {
  assert.equal(messageStatusLabel("delivered"), "Délivré");
  assert.equal(messageStatusTone("template_required"), "destructive");
  assert.equal(messageStatusLabel("unknown_future_status"), "unknown_future_status");
});
