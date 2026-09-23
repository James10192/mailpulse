import type { PhoneVerificationError, PhoneVerificationStatus } from "@/generated/prisma";
import { API_RATE_LIMITS, API_RATE_WINDOW_MS } from "@/lib/mailpulse/api-rate-limits";
import type { WhatsAppFailureReason } from "@/lib/whatsapp/types";

/**
 * The rules of a verification: lifetime, attempts, send limits, the message,
 * the public vocabulary and the classification of send failures.
 */

export const VERIFICATION_TTL_MS = 10 * 60_000;
export const VERIFICATION_MAX_ATTEMPTS = 5;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Sends per hour for a whole organization, whatever the number or the key. */
export const ORGANIZATION_HOURLY_SENDS = 100;

type Window = { readonly windowMs: number; readonly max: number };

export const SEND_LIMITS = {
  perPhone: [{ windowMs: MINUTE_MS, max: 1 }, { windowMs: HOUR_MS, max: 5 }],
  perKey: [{ windowMs: HOUR_MS, max: 20 }],
  perOrganization: [{ windowMs: HOUR_MS, max: ORGANIZATION_HOURLY_SENDS }],
  // Shared with API WhatsApp messages: both leave from the same number.
  whatsApp: [{ windowMs: API_RATE_WINDOW_MS, max: API_RATE_LIMITS.WHATSAPP }],
} as const satisfies Record<string, readonly Window[]>;

/** The widest window any limit looks at: older sends never matter. */
export const SEND_LIMIT_LOOKBACK_MS = HOUR_MS;

export type RecentSend = { createdAt: Date; phoneNumber: string; apiKeyId: string | null };

export type SendLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

function retryAfter(sends: readonly Date[], limit: Window, now: Date) {
  const since = now.getTime() - limit.windowMs;
  const inWindow = sends.map((date) => date.getTime()).filter((time) => time >= since).sort((a, b) => a - b);
  if (inWindow.length < limit.max) return 0;
  // The window frees a slot when the oldest send that still fills it ages out.
  const freeingSend = inWindow[inWindow.length - limit.max];
  return Math.max(1, Math.ceil((freeingSend + limit.windowMs - now.getTime()) / 1000));
}

/**
 * Every recorded send counts, failed or canceled included: a limit that only
 * counted delivered codes would let a caller hammer a number whose sends fail.
 */
export function evaluateSendLimits(input: {
  now: Date;
  phoneNumber: string;
  apiKeyId: string;
  organizationSends: readonly RecentSend[];
  whatsAppMessageTimes: readonly Date[];
}): SendLimitDecision {
  const all = input.organizationSends.map((send) => send.createdAt);
  const byPhone = input.organizationSends.filter((send) => send.phoneNumber === input.phoneNumber).map((send) => send.createdAt);
  const byKey = input.organizationSends.filter((send) => send.apiKeyId === input.apiKeyId).map((send) => send.createdAt);
  const whatsApp = [...all, ...input.whatsAppMessageTimes];

  const delays = [
    ...SEND_LIMITS.perPhone.map((limit) => retryAfter(byPhone, limit, input.now)),
    ...SEND_LIMITS.perKey.map((limit) => retryAfter(byKey, limit, input.now)),
    ...SEND_LIMITS.perOrganization.map((limit) => retryAfter(all, limit, input.now)),
    ...SEND_LIMITS.whatsApp.map((limit) => retryAfter(whatsApp, limit, input.now)),
  ];
  const wait = Math.max(0, ...delays);
  return wait > 0 ? { allowed: false, retryAfterSeconds: wait } : { allowed: true };
}

/**
 * The status a verification really has now: a pending code past its lifetime
 * is expired, and one whose attempts are spent is locked, before anything
 * writes it down.
 */
export function effectiveStatus(
  verification: { status: PhoneVerificationStatus; expiresAt: Date; attempts: number },
  now: Date,
): PhoneVerificationStatus {
  if (verification.status !== "PENDING") return verification.status;
  if (verification.attempts >= VERIFICATION_MAX_ATTEMPTS) return "MAX_ATTEMPTS";
  if (verification.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return "PENDING";
}

const PUBLIC_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  EXPIRED: "expired",
  MAX_ATTEMPTS: "max_attempts",
  CANCELED: "canceled",
  FAILED: "failed",
} as const satisfies Record<PhoneVerificationStatus, string>;

export function publicStatus(status: PhoneVerificationStatus) {
  return PUBLIC_STATUS[status];
}

/** Error code returned with a refused check, in the API's French vocabulary. */
export function checkErrorCode(status: PhoneVerificationStatus) {
  if (status === "PENDING") return "code_invalide" as const;
  if (status === "MAX_ATTEMPTS") return "trop_de_tentatives" as const;
  // Expired, canceled by a newer code, failed to send or already used: in every
  // case this code can no longer approve anything.
  return "expire" as const;
}

// ─── Message ────────────────────────────────────────────

export const VERIFICATION_LOCALES = ["fr", "en"] as const;
export type VerificationLocale = (typeof VERIFICATION_LOCALES)[number];

/** Sober on purpose: no link, nothing to click. */
export function buildVerificationMessage(locale: VerificationLocale, code: string) {
  const minutes = VERIFICATION_TTL_MS / MINUTE_MS;
  if (locale === "en") {
    return `Your verification code is ${code}. It expires in ${minutes} minutes. Do not share it with anyone.`;
  }
  return `Votre code de vérification est ${code}. Il expire dans ${minutes} minutes. Ne le partagez avec personne.`;
}

// ─── Send failures ──────────────────────────────────────

const ERROR_BY_REASON = {
  recipient_unreachable: "RECIPIENT_UNREACHABLE",
  timeout: "TIMEOUT",
  transport: "TRANSPORT",
} as const satisfies Record<WhatsAppFailureReason, PhoneVerificationError>;

function failureReason(error: unknown): WhatsAppFailureReason {
  if (typeof error !== "object" || error === null || !("reason" in error)) return "transport";
  const { reason } = error;
  return reason === "recipient_unreachable" || reason === "timeout" ? reason : "transport";
}

/**
 * Reduces a send failure to the structured reason the provider client
 * attached. Provider texts are never stored: they carry the number in clear.
 */
export function classifySendError(error: unknown): PhoneVerificationError {
  return ERROR_BY_REASON[failureReason(error)];
}
