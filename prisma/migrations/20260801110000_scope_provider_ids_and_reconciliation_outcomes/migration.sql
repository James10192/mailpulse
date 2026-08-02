-- Provider message IDs are only meaningful in a provider account and tenant scope.
ALTER TABLE "communication_message"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'UNSPECIFIED',
  ADD COLUMN "reconciliationFollowUpAt" TIMESTAMP(3),
  ADD COLUMN "reconciliationFollowUpById" TEXT;

ALTER TABLE "meta_whatsapp_inbox"
  ADD COLUMN "reconciliationFollowUpAt" TIMESTAMP(3),
  ADD COLUMN "reconciliationFollowUpById" TEXT;

-- Backfill stable provider scopes before replacing the old global uniqueness rule.
UPDATE "communication_message" AS message
SET "provider" = CASE
  WHEN message."channel" = 'SMS' THEN COALESCE(organization."smsProvider"::TEXT, 'ORANGE_CI')
  WHEN message."channel" = 'EMAIL' THEN 'EMAIL'
  WHEN message."channel" = 'WHATSAPP' THEN 'WHATSAPP'
  ELSE 'UNSPECIFIED'
END
FROM "organization" AS organization
WHERE organization."id" = message."organizationId";

DROP INDEX IF EXISTS "communication_message_providerMessageId_key";
CREATE UNIQUE INDEX "communication_message_organizationId_channel_provider_providerMessageId_key"
  ON "communication_message"("organizationId", "channel", "provider", "providerMessageId");

ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'DUPLICATE_CONFIRMED';
ALTER TYPE "MetaWhatsAppInboxStatus" ADD VALUE IF NOT EXISTS 'DUPLICATE_CONFIRMED';
