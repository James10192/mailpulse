/**
 * The rules of a verification: lifetime, attempts, send limits and the public
 * status. Dependency-free so the Node test runner can exercise them directly.
 */

export const VERIFICATION_TTL_MS = 10 * 60_000;
export const VERIFICATION_MAX_ATTEMPTS = 5;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Checked in order; the first exhausted window decides the retry delay. */
export const SEND_LIMITS = {
  perPhone: [
    { windowMs: MINUTE_MS, max: 1 },
    { windowMs: HOUR_MS, max: 5 },
  ],
  perKey: [{ windowMs: HOUR_MS, max: 20 }],
} as const;

/** The widest window any limit looks at: older sends never matter. */
export const SEND_LIMIT_LOOKBACK_MS = HOUR_MS;

export type VerificationStatus = "PENDING" | "APPROVED" | "EXPIRED" | "MAX_ATTEMPTS" | "CANCELED" | "FAILED";

export type SendLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Window = { readonly windowMs: number; readonly max: number };

function retryAfter(sends: readonly Date[], limit: Window, now: Date) {
  const since = now.getTime() - limit.windowMs;
  const inWindow = sends.map((date) => date.getTime()).filter((time) => time > since).sort((a, b) => a - b);
  if (inWindow.length < limit.max) return 0;
  // The window frees a slot when the oldest send that still fills it ages out.
  const freeingSend = inWindow[inWindow.length - limit.max];
  return Math.max(1, Math.ceil((freeingSend + limit.windowMs - now.getTime()) / 1000));
}

/**
 * Every recorded send counts, failed or canceled included: a limit that only
 * counted delivered codes would let a caller hammer a number whose sends fail.
 */
export function evaluateSendLimits(input: { now: Date; phoneSends: readonly Date[]; keySends: readonly Date[] }): SendLimitDecision {
  const delays = [
    ...SEND_LIMITS.perPhone.map((limit) => retryAfter(input.phoneSends, limit, input.now)),
    ...SEND_LIMITS.perKey.map((limit) => retryAfter(input.keySends, limit, input.now)),
  ];
  const wait = Math.max(0, ...delays);
  return wait > 0 ? { allowed: false, retryAfterSeconds: wait } : { allowed: true };
}

/** A pending code past its lifetime is expired even before anything writes it down. */
export function effectiveStatus(verification: { status: VerificationStatus; expiresAt: Date }, now: Date): VerificationStatus {
  if (verification.status === "PENDING" && verification.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return verification.status;
}

export function publicStatus(status: VerificationStatus) {
  return status.toLowerCase() as Lowercase<VerificationStatus>;
}

/** Error code returned with a refused check, in the API's French vocabulary. */
export function checkErrorCode(status: VerificationStatus) {
  if (status === "PENDING") return "code_invalide" as const;
  if (status === "MAX_ATTEMPTS") return "trop_de_tentatives" as const;
  // Expired, canceled by a newer code, failed to send or already used: in every
  // case this code can no longer approve anything.
  return "expire" as const;
}
