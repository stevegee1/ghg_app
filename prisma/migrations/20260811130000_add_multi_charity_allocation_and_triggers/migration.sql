-- CreateEnum
CREATE TYPE "CharityStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Charity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripeConnectedAccountId" TEXT,
    "status" "CharityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Charity_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FinancialSplit" ADD COLUMN "allocationsFinalized" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CharityAllocation" (
    "id" TEXT NOT NULL,
    "financialSplitId" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeTransferId" TEXT,
    "transferFailed" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharityAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharityAllocation_financialSplitId_idx" ON "CharityAllocation"("financialSplitId");

-- CreateIndex
CREATE INDEX "CharityAllocation_charityId_idx" ON "CharityAllocation"("charityId");

-- AddForeignKey
ALTER TABLE "CharityAllocation" ADD CONSTRAINT "CharityAllocation_financialSplitId_fkey" FOREIGN KEY ("financialSplitId") REFERENCES "FinancialSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharityAllocation" ADD CONSTRAINT "CharityAllocation_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trigger 1: Enforce CharityAllocation sum <= FinancialSplit.charityGiftCents on insert/update
CREATE OR REPLACE FUNCTION check_charity_allocation_sum_bound()
RETURNS TRIGGER AS $$
DECLARE
  total_gift INT;
  current_sum INT;
BEGIN
  SELECT "charityGiftCents" INTO total_gift FROM "FinancialSplit" WHERE "id" = NEW."financialSplitId";

  SELECT COALESCE(SUM("amountCents"), 0) INTO current_sum
  FROM "CharityAllocation"
  WHERE "financialSplitId" = NEW."financialSplitId"
    AND "id" IS DISTINCT FROM NEW."id";

  IF (current_sum + NEW."amountCents") > total_gift THEN
    RAISE EXCEPTION 'CharityAllocation sum (%) exceeds FinancialSplit.charityGiftCents (%)',
      (current_sum + NEW."amountCents"), total_gift;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_charity_allocation_sum_bound_trigger
BEFORE INSERT OR UPDATE ON "CharityAllocation"
FOR EACH ROW
EXECUTE FUNCTION check_charity_allocation_sum_bound();

-- Trigger 2: Enforce CharityAllocation sum == FinancialSplit.charityGiftCents ONLY when allocationsFinalized transitions to true
CREATE OR REPLACE FUNCTION check_financial_split_allocations_finalized()
RETURNS TRIGGER AS $$
DECLARE
  current_sum INT;
BEGIN
  IF (OLD."allocationsFinalized" IS DISTINCT FROM NEW."allocationsFinalized") AND NEW."allocationsFinalized" = true THEN
    SELECT COALESCE(SUM("amountCents"), 0) INTO current_sum
    FROM "CharityAllocation"
    WHERE "financialSplitId" = NEW."id";

    IF current_sum != NEW."charityGiftCents" THEN
      RAISE EXCEPTION 'Cannot finalize allocations: CharityAllocation sum (%) does not equal FinancialSplit.charityGiftCents (%)',
        current_sum, NEW."charityGiftCents";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_financial_split_allocations_finalized_trigger
BEFORE UPDATE ON "FinancialSplit"
FOR EACH ROW
EXECUTE FUNCTION check_financial_split_allocations_finalized();
