-- Registry filter by application. Built without locking writes on a table that
-- receives every message; CONCURRENTLY must be alone in its migration, outside
-- any transaction.
-- A failed concurrent build leaves an INVALID index that IF NOT EXISTS skips:
-- check pg_index.indisvalid, DROP INDEX CONCURRENTLY, then redeploy.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "communication_message_organizationId_applicationId_createdA_idx" ON "communication_message"("organizationId", "applicationId", "createdAt");
