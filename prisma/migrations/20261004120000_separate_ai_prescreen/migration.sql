-- Migration: separate_ai_prescreen
-- AI pre-screen results were written into WorkflowReviewDecision, the same row the Lead
-- Auditor's decision later overwrote, so the AI recommendation was lost from the audit trail.
-- AI results now live on WorkflowSubmission; WorkflowReviewDecision holds human decisions only
-- and records the auditor's identity at sign-off.

ALTER TABLE "WorkflowSubmission"
  ADD COLUMN "aiScreenedAt" TIMESTAMP(3),
  ADD COLUMN "aiReviewer" TEXT,
  ADD COLUMN "aiScore" INTEGER,
  ADD COLUMN "aiRecommendation" TEXT,
  ADD COLUMN "aiSummary" TEXT,
  ADD COLUMN "aiClauseFindings" JSONB;

ALTER TABLE "WorkflowReviewDecision"
  ADD COLUMN "reviewerName" TEXT,
  ADD COLUMN "reviewerAccreditation" TEXT;

-- Move existing AI pre-screens (rows with no human reviewer) onto their submissions.
UPDATE "WorkflowSubmission" AS s
SET "aiScreenedAt" = d."createdAt",
    "aiReviewer" = 'Pre-screen recorded before audit trail separation',
    "aiScore" = d."overallScore",
    "aiRecommendation" = CASE WHEN d."overallDecision" = 'APPROVED' THEN 'APPROVE' ELSE 'REQUIRE_REVISION' END,
    "aiSummary" = d."reviewerNotes",
    "aiClauseFindings" = d."perQuestionDecisions"
FROM "WorkflowReviewDecision" AS d
WHERE d."submissionId" = s."id" AND d."reviewerId" IS NULL;

DELETE FROM "WorkflowReviewDecision" WHERE "reviewerId" IS NULL;
