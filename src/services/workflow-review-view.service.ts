import { Prisma, PrismaClient, WorkflowStatus } from '@prisma/client';
import { FileIntegrity, checkStoredFile } from './file-storage.service';

type Db = PrismaClient | Prisma.TransactionClient;

/** Submissions waiting on the Lead Auditor. AI_SCREENED is waiting too: the audit engine only advises. */
export const AWAITING_REVIEW: WorkflowStatus[] = [WorkflowStatus.SUBMITTED, WorkflowStatus.AI_SCREENED, WorkflowStatus.UNDER_REVIEW];

export const REVIEW_QUEUE_STAGES = ['awaiting', 'decided', 'all'] as const;
export type ReviewQueueStage = (typeof REVIEW_QUEUE_STAGES)[number];

export function isReviewQueueStage(value: unknown): value is ReviewQueueStage {
  return typeof value === 'string' && (REVIEW_QUEUE_STAGES as readonly string[]).includes(value);
}

const DECIDED: WorkflowStatus[] = [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED, WorkflowStatus.PAID, WorkflowStatus.BADGE_ISSUED];

/** The Lead Auditor's queue, oldest submission first so nothing waits longest. */
export async function listReviewQueue(db: Db, stage: ReviewQueueStage) {
  const statuses = stage === 'awaiting' ? AWAITING_REVIEW : stage === 'decided' ? DECIDED : [...AWAITING_REVIEW, ...DECIDED];
  const rows = await db.workflowSubmission.findMany({
    where: { status: { in: statuses } },
    select: {
      id: true,
      status: true,
      workflowType: true,
      submittedAt: true,
      reviewedAt: true,
      complianceScore: true,
      aiScreenedAt: true,
      aiScore: true,
      aiRecommendation: true,
      licensee: { select: { id: true, name: true } },
      framework: { select: { id: true, code: true, name: true } },
      reviewDecision: { select: { reviewerName: true, overallDecision: true } },
    },
    orderBy: stage === 'awaiting' ? { submittedAt: 'asc' } : { updatedAt: 'desc' },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    workflowType: r.workflowType,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
    complianceScore: r.complianceScore,
    licensee: r.licensee,
    framework: r.framework,
    ai: r.aiScreenedAt ? { score: r.aiScore, recommendation: r.aiRecommendation } : null,
    decidedBy: r.reviewDecision?.reviewerName ?? null,
  }));
}

interface AiFinding {
  questionId: string;
  status: string;
  findings: string;
  evidenceVerified: boolean;
  confidence: number | null;
}

function readAiFindings(value: Prisma.JsonValue | null): AiFinding[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((f): f is Prisma.JsonObject => typeof f === 'object' && f !== null && !Array.isArray(f) && typeof (f as Prisma.JsonObject).questionId === 'string')
    .map((f) => ({
      questionId: f.questionId as string,
      status: typeof f.status === 'string' ? f.status : 'UNKNOWN',
      findings: typeof f.findings === 'string' ? f.findings : '',
      evidenceVerified: f.evidenceVerified === true,
      confidence: typeof f.confidence === 'number' ? f.confidence : null,
    }));
}

function readDecisions(value: Prisma.JsonValue | undefined) {
  if (!Array.isArray(value)) return new Map<string, { accepted: boolean; reasonIfRejected: string | null }>();
  return new Map(
    value
      .filter((d): d is Prisma.JsonObject => typeof d === 'object' && d !== null && !Array.isArray(d) && typeof (d as Prisma.JsonObject).questionId === 'string')
      .map((d) => [d.questionId as string, { accepted: d.accepted === true, reasonIfRejected: typeof d.reasonIfRejected === 'string' ? d.reasonIfRejected : null }])
  );
}

/**
 * Everything the Lead Auditor needs to decide one submission: each question with the client's
 * answer and evidence, the AI pre-screen finding for it (advice only), and any earlier decision.
 */
export async function getReviewDossier(db: Db, submissionId: string) {
  const s = await db.workflowSubmission.findUnique({
    where: { id: submissionId },
    include: {
      licensee: { select: { id: true, name: true } },
      framework: true,
      frameworkVersion: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      answers: { include: { evidenceDocument: true } },
      reviewDecision: true,
      transitions: { orderBy: { timestamp: 'asc' } },
    },
  });
  if (!s) return null;

  // Re-check every stored file's fingerprint, so the auditor knows each one is the file the client uploaded.
  const integrityByEvidence = new Map<string, FileIntegrity>();
  await Promise.all(
    s.answers.map(async (a) => {
      const e = a.evidenceDocument;
      if (e?.storageKey) integrityByEvidence.set(e.id, (await checkStoredFile(e.storageKey, e.sha256Hash)).integrity);
    })
  );

  const aiByQuestion = new Map(readAiFindings(s.aiClauseFindings).map((f) => [f.questionId, f]));
  const answerByQuestion = new Map(s.answers.map((a) => [a.questionId, a]));
  const previous = readDecisions(s.reviewDecision?.perQuestionDecisions);

  return {
    id: s.id,
    status: s.status,
    workflowType: s.workflowType,
    submittedAt: s.submittedAt,
    reviewedAt: s.reviewedAt,
    canDecide: s.status === WorkflowStatus.AI_SCREENED || s.status === WorkflowStatus.UNDER_REVIEW,
    canStartReview: s.status === WorkflowStatus.SUBMITTED,
    canRerunAi: s.status === WorkflowStatus.SUBMITTED || s.status === WorkflowStatus.AI_SCREENED,
    licensee: s.licensee,
    framework: { id: s.framework.id, code: s.framework.code, name: s.framework.name, governingBody: s.framework.governingBody },
    ai: s.aiScreenedAt
      ? { screenedAt: s.aiScreenedAt, reviewer: s.aiReviewer, score: s.aiScore, recommendation: s.aiRecommendation, summary: s.aiSummary }
      : null,
    version: { id: s.frameworkVersion.id, version: s.frameworkVersion.version, standardReference: s.frameworkVersion.standardReference },
    questions: s.frameworkVersion.questions.map((q) => {
      const a = answerByQuestion.get(q.id);
      const e = a?.evidenceDocument;
      return {
        id: q.id,
        orderIndex: q.orderIndex,
        text: q.text,
        answerType: q.answerType,
        evidenceRequired: q.evidenceRequired,
        clauseReference: q.isoClauseReference,
        guidanceNotes: q.guidanceNotes,
        answer: a ? a.value : null,
        evidence: e
          ? {
              id: e.id,
              fileName: e.fileName,
              fileUrl: e.fileUrl,
              fileSizeBytes: e.fileSizeBytes,
              sha256Hash: e.sha256Hash,
              stored: Boolean(e.storageKey),
              integrity: integrityByEvidence.get(e.id) ?? null,
            }
          : null,
        aiFinding: aiByQuestion.get(q.id) ?? null,
        previousDecision: previous.get(q.id) ?? null,
      };
    }),
    review: s.reviewDecision
      ? {
          decision: s.reviewDecision.overallDecision,
          score: s.reviewDecision.overallScore,
          reviewerName: s.reviewDecision.reviewerName,
          reviewerAccreditation: s.reviewDecision.reviewerAccreditation,
          notes: s.reviewDecision.reviewerNotes,
          decidedAt: s.reviewDecision.createdAt,
        }
      : null,
    history: s.transitions.map((t) => ({ status: t.newStatus, at: t.timestamp, reason: t.triggerReason })),
  };
}

/** The signed-in auditor's name as it will appear on decisions, and the accreditation they last signed with. */
export async function getReviewerProfile(db: Db, userId: string) {
  const user = await db.portalUser.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
  if (!user) return null;
  const last = await db.workflowReviewDecision.findFirst({
    where: { reviewerId: userId, reviewerAccreditation: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { reviewerAccreditation: true },
  });
  return {
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    lastAccreditation: last?.reviewerAccreditation ?? null,
  };
}
