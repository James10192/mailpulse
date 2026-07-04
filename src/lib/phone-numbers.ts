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
