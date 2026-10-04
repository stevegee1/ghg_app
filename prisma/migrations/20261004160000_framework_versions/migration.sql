-- Versioned compliance standards: every framework gets a published version 2026.1 holding its
-- current questions, and every existing submission is pinned to it.

CREATE TABLE "WorkflowFrameworkVersion" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "standardReference" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "changeSummary" TEXT,
    "contentHash" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowFrameworkVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowFrameworkVersion_frameworkId_version_key" ON "WorkflowFrameworkVersion"("frameworkId", "version");
CREATE INDEX "WorkflowFrameworkVersion_frameworkId_effectiveFrom_idx" ON "WorkflowFrameworkVersion"("frameworkId", "effectiveFrom");
ALTER TABLE "WorkflowFrameworkVersion" ADD CONSTRAINT "WorkflowFrameworkVersion_frameworkId_fkey"
    FOREIGN KEY ("frameworkId") REFERENCES "WorkflowFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: the questions each framework has today become its version 2026.1.
INSERT INTO "WorkflowFrameworkVersion" ("id", "frameworkId", "version", "standardReference", "effectiveFrom", "changeSummary", "publishedAt", "retiredAt")
SELECT "id" || '_v2026_1', "id", '2026.1', "name", "createdAt", 'Initial published version.', "createdAt", "retiredAt"
FROM "WorkflowFramework";

ALTER TABLE "WorkflowQuestion" ADD COLUMN "versionId" TEXT;
UPDATE "WorkflowQuestion" SET "versionId" = "frameworkId" || '_v2026_1';
ALTER TABLE "WorkflowQuestion" ALTER COLUMN "versionId" SET NOT NULL;
CREATE INDEX "WorkflowQuestion_versionId_orderIndex_idx" ON "WorkflowQuestion"("versionId", "orderIndex");
ALTER TABLE "WorkflowQuestion" ADD CONSTRAINT "WorkflowQuestion_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "WorkflowFrameworkVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkflowSubmission" ADD COLUMN "frameworkVersionId" TEXT;
UPDATE "WorkflowSubmission" SET "frameworkVersionId" = "frameworkId" || '_v2026_1';
ALTER TABLE "WorkflowSubmission" ALTER COLUMN "frameworkVersionId" SET NOT NULL;
CREATE INDEX "WorkflowSubmission_frameworkVersionId_idx" ON "WorkflowSubmission"("frameworkVersionId");
ALTER TABLE "WorkflowSubmission" ADD CONSTRAINT "WorkflowSubmission_frameworkVersionId_fkey"
    FOREIGN KEY ("frameworkVersionId") REFERENCES "WorkflowFrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ghg_app_user') THEN
    GRANT ALL PRIVILEGES ON TABLE "WorkflowFrameworkVersion" TO ghg_app_user;
  END IF;
END
$$;
