-- Contract materials with budgeted prices, and immutable cost calculations per project.
CREATE TABLE "FleetProjectMaterial" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,
    "quantity" DECIMAL(16,3) NOT NULL,
    "budgetUnitPrice" DECIMAL(14,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetProjectMaterial_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FleetProjectMaterial_positive" CHECK ("quantity" > 0 AND "budgetUnitPrice" > 0)
);
CREATE UNIQUE INDEX "FleetProjectMaterial_projectId_indexId_key" ON "FleetProjectMaterial"("projectId", "indexId");
ALTER TABLE "FleetProjectMaterial" ADD CONSTRAINT "FleetProjectMaterial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FleetProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetProjectMaterial" ADD CONSTRAINT "FleetProjectMaterial_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "MarketIndex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FleetProjectCostRun" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "periodFrom" DATE NOT NULL,
    "periodTo" DATE NOT NULL,
    "methodVersion" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "recordSha256" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetProjectCostRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FleetProjectCostRun_licenseeId_projectId_createdAt_idx" ON "FleetProjectCostRun"("licenseeId", "projectId", "createdAt");
ALTER TABLE "FleetProjectCostRun" ADD CONSTRAINT "FleetProjectCostRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FleetProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cost runs are records: they are never edited.
CREATE OR REPLACE FUNCTION "fleet_cost_run_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'FleetProjectCostRun records cannot be changed';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "FleetProjectCostRun_no_update" BEFORE UPDATE ON "FleetProjectCostRun"
  FOR EACH ROW EXECUTE FUNCTION "fleet_cost_run_immutable"();

-- A market value used by a cost run cannot be deleted.
CREATE OR REPLACE FUNCTION "market_value_in_use"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "FleetProjectCostRun" r
    WHERE r."inputs" @> jsonb_build_object('marketValueIds', jsonb_build_array(OLD."id"))
  ) THEN
    RAISE EXCEPTION 'Market value % is used by a cost calculation and cannot be deleted', OLD."id";
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "MarketIndexValue_in_use" BEFORE DELETE ON "MarketIndexValue"
  FOR EACH ROW EXECUTE FUNCTION "market_value_in_use"();

ALTER TABLE "FleetProjectMaterial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetProjectMaterial" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetProjectMaterial"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "FleetProjectCostRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetProjectCostRun" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetProjectCostRun"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );
