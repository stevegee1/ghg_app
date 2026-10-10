-- Contracts the client runs machines on, and which machine is on which contract when.
CREATE TYPE "FleetProjectStatus" AS ENUM ('ACTIVE', 'CLOSED');

CREATE TABLE "FleetProject" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "contractValuePence" BIGINT NOT NULL,
    "budgetedMarginBps" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "FleetProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetProject_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FleetProject_value_positive" CHECK ("contractValuePence" > 0),
    CONSTRAINT "FleetProject_margin_range" CHECK ("budgetedMarginBps" BETWEEN -10000 AND 10000),
    CONSTRAINT "FleetProject_dates" CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
);
CREATE UNIQUE INDEX "FleetProject_licenseeId_name_key" ON "FleetProject"("licenseeId", "name");
CREATE INDEX "FleetProject_licenseeId_status_idx" ON "FleetProject"("licenseeId", "status");
ALTER TABLE "FleetProject" ADD CONSTRAINT "FleetProject_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FleetProjectAsset" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetProjectAsset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FleetProjectAsset_dates" CHECK ("toDate" IS NULL OR "toDate" >= "fromDate")
);
CREATE INDEX "FleetProjectAsset_licenseeId_assetId_idx" ON "FleetProjectAsset"("licenseeId", "assetId");
CREATE INDEX "FleetProjectAsset_projectId_idx" ON "FleetProjectAsset"("projectId");
ALTER TABLE "FleetProjectAsset" ADD CONSTRAINT "FleetProjectAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FleetProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetProjectAsset" ADD CONSTRAINT "FleetProjectAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A machine cannot be on two projects on the same day.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "FleetProjectAsset" ADD CONSTRAINT "FleetProjectAsset_no_overlap"
  EXCLUDE USING gist ("assetId" WITH =, daterange("fromDate", "toDate", '[]') WITH &&);

-- Row Level Security: licensee isolation
ALTER TABLE "FleetProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetProject" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetProject"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "FleetProjectAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetProjectAsset" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetProjectAsset"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );
