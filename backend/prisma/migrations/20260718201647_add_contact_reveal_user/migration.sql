-- AlterTable
ALTER TABLE "contact_reveals" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "contact_reveals" ADD CONSTRAINT "contact_reveals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
