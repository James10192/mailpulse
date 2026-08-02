-- Durable Orange delivery acknowledgements. The resource ID is unique only
-- within the tenant and provider scope, matching communication_message.
CREATE TABLE "sms_delivery_receipt_inbox" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL,
    "callbackCount" INTEGER NOT NULL DEFAULT 1,
    "firstReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "messageId" TEXT,

    CONSTRAINT "sms_delivery_receipt_inbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sms_delivery_receipt_inbox_organizationId_provider_providerMessageId_key"
  ON "sms_delivery_receipt_inbox"("organizationId", "provider", "providerMessageId");
CREATE INDEX "sms_delivery_receipt_inbox_organizationId_provider_matchedAt_idx"
  ON "sms_delivery_receipt_inbox"("organizationId", "provider", "matchedAt");
CREATE INDEX "sms_delivery_receipt_inbox_organizationId_messageId_idx"
  ON "sms_delivery_receipt_inbox"("organizationId", "messageId");
CREATE UNIQUE INDEX "communication_message_organizationId_id_key"
  ON "communication_message"("organizationId", "id");

ALTER TABLE "sms_delivery_receipt_inbox"
  ADD CONSTRAINT "sms_delivery_receipt_inbox_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sms_delivery_receipt_inbox"
  ADD CONSTRAINT "sms_delivery_receipt_inbox_organizationId_messageId_fkey"
  FOREIGN KEY ("organizationId", "messageId") REFERENCES "communication_message"("organizationId", "id")
  ON DELETE SET NULL ("messageId") ON UPDATE CASCADE;
