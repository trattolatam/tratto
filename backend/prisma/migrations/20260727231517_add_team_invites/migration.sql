-- CreateEnum
CREATE TYPE "TeamInviteStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CompanyMemberRole" NOT NULL DEFAULT 'EDITOR',
    "status" "TeamInviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_companyId_email_key" ON "team_invites"("companyId", "email");

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
