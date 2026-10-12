-- Registry of trained predictive maintenance models, their accuracy and publication.

-- CreateEnum
CREATE TYPE "MaintenanceModelStatus" AS ENUM ('TRAINED', 'PUBLISHED', 'RETIRED');

-- CreateTable
CREATE TABLE "FleetMaintenanceModel" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "featureSetId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,
    "weights" JSONB NOT NULL,
    "trainMetrics" JSONB NOT NULL,
    "testMetrics" JSONB NOT NULL,
    "clientCount" INTEGER NOT NULL,
    "machineCount" INTEGER NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "positiveCount" INTEGER NOT NULL,
    "datasetSha256" TEXT NOT NULL,
    "passedGate" BOOLEAN NOT NULL,
    "gateNotes" TEXT NOT NULL,
    "status" "MaintenanceModelStatus" NOT NULL DEFAULT 'TRAINED',
    "trainedByUserId" TEXT NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "FleetMaintenanceModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FleetMaintenanceModel_version_key" ON "FleetMaintenanceModel"("version");

-- CreateIndex
CREATE INDEX "FleetMaintenanceModel_status_idx" ON "FleetMaintenanceModel"("status");

-- AddForeignKey
ALTER TABLE "FleetMaintenanceModel" ADD CONSTRAINT "FleetMaintenanceModel_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "MaintenanceRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "FleetMaintenanceModel" ADD CONSTRAINT "FleetMaintenanceModel_valid" CHECK (
  "horizonDays" > 0 AND "sampleCount" >= 0 AND "positiveCount" >= 0 AND "positiveCount" <= "sampleCount"
);
-- At most one published model; a model that missed its accuracy minimums can never be published.
CREATE UNIQUE INDEX "FleetMaintenanceModel_one_published" ON "FleetMaintenanceModel"("status") WHERE "status" = 'PUBLISHED';
ALTER TABLE "FleetMaintenanceModel" ADD CONSTRAINT "FleetMaintenanceModel_publish_requires_gate" CHECK ("status" <> 'PUBLISHED' OR "passedGate");

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
