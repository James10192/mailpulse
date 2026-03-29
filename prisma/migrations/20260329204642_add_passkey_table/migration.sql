-- CreateTable
CREATE TABLE "passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentialID_key" ON "passkey"("credentialID");

-- AddForeignKey
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
