-- AlterTable
ALTER TABLE "sending_domain" ADD COLUMN     "dkimName" TEXT,
ADD COLUMN     "dkimStatus" TEXT,
ADD COLUMN     "region" TEXT NOT NULL DEFAULT 'us-east-1',
ADD COLUMN     "resendDomainId" TEXT,
ADD COLUMN     "spfStatus" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'not_started';
