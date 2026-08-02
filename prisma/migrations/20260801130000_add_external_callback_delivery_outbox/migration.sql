CREATE TYPE "ExternalCallbackDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

CREATE TABLE "external_callback_delivery" (
    "id" TEXT NOT NULL,
    "sourceEndpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payloadCiphertext" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "secretCiphertext" TEXT NOT NULL,
    "status" "ExternalCallbackDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseAcquiredAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "operationId" TEXT NOT NULL,

    CONSTRAINT "external_callback_delivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_callback_delivery_operationId_sourceEndpointId_key"
  ON "external_callback_delivery"("operationId", "sourceEndpointId");
CREATE INDEX "external_callback_delivery_status_nextAttemptAt_idx"
  ON "external_callback_delivery"("status", "nextAttemptAt");
CREATE INDEX "external_callback_delivery_status_leaseExpiresAt_idx"
  ON "external_callback_delivery"("status", "leaseExpiresAt");
CREATE INDEX "external_callback_delivery_operationId_status_idx"
  ON "external_callback_delivery"("operationId", "status");

ALTER TABLE "external_callback_delivery"
  ADD CONSTRAINT "external_callback_delivery_operationId_fkey"
  FOREIGN KEY ("operationId") REFERENCES "external_transport_operation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
