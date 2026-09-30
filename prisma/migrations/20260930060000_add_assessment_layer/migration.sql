-- CreateEnum
CREATE TYPE "PrimaryRole" AS ENUM ('COMPLIANCE_OFFICER', 'FINANCE_DIRECTOR', 'OPERATIONS_DIRECTOR', 'LEGAL_OFFICER', 'SUSTAINABILITY_CONSULTANT', 'IT_DATA_MANAGER', 'OTHER');

-- CreateEnum
CREATE TYPE "IndustrySector" AS ENUM ('MANUFACTURING', 'DATA_CENTRE', 'CONSTRUCTION', 'LOGISTICS_TRANSPORT', 'GREEN_HYDROGEN', 'RETAIL_CONSUMER_GOODS', 'FINANCIAL_SERVICES', 'PUBLIC_SECTOR', 'EVENTS_HOSPITALITY', 'REAL_ESTATE_PROPERTY', 'AGRICULTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganisationSize" AS ENUM ('MICRO_UNDER_10', 'SMALL_10_49', 'MEDIUM_50_249', 'LARGE_250_PLUS');

-- CreateEnum
CREATE TYPE "RevenueBand" AS ENUM ('UNDER_2M', 'BAND_2M_10M', 'BAND_10M_36M', 'BAND_36M_PLUS');

-- CreateEnum
CREATE TYPE "ComplianceEffort" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'WAIVED');

-- CreateEnum
CREATE TYPE "ChecklistItemDataType" AS ENUM ('NUMERIC_READING', 'DOCUMENT_UPLOAD', 'DATE_RANGE', 'YES_NO', 'FREE_TEXT');

-- AlterEnum
ALTER TYPE "WorkflowStatus" ADD VALUE 'ASSESSMENT_PENDING';
ALTER TYPE "WorkflowStatus" ADD VALUE 'PREPARATION';

-- AlterTable
ALTER TABLE "Licensee" ADD COLUMN     "companyRegistrationNo" TEXT,
ADD COLUMN     "hasCompletedAssessment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "industrySector" "IndustrySector",
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "organisationCountry" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "PortalUser" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "primaryRole" "PrimaryRole" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "ClientAssessment" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "organisationCountry" TEXT NOT NULL,
    "organisationSize" "OrganisationSize" NOT NULL,
    "annualRevenueBand" "RevenueBand" NOT NULL,
    "industrySector" "IndustrySector" NOT NULL,
    "hasPhysicalSites" BOOLEAN NOT NULL,
    "hasProductionProcess" BOOLEAN NOT NULL,
    "hasFleet" BOOLEAN NOT NULL,
    "hasIoTMeters" BOOLEAN NOT NULL,
    "isUKPublicContractor" BOOLEAN NOT NULL,
    "hasPlanningConsent" BOOLEAN NOT NULL,
    "makesPublicGreenClaims" BOOLEAN NOT NULL,
    "hasGreenHydrogen" BOOLEAN NOT NULL DEFAULT false,
    "assessmentVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRecommendation" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "frameworkCode" TEXT NOT NULL,
    "frameworkName" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "isLegallyMandatory" BOOLEAN NOT NULL,
    "plainEnglishWhy" TEXT NOT NULL,
    "consequenceIfSkipped" TEXT,
    "enforcementBody" TEXT,
    "estimatedEffort" "ComplianceEffort" NOT NULL,
    "clientAccepted" BOOLEAN NOT NULL DEFAULT true,
    "deferredReason" TEXT,
    "clientReviewedAt" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflowSubmissionId" TEXT,

    CONSTRAINT "ComplianceRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationChecklist" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "isReadyToIngest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparationChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "plainEnglishLabel" TEXT NOT NULL,
    "plainEnglishGuidance" TEXT NOT NULL,
    "isoClauseReference" TEXT,
    "dataType" "ChecklistItemDataType" NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "waivedReason" TEXT,
    "linkedEvidenceDocId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparationChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientAssessment_licenseeId_idx" ON "ClientAssessment"("licenseeId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRecommendation_workflowSubmissionId_key" ON "ComplianceRecommendation"("workflowSubmissionId");

-- CreateIndex
CREATE INDEX "ComplianceRecommendation_licenseeId_frameworkCode_idx" ON "ComplianceRecommendation"("licenseeId", "frameworkCode");

-- CreateIndex
CREATE INDEX "ComplianceRecommendation_assessmentId_idx" ON "ComplianceRecommendation"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PreparationChecklist_recommendationId_key" ON "PreparationChecklist"("recommendationId");

-- CreateIndex
CREATE INDEX "PreparationChecklist_licenseeId_idx" ON "PreparationChecklist"("licenseeId");

-- CreateIndex
CREATE INDEX "PreparationChecklistItem_checklistId_status_idx" ON "PreparationChecklistItem"("checklistId", "status");

-- CreateIndex
CREATE INDEX "PreparationChecklistItem_itemCode_idx" ON "PreparationChecklistItem"("itemCode");

-- AddForeignKey
ALTER TABLE "ClientAssessment" ADD CONSTRAINT "ClientAssessment_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecommendation" ADD CONSTRAINT "ComplianceRecommendation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ClientAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecommendation" ADD CONSTRAINT "ComplianceRecommendation_workflowSubmissionId_fkey" FOREIGN KEY ("workflowSubmissionId") REFERENCES "WorkflowSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationChecklist" ADD CONSTRAINT "PreparationChecklist_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ComplianceRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationChecklistItem" ADD CONSTRAINT "PreparationChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "PreparationChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (RLS) enforcement
ALTER TABLE "ClientAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientAssessment" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "ClientAssessment"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "ComplianceRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRecommendation" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "ComplianceRecommendation"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "PreparationChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreparationChecklist" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "PreparationChecklist"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

ALTER TABLE "PreparationChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreparationChecklistItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "PreparationChecklistItem"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "checklistId" IN (
      SELECT id FROM "PreparationChecklist" WHERE "licenseeId" = current_setting('app.current_licensee_id', true)
    )
  );

GRANT USAGE ON SCHEMA public TO ghg_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ghg_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ghg_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ghg_app_user;
