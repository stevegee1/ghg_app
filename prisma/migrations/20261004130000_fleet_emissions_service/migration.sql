-- Migration: fleet_emissions_service
-- Adds the Fleet Emissions service: equipment and vehicle assets, fuel readings with the
-- emission factor applied at import, upload audit trail, per-asset subscriptions and the
-- FLEET service line. Emission factors are entered by administrators from a cited source.

-- CreateEnum
CREATE TYPE "FleetAssetCategory" AS ENUM ('EXCAVATOR', 'DUMPER', 'DUMP_TRUCK', 'WHEEL_LOADER', 'CRANE', 'TELEHANDLER', 'ROLLER', 'GENERATOR', 'HGV', 'LIGHT_COMMERCIAL_VEHICLE', 'CAR', 'OTHER');

-- CreateEnum
CREATE TYPE "FleetOwnership" AS ENUM ('OWNED', 'LEASED', 'RENTED_IN', 'RENTED_OUT');

-- CreateEnum
CREATE TYPE "FleetFuelType" AS ENUM ('DIESEL_AVERAGE_BIOFUEL_BLEND', 'DIESEL_MINERAL', 'PETROL_AVERAGE_BIOFUEL_BLEND', 'PETROL_MINERAL', 'HVO', 'LPG');

-- CreateEnum
CREATE TYPE "FleetReadingSource" AS ENUM ('CSV_UPLOAD', 'FUEL_CARD', 'ISO_15143_3', 'PARTNER_API');

-- CreateEnum
CREATE TYPE "FleetSubscriptionStatus" AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED');

-- AlterEnum
ALTER TYPE "ServiceLine" ADD VALUE 'FLEET';


-- CreateTable
CREATE TABLE "EmissionFactor" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publicationYear" INTEGER NOT NULL,
    "fuelType" "FleetFuelType" NOT NULL,
    "unit" TEXT NOT NULL,
    "kgCo2ePerUnit" DECIMAL(12,6) NOT NULL,
    "citation" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),

    CONSTRAINT "EmissionFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetAsset" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FleetAssetCategory" NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "fuelType" "FleetFuelType" NOT NULL,
    "ownership" "FleetOwnership" NOT NULL,
    "operationalControl" BOOLEAN NOT NULL,
    "siteName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetImportBatch" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "source" "FleetReadingSource" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "rowsReceived" INTEGER NOT NULL,
    "rowsAccepted" INTEGER NOT NULL,
    "rowsRejected" INTEGER NOT NULL,
    "rejections" JSONB NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetReading" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "importBatchId" TEXT,
    "source" "FleetReadingSource" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "fuelQuantity" DECIMAL(14,3) NOT NULL,
    "fuelUnit" TEXT NOT NULL,
    "engineHours" DECIMAL(12,2),
    "idleHours" DECIMAL(12,2),
    "distanceKm" DECIMAL(14,2),
    "emissionFactorId" TEXT NOT NULL,
    "kgCo2e" DECIMAL(16,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetSubscription" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "FleetSubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmissionFactor_fuelType_publicationYear_idx" ON "EmissionFactor"("fuelType", "publicationYear");

-- CreateIndex
CREATE UNIQUE INDEX "EmissionFactor_source_publicationYear_fuelType_key" ON "EmissionFactor"("source", "publicationYear", "fuelType");

-- CreateIndex
CREATE INDEX "FleetAsset_licenseeId_active_idx" ON "FleetAsset"("licenseeId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "FleetAsset_licenseeId_assetTag_key" ON "FleetAsset"("licenseeId", "assetTag");

-- CreateIndex
CREATE INDEX "FleetImportBatch_licenseeId_createdAt_idx" ON "FleetImportBatch"("licenseeId", "createdAt");

-- CreateIndex
CREATE INDEX "FleetReading_licenseeId_periodStart_idx" ON "FleetReading"("licenseeId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "FleetReading_assetId_periodStart_periodEnd_source_key" ON "FleetReading"("assetId", "periodStart", "periodEnd", "source");

-- CreateIndex
CREATE UNIQUE INDEX "FleetSubscription_licenseeId_key" ON "FleetSubscription"("licenseeId");

-- CreateIndex
CREATE UNIQUE INDEX "FleetSubscription_stripeCustomerId_key" ON "FleetSubscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "FleetSubscription_stripeSubscriptionId_key" ON "FleetSubscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "EmissionFactor" ADD CONSTRAINT "EmissionFactor_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "PortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetAsset" ADD CONSTRAINT "FleetAsset_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetImportBatch" ADD CONSTRAINT "FleetImportBatch_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetImportBatch" ADD CONSTRAINT "FleetImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "PortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetReading" ADD CONSTRAINT "FleetReading_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetReading" ADD CONSTRAINT "FleetReading_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetReading" ADD CONSTRAINT "FleetReading_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "FleetImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetReading" ADD CONSTRAINT "FleetReading_emissionFactorId_fkey" FOREIGN KEY ("emissionFactorId") REFERENCES "EmissionFactor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetSubscription" ADD CONSTRAINT "FleetSubscription_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data integrity
ALTER TABLE "EmissionFactor" ADD CONSTRAINT "EmissionFactor_positive_factor" CHECK ("kgCo2ePerUnit" > 0);
ALTER TABLE "FleetReading" ADD CONSTRAINT "FleetReading_valid_period" CHECK ("periodEnd" > "periodStart");
ALTER TABLE "FleetReading" ADD CONSTRAINT "FleetReading_non_negative_values" CHECK (
  "fuelQuantity" >= 0
  AND "kgCo2e" >= 0
  AND ("engineHours" IS NULL OR "engineHours" >= 0)
  AND ("idleHours" IS NULL OR "idleHours" >= 0)
  AND ("distanceKm" IS NULL OR "distanceKm" >= 0)
);
ALTER TABLE "FleetImportBatch" ADD CONSTRAINT "FleetImportBatch_row_counts" CHECK (
  "rowsReceived" = "rowsAccepted" + "rowsRejected"
);
ALTER TABLE "FleetSubscription" ADD CONSTRAINT "FleetSubscription_non_negative_quantity" CHECK ("quantity" >= 0);

-- Row Level Security: licensee isolation on all tenant tables
ALTER TABLE "FleetAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetAsset" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetAsset"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "FleetImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetImportBatch" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetImportBatch"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "FleetReading" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetReading" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetReading"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "FleetSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetSubscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetSubscription"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
