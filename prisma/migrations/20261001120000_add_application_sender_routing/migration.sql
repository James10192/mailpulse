-- Routing by application: an API key speaks for an application, and a message
-- records the application and the sending account it left from. Additive only:
-- every column is nullable and no existing row changes until the backfill
-- script attaches keys to applications.
--
-- communication_message is the largest table. Its foreign keys are added NOT
-- VALID (no scan of existing rows under a write-blocking lock) and validated by
-- the next migration, which only takes a lock that lets writes through. The
-- registry filters on these columns get their indexes with the screens that
-- read them, built CONCURRENTLY.

-- AlterTable
ALTER TABLE "communication_message" ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "senderAccountId" TEXT,
ADD COLUMN     "senderSnapshot" JSONB;

-- AlterTable
ALTER TABLE "external_application" ADD COLUMN     "defaultEmailSenderId" TEXT;

-- AlterTable
ALTER TABLE "integration_api_key" ADD COLUMN     "applicationId" TEXT;

-- AlterTable
ALTER TABLE "provider_account" ADD COLUMN     "label" TEXT;

-- CreateIndex
CREATE INDEX "integration_api_key_organizationId_applicationId_idx" ON "integration_api_key"("organizationId", "applicationId");

-- AddForeignKey
ALTER TABLE "integration_api_key" ADD CONSTRAINT "integration_api_key_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_message" ADD CONSTRAINT "communication_message_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- AddForeignKey
ALTER TABLE "communication_message" ADD CONSTRAINT "communication_message_organizationId_senderAccountId_fkey" FOREIGN KEY ("organizationId", "senderAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
