import assert from "node:assert/strict";
import test from "node:test";
import { maskE164, parseStrictE164 } from "./phone-numbers";

const e164 = (input: string) => parseStrictE164(input)?.e164 ?? null;

test("normalizes spaced, dotted and 00-prefixed international numbers to E.164", () => {
  for (const input of ["+2250700000000", "+225 07 00 00 00 00", "00225 07.00.00.00.00", "+225 (07) 00-00-00-00"]) {
    assert.equal(e164(input), "+2250700000000", input);
  }
  assert.equal(e164("+33 6 12 34 56 78"), "+33612345678");
  assert.equal(e164("+1 415 555 0100"), "+14155550100");
});

test("refuses numbers without an international prefix instead of guessing a country", () => {
  assert.equal(e164("0700000000"), null);
  assert.equal(e164("2250700000000"), null);
});

test("refuses letters, empty input and impossible lengths", () => {
  for (const input of ["+225 07 AB 00 00 00", "", "+", "+0225070000000", "+1234567890123456"]) {
    assert.equal(e164(input), null, input);
  }
});

test("enforces the exact national length of fixed numbering plans", () => {
  assert.equal(e164("+22507000000"), null);
  assert.equal(e164("+225070000000000"), null);
  assert.equal(e164("+3361234567"), null);
  assert.equal(e164("+221770000000"), "+221770000000");
});

test("masks every group but the first and the last", () => {
  assert.equal(maskE164("+2250700000000"), "+225 07 ** ** ** 00");
  assert.equal(maskE164("+33612345678"), "+33 6 ** ** ** 78");
  assert.equal(maskE164("+22670123456"), "+226 70 ** ** 56");
  assert.equal(maskE164("not a number"), "***");
});
