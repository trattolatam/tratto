-- CreateTable
CREATE TABLE "contact_reveals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_reveals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_reveals_companyId_createdAt_idx" ON "contact_reveals"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "contact_reveals" ADD CONSTRAINT "contact_reveals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
