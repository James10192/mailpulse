-- An application may now hold several WhatsApp numbers; one of them is the
-- default, used when a request names none.
ALTER TABLE "provider_account" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- An application that had exactly one active WhatsApp number keeps sending
-- from it: that number becomes its default.
UPDATE "provider_account" AS pa
SET "isDefault" = true
WHERE pa."channel" = 'WHATSAPP'
  AND pa."applicationId" IS NOT NULL
  AND pa."active" = true
  AND (
    SELECT count(*) FROM "provider_account" AS other
    WHERE other."organizationId" = pa."organizationId"
      AND other."applicationId" = pa."applicationId"
      AND other."channel" = 'WHATSAPP'
      AND other."active" = true
  ) = 1;

-- Several active numbers per application are now allowed: the default, not
-- the database, decides which one speaks.
DROP INDEX IF EXISTS "provider_account_active_application_channel_provider_key";

-- At most one default number per application.
CREATE UNIQUE INDEX "provider_account_whatsapp_default_key"
  ON "provider_account" ("organizationId", "applicationId")
  WHERE "isDefault" = true AND "channel" = 'WHATSAPP' AND "applicationId" IS NOT NULL;
