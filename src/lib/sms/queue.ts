import { randomUUID } from "node:crypto";
import type { CommunicationMessage, Prisma } from "@/generated/prisma";
import { api } from "../../../convex/_generated/api";
import { convexServer } from "@/lib/convex-server";
import { prisma } from "@/lib/prisma";
import { isOrangeSmsEnabled } from "@/lib/transport-flags";
import { emitWebhookEvent } from "@/lib/mailpulse/webhooks";
import { serializeMessage } from "@/lib/mailpulse/serializers";
import { smsProviderFor } from ".";
import {
  persistOrangeSmsDeliveryReceipt,
  reconcileOrangeSmsDeliveryReceipt,
  reconcilePersistedOrangeSmsProviderMessage,
  reconcileUnmatchedOrangeSmsDeliveryReceipts,
} from "./delivery-receipts";
import { SmsProviderError } from "./types";
import { canReceiveChannel } from "@/lib/mailpulse/consent";

type SmsMessage = CommunicationMessage;

const SMS_CAMPAIGN_TRANSACTION_MAX_RETRIES = 5;
const SMS_FINALIZATION_TRANSACTION_MAX_RETRIES = 3;
const SMS_BATCH_SIZE = 200;
const SMS_DISPATCH_CONCURRENCY = 5;
const SMS_LEASE_ID = "orange-ci";
const SMS_WORKER_MAX_DURATION_MS = 48_000;
const SMS_LEASE_DURATION_MS = 90_000;
const SMS_LEASE_RENEWAL_INTERVAL_MS = 20_000;
const SMS_PROCESSING_TIMEOUT_MS = 120_000;
const SMS_POST_DISPATCH_TIMEOUT_MS = 5_000;

async function dispatchSmsMessage(message: SmsMessage) {
  const contact = message.contactId
    ? await prisma.contact.findUnique({ where: { id: message.contactId }, select: { subscribed: true, metadata: true } })
    : null;
  if (!canReceiveChannel(contact, "SMS")) {
    return finalizeSmsDispatch(message, {
      status: "FAILED",
      errorCode: "consent_denied",
      errorMessage: "Le destinataire a refuse les SMS.",
    });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: message.organizationId },
    select: {
      smsEnabled: true,
      smsProvider: true,
      smsSenderAddress: true,
      smsSenderName: true,
    },
  });

  if (!organization?.smsEnabled || !organization.smsProvider || !organization.smsSenderAddress) {
    return finalizeSmsDispatch(message, {
      status: "FAILED",
      errorCode: "channel_not_configured",
      errorMessage: "SMS n'est pas configuré pour cette organisation.",
    });
  }

  if (process.env.ORANGE_SMS_OWNER_ORGANIZATION_ID !== message.organizationId) {
    return finalizeSmsDispatch(message, {
      status: "FAILED",
      errorCode: "sms_not_authorized",
      errorMessage: "Cette organisation n'est pas autorisée à utiliser le compte Orange SMS.",
    });
  }

  try {
    const result = await smsProviderFor(organization.smsProvider).send({
      to: message.recipientValue,
      text: message.text ?? "",
      senderAddress: organization.smsSenderAddress,
      senderName: organization.smsSenderName,
    });

    return finalizeSmsDispatch(message, {
      status: "SENT",
      sentAt: new Date(),
      providerMessageId: result.providerMessageId,
      provider: organization.smsProvider,
      errorCode: null,
      errorMessage: null,
      nextRetryAt: null,
    });
  } catch (error) {
    if (error instanceof SmsProviderError && error.submissionState === "unknown") {
      return finalizeSmsDispatch(message, {
        status: "SUBMISSION_UNKNOWN",
        errorCode: "submission_unknown",
        errorMessage: error.message,
      });
    }

    if (error instanceof SmsProviderError && error.retryable && message.retryCount < 3) {
      const retryCount = message.retryCount + 1;
      return finalizeSmsDispatch(message, {
        status: "RETRYING",
        retryCount,
        nextRetryAt: new Date(Date.now() + 60_000 * 2 ** retryCount),
        errorCode: "provider_temporary_error",
        errorMessage: error.message,
      });
    }

    return finalizeSmsDispatch(message, {
      status: "FAILED",
      errorCode: "provider_error",
      errorMessage: error instanceof Error ? error.message : "Échec de l'envoi SMS.",
    });
  }
}

async function finalizeSmsDispatch(
  message: SmsMessage,
  data: Prisma.CommunicationMessageUpdateManyMutationInput,
) {
  for (let attempt = 0; attempt < SMS_FINALIZATION_TRANSACTION_MAX_RETRIES; attempt += 1) {
    try {
      const finalized = await prisma.$transaction(async (tx) => {
        const updated = await tx.communicationMessage.updateMany({
          where: { id: message.id, status: "PROCESSING", processingToken: message.processingToken },
          data: { ...data, processingStartedAt: null, processingToken: null },
        });
        const persisted = await tx.communicationMessage.findUniqueOrThrow({ where: { id: message.id } });
        if (updated.count === 0) return { message: persisted, changed: false };
        return reconcilePersistedOrangeSmsProviderMessage(tx, persisted);
      }, { isolationLevel: "Serializable" });
      return finalized.message;
    } catch (error) {
      if (!isSmsCampaignSerializationConflict(error) || attempt === SMS_FINALIZATION_TRANSACTION_MAX_RETRIES - 1) throw error;
    }
  }

  throw new Error("SMS dispatch finalization transaction retries exhausted.");
}

function smsCampaignContext(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = metadata as Record<string, unknown>;
  return typeof value.campaignId === "string" && typeof value.recipientId === "string"
    ? { campaignId: value.campaignId, recipientId: value.recipientId }
    : null;
}

export async function syncSmsCampaignProgress(message: SmsMessage) {
  for (let attempt = 0; attempt < SMS_CAMPAIGN_TRANSACTION_MAX_RETRIES; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        await syncSmsCampaignProgressInTransaction(tx, message);
      }, { isolationLevel: "Serializable" });
      return;
    } catch (error) {
      const canRetry = isSmsCampaignSerializationConflict(error)
        && attempt < SMS_CAMPAIGN_TRANSACTION_MAX_RETRIES - 1;
      if (canRetry) continue;
      throw error;
    }
  }
}

export async function syncSmsCampaignProgressInTransaction(
  tx: Prisma.TransactionClient,
  message: SmsMessage,
) {
  const context = smsCampaignContext(message.metadata);
  if (!context) return;
  await applySmsCampaignTransition(tx, context, message);
}

async function applySmsCampaignTransition(
  tx: Prisma.TransactionClient,
  context: { campaignId: string; recipientId: string },
  message: SmsMessage,
) {
  if (message.status === "SENT") {
    await markSmsRecipientSent(tx, context, message.sentAt ?? new Date());
    await closeSmsCampaignIfComplete(tx, context.campaignId);
    return;
  }
  if (message.status === "DELIVERED") {
    await markSmsRecipientSent(tx, context, message.sentAt ?? new Date());
    const delivered = await tx.campaignRecipient.updateMany({
      where: { id: context.recipientId, campaignId: context.campaignId, deliveredAt: null },
      data: { deliveredAt: message.deliveredAt ?? new Date() },
    });
    if (delivered.count === 1) {
      await incrementCampaignAnalytics(tx, context.campaignId, "totalDelivered");
    }
    await closeSmsCampaignIfComplete(tx, context.campaignId);
    return;
  }
  if (message.status === "DUPLICATE_CONFIRMED") {
    await markSmsRecipientSent(tx, context, message.sentAt ?? new Date());
    await closeSmsCampaignIfComplete(tx, context.campaignId);
    return;
  }
  if (message.status === "FAILED" || (message.status === "RECONCILED" && message.reconciliationDecision === "NO_FURTHER_ACTION")) {
    const failed = await tx.campaignRecipient.updateMany({
      where: { id: context.recipientId, campaignId: context.campaignId, bouncedAt: null },
      data: { bouncedAt: message.failedAt ?? new Date() },
    });
    if (failed.count === 1) {
      await incrementCampaignAnalytics(tx, context.campaignId, "totalBounced");
    }
    await closeSmsCampaignIfComplete(tx, context.campaignId);
  }
}

async function markSmsRecipientSent(
  tx: Prisma.TransactionClient,
  context: { campaignId: string; recipientId: string },
  sentAt: Date,
) {
  const sent = await tx.campaignRecipient.updateMany({
    where: { id: context.recipientId, campaignId: context.campaignId, sentAt: null },
    data: { sentAt },
  });
  if (sent.count === 1) {
    await incrementCampaignAnalytics(tx, context.campaignId, "totalSent");
  }
}

async function incrementCampaignAnalytics(
  tx: Prisma.TransactionClient,
  campaignId: string,
  field: "totalSent" | "totalDelivered" | "totalBounced",
) {
  await tx.campaignAnalytics.upsert({
    where: { campaignId },
    update: { [field]: { increment: 1 } },
    create: { campaignId, [field]: 1 },
  });
}

async function closeSmsCampaignIfComplete(tx: Prisma.TransactionClient, campaignId: string) {
  const analytics = await tx.campaignAnalytics.findUnique({
    where: { campaignId },
    select: { totalQueued: true, totalSent: true, totalBounced: true },
  });
  if (!analytics?.totalQueued || analytics.totalSent + analytics.totalBounced < analytics.totalQueued) return;
  await tx.campaign.updateMany({
    where: { id: campaignId, status: "SENDING" },
    data: { status: "SENT", completedAt: new Date() },
  });
}

function isSmsCampaignSerializationConflict(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2034";
}

export async function processSmsQueue(limit = SMS_BATCH_SIZE) {
  if (!isOrangeSmsEnabled()) {
    return { processed: 0, leaseAcquired: false, transport: "disabled" as const };
  }

  const now = new Date();
  const ownerToken = randomUUID();
  await prisma.smsDispatchLease.upsert({
    where: { id: SMS_LEASE_ID },
    create: { id: SMS_LEASE_ID },
    update: {},
  });

  const lease = await prisma.smsDispatchLease.updateMany({
    where: {
      id: SMS_LEASE_ID,
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: {
      ownerToken,
      lockedUntil: new Date(now.getTime() + SMS_LEASE_DURATION_MS),
    },
  });
  if (lease.count === 0) return { processed: 0, leaseAcquired: false };

  try {
    await recoverExpiredSmsClaims(now);
    await reconcileUnmatchedOrangeSmsReceipts();
    return await processClaimedSmsBatch(now, ownerToken, limit, Date.now() + SMS_WORKER_MAX_DURATION_MS);
  } finally {
    await prisma.smsDispatchLease.updateMany({
      where: { id: SMS_LEASE_ID, ownerToken },
      data: { ownerToken: null, lockedUntil: null },
    });
  }
}

async function reconcileUnmatchedOrangeSmsReceipts() {
  const organizationId = process.env.ORANGE_SMS_OWNER_ORGANIZATION_ID;
  if (!organizationId) return;

  const reconciliations = await reconcileUnmatchedOrangeSmsDeliveryReceipts({ organizationId });
  for (const reconciliation of reconciliations) {
    if (!reconciliation.message || !reconciliation.changed) continue;
    const response = serializeMessage(reconciliation.message);
    await syncSmsCampaignProgress(reconciliation.message);
    await Promise.all([
      completeWithin(syncLiveMessage(reconciliation.message.organizationId, response), SMS_POST_DISPATCH_TIMEOUT_MS),
      completeWithin(emitWebhookEvent({
        organizationId: reconciliation.message.organizationId,
        type: webhookEventForStatus(reconciliation.message.status),
        messageId: reconciliation.message.id,
        data: { message: response },
      }), SMS_POST_DISPATCH_TIMEOUT_MS),
    ]);
  }
}

async function recoverExpiredSmsClaims(now: Date) {
  await prisma.communicationMessage.updateMany({
    where: {
      channel: "SMS",
      status: "PROCESSING",
      processingStartedAt: { lt: new Date(now.getTime() - SMS_PROCESSING_TIMEOUT_MS) },
    },
    data: {
      status: "SUBMISSION_UNKNOWN",
      errorCode: "worker_interrupted",
      errorMessage: "Le worker s'est interrompu pendant la soumission Orange. Vérifiez la livraison avant de renvoyer ce SMS.",
      processingStartedAt: null,
      processingToken: null,
    },
  });
}

async function processClaimedSmsBatch(now: Date, processingToken: string, limit: number, deadline: number) {
  const candidates = await prisma.communicationMessage.findMany({
    where: { channel: "SMS", OR: [{ status: "QUEUED" }, { status: "RETRYING", nextRetryAt: { lte: now } }] },
    orderBy: { queuedAt: "asc" },
    take: Math.min(Math.max(limit, 1), SMS_BATCH_SIZE),
    select: { id: true },
  });

  let processed = 0;
  let candidateIndex = 0;
  let lastLeaseRenewal = Date.now();

  const claimAndDispatch = async () => {
    while (Date.now() < deadline) {
      const candidate = candidates[candidateIndex++];
      if (!candidate) return;

      if (Date.now() - lastLeaseRenewal >= SMS_LEASE_RENEWAL_INTERVAL_MS) {
        const renewed = await renewSmsLease(processingToken);
        if (!renewed) return;
        lastLeaseRenewal = Date.now();
      }

      const message = await claimSmsMessage(candidate.id, processingToken, now);
      if (!message) continue;

      const updated = await dispatchSmsMessage(message);
      await syncSmsCampaignProgress(updated);
      const response = serializeMessage(updated);
      await Promise.all([
        completeWithin(syncLiveMessage(updated.organizationId, response), SMS_POST_DISPATCH_TIMEOUT_MS),
        completeWithin(emitWebhookEvent({
          organizationId: updated.organizationId,
          type: webhookEventForStatus(updated.status),
          messageId: updated.id,
          data: { message: response },
        }), SMS_POST_DISPATCH_TIMEOUT_MS),
      ]);
      processed += 1;
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(SMS_DISPATCH_CONCURRENCY, candidates.length) }, claimAndDispatch),
  );

  return { processed, leaseAcquired: true };
}

async function renewSmsLease(ownerToken: string) {
  const renewed = await prisma.smsDispatchLease.updateMany({
    where: { id: SMS_LEASE_ID, ownerToken, lockedUntil: { gt: new Date() } },
    data: { lockedUntil: new Date(Date.now() + SMS_LEASE_DURATION_MS) },
  });
  return renewed.count === 1;
}

async function claimSmsMessage(messageId: string, processingToken: string, now: Date) {
  const claim = await prisma.communicationMessage.updateMany({
    where: {
      id: messageId,
      OR: [{ status: "QUEUED" }, { status: "RETRYING", nextRetryAt: { lte: now } }],
    },
    data: { status: "PROCESSING", processingStartedAt: new Date(), processingToken },
  });
  if (claim.count === 0) return null;
  return prisma.communicationMessage.findUnique({ where: { id: messageId } });
}

async function completeWithin(task: Promise<unknown>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutReached = new Promise<void>((resolve) => { timeout = setTimeout(resolve, timeoutMs); });
  try {
    await Promise.race([task.catch(() => undefined), timeoutReached]);
  } finally {
    clearTimeout(timeout!);
  }
}

export async function applyOrangeSmsDeliveryReceipt(params: { resourceId: string; deliveryStatus: string }) {
  const organizationId = process.env.ORANGE_SMS_OWNER_ORGANIZATION_ID;
  if (!organizationId) return null;
  await persistOrangeSmsDeliveryReceipt({
    organizationId,
    resourceId: params.resourceId,
    deliveryStatus: params.deliveryStatus,
  });
  const reconciliation = await reconcileOrangeSmsDeliveryReceipt({ organizationId, resourceId: params.resourceId });
  if (!reconciliation.message) return null;

  const updated = reconciliation.message;
  const response = serializeMessage(updated);
  if (!reconciliation.changed) return response;

  await syncSmsCampaignProgress(updated);
  await syncLiveMessage(updated.organizationId, response);
  await emitWebhookEvent({
    organizationId: updated.organizationId,
    type: webhookEventForStatus(updated.status),
    messageId: updated.id,
    data: { message: response },
  });
  return response;
}

function webhookEventForStatus(status: CommunicationMessage["status"]) {
  if (status === "DELIVERED") return "message.delivered";
  if (status === "FAILED") return "message.failed";
  if (status === "SUBMISSION_UNKNOWN") return "message.submission_unknown";
  return "message.sent";
}

async function syncLiveMessage(organizationId: string, message: ReturnType<typeof serializeMessage>) {
  try {
    const convexApi = api as unknown as {
      communication: { upsertMessage: Parameters<typeof convexServer.mutation>[0] };
    };
    await convexServer.mutation(convexApi.communication.upsertMessage, {
      organizationId,
      messageId: message.id,
      channel: message.channel,
      status: message.status,
      recipient: message.recipient.value,
      updatedAt: Date.now(),
    });
  } catch {
    // Convex is a live mirror only; durable Prisma writes remain authoritative.
  }
}
