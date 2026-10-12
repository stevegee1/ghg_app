-- Machine service intervals, maintenance events (the outcomes the predictive model learns from) and
-- each client's consent to their anonymised data training the shared model.

-- CreateEnum
CREATE TYPE "FleetMaintenanceEventType" AS ENUM ('SCHEDULED_SERVICE', 'INSPECTION', 'BREAKDOWN', 'UNPLANNED_REPAIR');

-- CreateEnum
CREATE TYPE "FleetMaintenanceEventSource" AS ENUM ('PORTAL', 'CSV_IMPORT');

-- CreateTable
CREATE TABLE "FleetMaintenancePlan" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "serviceIntervalHours" DECIMAL(10,2) NOT NULL,
    "intervalSource" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetMaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetMaintenanceEvent" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "FleetMaintenanceEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "operatingHours" DECIMAL(12,2),
    "downtimeHours" DECIMAL(10,2),
    "component" TEXT,
    "description" TEXT,
    "source" "FleetMaintenanceEventSource" NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetMaintenanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelTrainingConsent" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL,
    "grantedByUserId" TEXT NOT NULL,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelTrainingConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FleetMaintenancePlan_assetId_key" ON "FleetMaintenancePlan"("assetId");

-- CreateIndex
CREATE INDEX "FleetMaintenancePlan_licenseeId_idx" ON "FleetMaintenancePlan"("licenseeId");

-- CreateIndex
CREATE INDEX "FleetMaintenanceEvent_licenseeId_occurredAt_idx" ON "FleetMaintenanceEvent"("licenseeId", "occurredAt");

-- CreateIndex
CREATE INDEX "FleetMaintenanceEvent_assetId_occurredAt_idx" ON "FleetMaintenanceEvent"("assetId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "FleetMaintenanceEvent_assetId_type_occurredAt_key" ON "FleetMaintenanceEvent"("assetId", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelTrainingConsent_licenseeId_key" ON "ModelTrainingConsent"("licenseeId");

-- AddForeignKey
ALTER TABLE "FleetMaintenancePlan" ADD CONSTRAINT "FleetMaintenancePlan_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetMaintenancePlan" ADD CONSTRAINT "FleetMaintenancePlan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetMaintenanceEvent" ADD CONSTRAINT "FleetMaintenanceEvent_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetMaintenanceEvent" ADD CONSTRAINT "FleetMaintenanceEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelTrainingConsent" ADD CONSTRAINT "ModelTrainingConsent_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "FleetMaintenancePlan" ADD CONSTRAINT "FleetMaintenancePlan_positive_interval" CHECK ("serviceIntervalHours" > 0);
ALTER TABLE "FleetMaintenanceEvent" ADD CONSTRAINT "FleetMaintenanceEvent_non_negative" CHECK (
  ("operatingHours" IS NULL OR "operatingHours" >= 0) AND ("downtimeHours" IS NULL OR "downtimeHours" >= 0)
);

-- Row Level Security: licensee isolation
ALTER TABLE "FleetMaintenancePlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetMaintenancePlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetMaintenancePlan"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "FleetMaintenanceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetMaintenanceEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetMaintenanceEvent"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "ModelTrainingConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModelTrainingConsent" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "ModelTrainingConsent"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
