-- AlterTable
ALTER TABLE "ads" ADD COLUMN     "targetAgeRanges" "AgeRange"[] DEFAULT ARRAY[]::"AgeRange"[],
ADD COLUMN     "targetGenders" "Gender"[] DEFAULT ARRAY[]::"Gender"[],
ADD COLUMN     "targetIncomeLevels" "IncomeLevel"[] DEFAULT ARRAY[]::"IncomeLevel"[],
ADD COLUMN     "targetInterests" TEXT[] DEFAULT ARRAY[]::TEXT[];
