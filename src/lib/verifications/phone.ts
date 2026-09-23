/**
 * Phone numbers accepted by the verification API. Dependency-free on purpose:
 * the rules are exercised directly by the Node test runner.
 *
 * A verification proves ownership of a number, so the input must already be
 * international: guessing a default country would verify the wrong person.
 */

export type NormalizedPhone = { ok: true; e164: string; countryCode: string; national: string } | { ok: false };

// ITU calling codes form a prefix-free set: 1 and 7 are the only one-digit
// codes, these are the two-digit ones, every other code has three digits.
const TWO_DIGIT_CODES = new Set([
  "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84",
  "86", "90", "91", "92", "93", "94", "95", "98",
]);

// Exact national lengths where the numbering plan is fixed and well known.
// Anywhere else the generic E.164 bounds apply.
const NATIONAL_LENGTHS: Record<string, number> = {
  "225": 10,
  "221": 9,
  "223": 8,
  "226": 8,
  "228": 8,
  "229": 10,
  "33": 9,
};

const MIN_NATIONAL_DIGITS = 6;
const MAX_E164_DIGITS = 15;

function splitCountryCode(digits: string) {
  if (digits.startsWith("1") || digits.startsWith("7")) return digits.slice(0, 1);
  if (TWO_DIGIT_CODES.has(digits.slice(0, 2))) return digits.slice(0, 2);
  return digits.slice(0, 3);
}

export function normalizeVerificationPhone(raw: unknown): NormalizedPhone {
  if (typeof raw !== "string") return { ok: false };
  const trimmed = raw.trim();
  // Only the usual separators; a letter or any other symbol is a typo, not formatting.
  if (!/^(\+|00)[\d\s().-]+$/.test(trimmed)) return { ok: false };

  const allDigits = trimmed.replace(/\D/g, "");
  const digits = trimmed.startsWith("00") ? allDigits.slice(2) : allDigits;
  if (!/^[1-9]\d+$/.test(digits) || digits.length > MAX_E164_DIGITS) return { ok: false };

  const countryCode = splitCountryCode(digits);
  const national = digits.slice(countryCode.length);
  const expected = NATIONAL_LENGTHS[countryCode];
  if (expected !== undefined ? national.length !== expected : national.length < MIN_NATIONAL_DIGITS) {
    return { ok: false };
  }

  return { ok: true, e164: `+${digits}`, countryCode, national };
}

/**
 * "+2250700000000" reads "+225 07 ** ** ** 00": enough for a person to
 * recognise their number, not enough to reveal it in a log or a response.
 */
export function maskPhoneNumber(e164: string) {
  const normalized = normalizeVerificationPhone(e164);
  if (!normalized.ok) return "***";

  const groups: string[] = [];
  let rest = normalized.national;
  while (rest.length > 0) {
    const size = rest.length % 2 === 1 ? 1 : 2;
    groups.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  const masked = groups.map((group, index) =>
    index === 0 || index === groups.length - 1 ? group : "*".repeat(group.length),
  );
  return `+${normalized.countryCode} ${masked.join(" ")}`;
}
