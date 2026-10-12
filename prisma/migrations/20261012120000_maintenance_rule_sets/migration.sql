-- Versioned thresholds for the rule-based maintenance check, published by administrators.

-- CreateTable
CREATE TABLE "MaintenanceRuleSet" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lookbackDays" INTEGER NOT NULL,
    "baselineDays" INTEGER NOT NULL,
    "dueSoonHours" DECIMAL(10,2) NOT NULL,
    "fuelDriftPct" DECIMAL(6,2) NOT NULL,
    "idleRatioPct" DECIMAL(6,2) NOT NULL,
    "faultRecurrenceCount" INTEGER NOT NULL,
    "staleDataHours" INTEGER NOT NULL,
    "highSeverityLabels" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRuleSet_version_key" ON "MaintenanceRuleSet"("version");


ALTER TABLE "MaintenanceRuleSet" ADD CONSTRAINT "MaintenanceRuleSet_valid" CHECK (
  "lookbackDays" > 0 AND "baselineDays" > 0 AND "dueSoonHours" >= 0 AND "fuelDriftPct" > 0
  AND "idleRatioPct" > 0 AND "idleRatioPct" <= 100 AND "faultRecurrenceCount" >= 2 AND "staleDataHours" > 0
);
-- At most one active version.
CREATE UNIQUE INDEX "MaintenanceRuleSet_one_active" ON "MaintenanceRuleSet"("active") WHERE "active" = true;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
