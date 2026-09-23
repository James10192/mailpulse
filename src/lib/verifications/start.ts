import type { VerificationLocale } from "./message";
import type { VerificationDeps, VerificationRecord, VerificationTransport } from "./types";

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
  | { type: "sent"; verification: VerificationRecord }
  | { type: "failed"; verification: VerificationRecord };

const MAX_ERROR_LENGTH = 500;

/**
 * Creates a verification and sends its code. The limit check, the cancellation
 * of the previous pending code and the creation happen under one lock; the
 * provider call happens after it, so a slow transport never holds the lock.
 */
export async function startVerification(deps: VerificationDeps, input: StartVerificationInput): Promise<StartVerificationResult> {
  const now = deps.now();
  const since = new Date(now.getTime() - deps.rules.lookbackMs);

  const claim = await deps.store.withSendLock(input, async (tx) => {
    const [phoneSends, keySends] = await Promise.all([
      tx.sendsForPhone(input.organizationId, input.phoneNumber, since),
      tx.sendsForKey(input.apiKeyId, since),
    ]);
    const decision = deps.rules.evaluateSendLimits({ now, phoneSends, keySends });
    if (!decision.allowed) return { type: "rate_limited" as const, retryAfterSeconds: decision.retryAfterSeconds };

    // Sending again for a number replaces its code: only the latest one works.
    await tx.cancelPending(input.organizationId, input.phoneNumber, now);
    const code = deps.rules.generateCode();
    const verification = await tx.create({
      organizationId: input.organizationId,
      apiKeyId: input.apiKeyId,
      phoneNumber: input.phoneNumber,
      locale: input.locale,
      reference: input.reference,
      codeHash: deps.rules.hashCode(code),
      expiresAt: new Date(now.getTime() + deps.rules.ttlMs),
      createdAt: now,
    });
    return { type: "created" as const, verification, code };
  });
  if (claim.type === "rate_limited") return claim;

  const { verification, code } = claim;
  const outcome = await input.transport
    .send(verification.phoneNumber, deps.rules.buildMessage(input.locale, code))
    .catch((error: unknown) => ({
      ok: false as const,
      provider: null,
      error: error instanceof Error ? error.message : "Échec de l'envoi WhatsApp.",
    }));

  if (!outcome.ok) {
    const failed = await deps.store.markFailed(verification.id, {
      provider: outcome.provider,
      errorMessage: outcome.error.slice(0, MAX_ERROR_LENGTH),
      failedAt: deps.now(),
    });
    return { type: "failed", verification: failed };
  }

  const sent = await deps.store.markSent(verification.id, {
    provider: outcome.provider,
    providerMessageId: outcome.providerMessageId,
  });
  return { type: "sent", verification: sent };
}
