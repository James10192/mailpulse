CREATE TYPE "ExternalApplicationCredentialPurpose" AS ENUM ('COMMAND_INGRESS', 'INBOUND_FORWARD');
CREATE TYPE "ExternalTransportDirection" AS ENUM ('OUTBOUND', 'INBOUND');

CREATE TABLE "external_application" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "external_application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_application_credential" (
    "id" TEXT NOT NULL,
    "purpose" "ExternalApplicationCredentialPurpose" NOT NULL,
    "keyId" TEXT NOT NULL,
    "secretCiphertext" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "rotationId" TEXT,
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "external_application_credential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provider_account" (
    "id" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "provider" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "senderId" TEXT,
    "credentialsCiphertext" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT,

    CONSTRAINT "provider_account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_forward_endpoint" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "secretCiphertext" TEXT NOT NULL,
    "events" TEXT[] NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "providerAccountId" TEXT,

    CONSTRAINT "application_forward_endpoint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "application_forward_endpoint_url_https_check" CHECK ("url" ~ '^https://')
);

CREATE TABLE "application_template_config" (
    "id" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "templateId" TEXT,
    "locale" TEXT NOT NULL,
    "providerTemplateId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "providerAccountId" TEXT,

    CONSTRAINT "application_template_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_transport_operation" (
    "id" TEXT NOT NULL,
    "direction" "ExternalTransportDirection" NOT NULL,
    "operationKey" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT,
    "payloadCiphertext" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "leaseAcquiredAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "reconciliationDecision" TEXT,
    "reconciliationFollowUpAt" TIMESTAMP(3),
    "reconciliationFollowUpById" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "reconciledById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "callbackAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextCallbackAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "external_transport_operation_pkey" PRIMARY KEY ("id")
);

-- This model is authoritative for external-application channels. It does not
-- store a phone number: recipientHash is a domain-separated HMAC.
CREATE TABLE "external_conversation_window" (
    "id" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "lastInboundAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "external_conversation_window_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_application_organizationId_key_key" ON "external_application"("organizationId", "key");
CREATE UNIQUE INDEX "external_application_organizationId_id_key" ON "external_application"("organizationId", "id");
CREATE INDEX "external_application_organizationId_active_idx" ON "external_application"("organizationId", "active");

CREATE UNIQUE INDEX "external_application_credential_applicationId_purpose_version_key" ON "external_application_credential"("applicationId", "purpose", "version");
CREATE INDEX "external_application_credential_applicationId_purpose_revokedAt_expiresAt_idx" ON "external_application_credential"("applicationId", "purpose", "revokedAt", "expiresAt");
CREATE INDEX "external_application_credential_rotationId_idx" ON "external_application_credential"("rotationId");

CREATE UNIQUE INDEX "provider_account_organizationId_channel_provider_externalAccountId_key" ON "provider_account"("organizationId", "channel", "provider", "externalAccountId");
CREATE UNIQUE INDEX "provider_account_organizationId_id_key" ON "provider_account"("organizationId", "id");
CREATE INDEX "provider_account_organizationId_applicationId_active_idx" ON "provider_account"("organizationId", "applicationId", "active");
-- Exactly one active transport account may serve an application/channel/provider.
-- Detached provider accounts are intentionally outside this invariant.
CREATE UNIQUE INDEX "provider_account_active_application_channel_provider_key" ON "provider_account"("applicationId", "channel", "provider") WHERE "active" = true AND "applicationId" IS NOT NULL;

CREATE UNIQUE INDEX "application_forward_endpoint_applicationId_url_key" ON "application_forward_endpoint"("applicationId", "url");
CREATE INDEX "application_forward_endpoint_organizationId_active_idx" ON "application_forward_endpoint"("organizationId", "active");
CREATE INDEX "application_forward_endpoint_providerAccountId_active_idx" ON "application_forward_endpoint"("providerAccountId", "active");

-- Intentional schema invariant: PostgreSQL considers NULL values distinct in a
-- composite unique index, so Prisma must not declare a nullable @@unique here.
-- These partial indexes enforce one default configuration and one override per
-- provider account while allowing a default and its overrides to coexist.
CREATE UNIQUE INDEX "application_template_config_default_key" ON "application_template_config"("applicationId", "operationKey", "locale") WHERE "providerAccountId" IS NULL;
CREATE UNIQUE INDEX "application_template_config_provider_account_key" ON "application_template_config"("applicationId", "operationKey", "locale", "providerAccountId") WHERE "providerAccountId" IS NOT NULL;
CREATE INDEX "application_template_config_organizationId_active_idx" ON "application_template_config"("organizationId", "active");
CREATE INDEX "application_template_config_providerAccountId_active_idx" ON "application_template_config"("providerAccountId", "active");

CREATE UNIQUE INDEX "external_transport_operation_organizationId_applicationId_idempotencyKey_key" ON "external_transport_operation"("organizationId", "applicationId", "idempotencyKey");
CREATE UNIQUE INDEX "external_transport_operation_organizationId_providerAccountId_providerMessageId_key" ON "external_transport_operation"("organizationId", "providerAccountId", "providerMessageId");
CREATE INDEX "external_transport_operation_organizationId_status_createdAt_idx" ON "external_transport_operation"("organizationId", "status", "createdAt");
CREATE INDEX "external_transport_operation_applicationId_status_leaseExpiresAt_idx" ON "external_transport_operation"("applicationId", "status", "leaseExpiresAt");
CREATE INDEX "external_transport_operation_applicationId_status_nextCallbackAttemptAt_idx" ON "external_transport_operation"("applicationId", "status", "nextCallbackAttemptAt");
CREATE INDEX "external_transport_operation_providerAccountId_createdAt_idx" ON "external_transport_operation"("providerAccountId", "createdAt");

CREATE UNIQUE INDEX "external_conversation_window_scope_recipient_key" ON "external_conversation_window"("organizationId", "applicationId", "providerAccountId", "channel", "recipientHash");
CREATE INDEX "external_conversation_window_active_lookup_idx" ON "external_conversation_window"("organizationId", "applicationId", "providerAccountId", "channel", "expiresAt");

ALTER TABLE "external_application" ADD CONSTRAINT "external_application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_application_credential" ADD CONSTRAINT "external_application_credential_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "external_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_account" ADD CONSTRAINT "provider_account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_account" ADD CONSTRAINT "provider_account_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_forward_endpoint" ADD CONSTRAINT "application_forward_endpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_forward_endpoint" ADD CONSTRAINT "application_forward_endpoint_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_forward_endpoint" ADD CONSTRAINT "application_forward_endpoint_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "application_template_config" ADD CONSTRAINT "application_template_config_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_template_config" ADD CONSTRAINT "application_template_config_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_template_config" ADD CONSTRAINT "application_template_config_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_transport_operation" ADD CONSTRAINT "external_transport_operation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_transport_operation" ADD CONSTRAINT "external_transport_operation_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_transport_operation" ADD CONSTRAINT "external_transport_operation_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_conversation_window" ADD CONSTRAINT "external_conversation_window_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_conversation_window" ADD CONSTRAINT "external_conversation_window_organizationId_applicationId_fkey" FOREIGN KEY ("organizationId", "applicationId") REFERENCES "external_application"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_conversation_window" ADD CONSTRAINT "external_conversation_window_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
