-- Migration: ghg_scope_ai_screened
-- Adds GHG Protocol Scope 1/2/3 classification fields to TelemetryLog
-- Adds AI_SCREENED status to WorkflowStatus enum

-- 1. Create GhgScope enum
CREATE TYPE "GhgScope" AS ENUM ('SCOPE_1', 'SCOPE_2', 'SCOPE_3');

-- 2. Add GHG scope and emission factor columns to TelemetryLog
ALTER TABLE "TelemetryLog"
  ADD COLUMN "ghgScope" "GhgScope",
  ADD COLUMN "activityAmount" DOUBLE PRECISION,
  ADD COLUMN "unitOfMeasure" TEXT,
  ADD COLUMN "emissionFactorKgCo2PerUnit" DOUBLE PRECISION,
  ADD COLUMN "calculatedKgCo2e" DOUBLE PRECISION;

-- 3. Add index for ghgScope queries (Scope 1/2/3 rollup reporting)
CREATE INDEX "TelemetryLog_licenseeId_ghgScope_idx" ON "TelemetryLog"("licenseeId", "ghgScope");

-- 4. Add AI_SCREENED status to WorkflowStatus enum
ALTER TYPE "WorkflowStatus" ADD VALUE 'AI_SCREENED' AFTER 'SUBMITTED';
