-- A verification is either sent by MailPulse (OUTBOUND) or sent by the person
-- to the number from a wa.me link (INBOUND). Existing rows were all sent.
CREATE TYPE "PhoneVerificationMode" AS ENUM ('OUTBOUND', 'INBOUND');
ALTER TABLE "phone_verification" ADD COLUMN "mode" "PhoneVerificationMode" NOT NULL DEFAULT 'OUTBOUND';
