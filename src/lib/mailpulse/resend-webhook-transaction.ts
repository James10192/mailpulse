import { prisma } from "@/lib/prisma";
import { retryOnSerializationFailure } from "@/lib/prisma-errors";

import { processResendDelivery, type ResendDelivery } from "./resend-webhook-processing";

/**
 * Replays allowed after a serialization conflict. Resend sends a message's
 * events close together (sent, delivered, opened within seconds), so two
 * transactions on the same message regularly collide.
 */
export const RESEND_CONFLICT_RETRIES = 3;

/**
 * Applies one Resend event in a serializable transaction, replaying it when it
 * loses a conflict instead of answering 500 and waiting for Resend's own
 * retry. A replay is safe: the failed attempt rolled back and wrote nothing.
 */
export function applyResendDelivery(delivery: ResendDelivery, retries = RESEND_CONFLICT_RETRIES) {
  return retryOnSerializationFailure(
    () => prisma.$transaction((tx) => processResendDelivery(tx, delivery), { isolationLevel: "Serializable" }),
    retries,
  );
}
