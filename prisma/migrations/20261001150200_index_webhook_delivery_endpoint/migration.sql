-- Delivery log per endpoint. Same constraints: alone, concurrent, idempotent.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "webhook_delivery_endpointId_createdAt_idx" ON "webhook_delivery"("endpointId", "createdAt");
