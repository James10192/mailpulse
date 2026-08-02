CREATE TYPE "MetaWhatsAppInboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'FORWARD_UNKNOWN', 'FORWARDED');

CREATE TABLE "meta_whatsapp_inbox" (
    "id" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "status" "MetaWhatsAppInboxStatus" NOT NULL DEFAULT 'PENDING',
    "processingToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "forwardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_whatsapp_inbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meta_whatsapp_inbox_providerMessageId_key"
ON "meta_whatsapp_inbox"("providerMessageId");

CREATE INDEX "meta_whatsapp_inbox_status_leaseExpiresAt_idx"
ON "meta_whatsapp_inbox"("status", "leaseExpiresAt");
