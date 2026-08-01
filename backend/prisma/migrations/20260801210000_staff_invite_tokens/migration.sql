-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staffActivatedAt" TIMESTAMP(3),
ADD COLUMN     "staffInviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "staffInviteToken" TEXT,
ADD COLUMN     "staffInvitedById" TEXT;
