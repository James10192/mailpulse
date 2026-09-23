-- Phone number verification by one-time code. Additive only: four new enums and
-- one new table, nothing existing is altered. The code is never stored, only a
-- salted HMAC of it in "codeHash".
CREATE TYPE "PhoneVerificationChannel" AS ENUM ('WHATSAPP');

CREATE TYPE "PhoneVerificationError" AS ENUM ('RECIPIENT_UNREACHABLE', 'REJECTED', 'TIMEOUT', 'TRANSPORT');

CREATE TYPE "PhoneVerificationLocale" AS ENUM ('fr', 'en');

CREATE TYPE "PhoneVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'EXPIRED', 'MAX_ATTEMPTS', 'CANCELED', 'FAILED');

CREATE TABLE "phone_verification" (
    "id" TEXT NOT NULL,
    "channel" "PhoneVerificationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "phoneNumber" TEXT NOT NULL,
    "locale" "PhoneVerificationLocale" NOT NULL DEFAULT 'fr',
    "reference" TEXT,
    "codeHash" TEXT NOT NULL,
    "status" "PhoneVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerMessageId" TEXT,
    "errorCode" "PhoneVerificationError",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "apiKeyId" TEXT,

    CONSTRAINT "phone_verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "phone_verification_organizationId_phoneNumber_createdAt_idx"
  ON "phone_verification"("organizationId", "phoneNumber", "createdAt");

CREATE INDEX "phone_verification_organizationId_createdAt_idx"
  ON "phone_verification"("organizationId", "createdAt");

CREATE INDEX "phone_verification_apiKeyId_createdAt_idx"
  ON "phone_verification"("apiKeyId", "createdAt");

ALTER TABLE "phone_verification"
  ADD CONSTRAINT "phone_verification_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keys are revoked, not deleted; SET NULL only covers a manual purge.
ALTER TABLE "phone_verification"
  ADD CONSTRAINT "phone_verification_apiKeyId_fkey"
  FOREIGN KEY ("apiKeyId") REFERENCES "integration_api_key"("id") ON DELETE SET NULL ON UPDATE CASCADE;
