import assert from "node:assert/strict";
import test from "node:test";
import { isSerializationFailure, isUniqueConstraintViolation, retryOnSerializationFailure } from "./prisma-errors";

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
