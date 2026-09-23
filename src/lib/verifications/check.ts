import type { VerificationStatus } from "./policy";
import type { VerificationDeps } from "./types";

export type CheckVerificationResult =
  | { type: "not_found" }
  | { type: "approved"; id: string }
  | { type: "refused"; id: string; status: VerificationStatus };

// Each round is one read and one conditional write. Losing a round means a
// concurrent check changed the row, so re-reading decides with fresh state.
const MAX_ROUNDS = 3;

/**
 * Checks a submitted code. Every wrong code consumes an attempt, the last one
 * locks the verification, and a right code approves it exactly once: the
 * conditional write makes two simultaneous correct submissions approve once.
 */
export async function checkVerification(
  deps: VerificationDeps,
  input: { organizationId: string; id: string; code: string },
): Promise<CheckVerificationResult> {
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const verification = await deps.store.find(input.organizationId, input.id);
    if (!verification) return { type: "not_found" };

    const now = deps.now();
    const status = deps.rules.effectiveStatus(verification, now);
    if (status !== "PENDING") {
      if (status === "EXPIRED" && verification.status === "PENDING") await deps.store.expire(verification.id);
      return { type: "refused", id: verification.id, status };
    }

    const matches = deps.rules.codeMatches(input.code, verification.codeHash);
    const attempts = verification.attempts + 1;
    const next: VerificationStatus = matches ? "APPROVED" : attempts >= deps.rules.maxAttempts ? "MAX_ATTEMPTS" : "PENDING";
    const applied = await deps.store.recordAttempt({
      id: verification.id,
      expectedAttempts: verification.attempts,
      now,
      attempts,
      status: next,
    });
    if (!applied) continue;

    return matches ? { type: "approved", id: verification.id } : { type: "refused", id: verification.id, status: next };
  }

  // Sustained contention on one verification: answer with its current state and
  // never approve without a write that won.
  const latest = await deps.store.find(input.organizationId, input.id);
  if (!latest) return { type: "not_found" };
  const status = deps.rules.effectiveStatus(latest, deps.now());
  return { type: "refused", id: latest.id, status };
}
