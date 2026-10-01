-- Validates the foreign keys added NOT VALID by the previous migration. In its
-- own migration so the scan of communication_message runs under SHARE UPDATE
-- EXCLUSIVE only: messages keep being written and updated while it runs. The
-- new columns are null on every existing row, so validation finds nothing.

ALTER TABLE "communication_message" VALIDATE CONSTRAINT "communication_message_organizationId_applicationId_fkey";

ALTER TABLE "communication_message" VALIDATE CONSTRAINT "communication_message_organizationId_senderAccountId_fkey";
