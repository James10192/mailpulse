import type { PhoneVerification, PhoneVerificationStatus } from "@/generated/prisma";
import { generateVerificationCode, hashVerificationCode, verificationCodeMatches } from "./code";
import {
  SEND_LIMIT_LOOKBACK_MS,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_TTL_MS,
  buildVerificationMessage,
  classifySendError,
  effectiveStatus,
  evaluateSendLimits,
  storedLocale,
  type VerificationLocale,
} from "./policy";
import type { VerificationStore } from "./store";
import type { VerificationTransport } from "./transport";

export type VerificationServiceDeps = {
  store: VerificationStore;
  now(): Date;
  secret: string;
};

// A concurrent request holds the organization's send lock: it lasts a few
// milliseconds, so the caller can retry almost at once.
const LOCK_BUSY_RETRY_SECONDS = 1;

// ─── Start ──────────────────────────────────────────────

export type StartVerificationInput = {
  organizationId: string;
  apiKeyId: string;
  phoneNumber: string;
  locale: VerificationLocale;
  reference: string | null;
  transport: VerificationTransport;
};

export type StartVerificationResult =
  | { type: "rate_limited"; retryAfterSeconds: number }
  | { type: "busy"; retryAfterSeconds: number }
  | { type: "sent"; verification: PhoneVerification }
  | { type: "failed"; verification: PhoneVerification; retryAfterSeconds: number | null };

async function recordSend(deps: VerificationServiceDeps, verification: PhoneVerification, provider: string, messageId: string | null): Promise<StartVerificationResult> {
  try {
    return { type: "sent", verification: await deps.store.markSent(verification.id, { provider, providerMessageId: messageId }) };
  } catch (error) {
    // The code is on its way: the verification stays usable, only the provider
    // reference is missing.
    console.error("[verifications] sent but not recorded", { id: verification.id, error: error instanceof Error ? error.message : error });
    return { type: "sent", verification };
  }
}

/**
 * Creates a verification and sends its code. Limits, cancellation of the
 * previous pending code and creation happen under the organization's lock; the
 * provider call happens after it, so a slow transport never holds the lock.
 */
export async function startVerification(deps: VerificationServiceDeps, input: StartVerificationInput): Promise<StartVerificationResult> {
  const now = deps.now();
  const since = new Date(now.getTime() - SEND_LIMIT_LOOKBACK_MS);

  const lock = await deps.store.withOrganizationLock(input.organizationId, async (tx) => {
    const [organizationSends, whatsAppMessageTimes] = await Promise.all([
      tx.recentSends(input.organizationId, since),
      tx.whatsAppMessageTimes(input.organizationId, since),
    ]);
    const decision = evaluateSendLimits({ now, phoneNumber: input.phoneNumber, apiKeyId: input.apiKeyId, organizationSends, whatsAppMessageTimes });
    if (!decision.allowed) return { type: "rate_limited" as const, retryAfterSeconds: decision.retryAfterSeconds };

    // Sending again for a number replaces its code: only the latest one works.
    await tx.cancelPending(input.organizationId, input.phoneNumber, now);
    const code = generateVerificationCode();
    const verification = await tx.create({
      organizationId: input.organizationId,
      apiKeyId: input.apiKeyId,
      phoneNumber: input.phoneNumber,
      locale: storedLocale(input.locale),
      reference: input.reference,
      codeHash: hashVerificationCode(deps.secret, code),
      expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
      createdAt: now,
    });
    return { type: "created" as const, verification, code };
  });
  if (!lock.acquired) return { type: "busy", retryAfterSeconds: LOCK_BUSY_RETRY_SECONDS };
  const claim = lock.value;
  if (claim.type === "rate_limited") return claim;

  const { verification, code } = claim;
  const { provider } = input.transport;
  let messageId: string | null;
  try {
    ({ messageId } = await input.transport.send(verification.phoneNumber, buildVerificationMessage(input.locale, code)));
  } catch (error) {
    return recordSendFailure(deps, verification, provider, error);
  }
  return recordSend(deps, verification, provider, messageId);
}

/**
 * A definite refusal fails the verification. An ambiguous failure (timeout,
 * transport error) leaves it pending: the message may still arrive, and a code
 * that arrives late must work. Neither ever undoes a code approved meanwhile.
 */
async function recordSendFailure(deps: VerificationServiceDeps, verification: PhoneVerification, provider: string, error: unknown): Promise<StartVerificationResult> {
  const { errorCode, definite, retryAfterSeconds } = classifySendError(error);
  if (!definite) {
    const current = await deps.store.markUnconfirmed(verification.id, { provider, errorCode });
    return { type: "sent", verification: current ?? verification };
  }
  const current = await deps.store.markFailed(verification.id, { provider, errorCode, failedAt: deps.now() });
  if (current?.status === "APPROVED") return { type: "sent", verification: current };
  return { type: "failed", verification: current ?? verification, retryAfterSeconds };
}

// ─── Check ──────────────────────────────────────────────

export type CheckVerificationResult =
  | { type: "not_found" }
  | { type: "approved"; id: string }
  | { type: "refused"; id: string; status: PhoneVerificationStatus };

/** Answers with the current state, recording an expiry or a lock a read discovers. */
async function refuseWithCurrentState(deps: VerificationServiceDeps, organizationId: string, id: string): Promise<CheckVerificationResult> {
  const verification = await deps.store.find(organizationId, id);
  if (!verification) return { type: "not_found" };
  const status = effectiveStatus(verification, deps.now());
  if (status === "EXPIRED" || status === "MAX_ATTEMPTS") await deps.store.close(verification.id, status);
  return { type: "refused", id: verification.id, status };
}

/**
 * The attempt is spent before the code is compared, in one atomic write: no
 * number of concurrent guesses can compare more than the allowed attempts, and
 * a right code approves exactly once.
 */
export async function checkVerification(
  deps: VerificationServiceDeps,
  input: { organizationId: string; id: string; code: string },
): Promise<CheckVerificationResult> {
  const now = deps.now();
  const verification = await deps.store.consumeAttempt({ organizationId: input.organizationId, id: input.id, now, maxAttempts: VERIFICATION_MAX_ATTEMPTS });
  if (!verification) return refuseWithCurrentState(deps, input.organizationId, input.id);

  if (verificationCodeMatches(deps.secret, input.code, verification.codeHash)) {
    const approved = await deps.store.approveSpentAttempt(verification.id, now);
    // Lost only to a previous approval or a newer code: never approve twice.
    return approved ? { type: "approved", id: verification.id } : refuseWithCurrentState(deps, input.organizationId, input.id);
  }

  if (verification.attempts >= VERIFICATION_MAX_ATTEMPTS) {
    const locked = await deps.store.close(verification.id, "MAX_ATTEMPTS");
    return locked ? { type: "refused", id: verification.id, status: "MAX_ATTEMPTS" } : refuseWithCurrentState(deps, input.organizationId, input.id);
  }
  return { type: "refused", id: verification.id, status: "PENDING" };
}
