import { randomUUID } from "node:crypto";

import { decryptExternalApplicationValue, encryptExternalApplicationValue, hashExternalApplicationPayload } from "@/lib/external-applications/crypto";
import { resolveWhatsAppProvider, type ExternalApplicationContext, type ExternalWhatsAppProvider } from "@/lib/external-applications/application";
import type { ExternalCommand } from "@/lib/external-applications/command-types";
import {
  MissingTemplateConfigurationError,
  parseCommandPayload,
  submitCommandToProvider,
} from "@/lib/external-applications/command-submission";
import { applyConsentGate, CONSENT_PENDING_STATUS, QUEUED_STATUS } from "@/lib/external-applications/consent-hold";
import { CONSENT_REFUSED_CODE } from "@/lib/external-applications/consent-policy";
import { hasActiveExternalWhatsAppConversationWindow } from "@/lib/external-applications/conversation-window";
import { recordEventsAfterCommit, recordOperationEvents } from "@/lib/external-applications/events";
import { isProviderConfirmedOperationStatus, isProviderRejectedOperationStatus } from "@/lib/external-applications/message-status";
import { requiresWhatsAppServiceWindow } from "@/lib/external-applications/whatsapp-transport-policy";
import { prisma } from "@/lib/prisma";
import { isConfigured as isEvolutionConfigured } from "@/lib/whatsapp-baileys";

export type { ExternalCommand };

const LEASE_DURATION_MS = 10 * 60_000;

export async function dispatchExternalApplicationCommand(application: ExternalApplicationContext, command: ExternalCommand) {
  const provider = await resolveWhatsAppProvider(application);
  if (!provider) return { status: "unavailable" as const };
  // Checked before any operation row exists: a missing Evolution endpoint would
  // otherwise strand the command in SUBMISSION_UNKNOWN, where an idempotent
  // retry can never resubmit it once the configuration is repaired.
  if (provider.kind === "baileys" && !isEvolutionConfigured()) return { status: "unavailable" as const };

  const serializedPayload = JSON.stringify(command);
  const payloadHash = hashExternalApplicationPayload(serializedPayload);
  const operation = await findOrCreateOperation(application, provider.id, command.operationKey, command.idempotencyKey, serializedPayload, payloadHash);
  if (operation.payloadHash !== payloadHash) return { status: "conflict" as const, operationId: operation.id };
  // Checked before the window gate: a delivered message must never be answered
  // with a rejection because its 24h window has since closed.
  if (isProviderConfirmedOperationStatus(operation.status)) return { status: "accepted" as const, operationId: operation.id };
  if (operation.rejectionCode === CONSENT_REFUSED_CODE) return { status: "consent_refused" as const, operationId: operation.id };
  if (isProviderRejectedOperationStatus(operation.status)) {
    return { status: "rejected" as const, operationId: operation.id, rejectionCode: operation.rejectionCode ?? undefined };
  }
  if (operation.status === "SUBMISSION_UNKNOWN") return { status: "submission_unknown" as const, operationId: operation.id };

  if (operation.status === CONSENT_PENDING_STATUS) return { status: "consent_pending" as const, operationId: operation.id };
  if (operation.status === QUEUED_STATUS) return { status: "queued" as const, operationId: operation.id };

  // Before any other gate: a refusal is the recipient's own decision and must
  // hold whatever the content, the transport or the window.
  const consent = await applyConsentGate(application, provider, operation, command, () => hasOpenConversationWindow(application, provider.id, command.recipient));
  if (consent === "refused") {
    await rejectPendingOperation(operation.id, CONSENT_REFUSED_CODE);
    return { status: "consent_refused" as const, operationId: operation.id };
  }
  if (consent === "window_closed") {
    await rejectPendingOperation(operation.id, "whatsapp_service_window_closed");
    return { status: "rejected" as const, operationId: operation.id, rejectionCode: "whatsapp_service_window_closed" };
  }
  if (consent === "held") return { status: "consent_pending" as const, operationId: operation.id };

  if (requiresWhatsAppServiceWindow(provider.kind, command.content.type)) {
    const windowOpen = await hasOpenConversationWindow(application, provider.id, command.recipient);
    if (!windowOpen) {
      await rejectPendingOperation(operation.id, "whatsapp_service_window_closed");
      return { status: "rejected" as const, operationId: operation.id, rejectionCode: "whatsapp_service_window_closed" };
    }
  }

  return submitOperation(application, provider, operation);
}

/**
 * Claims the operation and submits it once. Shared by the immediate path and by
 * the paced queue, which claims a consent-released command from QUEUED.
 */
export async function submitOperation(
  application: ExternalApplicationContext,
  provider: ExternalWhatsAppProvider,
  operation: { id: string; payloadCiphertext: string | null },
  claimableStatus: "PENDING" | typeof QUEUED_STATUS = "PENDING",
) {
  const result = await submitClaimedOperation(application, provider, operation, claimableStatus);
  if (result.status === "accepted" || result.status === "rejected") {
    const event = result.status === "accepted" ? "message.sent" : "message.failed";
    const failureCode = result.status === "rejected" ? result.rejectionCode : null;
    await recordEventsAfterCommit(event, () => recordOperationEvents(
      prisma,
      { organizationId: application.organizationId, applicationId: application.id, providerAccountId: provider.id },
      event,
      [operation.id],
      { occurredAt: new Date(), failureCode },
    ));
  }
  return result;
}

async function submitClaimedOperation(
  application: ExternalApplicationContext,
  provider: ExternalWhatsAppProvider,
  operation: { id: string; payloadCiphertext: string | null },
  claimableStatus: "PENDING" | typeof QUEUED_STATUS,
) {
  const leaseToken = randomUUID();
  const now = new Date();
  const claimed = await prisma.externalTransportOperation.updateMany({
    where: {
      id: operation.id,
      OR: [{ status: claimableStatus }, { status: "PROCESSING", leaseExpiresAt: { lt: now } }],
    },
    data: { status: "PROCESSING", leaseToken, leaseAcquiredAt: now, leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS) },
  });
  if (claimed.count !== 1) return { status: "in_progress" as const, operationId: operation.id };

  const prepared = await prisma.externalTransportOperation.updateMany({
    where: { id: operation.id, status: "PROCESSING", leaseToken },
    data: { status: "SUBMISSION_UNKNOWN" },
  });
  if (prepared.count !== 1) return { status: "submission_unknown" as const, operationId: operation.id };

  try {
    const payload = parseCommandPayload(decryptExternalApplicationValue(operation.payloadCiphertext ?? ""));
    const submission = await submitCommandToProvider(application, provider, payload, operation.id);
    if (submission.outcome === "rejected") {
      await finalizeOperation(operation.id, leaseToken, submission.rejectionCode);
      return { status: "rejected" as const, operationId: operation.id, rejectionCode: submission.rejectionCode };
    }
    if (submission.outcome === "unknown") return { status: "submission_unknown" as const, operationId: operation.id };

    const accepted = await prisma.externalTransportOperation.updateMany({
      where: { id: operation.id, status: "SUBMISSION_UNKNOWN", leaseToken },
      data: { status: "ACCEPTED", acceptedAt: new Date(), providerMessageId: submission.messageId, leaseToken: null, leaseExpiresAt: null },
    });
    if (accepted.count === 1) return { status: "accepted" as const, operationId: operation.id };

    // A status webhook can confirm the submission while the provider response
    // is still in flight. That confirmation is stronger than our own write.
    const current = await prisma.externalTransportOperation.findUnique({
      where: { id: operation.id },
      select: { status: true },
    });
    return current && isProviderConfirmedOperationStatus(current.status)
      ? { status: "accepted" as const, operationId: operation.id }
      : { status: "submission_unknown" as const, operationId: operation.id };
  } catch (error) {
    if (error instanceof MissingTemplateConfigurationError) {
      await finalizeOperation(operation.id, leaseToken, "template_not_configured");
      return { status: "rejected" as const, operationId: operation.id, rejectionCode: "template_not_configured" };
    }
    return { status: "submission_unknown" as const, operationId: operation.id };
  }
}

async function findOrCreateOperation(application: ExternalApplicationContext, providerAccountId: string, operationKey: string, idempotencyKey: string, payload: string, payloadHash: string) {
  const existing = await prisma.externalTransportOperation.findFirst({
    where: { organizationId: application.organizationId, applicationId: application.id, idempotencyKey },
  });
  if (existing) return existing;
  try {
    return await prisma.externalTransportOperation.create({
      data: {
        direction: "OUTBOUND",
        operationKey,
        idempotencyKey,
        payloadHash,
        payloadCiphertext: encryptExternalApplicationValue(payload),
        organizationId: application.organizationId,
        applicationId: application.id,
        providerAccountId,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return prisma.externalTransportOperation.findFirstOrThrow({
      where: { organizationId: application.organizationId, applicationId: application.id, idempotencyKey },
    });
  }
}

function finalizeOperation(id: string, leaseToken: string, rejectionCode: string) {
  return prisma.externalTransportOperation.updateMany({
    where: { id, status: "SUBMISSION_UNKNOWN", leaseToken },
    data: { status: "REJECTED", rejectionCode, failedAt: new Date(), leaseToken: null, leaseExpiresAt: null },
  });
}

function rejectPendingOperation(id: string, rejectionCode: string) {
  return prisma.externalTransportOperation.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", rejectionCode, failedAt: new Date() },
  });
}

async function hasOpenConversationWindow(application: ExternalApplicationContext, providerAccountId: string, recipient: string) {
  try {
    return await hasActiveExternalWhatsAppConversationWindow({
      organizationId: application.organizationId,
      applicationId: application.id,
      providerAccountId,
      recipient,
    });
  } catch {
    // A failed lookup must never permit a free-form WhatsApp command.
    return false;
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
