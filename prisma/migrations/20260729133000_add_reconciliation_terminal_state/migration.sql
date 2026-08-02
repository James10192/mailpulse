ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'RECONCILED';
ALTER TYPE "MetaWhatsAppInboxStatus" ADD VALUE IF NOT EXISTS 'RECONCILED';

ALTER TABLE "communication_message"
  ADD COLUMN "reconciliationDecision" TEXT,
  ADD COLUMN "reconciledAt" TIMESTAMP(3),
  ADD COLUMN "reconciledById" TEXT;

ALTER TABLE "meta_whatsapp_inbox"
  ADD COLUMN "reconciliationDecision" TEXT,
  ADD COLUMN "reconciledAt" TIMESTAMP(3),
  ADD COLUMN "reconciledById" TEXT;
