/** The text carrying a code. Sober on purpose: no link, nothing to click. */

export type VerificationLocale = "fr" | "en";

export function resolveVerificationLocale(value: string | undefined | null): VerificationLocale {
  return value?.trim().toLowerCase().startsWith("en") ? "en" : "fr";
}

export function buildVerificationMessage(locale: VerificationLocale, code: string, ttlMinutes: number) {
  if (locale === "en") {
    return `Your verification code is ${code}. It expires in ${ttlMinutes} minutes. Do not share it with anyone.`;
  }
  return `Votre code de vérification est ${code}. Il expire dans ${ttlMinutes} minutes. Ne le partagez avec personne.`;
}
