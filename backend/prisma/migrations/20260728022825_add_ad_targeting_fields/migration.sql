-- CreateEnum
CREATE TYPE "AgeRange" AS ENUM ('R18_24', 'R25_34', 'R35_44', 'R45_54', 'R55_64', 'R65_PLUS');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "IncomeLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ageRange" "AgeRange",
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "incomeLevel" "IncomeLevel",
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetingAskedAt" TIMESTAMP(3);
