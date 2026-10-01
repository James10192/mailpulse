-- Secret rotation with an overlap: nullable columns, no rewrite of the table.
ALTER TABLE "webhook_endpoint" ADD COLUMN "previousSigningSecret" TEXT,
ADD COLUMN "previousSecretExpiresAt" TIMESTAMP(3);
