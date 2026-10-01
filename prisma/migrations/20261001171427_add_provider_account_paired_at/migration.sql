-- A number paired by QR code in MailPulse follows a tighter verification rate
-- for 30 days. Nullable, no default: existing numbers keep no date.
ALTER TABLE "provider_account" ADD COLUMN "pairedAt" TIMESTAMP(3);
