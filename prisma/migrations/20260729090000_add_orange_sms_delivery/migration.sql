-- Orange SMS channel configuration and durable queue claim status.
CREATE TYPE "SmsProvider" AS ENUM ('ORANGE_CI');

ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "MessageStatus" ADD VALUE IF NOT EXISTS 'SUBMISSION_UNKNOWN';

ALTER TABLE "organization"
  ADD COLUMN "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smsProvider" "SmsProvider",
  ADD COLUMN "smsSenderAddress" TEXT,
  ADD COLUMN "smsSenderName" TEXT;

ALTER TABLE "communication_message"
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "processingToken" TEXT;

CREATE UNIQUE INDEX "communication_message_providerMessageId_key"
  ON "communication_message"("providerMessageId");

CREATE INDEX "communication_message_channel_status_nextRetryAt_queuedAt_idx"
  ON "communication_message"("channel", "status", "nextRetryAt", "queuedAt");

CREATE TABLE "sms_dispatch_lease" (
  "id" TEXT NOT NULL,
  "lockedUntil" TIMESTAMP(3),
  "ownerToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sms_dispatch_lease_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sms_dispatch_lease_lockedUntil_idx" ON "sms_dispatch_lease"("lockedUntil");
