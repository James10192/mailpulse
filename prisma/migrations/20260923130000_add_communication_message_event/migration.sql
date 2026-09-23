-- Provider notices that do not change a message status (delivery delays).
-- Additive only: a new enum, a new table, and a new email event type.
CREATE TYPE "CommunicationMessageEventType" AS ENUM ('DELIVERY_DELAYED');

CREATE TABLE "communication_message_event" (
    "id" TEXT NOT NULL,
    "type" "CommunicationMessageEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "communication_message_event_pkey" PRIMARY KEY ("id")
);

-- The provider event identifier makes a redelivered webhook a no-op.
CREATE UNIQUE INDEX "communication_message_event_provider_providerEventId_key"
  ON "communication_message_event"("provider", "providerEventId");
CREATE INDEX "communication_message_event_messageId_occurredAt_idx"
  ON "communication_message_event"("messageId", "occurredAt");
CREATE INDEX "communication_message_event_organizationId_idx"
  ON "communication_message_event"("organizationId");

ALTER TABLE "communication_message_event"
  ADD CONSTRAINT "communication_message_event_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "communication_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_message_event"
  ADD CONSTRAINT "communication_message_event_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Campaign recipients get a SUPPRESSED event when the provider refuses to send.
ALTER TYPE "EmailEventType" ADD VALUE IF NOT EXISTS 'SUPPRESSED' BEFORE 'UNSUBSCRIBED';
