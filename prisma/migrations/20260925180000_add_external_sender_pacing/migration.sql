-- CreateTable
CREATE TABLE "external_sender_pacing" (
    "id" TEXT NOT NULL,
    "dailyConsentRequestLimit" INTEGER NOT NULL DEFAULT 40,
    "quietHoursStart" INTEGER NOT NULL DEFAULT 21,
    "quietHoursEnd" INTEGER NOT NULL DEFAULT 7,
    "timeZone" TEXT NOT NULL DEFAULT 'Africa/Abidjan',
    "nextSendAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "external_sender_pacing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_sender_pacing_organizationId_providerAccountId_key" ON "external_sender_pacing"("organizationId", "providerAccountId");

-- AddForeignKey
ALTER TABLE "external_sender_pacing" ADD CONSTRAINT "external_sender_pacing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sender_pacing" ADD CONSTRAINT "external_sender_pacing_organizationId_providerAccountId_fkey" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "provider_account"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

