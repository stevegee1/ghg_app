-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FleetReadingSource" ADD VALUE 'CLIENT_API';
ALTER TYPE "FleetReadingSource" ADD VALUE 'OEM_CLOUD';
ALTER TYPE "FleetReadingSource" ADD VALUE 'TRACKING_DEVICE';

-- CreateTable
CREATE TABLE "FleetSchemaVersion" (
    "id" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "fieldSpec" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),

    CONSTRAINT "FleetSchemaVersion_pkey" PRIMARY KEY ("id")
);

-- Publish the standard data schema, version aemp2-2026.1 (field list in src/services/fleet/fleet-schema.ts)
INSERT INTO "FleetSchemaVersion" ("id", "standard", "version", "fieldSpec")
VALUES ('aemp2-2026.1', 'ISO 15143-3:2016 (AEMP 2.0 telematics data)', '2026.1', '[{"field":"observedAt","iso15143Element":"Snapshot time","unit":"ISO 8601 UTC","description":"When the machine recorded the values."},{"field":"cumulativeOperatingHours","iso15143Element":"Cumulative Operating Hours","unit":"hour","description":"Engine hours meter."},{"field":"cumulativeIdleHours","iso15143Element":"Cumulative Idle Hours","unit":"hour","description":"Idle hours meter."},{"field":"cumulativeFuelUsedLitres","iso15143Element":"Fuel Used","unit":"litre","description":"Lifetime fuel used meter."},{"field":"fuelRemainingPercent","iso15143Element":"Fuel Remaining","unit":"percent","description":"Fuel level, 0 to 100."},{"field":"odometerKm","iso15143Element":"Distance","unit":"kilometre","description":"Odometer."},{"field":"engineRunning","iso15143Element":"Engine Status","unit":"boolean","description":"Engine running at the snapshot time."},{"field":"latitude","iso15143Element":"Location","unit":"decimal degrees (WGS 84)","description":"Latitude, -90 to 90."},{"field":"longitude","iso15143Element":"Location","unit":"decimal degrees (WGS 84)","description":"Longitude, -180 to 180."},{"field":"altitudeM","iso15143Element":"Location","unit":"metre","description":"Altitude."},{"field":"faultCodes","iso15143Element":"Fault Codes","unit":"code list","description":"Active fault or caution codes with severity."}]'::jsonb);

-- Every reading records the schema version it was normalised to. Existing CSV and fuel-card
-- readings carry fuel, hours and distance, which are fields of this version.
ALTER TABLE "FleetReading" ADD COLUMN "schemaVersionId" TEXT;
UPDATE "FleetReading" SET "schemaVersionId" = 'aemp2-2026.1';
ALTER TABLE "FleetReading" ALTER COLUMN "schemaVersionId" SET NOT NULL;
ALTER TABLE "FleetReading" ADD COLUMN "startSnapshotId" TEXT, ADD COLUMN "endSnapshotId" TEXT;

-- CreateTable
CREATE TABLE "FleetTelemetrySnapshot" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "schemaVersionId" TEXT NOT NULL,
    "source" "FleetReadingSource" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "cumulativeOperatingHours" DECIMAL(12,2),
    "cumulativeIdleHours" DECIMAL(12,2),
    "cumulativeFuelUsedLitres" DECIMAL(14,3),
    "fuelRemainingPercent" DECIMAL(5,2),
    "odometerKm" DECIMAL(14,2),
    "engineRunning" BOOLEAN,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "altitudeM" DECIMAL(8,2),
    "counterReset" BOOLEAN NOT NULL DEFAULT false,
    "payloadSha256" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetTelemetrySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetFaultCode" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "source" "FleetReadingSource" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetFaultCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetApiKey" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "FleetApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FleetTelemetrySnapshot_licenseeId_observedAt_idx" ON "FleetTelemetrySnapshot"("licenseeId", "observedAt");

-- CreateIndex
CREATE INDEX "FleetTelemetrySnapshot_assetId_source_observedAt_idx" ON "FleetTelemetrySnapshot"("assetId", "source", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FleetTelemetrySnapshot_assetId_source_observedAt_key" ON "FleetTelemetrySnapshot"("assetId", "source", "observedAt");

-- CreateIndex
CREATE INDEX "FleetFaultCode_licenseeId_observedAt_idx" ON "FleetFaultCode"("licenseeId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FleetFaultCode_assetId_observedAt_code_key" ON "FleetFaultCode"("assetId", "observedAt", "code");

-- CreateIndex
CREATE UNIQUE INDEX "FleetApiKey_keyHash_key" ON "FleetApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "FleetApiKey_licenseeId_revokedAt_idx" ON "FleetApiKey"("licenseeId", "revokedAt");

-- AddForeignKey
ALTER TABLE "FleetReading" ADD CONSTRAINT "FleetReading_schemaVersionId_fkey" FOREIGN KEY ("schemaVersionId") REFERENCES "FleetSchemaVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetTelemetrySnapshot" ADD CONSTRAINT "FleetTelemetrySnapshot_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetTelemetrySnapshot" ADD CONSTRAINT "FleetTelemetrySnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetTelemetrySnapshot" ADD CONSTRAINT "FleetTelemetrySnapshot_schemaVersionId_fkey" FOREIGN KEY ("schemaVersionId") REFERENCES "FleetSchemaVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetFaultCode" ADD CONSTRAINT "FleetFaultCode_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetFaultCode" ADD CONSTRAINT "FleetFaultCode_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetFaultCode" ADD CONSTRAINT "FleetFaultCode_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "FleetTelemetrySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetApiKey" ADD CONSTRAINT "FleetApiKey_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetApiKey" ADD CONSTRAINT "FleetApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "PortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security: licensee isolation on the new tenant tables
ALTER TABLE "FleetTelemetrySnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetTelemetrySnapshot" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetTelemetrySnapshot"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "FleetFaultCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetFaultCode" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetFaultCode"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "FleetApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetApiKey" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetApiKey"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- Meters are cumulative and never negative
ALTER TABLE "FleetTelemetrySnapshot" ADD CONSTRAINT "FleetTelemetrySnapshot_non_negative_meters" CHECK (
  ("cumulativeOperatingHours" IS NULL OR "cumulativeOperatingHours" >= 0)
  AND ("cumulativeIdleHours" IS NULL OR "cumulativeIdleHours" >= 0)
  AND ("cumulativeFuelUsedLitres" IS NULL OR "cumulativeFuelUsedLitres" >= 0)
  AND ("odometerKm" IS NULL OR "odometerKm" >= 0)
);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
