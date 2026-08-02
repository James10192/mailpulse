ALTER TABLE "organization"
  DROP COLUMN IF EXISTS "twilioAuthToken",
  DROP COLUMN IF EXISTS "twilioPhoneNumber",
  DROP COLUMN IF EXISTS "twilioSubaccountSid",
  DROP COLUMN IF EXISTS "twilioWhatsappNumber";

-- On a fresh database Orange SMS has not been introduced yet, so remove the
-- legacy flag before its canonical migration adds it. Upgraded databases keep it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE type.typname = 'SmsProvider' AND namespace.nspname = current_schema()
  ) THEN
    ALTER TABLE "organization" DROP COLUMN IF EXISTS "smsEnabled";
  END IF;
END $$;
