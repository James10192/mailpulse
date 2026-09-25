/*
  Warnings:

  - You are about to drop the `meta_whatsapp_inbox` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sms_delivery_receipt_inbox" DROP CONSTRAINT "sms_delivery_receipt_inbox_organizationId_messageId_fkey";

-- DropTable
DROP TABLE "meta_whatsapp_inbox";

-- DropEnum
DROP TYPE "MetaWhatsAppInboxStatus";

-- CreateTable
CREATE TABLE "rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_key_key" ON "rate_limit"("key");

-- CreateIndex
CREATE INDEX "campaign_recipient_contactId_idx" ON "campaign_recipient"("contactId");

-- CreateIndex
CREATE INDEX "contact_organizationId_createdAt_idx" ON "contact"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_list_organizationId_idx" ON "contact_list"("organizationId");

-- RenameForeignKey
ALTER TABLE "application_forward_endpoint" RENAME CONSTRAINT "application_forward_endpoint_organizationId_providerAccountId_f" TO "application_forward_endpoint_organizationId_providerAccoun_fkey";

-- RenameForeignKey
ALTER TABLE "application_template_config" RENAME CONSTRAINT "application_template_config_organizationId_providerAccountId_fk" TO "application_template_config_organizationId_providerAccount_fkey";

-- RenameForeignKey
ALTER TABLE "external_conversation_window" RENAME CONSTRAINT "external_conversation_window_organizationId_providerAccountId_f" TO "external_conversation_window_organizationId_providerAccoun_fkey";

-- RenameForeignKey
ALTER TABLE "external_transport_operation" RENAME CONSTRAINT "external_transport_operation_organizationId_providerAccountId_f" TO "external_transport_operation_organizationId_providerAccoun_fkey";

-- AddForeignKey
ALTER TABLE "sms_delivery_receipt_inbox" ADD CONSTRAINT "sms_delivery_receipt_inbox_organizationId_messageId_fkey" FOREIGN KEY ("organizationId", "messageId") REFERENCES "communication_message"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "communication_message_organizationId_channel_provider_providerM" RENAME TO "communication_message_organizationId_channel_provider_provi_key";

-- RenameIndex
ALTER INDEX "communication_template_organizationId_templateKey_locale_channe" RENAME TO "communication_template_organizationId_templateKey_locale_ch_key";

-- RenameIndex
ALTER INDEX "external_application_credential_applicationId_purpose_revokedAt" RENAME TO "external_application_credential_applicationId_purpose_revok_idx";

-- RenameIndex
ALTER INDEX "external_application_credential_applicationId_purpose_version_k" RENAME TO "external_application_credential_applicationId_purpose_versi_key";

-- RenameIndex
ALTER INDEX "external_conversation_window_active_lookup_idx" RENAME TO "external_conversation_window_organizationId_applicationId_p_idx";

-- RenameIndex
ALTER INDEX "external_conversation_window_scope_recipient_key" RENAME TO "external_conversation_window_organizationId_applicationId_p_key";

-- RenameIndex
ALTER INDEX "external_transport_operation_applicationId_status_leaseExpiresA" RENAME TO "external_transport_operation_applicationId_status_leaseExpi_idx";

-- RenameIndex
ALTER INDEX "external_transport_operation_applicationId_status_nextCallbackA" RENAME TO "external_transport_operation_applicationId_status_nextCallb_idx";

-- RenameIndex
ALTER INDEX "external_transport_operation_organizationId_applicationId_idemp" RENAME TO "external_transport_operation_organizationId_applicationId_i_key";

-- RenameIndex
ALTER INDEX "external_transport_operation_organizationId_providerAccountId_p" RENAME TO "external_transport_operation_organizationId_providerAccount_key";

-- RenameIndex
ALTER INDEX "external_transport_operation_organizationId_status_createdAt_id" RENAME TO "external_transport_operation_organizationId_status_createdA_idx";

-- RenameIndex
ALTER INDEX "provider_account_organizationId_channel_provider_externalAccoun" RENAME TO "provider_account_organizationId_channel_provider_externalAc_key";

-- RenameIndex
ALTER INDEX "sms_delivery_receipt_inbox_organizationId_provider_matchedAt_id" RENAME TO "sms_delivery_receipt_inbox_organizationId_provider_matchedA_idx";

-- RenameIndex
ALTER INDEX "sms_delivery_receipt_inbox_organizationId_provider_providerMess" RENAME TO "sms_delivery_receipt_inbox_organizationId_provider_provider_key";
