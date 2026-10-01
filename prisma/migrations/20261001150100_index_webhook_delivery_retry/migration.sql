-- Retry queue. Alone, concurrent, idempotent. A failed concurrent build leaves
-- an INVALID index that IF NOT EXISTS skips: check pg_index.indisvalid,
-- DROP INDEX CONCURRENTLY, then redeploy.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "webhook_delivery_status_nextRetryAt_idx" ON "webhook_delivery"("status", "nextRetryAt");
