-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "personalIdNumber" TEXT,
ADD COLUMN     "taxIdChecksumValid" BOOLEAN,
ADD COLUMN     "verificationDocType" TEXT,
ADD COLUMN     "verificationDocUrl" TEXT;

-- CreateTable
CREATE TABLE "claim_disputes" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "disputedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceDocUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claim_disputes_companyId_status_idx" ON "claim_disputes"("companyId", "status");

-- AddForeignKey
ALTER TABLE "claim_disputes" ADD CONSTRAINT "claim_disputes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_disputes" ADD CONSTRAINT "claim_disputes_disputedById_fkey" FOREIGN KEY ("disputedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
