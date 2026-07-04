CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'IDEA', 'OTHER');
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE', 'DISMISSED');
CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ABANDONED');

CREATE TABLE "feedback" (
  "id" TEXT NOT NULL,
  "type" "FeedbackType" NOT NULL,
  "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
  "message" TEXT NOT NULL,
  "context" TEXT,
  "pageTitle" TEXT,
  "browser" TEXT,
  "viewport" TEXT,
  "screenshotUrl" TEXT,
  "canContactBack" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,

  CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_payment" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
  "reference" TEXT NOT NULL,
  "authorizationUrl" TEXT,
  "accessCode" TEXT,
  "plan" "PlanTier" NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XOF',
  "status" "BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "providerStatus" TEXT,
  "paidAt" TIMESTAMP(3),
  "rawResponse" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,

  CONSTRAINT "billing_payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedback_organizationId_status_createdAt_idx" ON "feedback"("organizationId", "status", "createdAt");
CREATE INDEX "feedback_type_priority_idx" ON "feedback"("type", "priority");
CREATE UNIQUE INDEX "billing_payment_reference_key" ON "billing_payment"("reference");
CREATE INDEX "billing_payment_organizationId_status_createdAt_idx" ON "billing_payment"("organizationId", "status", "createdAt");

ALTER TABLE "feedback" ADD CONSTRAINT "feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_payment" ADD CONSTRAINT "billing_payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
