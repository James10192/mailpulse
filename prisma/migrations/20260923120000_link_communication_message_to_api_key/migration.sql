-- Record which API key submitted a message, so the dashboard can show the
-- traffic of each named key. Nullable: platform, campaign and older messages
-- have no key. Keys are revoked, not deleted; SET NULL only covers a manual purge.
ALTER TABLE "communication_message" ADD COLUMN "apiKeyId" TEXT;

CREATE INDEX "communication_message_organizationId_apiKeyId_createdAt_idx"
  ON "communication_message"("organizationId", "apiKeyId", "createdAt");

ALTER TABLE "communication_message"
  ADD CONSTRAINT "communication_message_apiKeyId_fkey"
  FOREIGN KEY ("apiKeyId") REFERENCES "integration_api_key"("id") ON DELETE SET NULL ON UPDATE CASCADE;
