-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'AD_LOW_BALANCE';

-- AlterTable
ALTER TABLE "ad_accounts" ADD COLUMN     "lowBalanceNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ad_events" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "ad_events_adId_userId_createdAt_idx" ON "ad_events"("adId", "userId", "createdAt");
