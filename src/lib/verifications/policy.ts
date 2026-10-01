import type { PhoneVerificationError, PhoneVerificationLocale, PhoneVerificationMode, PhoneVerificationStatus } from "@/generated/prisma";
import { API_RATE_LIMITS, API_RATE_WINDOW_MS } from "@/lib/mailpulse/api-rate-limits";
import type { WhatsAppFailureReason } from "@/lib/whatsapp/types";

/**
 * The rules of a verification: lifetime, attempts, send limits, the message,
 * the public vocabulary and the classification of send failures.
 */

export const VERIFICATION_TTL_MS = 10 * 60_000;
export const VERIFICATION_MAX_ATTEMPTS = 5;

const SECOND_MS = 1000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Sends per hour for a whole organization, whatever the number or the key. */
export const ORGANIZATION_HOURLY_SENDS = 100;

type Window = { readonly windowMs: number; readonly max: number };

export const SEND_LIMITS = {
  // Three codes an hour and five a day reach anyone who really asked; more is
  // a loop or someone typing another person's number.
  perPhone: [{ windowMs: MINUTE_MS, max: 1 }, { windowMs: HOUR_MS, max: 3 }, { windowMs: DAY_MS, max: 5 }],
  perKey: [{ windowMs: HOUR_MS, max: 20 }],
  perOrganization: [{ windowMs: HOUR_MS, max: ORGANIZATION_HOURLY_SENDS }],
  // Shared with API WhatsApp messages: both leave from the same number.
  whatsApp: [{ windowMs: API_RATE_WINDOW_MS, max: API_RATE_LIMITS.WHATSAPP }],
} as const satisfies Record<string, readonly Window[]>;

/**
 * Limits per sending number. A code goes to someone who never wrote to the
 * number, the strongest signal WhatsApp reads for an unofficial client, so a
 * WhatsApp Web number is held well below what practitioners report as safe
 * (Green-API, baileys-antiban: 8 a minute, 200 a day and more). WhatsApp
 * publishes no threshold; these are deliberately cautious.
 *
 * A number paired less than 30 days ago gets the tighter profile: new numbers
 * that send at once are the first to be restricted. The minimum gap keeps
 * sends from leaving at a machine's rhythm.
 */
export const SENDER_WARMUP_MS = 30 * DAY_MS;

export const SENDER_LIMITS = {
  warmingUp: [
    { windowMs: 10 * SECOND_MS, max: 1 },
    { windowMs: MINUTE_MS, max: 3 },
    { windowMs: HOUR_MS, max: 30 },
    { windowMs: DAY_MS, max: 150 },
  ],
  established: [
    { windowMs: 5 * SECOND_MS, max: 1 },
    { windowMs: MINUTE_MS, max: 6 },
    { windowMs: HOUR_MS, max: 80 },
    { windowMs: DAY_MS, max: 500 },
  ],
} as const satisfies Record<string, readonly Window[]>;

/**
 * After WhatsApp itself throttles a number, it gets no code for this long:
 * insisting is what turns a temporary limit into a ban.
 */
export const SENDER_COOLDOWN_MS = 30 * MINUTE_MS;

/** The widest window any limit looks at: older sends never matter. */
export const SEND_LIMIT_LOOKBACK_MS = DAY_MS;

export type RecentSend = {
  createdAt: Date;
  phoneNumber: string;
  apiKeyId: string | null;
  /** The application number it left from; null for the organization's own. */
  senderAccountId: string | null;
  errorCode: PhoneVerificationError | null;
  failedAt: Date | null;
  mode: PhoneVerificationMode;
};

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
 * The profile of the sending number. The organization's own number and a
 * number linked by hand carry no pairing date: they predate this rule and are
 * treated as established.
 */
export function senderLimits(pairedAt: Date | null, now: Date) {
  const warmingUp = pairedAt !== null && now.getTime() - pairedAt.getTime() < SENDER_WARMUP_MS;
  return warmingUp ? SENDER_LIMITS.warmingUp : SENDER_LIMITS.established;
}

function cooldownDelay(sends: readonly RecentSend[], now: Date) {
  const throttledAt = sends
    .filter((send) => send.errorCode === "PROVIDER_RATE_LIMITED")
    .map((send) => (send.failedAt ?? send.createdAt).getTime());
  if (throttledAt.length === 0) return 0;
  const until = Math.max(...throttledAt) + SENDER_COOLDOWN_MS;
  return until > now.getTime() ? Math.ceil((until - now.getTime()) / 1000) : 0;
}

/**
 * Every recorded send counts, failed or canceled included: a limit that only
 * counted delivered codes would let a caller hammer a number whose sends fail.
 */
export function evaluateSendLimits(input: {
  now: Date;
  phoneNumber: string;
  apiKeyId: string;
  senderAccountId: string | null;
  senderPairedAt: Date | null;
  /** Default OUTBOUND. A code the person sends us skips the number's pace. */
  mode?: PhoneVerificationMode;
  organizationSends: readonly RecentSend[];
  whatsAppMessageTimes: readonly Date[];
}): SendLimitDecision {
  const all = input.organizationSends.map((send) => send.createdAt);
  const byPhone = input.organizationSends.filter((send) => send.phoneNumber === input.phoneNumber).map((send) => send.createdAt);
  const byKey = input.organizationSends.filter((send) => send.apiKeyId === input.apiKeyId).map((send) => send.createdAt);
  const whatsApp = [...all, ...input.whatsAppMessageTimes];
  // A code the person sends to the number reaches no stranger: it never
  // counts against the number's pace.
  const fromSender = input.organizationSends.filter((send) => send.mode === "OUTBOUND" && send.senderAccountId === input.senderAccountId);
  // Only codes count here: they go to strangers. API messages from the same
  // number reach people who already know it, and have their own rate.
  const bySender = fromSender.map((send) => send.createdAt);

  const delays = [
    ...SEND_LIMITS.perPhone.map((limit) => retryAfter(byPhone, limit, input.now)),
    ...SEND_LIMITS.perKey.map((limit) => retryAfter(byKey, limit, input.now)),
    ...SEND_LIMITS.perOrganization.map((limit) => retryAfter(all, limit, input.now)),
    ...SEND_LIMITS.whatsApp.map((limit) => retryAfter(whatsApp, limit, input.now)),
  ];
  if ((input.mode ?? "OUTBOUND") === "OUTBOUND") {
    delays.push(...senderLimits(input.senderPairedAt, input.now).map((limit) => retryAfter(bySender, limit, input.now)), cooldownDelay(fromSender, input.now));
  }
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

const STORED_LOCALE = { fr: "FR", en: "EN" } as const satisfies Record<VerificationLocale, PhoneVerificationLocale>;

export function storedLocale(locale: VerificationLocale): PhoneVerificationLocale {
  return STORED_LOCALE[locale];
}

/** Sober on purpose: no link, nothing to click. */
export function buildVerificationMessage(locale: VerificationLocale, code: string) {
  const minutes = VERIFICATION_TTL_MS / MINUTE_MS;
  if (locale === "en") {
    return `Your verification code is ${code}. It expires in ${minutes} minutes. Do not share it with anyone.`;
  }
  return `Votre code de vérification est ${code}. Il expire dans ${minutes} minutes. Ne le partagez avec personne.`;
}

// ─── Reverse verification ───────────────────────────────

/**
 * The message the person sends from the wa.me link. The code ties it to one
 * verification; the number it comes from is the proof.
 */
export function buildReverseVerificationMessage(locale: VerificationLocale, code: string) {
  return locale === "en" ? `I confirm my WhatsApp number. Code: ${code}` : `Je confirme mon numéro WhatsApp. Code : ${code}`;
}

/** The link that opens WhatsApp on the number with the message already typed. */
export function reverseVerificationLink(senderNumber: string, message: string) {
  return `https://wa.me/${senderNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

/** Six-digit runs of an inbound text, in order, without repeats. */
export function codeCandidates(text: string) {
  return [...new Set(text.match(/(?<!\d)\d{6}(?!\d)/g) ?? [])];
}

export type ReverseReply = "approved" | "wrong_code" | "closed";

const REVERSE_REPLIES = {
  fr: {
    approved: "Merci, votre numéro est vérifié. Vous pouvez revenir sur la page d'inscription.",
    wrong_code: "Ce code ne correspond pas. Renvoyez le message tel qu'il s'est affiché, sans le modifier.",
    closed: "Ce code n'est plus valable. Revenez sur la page d'inscription pour en obtenir un nouveau.",
  },
  en: {
    approved: "Thank you, your number is verified. You can go back to the registration page.",
    wrong_code: "This code does not match. Send the message exactly as it appeared, without changing it.",
    closed: "This code is no longer valid. Go back to the registration page to get a new one.",
  },
} as const satisfies Record<VerificationLocale, Record<ReverseReply, string>>;

export function reverseReplyText(locale: PhoneVerificationLocale, reply: ReverseReply) {
  return REVERSE_REPLIES[locale === "EN" ? "en" : "fr"][reply];
}

// ─── Send failures ──────────────────────────────────────

const ERROR_BY_REASON = {
  recipient_unreachable: "RECIPIENT_UNREACHABLE",
  rejected: "REJECTED",
  rate_limited: "PROVIDER_RATE_LIMITED",
  timeout: "TIMEOUT",
  transport: "TRANSPORT",
} as const satisfies Record<WhatsAppFailureReason, PhoneVerificationError>;

const FAILURE_REASONS = Object.keys(ERROR_BY_REASON) as WhatsAppFailureReason[];

/**
 * Read by shape, not by class: the reason is the `reason` field the WhatsApp
 * client attaches to the error it throws. Anything without a known reason (a
 * bug, a crash in between) counts as an ambiguous transport failure, so it can
 * never be mistaken for a definite refusal.
 */
function failureReason(error: unknown): WhatsAppFailureReason {
  if (typeof error !== "object" || error === null || !("reason" in error)) return "transport";
  const reason = FAILURE_REASONS.find((known) => known === error.reason);
  return reason ?? "transport";
}

export type SendFailure = {
  errorCode: PhoneVerificationError;
  /** Nothing was sent: the verification fails. Otherwise the code may still arrive. */
  definite: boolean;
  /** The provider's own delay before a new attempt, when it gave one. */
  retryAfterSeconds: number | null;
};

const NOTHING_SENT: ReadonlySet<WhatsAppFailureReason> = new Set(["recipient_unreachable", "rejected", "rate_limited"]);

function providerRetryAfter(error: unknown) {
  if (typeof error !== "object" || error === null || !("retryAfterSeconds" in error)) return null;
  const value = error.retryAfterSeconds;
  return typeof value === "number" && value > 0 ? value : null;
}

/**
 * Reduces a send failure to a stored code. Only a definite refusal fails the
 * verification; after a timeout or a transport error the message may still
 * arrive, so the code stays usable. Provider texts are never kept: they carry
 * the number in clear.
 */
export function classifySendError(error: unknown): SendFailure {
  const reason = failureReason(error);
  return { errorCode: ERROR_BY_REASON[reason], definite: NOTHING_SENT.has(reason), retryAfterSeconds: providerRetryAfter(error) };
}
