import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { processBoundedCallbackBatch } from "./callback-batch.ts";

test("runs callback deliveries with a bounded concurrency", async () => {
  let active = 0;
  let peak = 0;
  const releases: Array<() => void> = [];
  const batch = processBoundedCallbackBatch([1, 2, 3, 4], {
    deadline: Date.now() + 1_000,
    concurrency: 2,
    run: async (delivery) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return delivery;
    },
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(peak, 2);
  releases.splice(0).forEach((release) => release());
  await new Promise((resolve) => setImmediate(resolve));
  releases.splice(0).forEach((release) => release());
  assert.deepEqual((await batch).sort(), [1, 2, 3, 4]);
});

test("does not launch a callback after the hard deadline", async () => {
  let now = 100;
  const started: number[] = [];
  const results = await processBoundedCallbackBatch([1, 2, 3], {
    deadline: 101,
    concurrency: 1,
    now: () => now,
    run: async (delivery) => {
      started.push(delivery);
      now = 101;
      return delivery;
    },
  });

  assert.deepEqual(results, [1]);
  assert.deepEqual(started, [1]);
});
