/*
  Warnings:

  - You are about to drop the `booking_slots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bookings` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `companyId` on table `api_keys` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "booking_slots" DROP CONSTRAINT "booking_slots_companyId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_companyId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_slotId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_userId_fkey";

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "usageResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "companyId" SET NOT NULL;

-- DropTable
DROP TABLE "booking_slots";

-- DropTable
DROP TABLE "bookings";

-- DropEnum
DROP TYPE "BookingStatus";

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
