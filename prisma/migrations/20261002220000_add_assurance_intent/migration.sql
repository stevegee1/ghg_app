-- AlterTable
ALTER TABLE "ClientAssessment" ADD COLUMN IF NOT EXISTS "assuranceIntent" TEXT NOT NULL DEFAULT 'DUAL';

-- AlterTable
ALTER TABLE "Licensee" ADD COLUMN IF NOT EXISTS "assuranceIntent" TEXT DEFAULT 'DUAL';

-- AlterTable
ALTER TABLE "MerchEnquiry" ALTER COLUMN "updatedAt" DROP DEFAULT;
