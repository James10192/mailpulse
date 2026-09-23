import { generateVerificationCode, hashVerificationCode, readVerificationSecret, verificationCodeMatches } from "./code";
import { buildVerificationMessage } from "./message";
import {
  SEND_LIMIT_LOOKBACK_MS,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_TTL_MS,
  effectiveStatus,
  evaluateSendLimits,
} from "./policy";
import { prismaVerificationStore } from "./store";
import type { VerificationDeps } from "./types";

/** Production wiring. Null when the hashing secret is not configured: fail closed. */
export function verificationDeps(): VerificationDeps | null {
  const secret = readVerificationSecret(process.env);
  if (!secret) return null;

  return {
    store: prismaVerificationStore,
    now: () => new Date(),
    rules: {
      ttlMs: VERIFICATION_TTL_MS,
      maxAttempts: VERIFICATION_MAX_ATTEMPTS,
      lookbackMs: SEND_LIMIT_LOOKBACK_MS,
      generateCode: generateVerificationCode,
      hashCode: (code) => hashVerificationCode(secret, code),
      codeMatches: (code, hash) => verificationCodeMatches(secret, code, hash),
      evaluateSendLimits,
      effectiveStatus,
      buildMessage: (locale, code) => buildVerificationMessage(locale, code, VERIFICATION_TTL_MS / 60_000),
    },
  };
}
