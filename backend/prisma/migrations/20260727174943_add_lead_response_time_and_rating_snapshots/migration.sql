-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "company_rating_snapshots" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ratingAvg" DOUBLE PRECISION NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "rankPosition" INTEGER,
    "rankTotal" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_rating_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_rating_snapshots_companyId_capturedAt_idx" ON "company_rating_snapshots"("companyId", "capturedAt");
