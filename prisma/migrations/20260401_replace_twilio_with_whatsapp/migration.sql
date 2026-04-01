-- CreateEnum
CREATE TYPE "WhatsAppMode" AS ENUM ('BAILEYS', 'META');

-- AlterTable
ALTER TABLE "organization" DROP COLUMN "smsEnabled",
DROP COLUMN "twilioAuthToken",
DROP COLUMN "twilioPhoneNumber",
DROP COLUMN "twilioSubaccountSid",
DROP COLUMN "twilioWhatsappNumber",
ADD COLUMN     "evoInstanceName" TEXT,
ADD COLUMN     "evoInstanceStatus" TEXT,
ADD COLUMN     "metaAccessToken" TEXT,
ADD COLUMN     "metaPhoneNumberId" TEXT,
ADD COLUMN     "metaWabaId" TEXT,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappMode" "WhatsAppMode" NOT NULL DEFAULT 'BAILEYS',
ADD COLUMN     "whatsappPhone" TEXT;
