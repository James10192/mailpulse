import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { maskPhoneNumber, normalizeVerificationPhone } from "./phone.ts";

function e164(input: string) {
  const result = normalizeVerificationPhone(input);
  return result.ok ? result.e164 : null;
}

test("normalizes spaced, dotted and 00-prefixed international numbers to E.164", () => {
  for (const input of ["+2250700000000", "+225 07 00 00 00 00", "00225 07.00.00.00.00", "+225 (07) 00-00-00-00"]) {
    assert.equal(e164(input), "+2250700000000", input);
  }
  assert.equal(e164("+33 6 12 34 56 78"), "+33612345678");
  assert.equal(e164("+1 415 555 0100"), "+14155550100");
});

test("refuses numbers without an international prefix instead of guessing a country", () => {
  assert.equal(normalizeVerificationPhone("0700000000").ok, false);
  assert.equal(normalizeVerificationPhone("2250700000000").ok, false);
});

test("refuses letters, empty input, non-strings and impossible lengths", () => {
  for (const input of ["+225 07 AB 00 00 00", "", "+", "+0225070000000", "+1234567890123456", 2250700000000, null]) {
    assert.equal(normalizeVerificationPhone(input).ok, false, String(input));
  }
});

test("enforces the exact national length of fixed numbering plans", () => {
  assert.equal(normalizeVerificationPhone("+22507000000").ok, false);
  assert.equal(normalizeVerificationPhone("+225070000000000").ok, false);
  assert.equal(normalizeVerificationPhone("+3361234567").ok, false);
  assert.equal(normalizeVerificationPhone("+221770000000").ok, true);
});

test("masks every group but the first and the last", () => {
  assert.equal(maskPhoneNumber("+2250700000000"), "+225 07 ** ** ** 00");
  assert.equal(maskPhoneNumber("+33612345678"), "+33 6 ** ** ** 78");
  assert.equal(maskPhoneNumber("+22670123456"), "+226 70 ** ** 56");
});

test("never echoes an invalid value while masking", () => {
  assert.equal(maskPhoneNumber("not a number"), "***");
});
