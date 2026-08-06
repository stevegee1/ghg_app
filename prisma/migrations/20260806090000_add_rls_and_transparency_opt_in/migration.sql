-- AlterTable
ALTER TABLE "Licensee" ADD COLUMN "isPubliclyVisible" BOOLEAN NOT NULL DEFAULT false;

-- Create non-superuser role for RLS enforcement testing if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ghg_app_user') THEN
    CREATE ROLE ghg_app_user NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ghg_app_user;

-- Enable and FORCE Row-Level Security on Transaction table
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;

-- Create RLS policy for Transaction table
CREATE POLICY licensee_isolation ON "Transaction"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

-- Enable and FORCE Row-Level Security on FinancialSplit table
ALTER TABLE "FinancialSplit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialSplit" FORCE ROW LEVEL SECURITY;

-- Create RLS policy for FinancialSplit table
CREATE POLICY licensee_isolation ON "FinancialSplit"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "transactionId" IN (
      SELECT id FROM "Transaction" WHERE "licenseeId" = current_setting('app.current_licensee_id', true)
    )
  );

-- Enable and FORCE Row-Level Security on TriggerEvent table
ALTER TABLE "TriggerEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TriggerEvent" FORCE ROW LEVEL SECURITY;

-- Create RLS policy for TriggerEvent table
CREATE POLICY licensee_isolation ON "TriggerEvent"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "transactionId" IN (
      SELECT id FROM "Transaction" WHERE "licenseeId" = current_setting('app.current_licensee_id', true)
    )
  );
