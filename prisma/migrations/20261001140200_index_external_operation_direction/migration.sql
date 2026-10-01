-- Overview counts of signed commands per period. Alone, concurrent, idempotent.
-- If a concurrent build fails it leaves an INVALID index that IF NOT EXISTS
-- would then skip: check pg_index.indisvalid, DROP INDEX CONCURRENTLY, redeploy.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "external_transport_operation_organizationId_direction_creat_idx" ON "external_transport_operation"("organizationId", "direction", "createdAt");
