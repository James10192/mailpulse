-- AlterTable
ALTER TABLE "capture_page" ADD COLUMN     "conversions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uniqueViews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "capture_page_daily_stat" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "capturePageId" TEXT NOT NULL,

    CONSTRAINT "capture_page_daily_stat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capture_page_daily_stat_capturePageId_date_key" ON "capture_page_daily_stat"("capturePageId", "date");

-- AddForeignKey
ALTER TABLE "capture_page_daily_stat" ADD CONSTRAINT "capture_page_daily_stat_capturePageId_fkey" FOREIGN KEY ("capturePageId") REFERENCES "capture_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
