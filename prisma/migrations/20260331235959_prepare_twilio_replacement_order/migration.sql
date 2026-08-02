-- A legacy replacement migration can sort before the migration that introduced
-- these columns on a fresh database. Existing upgraded databases already have
-- WhatsAppMode and therefore take the no-op path.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE type.typname = 'WhatsAppMode' AND namespace.nspname = current_schema()
  ) THEN
    ALTER TABLE "organization"
      ADD COLUMN IF NOT EXISTS "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "twilioAuthToken" TEXT,
      ADD COLUMN IF NOT EXISTS "twilioPhoneNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "twilioSubaccountSid" TEXT,
      ADD COLUMN IF NOT EXISTS "twilioWhatsappNumber" TEXT;
  END IF;
END $$;
