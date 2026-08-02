import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { parseMetaMessageTimestamp } from "./meta-timestamp.ts";

test("accepts Meta timestamps in seconds and milliseconds", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");
  assert.equal(parseMetaMessageTimestamp("1785582000", now)?.toISOString(), "2026-08-01T11:00:00.000Z");
  assert.equal(parseMetaMessageTimestamp("1785582000000", now)?.toISOString(), "2026-08-01T11:00:00.000Z");
});

test("rejects malformed and implausibly future Meta timestamps", () => {
  const now = new Date("2026-08-01T12:00:00.000Z");
  assert.equal(parseMetaMessageTimestamp("not-a-timestamp", now), null);
  assert.equal(parseMetaMessageTimestamp("946684799", now), null);
  assert.equal(parseMetaMessageTimestamp("1785585901", now), null);
});
