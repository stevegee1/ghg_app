-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('CARBON', 'JOB');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'BADGE_ISSUED', 'MINTED');

-- CreateEnum
CREATE TYPE "WorkflowAnswerType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT');

-- CreateEnum
CREATE TYPE "ReviewOverallDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "WorkflowFramework" (
    "id" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "governingBody" TEXT,
    "jurisdiction" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowQuestion" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "answerType" "WorkflowAnswerType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "isoClauseReference" TEXT NOT NULL,
    "guidanceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSubmission" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "complianceScore" INTEGER,
    "paidAt" TIMESTAMP(3),
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "evidenceDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowReviewDecision" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "overallDecision" "ReviewOverallDecision" NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "perQuestionDecisions" JSONB NOT NULL,
    "reviewerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransitionLog" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "previousStatus" "WorkflowStatus",
    "newStatus" "WorkflowStatus" NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggerReason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowTransitionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowFramework_code_key" ON "WorkflowFramework"("code");

-- CreateIndex
CREATE INDEX "WorkflowFramework_workflowType_idx" ON "WorkflowFramework"("workflowType");

-- CreateIndex
CREATE INDEX "WorkflowQuestion_frameworkId_orderIndex_idx" ON "WorkflowQuestion"("frameworkId", "orderIndex");

-- CreateIndex
CREATE INDEX "WorkflowSubmission_licenseeId_status_idx" ON "WorkflowSubmission"("licenseeId", "status");

-- CreateIndex
CREATE INDEX "WorkflowSubmission_workflowType_status_idx" ON "WorkflowSubmission"("workflowType", "status");

-- CreateIndex
CREATE INDEX "WorkflowAnswer_submissionId_idx" ON "WorkflowAnswer"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowAnswer_submissionId_questionId_key" ON "WorkflowAnswer"("submissionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowReviewDecision_submissionId_key" ON "WorkflowReviewDecision"("submissionId");

-- CreateIndex
CREATE INDEX "WorkflowTransitionLog_submissionId_timestamp_idx" ON "WorkflowTransitionLog"("submissionId", "timestamp");

-- AddForeignKey
ALTER TABLE "WorkflowQuestion" ADD CONSTRAINT "WorkflowQuestion_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "WorkflowFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSubmission" ADD CONSTRAINT "WorkflowSubmission_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSubmission" ADD CONSTRAINT "WorkflowSubmission_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "WorkflowFramework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAnswer" ADD CONSTRAINT "WorkflowAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WorkflowSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAnswer" ADD CONSTRAINT "WorkflowAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WorkflowQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAnswer" ADD CONSTRAINT "WorkflowAnswer_evidenceDocumentId_fkey" FOREIGN KEY ("evidenceDocumentId") REFERENCES "AuditEvidenceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowReviewDecision" ADD CONSTRAINT "WorkflowReviewDecision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WorkflowSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransitionLog" ADD CONSTRAINT "WorkflowTransitionLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WorkflowSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (RLS) enforcement
ALTER TABLE "WorkflowSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowSubmission" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "WorkflowSubmission"
    FOR ALL
    USING (
        (current_setting('app.current_licensee_id'::text, true) = ''::text)
        OR
        ("licenseeId" = current_setting('app.current_licensee_id'::text, true))
    );
