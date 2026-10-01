-- Registry filter and overview health per sending number. Same constraints as
-- the application index: alone, concurrent, idempotent.
-- A failed concurrent build leaves an INVALID index that IF NOT EXISTS skips:
-- check pg_index.indisvalid, DROP INDEX CONCURRENTLY, then redeploy.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "communication_message_organizationId_senderAccountId_create_idx" ON "communication_message"("organizationId", "senderAccountId", "createdAt");
