-- The number a verification code left from, for verifications started by a key
-- attached to an application. Nullable: older rows and codes sent from the
-- organization's own number have none.

-- AlterTable
ALTER TABLE "phone_verification" ADD COLUMN     "senderAccountId" TEXT;

-- CreateIndex
-- Backs the foreign key's checks when a provider account changes or goes.
CREATE INDEX "phone_verification_organizationId_senderAccountId_idx" ON "phone_verification"("organizationId", "senderAccountId");

-- AddForeignKey
ALTER TABLE "phone_verification" ADD CONSTRAINT "phone_verification_organizationId_senderAccountId_fkey" FOREIGN KEY ("organizationId", "senderAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
