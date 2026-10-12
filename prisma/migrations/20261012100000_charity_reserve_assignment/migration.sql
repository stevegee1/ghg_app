-- Charity share held from payments taken while no charity was set, assigned later by an administrator.

-- AlterTable
ALTER TABLE "CharityAllocation" ADD COLUMN     "reserveAssignmentId" TEXT;

-- CreateTable
CREATE TABLE "CharityReserveAssignment" (
    "id" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "charityAllocationBps" JSONB NOT NULL,
    "currency" TEXT NOT NULL,
    "splitCount" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharityReserveAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharityReserveAssignment_assignedByUserId_idx" ON "CharityReserveAssignment"("assignedByUserId");

-- CreateIndex
CREATE INDEX "CharityAllocation_reserveAssignmentId_idx" ON "CharityAllocation"("reserveAssignmentId");

-- AddForeignKey
ALTER TABLE "CharityAllocation" ADD CONSTRAINT "CharityAllocation_reserveAssignmentId_fkey" FOREIGN KEY ("reserveAssignmentId") REFERENCES "CharityReserveAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharityReserveAssignment" ADD CONSTRAINT "CharityReserveAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "PortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Grant permissions to ghg_app_user if present
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ghg_app_user') THEN
    GRANT ALL PRIVILEGES ON TABLE "CharityReserveAssignment" TO ghg_app_user;
  END IF;
END $$;
