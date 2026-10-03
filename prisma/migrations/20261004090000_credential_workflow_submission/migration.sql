-- Migration: credential_workflow_submission
-- Credentials can be issued from the workflow engine (GHG and Workforce pipelines).
-- The legacy ISO readiness link becomes optional; every credential keeps exactly one link.

ALTER TABLE "AuditWarrantyCredential" ALTER COLUMN "submissionId" DROP NOT NULL;

ALTER TABLE "AuditWarrantyCredential" ADD COLUMN "workflowSubmissionId" TEXT;

CREATE UNIQUE INDEX "AuditWarrantyCredential_workflowSubmissionId_key"
  ON "AuditWarrantyCredential"("workflowSubmissionId");

ALTER TABLE "AuditWarrantyCredential"
  ADD CONSTRAINT "AuditWarrantyCredential_workflowSubmissionId_fkey"
  FOREIGN KEY ("workflowSubmissionId") REFERENCES "WorkflowSubmission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditWarrantyCredential"
  ADD CONSTRAINT "AuditWarrantyCredential_single_submission_link"
  CHECK (("submissionId" IS NULL) <> ("workflowSubmissionId" IS NULL));
