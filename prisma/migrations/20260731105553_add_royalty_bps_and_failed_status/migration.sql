-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Licensee" ADD COLUMN     "royaltyBps" INTEGER NOT NULL DEFAULT 1500;

-- Add CHECK constraint on Licensee.royaltyBps (between 0 and 10000 inclusive)
ALTER TABLE "Licensee" ADD CONSTRAINT "check_royalty_bps_range" CHECK ("royaltyBps" >= 0 AND "royaltyBps" <= 10000);
