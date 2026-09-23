import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { generateVerificationCode, hashVerificationCode, readVerificationSecret, verificationCodeMatches } from "./code.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { buildVerificationMessage, resolveVerificationLocale } from "./message.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { checkErrorCode, effectiveStatus, evaluateSendLimits, publicStatus } from "./policy.ts";

const SECRET = "s".repeat(32);
const NOW = new Date("2026-09-23T10:00:00.000Z");
const secondsAgo = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

test("codes are six digits, leading zeros kept, and vary between draws", () => {
  const codes = new Set(Array.from({ length: 200 }, () => generateVerificationCode()));
  for (const code of codes) assert.match(code, /^\d{6}$/);
  assert.ok(codes.size > 190);
});

test("the stored hash never contains the code and verifies only the right code", () => {
  const hash = hashVerificationCode(SECRET, "042917");
  assert.equal(hash.includes("042917"), false);
  assert.equal(verificationCodeMatches(SECRET, "042917", hash), true);
  assert.equal(verificationCodeMatches(SECRET, "042918", hash), false);
  assert.equal(verificationCodeMatches("t".repeat(32), "042917", hash), false);
});

test("the same code hashes differently twice, and a malformed hash never matches", () => {
  assert.notEqual(hashVerificationCode(SECRET, "123456"), hashVerificationCode(SECRET, "123456"));
  assert.equal(verificationCodeMatches(SECRET, "123456", "garbage"), false);
  assert.equal(verificationCodeMatches(SECRET, "123456", "v2.salt.digest"), false);
});

test("a missing or short secret is refused", () => {
  assert.equal(readVerificationSecret({}), null);
  assert.equal(readVerificationSecret({ VERIFICATION_CODE_SECRET: "short" }), null);
  assert.equal(readVerificationSecret({ VERIFICATION_CODE_SECRET: ` ${SECRET} ` }), SECRET);
});

test("one send per number per minute", () => {
  assert.deepEqual(evaluateSendLimits({ now: NOW, phoneSends: [secondsAgo(20)], keySends: [secondsAgo(20)] }), { allowed: false, retryAfterSeconds: 40 });
  assert.deepEqual(evaluateSendLimits({ now: NOW, phoneSends: [secondsAgo(61)], keySends: [secondsAgo(61)] }), { allowed: true });
});

test("five sends per number per hour, retry when the oldest leaves the window", () => {
  const phoneSends = [3000, 2400, 1800, 1200, 600].map(secondsAgo);
  assert.deepEqual(evaluateSendLimits({ now: NOW, phoneSends, keySends: phoneSends }), { allowed: false, retryAfterSeconds: 600 });
  assert.deepEqual(evaluateSendLimits({ now: NOW, phoneSends: phoneSends.slice(1), keySends: phoneSends }), { allowed: true });
});

test("twenty sends per key per hour, whatever the numbers", () => {
  const keySends = Array.from({ length: 20 }, (_, index) => secondsAgo(3500 - index * 100));
  assert.deepEqual(evaluateSendLimits({ now: NOW, phoneSends: [], keySends }), { allowed: false, retryAfterSeconds: 100 });
  assert.deepEqual(evaluateSendLimits({ now: NOW, phoneSends: [], keySends: keySends.slice(1) }), { allowed: true });
});

test("a pending code past its expiry reads as expired, other states are kept", () => {
  assert.equal(effectiveStatus({ status: "PENDING", expiresAt: NOW }, NOW), "EXPIRED");
  assert.equal(effectiveStatus({ status: "PENDING", expiresAt: secondsAgo(-1) }, NOW), "PENDING");
  assert.equal(effectiveStatus({ status: "APPROVED", expiresAt: secondsAgo(60) }, NOW), "APPROVED");
});

test("refusals map to the public vocabulary", () => {
  assert.equal(publicStatus("MAX_ATTEMPTS"), "max_attempts");
  assert.equal(checkErrorCode("PENDING"), "code_invalide");
  assert.equal(checkErrorCode("MAX_ATTEMPTS"), "trop_de_tentatives");
  assert.equal(checkErrorCode("EXPIRED"), "expire");
  assert.equal(checkErrorCode("CANCELED"), "expire");
});

test("the message carries the code and its lifetime in the requested language", () => {
  assert.equal(
    buildVerificationMessage(resolveVerificationLocale(undefined), "123456", 10),
    "Votre code de vérification est 123456. Il expire dans 10 minutes. Ne le partagez avec personne.",
  );
  assert.match(buildVerificationMessage(resolveVerificationLocale("en-US"), "123456", 10), /^Your verification code is 123456\./);
});
