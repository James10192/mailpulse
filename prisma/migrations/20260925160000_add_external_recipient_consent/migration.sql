-- CreateEnum
CREATE TYPE "ExternalConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'REFUSED', 'EXPIRED');

-- AlterTable
ALTER TABLE "external_transport_operation" ADD COLUMN     "rejectionCode" TEXT;

-- CreateTable
CREATE TABLE "external_recipient_consent" (
    "id" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "recipientCiphertext" TEXT NOT NULL,
    "status" "ExternalConsentStatus" NOT NULL,
    "proofCiphertext" TEXT,
    "grantedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "external_recipient_consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_recipient_consent_organizationId_applicationId_pro_key" ON "external_recipient_consent"("organizationId", "applicationId", "providerAccountId", "recipientHash");

-- AddForeignKey
ALTER TABLE "external_recipient_consent" ADD CONSTRAINT "external_recipient_consent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_recipient_consent" ADD CONSTRAINT "external_recipient_consent_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_recipient_consent" ADD CONSTRAINT "external_recipient_consent_organizationId_providerAccountI_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

