-- MailPulse V1 generic communication platform
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'MAILPULSE';

CREATE TYPE "ApiKeyEnvironment" AS ENUM ('LIVE', 'TEST');
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
CREATE TYPE "RecipientType" AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'TEMPLATE');
CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'RETRYING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED', 'TEMPLATE_REQUIRED');
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'APPROVED', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED');
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING');

ALTER TABLE "integration_api_key"
  ADD COLUMN "environment" "ApiKeyEnvironment" NOT NULL DEFAULT 'LIVE';

CREATE TABLE "communication_template" (
  "id" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "channel" "CommunicationChannel" NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "contentType" "MessageContentType" NOT NULL DEFAULT 'TEMPLATE',
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "variables" JSONB,
  "providerTemplateId" TEXT,
  "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "communication_template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation" (
  "id" TEXT NOT NULL,
  "channel" "CommunicationChannel" NOT NULL,
  "recipientType" "RecipientType" NOT NULL,
  "recipientValue" TEXT NOT NULL,
  "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  "lastInboundAt" TIMESTAMP(3),
  "serviceWindowExpiresAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "contactId" TEXT,
  CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_message" (
  "id" TEXT NOT NULL,
  "channel" "CommunicationChannel" NOT NULL,
  "direction" "MessageDirection" NOT NULL DEFAULT 'OUTBOUND',
  "recipientType" "RecipientType" NOT NULL,
  "recipientValue" TEXT NOT NULL,
  "contentType" "MessageContentType" NOT NULL,
  "text" TEXT,
  "templateKey" TEXT,
  "locale" TEXT,
  "variables" JSONB,
  "metadata" JSONB,
  "externalUserId" TEXT,
  "externalEventId" TEXT,
  "externalTenantId" TEXT,
  "idempotencyKey" TEXT,
  "providerMessageId" TEXT,
  "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "contactId" TEXT,
  "conversationId" TEXT,
  "templateId" TEXT,
  CONSTRAINT "communication_message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_endpoint" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "events" TEXT[],
  "signingSecret" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "secretPreview" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "webhook_endpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_delivery" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "messageId" TEXT,
  CONSTRAINT "webhook_delivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "idempotency_record" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
  "id" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "communication_template_organizationId_templateKey_locale_channel_key" ON "communication_template"("organizationId", "templateKey", "locale", "channel");
CREATE INDEX "communication_template_organizationId_channel_status_idx" ON "communication_template"("organizationId", "channel", "status");
CREATE INDEX "conversation_organizationId_channel_status_idx" ON "conversation"("organizationId", "channel", "status");
CREATE INDEX "conversation_organizationId_recipientValue_idx" ON "conversation"("organizationId", "recipientValue");
CREATE UNIQUE INDEX "communication_message_organizationId_idempotencyKey_key" ON "communication_message"("organizationId", "idempotencyKey");
CREATE INDEX "communication_message_organizationId_status_createdAt_idx" ON "communication_message"("organizationId", "status", "createdAt");
CREATE INDEX "communication_message_organizationId_channel_createdAt_idx" ON "communication_message"("organizationId", "channel", "createdAt");
CREATE INDEX "communication_message_conversationId_createdAt_idx" ON "communication_message"("conversationId", "createdAt");
CREATE INDEX "communication_message_externalEventId_idx" ON "communication_message"("externalEventId");
CREATE INDEX "webhook_endpoint_organizationId_active_idx" ON "webhook_endpoint"("organizationId", "active");
CREATE UNIQUE INDEX "webhook_delivery_endpointId_eventId_key" ON "webhook_delivery"("endpointId", "eventId");
CREATE INDEX "webhook_delivery_organizationId_status_createdAt_idx" ON "webhook_delivery"("organizationId", "status", "createdAt");
CREATE UNIQUE INDEX "idempotency_record_organizationId_key_method_path_key" ON "idempotency_record"("organizationId", "key", "method", "path");
CREATE INDEX "idempotency_record_organizationId_createdAt_idx" ON "idempotency_record"("organizationId", "createdAt");
CREATE INDEX "audit_log_organizationId_createdAt_idx" ON "audit_log"("organizationId", "createdAt");

ALTER TABLE "communication_template" ADD CONSTRAINT "communication_template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_message" ADD CONSTRAINT "communication_message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_message" ADD CONSTRAINT "communication_message_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_message" ADD CONSTRAINT "communication_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_message" ADD CONSTRAINT "communication_message_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "communication_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "webhook_endpoint" ADD CONSTRAINT "webhook_endpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "idempotency_record" ADD CONSTRAINT "idempotency_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
