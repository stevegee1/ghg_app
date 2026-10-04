import { Prisma, PrismaClient, ServiceLine, WorkflowStatus, WorkflowType } from '@prisma/client';
import { currentRecommendationWhere } from './assessment-scope';
import { AssuranceFee, getAssuranceFee } from './assurance-fee.service';
import { ClientService, SERVICE_LINES } from './service-routing.service';

type Db = PrismaClient | Prisma.TransactionClient;

/** The engine pipelines a client works through; Fleet is a separate service with its own screens. */
export const PIPELINE_SERVICES = ['GHG', 'WORKFORCE'] as const;
export type PipelineService = (typeof PIPELINE_SERVICES)[number];

export function isPipelineService(value: unknown): value is PipelineService {
  return typeof value === 'string' && (PIPELINE_SERVICES as readonly string[]).includes(value);
}

/** Workflow types behind each pipeline service, matching its entitlements. */
export function pipelineWorkflowTypes(service: PipelineService): WorkflowType[] {
  return SERVICE_LINES[service as ClientService].map((line) => line as string as WorkflowType);
}

/** One flat assurance fee per pipeline, from env. GHG and CARBON share the GHG fee. */
export function pipelineFees(): Record<PipelineService, AssuranceFee> {
  return {
    GHG: getAssuranceFee(WorkflowType.GHG),
    WORKFORCE: getAssuranceFee(WorkflowType.JOB),
  };
}

/** Submissions in these statuses are still in progress; a client resumes them instead of starting again. */
const OPEN_STATUSES: WorkflowStatus[] = [
  WorkflowStatus.DRAFT,
  WorkflowStatus.SUBMITTED,
  WorkflowStatus.AI_SCREENED,
  WorkflowStatus.UNDER_REVIEW,
  WorkflowStatus.REJECTED,
  WorkflowStatus.APPROVED,
  WorkflowStatus.PAID,
];

/**
 * The frameworks a client works through in one pipeline service: their current, accepted
 * recommendations matched to the framework registry, with preparation readiness and the
 * latest submission for each, so the client can start or resume.
 */
export async function listClientFrameworks(db: Db, licenseeId: string, service: PipelineService) {
  const workflowTypes = pipelineWorkflowTypes(service);

  const [entitlements, recommendations] = await Promise.all([
    db.serviceEntitlement.findMany({
      where: { licenseeId, serviceLine: { in: SERVICE_LINES[service as ClientService] }, status: 'ACTIVE' },
      select: { serviceLine: true },
    }),
    db.complianceRecommendation.findMany({
      where: { ...currentRecommendationWhere(licenseeId), workflowType: { in: workflowTypes }, clientAccepted: true },
      include: { checklist: { select: { totalItems: true, completedItems: true, isReadyToIngest: true } } },
      orderBy: { displayOrder: 'asc' },
    }),
  ]);

  const codes = recommendations.map((r) => r.frameworkCode);
  const [frameworks, submissions] = await Promise.all([
    db.workflowFramework.findMany({
      where: { code: { in: codes }, retiredAt: null },
      include: { _count: { select: { questions: true } } },
    }),
    db.workflowSubmission.findMany({
      where: { licenseeId, workflowType: { in: workflowTypes }, framework: { code: { in: codes } } },
      select: { id: true, status: true, frameworkId: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const frameworkByCode = new Map(frameworks.map((f) => [f.code, f]));
  const entitledLines = new Set<ServiceLine>(entitlements.map((e) => e.serviceLine));

  return recommendations
    .filter((r) => frameworkByCode.has(r.frameworkCode))
    .map((r) => {
      const framework = frameworkByCode.get(r.frameworkCode)!;
      const latest = submissions.find((s) => s.frameworkId === framework.id) ?? null;
      return {
        frameworkId: framework.id,
        code: framework.code,
        name: framework.name,
        governingBody: framework.governingBody,
        workflowType: framework.workflowType,
        questionCount: framework._count.questions,
        isLegallyMandatory: r.isLegallyMandatory,
        plainEnglishWhy: r.plainEnglishWhy,
        consequenceIfSkipped: r.consequenceIfSkipped,
        enforcementBody: r.enforcementBody,
        estimatedEffort: r.estimatedEffort,
        entitled: entitledLines.has(framework.workflowType as string as ServiceLine),
        preparation: r.checklist
          ? {
              totalItems: r.checklist.totalItems,
              completedItems: r.checklist.completedItems,
              ready: r.checklist.isReadyToIngest,
            }
          : null,
        latestSubmission: latest
          ? { id: latest.id, status: latest.status, updatedAt: latest.updatedAt, open: OPEN_STATUSES.includes(latest.status) }
          : null,
      };
    });
}

/** Submission fields only administrators see: the AI pre-screen, which advises the auditor, and internal references. */
const ADMIN_ONLY_FIELDS = [
  'aiScreenedAt',
  'aiReviewer',
  'aiScore',
  'aiRecommendation',
  'aiSummary',
  'aiClauseFindings',
  'reviewerId',
  'stripeSessionId',
] as const;

type AdminOnlyField = (typeof ADMIN_ONLY_FIELDS)[number];

/** Returns the submission unchanged for administrators and without admin-only fields for everyone else. */
export function redactSubmissionForRole<T extends object>(submission: T, role: string): T | Omit<T, AdminOnlyField> {
  if (role === 'ADMIN') return submission;
  const copy = { ...submission } as Record<string, unknown>;
  for (const field of ADMIN_ONLY_FIELDS) delete copy[field];
  if (copy.reviewDecision && typeof copy.reviewDecision === 'object') {
    const { reviewerId: _reviewerId, ...decision } = copy.reviewDecision as Record<string, unknown>;
    copy.reviewDecision = decision;
  }
  return copy as Omit<T, AdminOnlyField>;
}

interface PerQuestionDecision {
  questionId: string;
  accepted: boolean;
  reasonIfRejected?: string | null;
}

function readDecisions(value: Prisma.JsonValue): PerQuestionDecision[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (d): d is Prisma.JsonObject =>
      typeof d === 'object' && d !== null && !Array.isArray(d) && typeof (d as Prisma.JsonObject).questionId === 'string'
  ).map((d) => ({
    questionId: d.questionId as string,
    accepted: d.accepted === true,
    reasonIfRejected: typeof d.reasonIfRejected === 'string' ? d.reasonIfRejected : null,
  }));
}

type SubmissionDossier = Prisma.WorkflowSubmissionGetPayload<{
  include: {
    framework: { include: { questions: true } };
    answers: { include: { evidenceDocument: true } };
    reviewDecision: true;
    transitions: true;
    credential: { select: { id: true; status: true; verificationSeal: true; warrantyExpiresAt: true; createdAt: true } };
  };
}>;

/**
 * What a client may see of a submission. The AI pre-screen only advises the Lead Auditor, so its
 * score, recommendation and findings are withheld; the client sees the auditor's decision and, on
 * a revision request, the auditor's reason against each question that needs work.
 */
export function toClientSubmission(dossier: SubmissionDossier) {
  const review = dossier.reviewDecision;
  const decisions = review ? readDecisions(review.perQuestionDecisions) : [];
  const revisionByQuestion = new Map(
    decisions.filter((d) => !d.accepted).map((d) => [d.questionId, d.reasonIfRejected ?? ''])
  );
  const answerByQuestion = new Map(dossier.answers.map((a) => [a.questionId, a]));

  return {
    id: dossier.id,
    licenseeId: dossier.licenseeId,
    workflowType: dossier.workflowType,
    status: dossier.status,
    submittedAt: dossier.submittedAt,
    reviewedAt: dossier.reviewedAt,
    complianceScore: dossier.complianceScore,
    paidAt: dossier.paidAt,
    clientMessage: dossier.clientMessage,
    createdAt: dossier.createdAt,
    updatedAt: dossier.updatedAt,
    framework: {
      id: dossier.framework.id,
      code: dossier.framework.code,
      name: dossier.framework.name,
      governingBody: dossier.framework.governingBody,
      description: dossier.framework.description,
    },
    questions: dossier.framework.questions
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((q) => {
        const answer = answerByQuestion.get(q.id);
        const evidence = answer?.evidenceDocument;
        return {
          id: q.id,
          orderIndex: q.orderIndex,
          text: q.text,
          answerType: q.answerType,
          options: q.options,
          evidenceRequired: q.evidenceRequired,
          clauseReference: q.isoClauseReference,
          guidanceNotes: q.guidanceNotes,
          answer: answer
            ? {
                value: answer.value,
                updatedAt: answer.updatedAt,
                evidence: evidence
                  ? {
                      id: evidence.id,
                      fileName: evidence.fileName,
                      fileUrl: evidence.fileUrl,
                      fileSizeBytes: evidence.fileSizeBytes,
                      sha256Hash: evidence.sha256Hash,
                      uploadedAt: evidence.createdAt,
                    }
                  : null,
              }
            : null,
          revisionReason: revisionByQuestion.has(q.id) ? revisionByQuestion.get(q.id)! : null,
        };
      }),
    review: review
      ? {
          decision: review.overallDecision,
          score: review.overallScore,
          reviewerName: review.reviewerName,
          reviewerAccreditation: review.reviewerAccreditation,
          notes: review.reviewerNotes,
          decidedAt: review.createdAt,
        }
      : null,
    history: dossier.transitions.map((t) => ({ status: t.newStatus, at: t.timestamp })),
    credential: dossier.credential
      ? {
          id: dossier.credential.id,
          status: dossier.credential.status,
          verificationSeal: dossier.credential.verificationSeal,
          warrantyExpiresAt: dossier.credential.warrantyExpiresAt,
          issuedAt: dossier.credential.createdAt,
          verifyPath: `/api/credentials/${dossier.credential.id}/verify`,
          badgePath: `/api/credentials/${dossier.credential.id}/badge.svg`,
        }
      : null,
  };
}

/** Client listing rows: the same withholding as toClientSubmission, without answers. */
export function toClientSubmissionSummary(
  submission: Prisma.WorkflowSubmissionGetPayload<{
    include: { framework: { select: { id: true; code: true; name: true } }; _count: { select: { answers: true } } };
  }>
) {
  return {
    id: submission.id,
    workflowType: submission.workflowType,
    status: submission.status,
    submittedAt: submission.submittedAt,
    reviewedAt: submission.reviewedAt,
    complianceScore: submission.complianceScore,
    paidAt: submission.paidAt,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    framework: submission.framework,
    answeredCount: submission._count.answers,
  };
}
