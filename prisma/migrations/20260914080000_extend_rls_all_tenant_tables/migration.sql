-- Enable and FORCE Row-Level Security on all remaining tenant tables

-- 1. AuditEvidenceDocument
ALTER TABLE "AuditEvidenceDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvidenceDocument" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "AuditEvidenceDocument"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- 2. JobCreationReport
ALTER TABLE "JobCreationReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobCreationReport" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "JobCreationReport"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- 3. TelemetryLog
ALTER TABLE "TelemetryLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TelemetryLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "TelemetryLog"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- 4. AssetCalibrationRecord
ALTER TABLE "AssetCalibrationRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetCalibrationRecord" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "AssetCalibrationRecord"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- 5. NonConformanceEvent
ALTER TABLE "NonConformanceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NonConformanceEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "NonConformanceEvent"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- 6. AuditInspectionReport
ALTER TABLE "AuditInspectionReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditInspectionReport" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "AuditInspectionReport"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- 7. IsoReadinessSubmission
ALTER TABLE "IsoReadinessSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IsoReadinessSubmission" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "IsoReadinessSubmission"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- 8. AuditWarrantyCredential
ALTER TABLE "AuditWarrantyCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditWarrantyCredential" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "AuditWarrantyCredential"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- 9. CustomKeepsakeSpec (via transaction relation)
ALTER TABLE "CustomKeepsakeSpec" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomKeepsakeSpec" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "CustomKeepsakeSpec"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "transactionId" IN (
      SELECT id FROM "Transaction" WHERE "licenseeId" = current_setting('app.current_licensee_id', true)
    )
  );

-- Ensure ghg_app_user has full usage and privileges across all public tables and sequences
GRANT USAGE ON SCHEMA public TO ghg_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ghg_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ghg_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ghg_app_user;
