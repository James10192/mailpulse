CREATE TYPE "IntegrationProvider" AS ENUM ('FILON');
CREATE TYPE "FilonRecoveryStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');
CREATE TYPE "RecoveryStepChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'HUMAN_ACTION');
CREATE TYPE "RecoveryStepStatus" AS ENUM ('PENDING', 'PREPARED', 'SENT', 'SKIPPED', 'FAILED', 'CANCELLED');

CREATE TABLE "integration_api_key" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'FILON',
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "integration_api_key_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "filon_recovery" (
    "id" TEXT NOT NULL,
    "filonOpportunityId" TEXT NOT NULL,
    "externalWorkspaceId" TEXT,
    "externalUserId" TEXT,
    "opportunityTitle" TEXT NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "status" "FilonRecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "lastReminderAt" TIMESTAMP(3),
    "nextReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "filon_recovery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "filon_recovery_step" (
    "id" TEXT NOT NULL,
    "recoveryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "channel" "RecoveryStepChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "RecoveryStepStatus" NOT NULL DEFAULT 'PREPARED',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filon_recovery_step_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_api_key_keyHash_key" ON "integration_api_key"("keyHash");
CREATE INDEX "integration_api_key_organizationId_provider_revokedAt_idx" ON "integration_api_key"("organizationId", "provider", "revokedAt");

CREATE UNIQUE INDEX "filon_recovery_organizationId_filonOpportunityId_key" ON "filon_recovery"("organizationId", "filonOpportunityId");
CREATE INDEX "filon_recovery_organizationId_status_idx" ON "filon_recovery"("organizationId", "status");
CREATE INDEX "filon_recovery_nextReminderAt_idx" ON "filon_recovery"("nextReminderAt");

CREATE UNIQUE INDEX "filon_recovery_step_recoveryId_position_key" ON "filon_recovery_step"("recoveryId", "position");
CREATE INDEX "filon_recovery_step_recoveryId_scheduledAt_idx" ON "filon_recovery_step"("recoveryId", "scheduledAt");
CREATE INDEX "filon_recovery_step_status_scheduledAt_idx" ON "filon_recovery_step"("status", "scheduledAt");

ALTER TABLE "integration_api_key" ADD CONSTRAINT "integration_api_key_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filon_recovery" ADD CONSTRAINT "filon_recovery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filon_recovery" ADD CONSTRAINT "filon_recovery_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filon_recovery_step" ADD CONSTRAINT "filon_recovery_step_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "filon_recovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
