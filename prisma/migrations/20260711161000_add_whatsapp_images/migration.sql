ALTER TABLE "campaign"
ADD COLUMN "whatsappImageUrl" TEXT,
ADD COLUMN "whatsappImageName" TEXT;

ALTER TABLE "email_template"
ADD COLUMN "whatsappImageUrl" TEXT,
ADD COLUMN "whatsappImageName" TEXT;
