import assert from "node:assert/strict";
import test from "node:test";
import { checkVerificationSchema, refusedCheckBody, startVerificationSchema, verificationSecretOrResponse } from "./api";
import { generateVerificationCode, hashVerificationCode, verificationCodeMatches } from "./code";
import { buildVerificationMessage, classifySendError, effectiveStatus, evaluateSendLimits } from "./policy";

const SECRET = "s".repeat(32);
const NOW = new Date("2026-09-23T10:00:00.000Z");
const secondsAgo = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);
const send = (seconds: number, phoneNumber = "+2250700000000", apiKeyId = "key_a") => ({ createdAt: secondsAgo(seconds), phoneNumber, apiKeyId });
const limits = (organizationSends: ReturnType<typeof send>[], whatsAppMessageTimes: Date[] = []) =>
  evaluateSendLimits({ now: NOW, phoneNumber: "+2250700000000", apiKeyId: "key_a", organizationSends, whatsAppMessageTimes });

test("codes are six digits, leading zeros kept, and vary between draws", () => {
  const codes = new Set(Array.from({ length: 200 }, () => generateVerificationCode()));
  for (const code of codes) assert.match(code, /^\d{6}$/);
  assert.ok(codes.size > 190);
});

test("the stored hash never contains the code and verifies only the right code under the right secret", () => {
  const hash = hashVerificationCode(SECRET, "042917");
  assert.equal(hash.includes("042917"), false);
  assert.equal(verificationCodeMatches(SECRET, "042917", hash), true);
  assert.equal(verificationCodeMatches(SECRET, "042918", hash), false);
  assert.equal(verificationCodeMatches("t".repeat(32), "042917", hash), false);
  assert.notEqual(hashVerificationCode(SECRET, "123456"), hashVerificationCode(SECRET, "123456"));
  assert.equal(verificationCodeMatches(SECRET, "123456", "v2.salt.digest"), false);
});

test("a missing or short secret answers 503, a valid one is returned", async () => {
  const missing = verificationSecretOrResponse({});
  assert.ok(missing instanceof Response);
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { error: "verification_indisponible" });
  assert.ok(verificationSecretOrResponse({ VERIFICATION_CODE_SECRET: "short" }) instanceof Response);
  assert.equal(verificationSecretOrResponse({ VERIFICATION_CODE_SECRET: ` ${SECRET} ` }), SECRET);
});

test("the start schema normalizes the number and rejects a doubtful one on the `to` field", () => {
  const ok = startVerificationSchema.safeParse({ channel: "whatsapp", to: "00225 07 00 00 00 00" });
  assert.equal(ok.success && ok.data.to, "+2250700000000");

  const bad = startVerificationSchema.safeParse({ channel: "whatsapp", to: "0700000000" });
  assert.equal(bad.success, false);
  assert.deepEqual(bad.error?.issues.map((issue) => issue.path), [["to"]]);
  assert.equal(startVerificationSchema.safeParse({ channel: "sms", to: "+2250700000000" }).success, false);
});

test("the locale is fr or en, nothing else", () => {
  assert.equal(startVerificationSchema.safeParse({ channel: "whatsapp", to: "+2250700000000", locale: "en" }).success, true);
  assert.equal(startVerificationSchema.safeParse({ channel: "whatsapp", to: "+2250700000000", locale: "en-US" }).success, false);
});

test("the check schema only accepts six digits", () => {
  assert.equal(checkVerificationSchema.safeParse({ code: "012345" }).success, true);
  for (const code of ["12345", "1234567", "12a456", 123456]) assert.equal(checkVerificationSchema.safeParse({ code }).success, false);
});

test("one send per number per minute, five per hour", () => {
  assert.deepEqual(limits([send(20)]), { allowed: false, retryAfterSeconds: 40 });
  assert.deepEqual(limits([send(61)]), { allowed: true });
  assert.deepEqual(limits([3000, 2400, 1800, 1200, 600].map((s) => send(s))), { allowed: false, retryAfterSeconds: 600 });
});

test("twenty sends per key per hour, one hundred per organization", () => {
  const byKey = Array.from({ length: 20 }, (_, i) => send(3500 - i * 100, `+22507000001${String(i).padStart(2, "0")}`));
  assert.deepEqual(limits(byKey), { allowed: false, retryAfterSeconds: 100 });
  const byOrg = Array.from({ length: 100 }, (_, i) => send(3590 - i * 30, `+2250700001${String(i).padStart(3, "0")}`, `key_${i}`));
  assert.deepEqual(limits(byOrg), { allowed: false, retryAfterSeconds: 10 });
});

test("codes and API WhatsApp messages share thirty sends a minute", () => {
  const messages = Array.from({ length: 29 }, () => secondsAgo(30));
  assert.deepEqual(limits([], messages), { allowed: true });
  assert.deepEqual(limits([send(40, "+2250700000999", "key_b")], messages), { allowed: false, retryAfterSeconds: 20 });
});

test("the effective status reflects expiry and spent attempts", () => {
  assert.equal(effectiveStatus({ status: "PENDING", expiresAt: NOW, attempts: 0 }, NOW), "EXPIRED");
  assert.equal(effectiveStatus({ status: "PENDING", expiresAt: secondsAgo(-60), attempts: 5 }, NOW), "MAX_ATTEMPTS");
  assert.equal(effectiveStatus({ status: "PENDING", expiresAt: secondsAgo(-60), attempts: 4 }, NOW), "PENDING");
  assert.equal(effectiveStatus({ status: "APPROVED", expiresAt: secondsAgo(60), attempts: 1 }, NOW), "APPROVED");
});

test("refusals speak the public vocabulary", () => {
  assert.deepEqual(refusedCheckBody("v1", "PENDING"), { id: "v1", status: "pending", error: "code_invalide" });
  assert.deepEqual(refusedCheckBody("v1", "MAX_ATTEMPTS"), { id: "v1", status: "max_attempts", error: "trop_de_tentatives" });
  assert.deepEqual(refusedCheckBody("v1", "CANCELED"), { id: "v1", status: "canceled", error: "expire" });
});

test("the message follows the requested language", () => {
  assert.match(buildVerificationMessage("fr", "123456"), /^Votre code de vérification est 123456\./);
  assert.equal(
    buildVerificationMessage("en", "123456"),
    "Your verification code is 123456. It expires in 10 minutes. Do not share it with anyone.",
  );
});

test("send failures are classified from their structured reason, not their text", () => {
  const failure = (reason: unknown) => Object.assign(new Error("any provider text"), { reason });
  const ambiguous = (errorCode: string) => ({ errorCode, definite: false });
  const definite = (errorCode: string) => ({ errorCode, definite: true });
  assert.deepEqual(classifySendError(failure("recipient_unreachable")), definite("RECIPIENT_UNREACHABLE"));
  assert.deepEqual(classifySendError(failure("rejected")), definite("REJECTED"));
  assert.deepEqual(classifySendError(failure("timeout")), ambiguous("TIMEOUT"));
  assert.deepEqual(classifySendError(failure("transport")), ambiguous("TRANSPORT"));
  assert.deepEqual(classifySendError(failure("something else")), ambiguous("TRANSPORT"));
  // The text alone decides nothing, however explicit it looks.
  assert.deepEqual(classifySendError(new Error("Le numéro n'est pas enregistré sur WhatsApp.")), ambiguous("TRANSPORT"));
  assert.deepEqual(classifySendError("boom"), ambiguous("TRANSPORT"));
});
