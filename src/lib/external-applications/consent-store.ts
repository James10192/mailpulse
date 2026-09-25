import type { Prisma } from "@/generated/prisma";

import { encryptExternalApplicationValue, hashExternalApplicationRecipient } from "@/lib/external-applications/crypto";
import { consentStateAfterReply, type ConsentReply } from "@/lib/external-applications/consent-policy";

type ConsentDatabase = Pick<Prisma.TransactionClient, "externalRecipientConsent">;

export type ConsentScope = {
  organizationId: string;
  applicationId: string;
  providerAccountId: string;
  recipient: string;
};

export type ConsentReplyProof = {
  text: string;
  providerMessageId: string;
  occurredAt: Date;
};

export function consentWhere(scope: ConsentScope) {
  return {
    organizationId: scope.organizationId,
    applicationId: scope.applicationId,
    providerAccountId: scope.providerAccountId,
    recipientHash: hashExternalApplicationRecipient(scope.recipient),
  };
}

export async function readRecipientConsent(db: ConsentDatabase, scope: ConsentScope) {
  return db.externalRecipientConsent.findUnique({
    where: { organizationId_applicationId_providerAccountId_recipientHash: consentWhere(scope) },
  });
}

/**
 * Records a yes or no whether or not a request is pending: a STOP sent out of
 * the blue must still stop every later command, and a later yes reactivates.
 */
export async function recordConsentReply(db: ConsentDatabase, scope: ConsentScope, reply: ConsentReply, proof: ConsentReplyProof, now: Date) {
  const status = consentStateAfterReply(reply);
  const decision = {
    status,
    proofCiphertext: encryptExternalApplicationValue(JSON.stringify({
      text: proof.text,
      providerMessageId: proof.providerMessageId,
      occurredAt: proof.occurredAt.toISOString(),
    })),
    ...(status === "GRANTED" ? { grantedAt: now } : { refusedAt: now }),
  };
  const where = consentWhere(scope);
  return db.externalRecipientConsent.upsert({
    where: { organizationId_applicationId_providerAccountId_recipientHash: where },
    create: { ...where, recipientCiphertext: encryptExternalApplicationValue(scope.recipient), ...decision },
    update: decision,
  });
}
