-- Registry filter by application. Built without locking writes on a table that
-- receives every message; CONCURRENTLY must be alone in its migration, outside
-- any transaction.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "communication_message_organizationId_applicationId_createdA_idx" ON "communication_message"("organizationId", "applicationId", "createdAt");
