-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twilioAuthToken" TEXT,
ADD COLUMN     "twilioPhoneNumber" TEXT,
ADD COLUMN     "twilioSubaccountSid" TEXT,
ADD COLUMN     "twilioWhatsappNumber" TEXT;
