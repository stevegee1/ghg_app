-- Weather wear coefficients (versioned), and immutable value and ownership cost estimates per machine.
ALTER TYPE "AnchorRecordKind" ADD VALUE 'FLEET_ASSET_VALUATION';

CREATE TABLE "WearCoefficientSet" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WearCoefficientSet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WearCoefficientSet_version_key" ON "WearCoefficientSet"("version");
CREATE UNIQUE INDEX "WearCoefficientSet_one_active" ON "WearCoefficientSet"("active") WHERE "active" = true;

CREATE TABLE "WearCoefficient" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "category" "FleetAssetCategory" NOT NULL,
    "heatPctPerHour" DECIMAL(9,6) NOT NULL,
    "frostPctPerHour" DECIMAL(9,6) NOT NULL,
    "rainPctPerHour" DECIMAL(9,6) NOT NULL,
    "windPctPerHour" DECIMAL(9,6) NOT NULL,
    CONSTRAINT "WearCoefficient_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WearCoefficient_non_negative" CHECK ("heatPctPerHour" >= 0 AND "frostPctPerHour" >= 0 AND "rainPctPerHour" >= 0 AND "windPctPerHour" >= 0)
);
CREATE UNIQUE INDEX "WearCoefficient_setId_category_key" ON "WearCoefficient"("setId", "category");
ALTER TABLE "WearCoefficient" ADD CONSTRAINT "WearCoefficient_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WearCoefficientSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Published coefficients never change; only which set is active does.
CREATE OR REPLACE FUNCTION "wear_coefficient_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Wear coefficients cannot be changed; publish a new version instead';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "WearCoefficient_no_update" BEFORE UPDATE ON "WearCoefficient" FOR EACH ROW EXECUTE FUNCTION "wear_coefficient_immutable"();
CREATE OR REPLACE FUNCTION "wear_set_immutable"() RETURNS trigger AS $$
BEGIN
  IF NEW."version" <> OLD."version" OR NEW."source" <> OLD."source" THEN
    RAISE EXCEPTION 'Wear coefficient sets cannot be changed; publish a new version instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "WearCoefficientSet_fixed" BEFORE UPDATE ON "WearCoefficientSet" FOR EACH ROW EXECUTE FUNCTION "wear_set_immutable"();

CREATE TABLE "FleetAssetValuation" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "asOf" DATE NOT NULL,
    "methodVersion" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "recordSha256" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetAssetValuation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FleetAssetValuation_licenseeId_assetId_createdAt_idx" ON "FleetAssetValuation"("licenseeId", "assetId", "createdAt");
ALTER TABLE "FleetAssetValuation" ADD CONSTRAINT "FleetAssetValuation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TRIGGER "FleetAssetValuation_no_update" BEFORE UPDATE ON "FleetAssetValuation" FOR EACH ROW EXECUTE FUNCTION "fleet_cost_run_immutable"();

-- A market value used by a cost run or a valuation cannot be deleted.
CREATE OR REPLACE FUNCTION "market_value_in_use"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "FleetProjectCostRun" r WHERE r."inputs" @> jsonb_build_object('marketValueIds', jsonb_build_array(OLD."id"))
  ) OR EXISTS (
    SELECT 1 FROM "FleetAssetValuation" v WHERE v."inputs" @> jsonb_build_object('marketValueIds', jsonb_build_array(OLD."id"))
  ) THEN
    RAISE EXCEPTION 'Market value % is used by a cost calculation and cannot be deleted', OLD."id";
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE "FleetAssetValuation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetAssetValuation" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetAssetValuation"
  USING (current_setting('app.is_admin', true) = 'true' OR "licenseeId" = current_setting('app.current_licensee_id', true));
