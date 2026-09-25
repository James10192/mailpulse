import type { Prisma } from "@/generated/prisma";

import { CONSENT_PENDING_STATUS } from "@/lib/external-applications/consent-hold";

/**
 * Closes a pending request without an answer: it expired, or it could never be
 * delivered. Every content held behind it is abandoned with the given code, so
 * an idempotent retry of those commands is answered with the same reason.
 * Returns null when the request was no longer pending: somebody else settled it.
 */
export async function abandonPendingConsent(
  tx: Prisma.TransactionClient,
  consentId: string,
  rejectionCode: string,
  now: Date,
  guard: Prisma.ExternalRecipientConsentWhereInput = {},
) {
  const closed = await tx.externalRecipientConsent.updateMany({
    where: { id: consentId, status: "PENDING", ...guard },
    data: { status: "EXPIRED", expiredAt: now },
  });
  if (closed.count !== 1) return null;

  const held = await tx.externalConsentHeldContent.findMany({
    where: { consentId, status: "HELD" },
    select: { id: true, operationId: true },
  });
  if (held.length === 0) return [];

  const operationIds = held.map((item) => item.operationId);
  await tx.externalConsentHeldContent.updateMany({
    where: { id: { in: held.map((item) => item.id) }, status: "HELD" },
    data: { status: "EXPIRED", settledAt: now },
  });
  await tx.externalTransportOperation.updateMany({
    where: { id: { in: operationIds }, status: CONSENT_PENDING_STATUS },
    data: { status: "REJECTED", rejectionCode, failedAt: now },
  });
  return operationIds;
}
