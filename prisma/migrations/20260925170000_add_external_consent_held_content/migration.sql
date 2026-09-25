-- CreateEnum
CREATE TYPE "ExternalConsentHeldStatus" AS ENUM ('HELD', 'RELEASED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "external_recipient_consent" ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "requestAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requestProviderMessageId" TEXT,
ADD COLUMN     "requestQueuedAt" TIMESTAMP(3),
ADD COLUMN     "requestSentAt" TIMESTAMP(3),
ADD COLUMN     "requestTextCiphertext" TEXT,
ADD COLUMN     "requestTtlSeconds" INTEGER;

-- CreateTable
CREATE TABLE "external_consent_held_content" (
    "id" TEXT NOT NULL,
    "status" "ExternalConsentHeldStatus" NOT NULL DEFAULT 'HELD',
    "payloadCiphertext" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consentId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,

    CONSTRAINT "external_consent_held_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_consent_held_content_operationId_key" ON "external_consent_held_content"("operationId");

-- CreateIndex
CREATE INDEX "external_consent_held_content_consentId_status_idx" ON "external_consent_held_content"("consentId", "status");

-- CreateIndex
CREATE INDEX "external_consent_held_content_status_releasedAt_idx" ON "external_consent_held_content"("status", "releasedAt");

-- CreateIndex
CREATE INDEX "external_recipient_consent_status_expiresAt_idx" ON "external_recipient_consent"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "external_recipient_consent_providerAccountId_status_request_idx" ON "external_recipient_consent"("providerAccountId", "status", "requestSentAt");

-- AddForeignKey
ALTER TABLE "external_consent_held_content" ADD CONSTRAINT "external_consent_held_content_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "external_recipient_consent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_consent_held_content" ADD CONSTRAINT "external_consent_held_content_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "external_transport_operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

