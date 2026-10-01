-- Registry filter and overview health per sending number. Same constraints as
-- the application index: alone, concurrent, idempotent.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "communication_message_organizationId_senderAccountId_create_idx" ON "communication_message"("organizationId", "senderAccountId", "createdAt");
