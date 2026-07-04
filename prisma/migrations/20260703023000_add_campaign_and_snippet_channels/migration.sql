ALTER TABLE "campaign" ADD COLUMN "channel" "CommunicationChannel" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "email_template" ADD COLUMN "channel" "CommunicationChannel" NOT NULL DEFAULT 'EMAIL';
