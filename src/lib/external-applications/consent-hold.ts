import type { Prisma } from "@/generated/prisma";

import type { ExternalApplicationContext, ExternalWhatsAppProvider } from "@/lib/external-applications/application";
import type { ExternalCommand } from "@/lib/external-applications/command-types";
import { consentGateDecision, type ConsentGateDecision } from "@/lib/external-applications/consent-policy";
import { consentWhere, readRecipientConsent, type ConsentScope } from "@/lib/external-applications/consent-store";
import { encryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { prisma } from "@/lib/prisma";

export const CONSENT_PENDING_STATUS = "CONSENT_PENDING";

export type ConsentGateOutcome = "send" | "refused" | "held" | "window_closed";

/**
 * Decides, before anything is sent, whether a command goes out now, waits for
 * its recipient's agreement, or is refused. A failed lookup throws: the caller
 * answers 503 and never sends on a guess.
 */
export async function applyConsentGate(
  application: ExternalApplicationContext,
  provider: ExternalWhatsAppProvider,
  operation: { id: string; payloadCiphertext: string | null },
  command: ExternalCommand,
  isWindowOpen: () => Promise<boolean>,
): Promise<ConsentGateOutcome> {
  const scope = { organizationId: application.organizationId, applicationId: application.id, providerAccountId: provider.id, recipient: command.recipient };
  const current = await readRecipientConsent(prisma, scope);
  const decision = consentGateDecision(current?.status, Boolean(command.consent));
  if (decision === "refuse") return "refused";
  if (decision === "send") return "send";
  // Meta only carries free-form text inside the 24 h service window, and the
  // request is free-form text written by the client.
  if (decision === "request" && provider.kind === "meta" && !(await isWindowOpen())) return "window_closed";

  return holdWithRetry(scope, operation, command);
}

async function holdWithRetry(scope: ConsentScope, operation: { id: string; payloadCiphertext: string | null }, command: ExternalCommand) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction((tx) => holdInTransaction(tx, scope, operation, command), { isolationLevel: "Serializable" });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === 2) throw error;
    }
  }
  throw new Error("Consent hold transaction retries exhausted.");
}

/**
 * The decision is taken again inside the transaction: a reply can land between
 * the first read and here, and must win over the command.
 */
async function holdInTransaction(
  tx: Prisma.TransactionClient,
  scope: ConsentScope,
  operation: { id: string; payloadCiphertext: string | null },
  command: ExternalCommand,
): Promise<ConsentGateOutcome> {
  const current = await readRecipientConsent(tx, scope);
  const decision = consentGateDecision(current?.status, Boolean(command.consent));
  if (decision === "refuse") return "refused";
  if (decision === "send") return "send";

  const consent = decision === "request"
    ? await queueConsentRequest(tx, scope, command, current?.id)
    : current!;

  const existingHold = await tx.externalConsentHeldContent.findUnique({ where: { operationId: operation.id }, select: { id: true } });
  if (!existingHold) {
    await tx.externalConsentHeldContent.create({
      data: {
        consentId: consent.id,
        operationId: operation.id,
        payloadCiphertext: operation.payloadCiphertext ?? encryptExternalApplicationValue(JSON.stringify(command)),
      },
    });
  }
  await tx.externalTransportOperation.updateMany({
    where: { id: operation.id, status: "PENDING" },
    data: { status: CONSENT_PENDING_STATUS },
  });
  return "held";
}

/** A new request replaces an expired one; its clock starts only when it is sent. */
function queueConsentRequest(tx: Prisma.TransactionClient, scope: ConsentScope, command: ExternalCommand, existingId: string | undefined) {
  const request = {
    status: "PENDING" as const,
    requestTextCiphertext: encryptExternalApplicationValue(command.consent!.requestText),
    requestTtlSeconds: command.consent!.expiresInSeconds,
    requestQueuedAt: new Date(),
    requestSentAt: null,
    requestAttempts: 0,
    requestProviderMessageId: null,
    expiresAt: null,
    expiredAt: null,
  };
  if (existingId) return tx.externalRecipientConsent.update({ where: { id: existingId }, data: request });
  return tx.externalRecipientConsent.create({
    data: { ...consentWhere(scope), recipientCiphertext: encryptExternalApplicationValue(scope.recipient), ...request },
  });
}

export type { ConsentGateDecision };

function isRetryableTransactionError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error.code === "P2034" || error.code === "P2002");
}
