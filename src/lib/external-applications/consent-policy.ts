/**
 * Consent decisions for the external application WhatsApp rail, kept
 * dependency-free so the rules that decide whether a recipient may be written
 * to are directly testable without a database.
 */

export type ConsentReply = "grant" | "refuse";

export type ConsentState = "PENDING" | "GRANTED" | "REFUSED" | "EXPIRED";

const GRANT_WORDS = new Set(["OUI", "YES", "OK", "DACCORD", "JACCEPTE"]);
const REFUSE_WORDS = new Set(["NON", "NO", "STOP", "ARRET", "STOPPER", "DESABONNER"]);

export const CONSENT_REFUSED_CODE = "consent_refused";
export const CONSENT_EXPIRED_CODE = "consent_expired";

/**
 * Upper case, accents stripped, then everything that is not a letter or a
 * digit removed: "D'accord !" and "d accord" both read DACCORD.
 */
export function normalizeConsentReply(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Only a whole-message answer counts: "non merci, oui plus tard" is neither. */
export function classifyConsentReply(text: string): ConsentReply | null {
  const normalized = normalizeConsentReply(text);
  if (GRANT_WORDS.has(normalized)) return "grant";
  if (REFUSE_WORDS.has(normalized)) return "refuse";
  return null;
}

/**
 * The state a recipient's consent moves to on a reply. A refusal always wins,
 * and a later yes always reactivates, whatever the previous state was.
 */
export function consentStateAfterReply(reply: ConsentReply): ConsentState {
  return reply === "grant" ? "GRANTED" : "REFUSED";
}

/** A refused recipient receives no command at all, with or without a consent request. */
export function isConsentBlocking(status: ConsentState | null | undefined) {
  return status === "REFUSED";
}
