-- Purchase cost, life and residual value per machine, for value and ownership cost estimates.
CREATE TABLE "FleetAssetFinance" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "acquisitionCostPence" BIGINT NOT NULL,
    "acquisitionDate" DATE NOT NULL,
    "expectedLifeYears" DECIMAL(5,2) NOT NULL,
    "expectedLifeHours" DECIMAL(10,1),
    "residualValuePence" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetAssetFinance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FleetAssetFinance_values" CHECK (
      "acquisitionCostPence" > 0 AND "residualValuePence" >= 0 AND "residualValuePence" < "acquisitionCostPence"
      AND "expectedLifeYears" > 0 AND ("expectedLifeHours" IS NULL OR "expectedLifeHours" > 0)
    )
);
CREATE UNIQUE INDEX "FleetAssetFinance_assetId_key" ON "FleetAssetFinance"("assetId");
CREATE INDEX "FleetAssetFinance_licenseeId_idx" ON "FleetAssetFinance"("licenseeId");
ALTER TABLE "FleetAssetFinance" ADD CONSTRAINT "FleetAssetFinance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FleetAssetFinance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetAssetFinance" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetAssetFinance"
  USING (current_setting('app.is_admin', true) = 'true' OR "licenseeId" = current_setting('app.current_licensee_id', true));
