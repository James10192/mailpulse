import type { Prisma } from "@/generated/prisma";

import { hashExternalApplicationRecipient } from "@/lib/external-applications/crypto";
import {
  externalWhatsAppWindowExpiresAt,
  isExternalWhatsAppWindowOpen,
} from "@/lib/external-applications/conversation-window-policy";
import { prisma } from "@/lib/prisma";

export { externalWhatsAppWindowExpiresAt, isExternalWhatsAppWindowOpen };

type ConversationWindowDatabase = Pick<Prisma.TransactionClient, "externalConversationWindow">;

type ConversationWindowScope = {
  organizationId: string;
  applicationId: string;
  providerAccountId: string;
  recipient: string;
};

/**
 * Extends rather than replaces an existing expiry. The conditional update keeps
 * out-of-order webhook deliveries from shortening an already-open window.
 * A message whose provider timestamp has already expired cannot reopen a window.
 * Call this inside the transaction that durably records the inbound event.
 */
export async function extendExternalWhatsAppConversationWindow(
  db: ConversationWindowDatabase,
  scope: ConversationWindowScope,
  inboundAt = new Date(),
  now = new Date(),
) {
  const recipientHash = hashExternalApplicationRecipient(scope.recipient);
  const expiresAt = externalWhatsAppWindowExpiresAt(inboundAt);
  if (!isExternalWhatsAppWindowOpen(expiresAt, now)) return;
  const where = {
    organizationId: scope.organizationId,
    applicationId: scope.applicationId,
    providerAccountId: scope.providerAccountId,
    channel: "WHATSAPP" as const,
    recipientHash,
  };

  const extended = await db.externalConversationWindow.updateMany({
    where: { ...where, expiresAt: { lt: expiresAt } },
    data: { lastInboundAt: inboundAt, expiresAt },
  });
  if (extended.count === 1) return;

  const existing = await db.externalConversationWindow.findUnique({
    where: { organizationId_applicationId_providerAccountId_channel_recipientHash: where },
    select: { id: true },
  });
  if (existing) return;

  await db.externalConversationWindow.create({
    data: { ...where, lastInboundAt: inboundAt, expiresAt },
  });
}

export async function hasActiveExternalWhatsAppConversationWindow(scope: ConversationWindowScope, now = new Date()) {
  const recipientHash = hashExternalApplicationRecipient(scope.recipient);
  const window = await prisma.externalConversationWindow.findFirst({
    where: {
      organizationId: scope.organizationId,
      applicationId: scope.applicationId,
      providerAccountId: scope.providerAccountId,
      channel: "WHATSAPP",
      recipientHash,
      expiresAt: { gt: now },
    },
    select: { expiresAt: true },
  });
  return isExternalWhatsAppWindowOpen(window?.expiresAt, now);
}
