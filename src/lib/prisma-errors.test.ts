import assert from "node:assert/strict";
import test from "node:test";
import {
  SERIALIZATION_RETRY_BASE_MS,
  isSerializationFailure,
  isUniqueConstraintViolation,
  retryOnSerializationFailure,
  serializationRetryDelay,
} from "./prisma-errors";

const prismaError = (code: string) => Object.assign(new Error(code), { code });

test("recognizes Prisma error codes without trusting the shape", () => {
  assert.equal(isUniqueConstraintViolation(prismaError("P2002")), true);
  assert.equal(isUniqueConstraintViolation(prismaError("P2025")), false);
  assert.equal(isUniqueConstraintViolation(null), false);
  assert.equal(isUniqueConstraintViolation("P2002"), false);
  assert.equal(isSerializationFailure(prismaError("P2034")), true);
});

test("retries a serialization failure, then succeeds", async () => {
  let calls = 0;
  const result = await retryOnSerializationFailure(async () => {
    calls++;
    if (calls < 3) throw prismaError("P2034");
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("gives up after the allowed retries", async () => {
  let calls = 0;
  await assert.rejects(
    retryOnSerializationFailure(async () => {
      calls++;
      throw prismaError("P2034");
    }, 2),
    { code: "P2034" }
  );
  assert.equal(calls, 3);
});

test("never retries another error", async () => {
  let calls = 0;
  await assert.rejects(
    retryOnSerializationFailure(async () => {
      calls++;
      throw prismaError("P2002");
    }),
    { code: "P2002" }
  );
  assert.equal(calls, 1);
});

test("waits before each replay, never before the first try nor after another error", async () => {
  const waits: number[] = [];
  let calls = 0;
  await retryOnSerializationFailure(async () => {
    calls++;
    if (calls < 3) throw prismaError("P2034");
    return "ok";
  }, 2, async (ms) => { waits.push(ms); });
  assert.equal(waits.length, 2, "une attente par relance");

  waits.length = 0;
  await assert.rejects(retryOnSerializationFailure(async () => { throw prismaError("P2002"); }, 2, async (ms) => { waits.push(ms); }));
  assert.deepEqual(waits, []);
});

test("the wait is random below a bound that doubles at each replay", () => {
  assert.equal(serializationRetryDelay(1, () => 0), 0);
  assert.equal(serializationRetryDelay(1, () => 0.999), SERIALIZATION_RETRY_BASE_MS - 1);
  assert.equal(serializationRetryDelay(3, () => 0.999), SERIALIZATION_RETRY_BASE_MS * 4 - 1);
});
