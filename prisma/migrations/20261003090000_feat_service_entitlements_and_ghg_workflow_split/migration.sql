-- Migration: feat_service_entitlements_and_ghg_workflow_split
-- Applies the blueprint gap-fixes agreed on 2026-10-03:
--   1. Adds GHG to WorkflowType so framework routing is distinct from CARBON
--   2. Introduces ServiceLine enum (GHG, CARBON, JOB, MERCH)
--   3. Introduces EntitlementStatus enum for the access-control lifecycle
--   4. Creates ServiceEntitlement table (per-licensee, per-service-line record)
--   5. Replaces the assuranceIntent String with a typed ServiceLine[] array on ClientAssessment
--   6. Removes the now-superseded assuranceIntent column from Licensee

-- 1. Extend WorkflowType enum with GHG value
ALTER TYPE "WorkflowType" ADD VALUE IF NOT EXISTS 'GHG';

-- 2. Create ServiceLine enum
DO $$ BEGIN
  CREATE TYPE "ServiceLine" AS ENUM ('GHG', 'CARBON', 'JOB', 'MERCH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create EntitlementStatus enum
DO $$ BEGIN
  CREATE TYPE "EntitlementStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create ServiceEntitlement table
CREATE TABLE IF NOT EXISTS "ServiceEntitlement" (
  "id"           TEXT NOT NULL,
  "licenseeId"   TEXT NOT NULL,
  "serviceLine"  "ServiceLine" NOT NULL,
  "status"       "EntitlementStatus" NOT NULL DEFAULT 'PENDING',
  "grantedAt"    TIMESTAMP(3),
  "grantedBy"    TEXT,
  "revokedAt"    TIMESTAMP(3),
  "revokedBy"    TEXT,
  "revokeReason" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceEntitlement_pkey" PRIMARY KEY ("id")
);

-- FK to Licensee (cascade delete)
DO $$ BEGIN
  ALTER TABLE "ServiceEntitlement"
    ADD CONSTRAINT "ServiceEntitlement_licenseeId_fkey"
    FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Unique constraint: one entitlement per (licensee, service line)
DO $$ BEGIN
  ALTER TABLE "ServiceEntitlement"
    ADD CONSTRAINT "ServiceEntitlement_licenseeId_serviceLine_key"
    UNIQUE ("licenseeId", "serviceLine");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "ServiceEntitlement_licenseeId_status_idx"
  ON "ServiceEntitlement"("licenseeId", "status");

CREATE INDEX IF NOT EXISTS "ServiceEntitlement_serviceLine_status_idx"
  ON "ServiceEntitlement"("serviceLine", "status");

-- 5. Add serviceLinesRequested column to ClientAssessment (replaces assuranceIntent String)
ALTER TABLE "ClientAssessment"
  ADD COLUMN IF NOT EXISTS "serviceLinesRequested" "ServiceLine"[] NOT NULL DEFAULT '{}';

-- Backfill existing rows: map old assuranceIntent to ServiceLine array
UPDATE "ClientAssessment"
  SET "serviceLinesRequested" = CASE
    WHEN "assuranceIntent" = 'CARBON' THEN ARRAY['GHG', 'CARBON']::"ServiceLine"[]
    WHEN "assuranceIntent" = 'JOB'    THEN ARRAY['JOB']::"ServiceLine"[]
    ELSE                                    ARRAY['GHG', 'CARBON', 'JOB']::"ServiceLine"[]
  END
  WHERE "serviceLinesRequested" = '{}';

-- Drop assuranceIntent from ClientAssessment (data preserved in serviceLinesRequested)
ALTER TABLE "ClientAssessment"
  DROP COLUMN IF EXISTS "assuranceIntent";

-- 6. Drop assuranceIntent from Licensee (data no longer needed; entitlements table takes over)
ALTER TABLE "Licensee"
  DROP COLUMN IF EXISTS "assuranceIntent";
