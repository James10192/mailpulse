-- CreateTable
CREATE TABLE "email_sender" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "replyTo" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "email_sender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capture_page" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "fields" JSONB NOT NULL DEFAULT '[{"name":"email","type":"email","required":true,"label":"Email"}]',
    "successMessage" TEXT NOT NULL DEFAULT 'Merci ! Vous etes inscrit.',
    "buttonLabel" TEXT NOT NULL DEFAULT 'S''inscrire',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "capture_page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_sender_email_organizationId_key" ON "email_sender"("email", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "capture_page_slug_organizationId_key" ON "capture_page"("slug", "organizationId");

-- AddForeignKey
ALTER TABLE "email_sender" ADD CONSTRAINT "email_sender_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capture_page" ADD CONSTRAINT "capture_page_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
