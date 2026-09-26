import assert from "node:assert/strict";
import test from "node:test";

import { EVOLUTION_REQUEST_MARGIN_MS, sendTimeoutMs, typingDelayMs } from "./baileys-typing";

/** A deterministic source of randomness cycling through the given values. */
function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

test("bulk typing stays between 2 and 10 seconds whatever the length and the draw", () => {
  for (const length of [0, 1, 20, 200, 2_000, 100_000]) {
    for (const draw of [0, 0.25, 0.5, 0.75, 0.999]) {
      const delay = typingDelayMs(length, "bulk", () => draw);
      assert.ok(delay >= 2_000 && delay <= 10_000, `length ${length}, draw ${draw}: ${delay}`);
    }
  }
});

test("interactive typing never exceeds 4 seconds", () => {
  for (const length of [0, 40, 400, 100_000]) {
    const delay = typingDelayMs(length, "interactive", () => 0.999);
    assert.ok(delay >= 1_000 && delay <= 4_000, `length ${length}: ${delay}`);
  }
});

test("between the bounds the delay follows the typing speed and its jitter", () => {
  // 30 characters at 5 chars/s (draw 1 → 3 + 2) with a 1.25 jitter: 7.5 s.
  assert.equal(typingDelayMs(30, "bulk", sequence(1, 1)), 7_500);
  // Same text at 3 chars/s and a 0.75 jitter: 7.5 s too, by symmetry.
  assert.equal(typingDelayMs(30, "bulk", sequence(0, 0)), 7_500);
  // A longer text types longer at the same draws.
  assert.ok(typingDelayMs(20, "bulk", () => 0.5) < typingDelayMs(35, "bulk", () => 0.5));
});

test("a send waits for its typing delay plus a fixed margin, under 20 s at most", () => {
  assert.equal(sendTimeoutMs(4_000), 4_000 + EVOLUTION_REQUEST_MARGIN_MS);
  assert.ok(sendTimeoutMs(typingDelayMs(1_000_000, "bulk")) < 20_000);
  assert.ok(sendTimeoutMs(typingDelayMs(1_000_000, "interactive")) < 15_000);
});
