import type { CommunicationMessage, Prisma, SmsDeliveryReceiptInbox } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  orangeSmsReceiptTargetStatus,
  preferredOrangeSmsDeliveryStatus,
  type OrangeSmsDeliveryStatus,
} from "./delivery-receipt-status";

const ORANGE_SMS_PROVIDER = "ORANGE_CI";
const RECEIPT_TRANSACTION_MAX_RETRIES = 3;

type SmsReceiptTransaction = Pick<Prisma.TransactionClient, "communicationMessage" | "smsDeliveryReceiptInbox">;

export type OrangeSmsReceiptReconciliation = {
  message: CommunicationMessage | null;
  changed: boolean;
};

export async function persistOrangeSmsDeliveryReceipt(params: {
  organizationId: string;
  resourceId: string;
  deliveryStatus: OrangeSmsDeliveryStatus;
}) {
  return withReceiptTransaction((tx) => persistOrangeSmsDeliveryReceiptInTransaction(tx, params));
}

export async function reconcileOrangeSmsDeliveryReceipt(params: {
  organizationId: string;
  resourceId: string;
}) {
  return withReceiptTransaction(async (tx) => {
    const receipt = await tx.smsDeliveryReceiptInbox.findUnique({
      where: {
        organizationId_provider_providerMessageId: {
          organizationId: params.organizationId,
          provider: ORANGE_SMS_PROVIDER,
          providerMessageId: params.resourceId,
        },
      },
    });
    if (!receipt) return { message: null, changed: false };

    const message = await tx.communicationMessage.findUnique({
      where: {
        organizationId_channel_provider_providerMessageId: {
          organizationId: params.organizationId,
          channel: "SMS",
          provider: ORANGE_SMS_PROVIDER,
          providerMessageId: params.resourceId,
        },
      },
    });
    if (!message) return { message: null, changed: false };

    return applyReceiptToMessageInTransaction(tx, receipt, message);
  });
}

/**
 * Replays acknowledgements that arrived before the dispatch transaction made
 * the Orange resource ID visible. Unmatched rows stay durable until a later
 * worker run can correlate them.
 */
export async function reconcileUnmatchedOrangeSmsDeliveryReceipts(input: {
  organizationId: string;
  limit?: number;
}) {
  const receipts = await prisma.smsDeliveryReceiptInbox.findMany({
    where: {
      organizationId: input.organizationId,
      provider: ORANGE_SMS_PROVIDER,
      matchedAt: null,
    },
    orderBy: { firstReceivedAt: "asc" },
    take: Math.min(Math.max(input.limit ?? 50, 1), 200),
    select: { providerMessageId: true },
  });
  return Promise.all(receipts.map((receipt) => reconcileOrangeSmsDeliveryReceipt({
    organizationId: input.organizationId,
    resourceId: receipt.providerMessageId,
  })));
}

export async function reconcilePersistedOrangeSmsProviderMessage(
  tx: SmsReceiptTransaction,
  message: CommunicationMessage,
): Promise<{ message: CommunicationMessage; changed: boolean }> {
  if (message.channel !== "SMS" || message.provider !== ORANGE_SMS_PROVIDER || !message.providerMessageId) {
    return { message, changed: false };
  }

  const receipt = await tx.smsDeliveryReceiptInbox.findUnique({
    where: {
      organizationId_provider_providerMessageId: {
        organizationId: message.organizationId,
        provider: ORANGE_SMS_PROVIDER,
        providerMessageId: message.providerMessageId,
      },
    },
  });
  if (!receipt) return { message, changed: false };

  return applyReceiptToMessageInTransaction(tx, receipt, message);
}

async function persistOrangeSmsDeliveryReceiptInTransaction(
  tx: SmsReceiptTransaction,
  params: {
    organizationId: string;
    resourceId: string;
    deliveryStatus: OrangeSmsDeliveryStatus;
  },
) {
  const where = {
    organizationId_provider_providerMessageId: {
      organizationId: params.organizationId,
      provider: ORANGE_SMS_PROVIDER,
      providerMessageId: params.resourceId,
    },
  };
  const existing = await tx.smsDeliveryReceiptInbox.findUnique({ where });
  if (!existing) {
    return tx.smsDeliveryReceiptInbox.create({
      data: {
        organizationId: params.organizationId,
        provider: ORANGE_SMS_PROVIDER,
        providerMessageId: params.resourceId,
        deliveryStatus: params.deliveryStatus,
      },
    });
  }

  return tx.smsDeliveryReceiptInbox.update({
    where: { id: existing.id },
    data: {
      deliveryStatus: preferredOrangeSmsDeliveryStatus(existing.deliveryStatus, params.deliveryStatus),
      callbackCount: { increment: 1 },
      lastReceivedAt: new Date(),
    },
  });
}

async function applyReceiptToMessageInTransaction(
  tx: SmsReceiptTransaction,
  receipt: SmsDeliveryReceiptInbox,
  message: CommunicationMessage,
): Promise<{ message: CommunicationMessage; changed: boolean }> {
  const targetStatus = orangeSmsReceiptTargetStatus(receipt.deliveryStatus);
  const changed = targetStatus ? await applyOrangeSmsReceiptStatus(tx, message, targetStatus) : null;
  const currentMessage = changed ?? message;

  await tx.smsDeliveryReceiptInbox.update({
    where: { id: receipt.id },
    data: { messageId: currentMessage.id, matchedAt: new Date() },
  });

  return { message: currentMessage, changed: changed !== null };
}

async function applyOrangeSmsReceiptStatus(
  tx: SmsReceiptTransaction,
  message: CommunicationMessage,
  targetStatus: "DELIVERED" | "SUBMISSION_UNKNOWN",
) {
  const transition = await tx.communicationMessage.updateMany({
    where: targetStatus === "DELIVERED"
      ? { id: message.id, status: { not: "DELIVERED" } }
      : { id: message.id, status: { in: ["SENT", "RETRYING", "PROCESSING", "SUBMISSION_UNKNOWN"] } },
    data: targetStatus === "DELIVERED"
      ? {
          status: targetStatus,
          sentAt: message.sentAt ?? new Date(),
          deliveredAt: new Date(),
          errorCode: null,
          errorMessage: null,
        }
      : {
          status: targetStatus,
          errorCode: "delivery_impossible_unconfirmed",
          errorMessage: "Orange signale une remise impossible. Vérifiez la livraison avant de renvoyer ce SMS.",
        },
  });
  if (transition.count === 0) return null;
  return tx.communicationMessage.findUniqueOrThrow({ where: { id: message.id } });
}

async function withReceiptTransaction<T>(operation: (tx: SmsReceiptTransaction) => Promise<T>) {
  for (let attempt = 0; attempt < RECEIPT_TRANSACTION_MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      if (isTransactionContention(error) && attempt < RECEIPT_TRANSACTION_MAX_RETRIES - 1) continue;
      throw error;
    }
  }

  throw new Error("SMS receipt transaction retries exhausted.");
}

function isTransactionContention(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && ((error.code === "P2034") || (error.code === "P2002"));
}
