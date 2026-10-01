-- Routing by application: an API key speaks for an application, and a message
-- records the application and the sending account it left from. Additive only:
-- every column is nullable and no existing row changes until the backfill
-- script attaches keys to applications.

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
CREATE INDEX "communication_message_organizationId_applicationId_createdA_idx" ON "communication_message"("organizationId", "applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_message_organizationId_senderAccountId_create_idx" ON "communication_message"("organizationId", "senderAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_api_key_organizationId_applicationId_idx" ON "integration_api_key"("organizationId", "applicationId");

-- AddForeignKey
ALTER TABLE "integration_api_key" ADD CONSTRAINT "integration_api_key_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_message" ADD CONSTRAINT "communication_message_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_message" ADD CONSTRAINT "communication_message_organizationId_senderAccountId_fkey" FOREIGN KEY ("organizationId", "senderAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
