-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
