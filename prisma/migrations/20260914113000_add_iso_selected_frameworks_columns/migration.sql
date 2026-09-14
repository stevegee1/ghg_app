-- AlterEnum
ALTER TYPE "IsoReadinessStatus" ADD VALUE IF NOT EXISTS 'AUDIT_READY';

-- AlterTable IsoReadinessSubmission
ALTER TABLE "IsoReadinessSubmission" ADD COLUMN IF NOT EXISTS "selectedFrameworks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "IsoReadinessSubmission" ADD COLUMN IF NOT EXISTS "auditReadyAt" TIMESTAMP(3);

-- AlterTable AuditWarrantyCredential
ALTER TABLE "AuditWarrantyCredential" ADD COLUMN IF NOT EXISTS "selectedFrameworks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AuditWarrantyCredential" ADD COLUMN IF NOT EXISTS "operationalHealth" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "AuditWarrantyCredential" ADD COLUMN IF NOT EXISTS "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[];
