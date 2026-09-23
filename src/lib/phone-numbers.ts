const COUNTRY_CODES = [
  { value: "+225", label: "Cote d'Ivoire", example: "07 00 00 00 00" },
  { value: "+221", label: "Senegal", example: "77 000 00 00" },
  { value: "+223", label: "Mali", example: "70 00 00 00" },
  { value: "+226", label: "Burkina Faso", example: "70 00 00 00" },
  { value: "+228", label: "Togo", example: "90 00 00 00" },
  { value: "+229", label: "Benin", example: "01 00 00 00 00" },
  { value: "+33", label: "France", example: "6 00 00 00 00" },
] as const;

const CI_MOBILE_PREFIXES_10_DIGITS = ["01", "05", "07"];

export type CountryCode = (typeof COUNTRY_CODES)[number]["value"];

export const PHONE_COUNTRY_CODES = COUNTRY_CODES;
export const DEFAULT_PHONE_COUNTRY: CountryCode = "+225";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function splitInternationalPhone(value: string | null | undefined) {
  const raw = value?.trim() ?? "";
  const digits = digitsOnly(raw);

  if (!digits) return { countryCode: DEFAULT_PHONE_COUNTRY, nationalNumber: "" };

  for (const country of PHONE_COUNTRY_CODES) {
    const code = country.value.slice(1);
    if (digits.startsWith(code)) {
      return {
        countryCode: country.value,
        nationalNumber: digits.slice(code.length),
      };
    }
  }

  return { countryCode: DEFAULT_PHONE_COUNTRY, nationalNumber: digits };
}

export function formatPhoneE164(countryCode: string, nationalNumber: string) {
  const code = digitsOnly(countryCode);
  const national = digitsOnly(nationalNumber);
  if (!national) return "";
  return `+${code}${national}`;
}

export function normalizeContactPhone(value: string | null | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) return "";

  if (raw.startsWith("+")) {
    const digits = digitsOnly(raw);
    return digits ? `+${digits}` : "";
  }

  if (raw.startsWith("00")) {
    const digits = digitsOnly(raw).replace(/^00/, "");
    return digits ? `+${digits}` : "";
  }

  return formatPhoneE164(DEFAULT_PHONE_COUNTRY, raw);
}

export function getWhatsAppPhoneCandidates(value: string) {
  const normalized = normalizeContactPhone(value);
  if (!normalized) return [];

  const candidates = [normalized];
  const digits = digitsOnly(normalized);

  if (digits.startsWith("225")) {
    const national = digits.slice(3);
    const shouldTryLegacyCiNumber =
      national.length === 10 &&
      CI_MOBILE_PREFIXES_10_DIGITS.some((prefix) => national.startsWith(prefix));

    if (shouldTryLegacyCiNumber) {
      candidates.push(`+225${national.slice(2)}`);
    }
  }

  return Array.from(new Set(candidates));
}

// ─── Strict international numbers ───────────────────────
// For flows that must reach exactly the number typed (one-time codes): no
// default country is guessed and no legacy variant is ever substituted.

// ITU calling codes form a prefix-free set: 1 and 7 are the only one-digit
// codes, these are the two-digit ones, every other code has three digits.
const TWO_DIGIT_CALLING_CODES = new Set([
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

export type StrictE164 = { e164: string; countryCode: string; national: string };

function callingCode(digits: string) {
  if (digits.startsWith("1") || digits.startsWith("7")) return digits.slice(0, 1);
  if (TWO_DIGIT_CALLING_CODES.has(digits.slice(0, 2))) return digits.slice(0, 2);
  return digits.slice(0, 3);
}

/** "+225 07 00 00 00 00" or "00225…" to "+2250700000000"; null for anything doubtful. */
export function parseStrictE164(raw: string): StrictE164 | null {
  const trimmed = raw.trim();
  // Only the usual separators; a letter or any other symbol is a typo, not formatting.
  if (!/^(\+|00)[\d\s().-]+$/.test(trimmed)) return null;

  const all = digitsOnly(trimmed);
  const digits = trimmed.startsWith("00") ? all.slice(2) : all;
  if (!/^[1-9]\d+$/.test(digits) || digits.length > MAX_E164_DIGITS) return null;

  const countryCode = callingCode(digits);
  const national = digits.slice(countryCode.length);
  const expected = NATIONAL_LENGTHS[countryCode];
  if (expected !== undefined ? national.length !== expected : national.length < MIN_NATIONAL_DIGITS) return null;

  return { e164: `+${digits}`, countryCode, national };
}

/** "+2250700000000" reads "+225 07 ** ** ** 00": recognisable by its owner, useless in a log. */
export function maskE164(e164: string) {
  const parsed = parseStrictE164(e164);
  if (!parsed) return "***";

  const groups: string[] = [];
  let rest = parsed.national;
  while (rest.length > 0) {
    const size = rest.length % 2 === 1 ? 1 : 2;
    groups.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  const masked = groups.map((group, index) => (index === 0 || index === groups.length - 1 ? group : "*".repeat(group.length)));
  return `+${parsed.countryCode} ${masked.join(" ")}`;
}
