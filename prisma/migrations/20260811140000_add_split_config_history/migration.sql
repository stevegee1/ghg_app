-- CreateTable
CREATE TABLE "SplitConfigHistory" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT,
    "royaltyBps" INTEGER NOT NULL,
    "charityAllocationBps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousConfigId" TEXT,

    CONSTRAINT "SplitConfigHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SplitConfigHistory_licenseeId_isActive_idx" ON "SplitConfigHistory"("licenseeId", "isActive");

-- CreateIndex
CREATE INDEX "SplitConfigHistory_changedByUserId_idx" ON "SplitConfigHistory"("changedByUserId");

-- CreatePartialUniqueIndex for per-licensee active configs
CREATE UNIQUE INDEX "SplitConfigHistory_licenseeId_active_unique_idx" ON "SplitConfigHistory"("licenseeId") WHERE "isActive" = true AND "licenseeId" IS NOT NULL;

-- CreatePartialUniqueIndex for platform default active config
CREATE UNIQUE INDEX "SplitConfigHistory_platform_default_active_unique_idx" ON "SplitConfigHistory"("isActive") WHERE "isActive" = true AND "licenseeId" IS NULL;

-- AddForeignKey
ALTER TABLE "SplitConfigHistory" ADD CONSTRAINT "SplitConfigHistory_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitConfigHistory" ADD CONSTRAINT "SplitConfigHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "PortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitConfigHistory" ADD CONSTRAINT "SplitConfigHistory_previousConfigId_fkey" FOREIGN KEY ("previousConfigId") REFERENCES "SplitConfigHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
