-- Migration: workflow_rls_admin_flag
-- The WorkflowSubmission and WorkflowApiKey policies granted access to every row whenever
-- app.current_licensee_id was empty, which includes non-admin sessions without a licensee.
-- Align them with every other tenant policy: full access only when app.is_admin is 'true'.

DROP POLICY IF EXISTS licensee_isolation ON "WorkflowSubmission";
CREATE POLICY licensee_isolation ON "WorkflowSubmission"
    FOR ALL
    USING (
        current_setting('app.is_admin', true) = 'true'
        OR "licenseeId" = current_setting('app.current_licensee_id', true)
    );

DROP POLICY IF EXISTS licensee_isolation ON "WorkflowApiKey";
CREATE POLICY licensee_isolation ON "WorkflowApiKey"
    FOR ALL
    USING (
        current_setting('app.is_admin', true) = 'true'
        OR "licenseeId" = current_setting('app.current_licensee_id', true)
    );
