-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "checkoutReferenceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_checkoutReferenceId_key" ON "Transaction"("checkoutReferenceId");
