-- Keep a durable provenance for every message while preserving unknown historical rows.
CREATE TYPE "MessageOrigin" AS ENUM ('API', 'PLATFORM', 'CAMPAIGN');

ALTER TABLE "communication_message"
  ADD COLUMN "origin" "MessageOrigin";

UPDATE "communication_message"
SET "origin" = 'CAMPAIGN'
WHERE "metadata" ? 'campaignId';

CREATE INDEX "communication_message_organizationId_origin_createdAt_idx"
  ON "communication_message"("organizationId", "origin", "createdAt");
