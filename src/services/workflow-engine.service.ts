import {
  Prisma,
  PrismaClient,
  CredentialStatus,
  WorkflowType,
  WorkflowStatus,
  ReviewOverallDecision,
  EvidenceCategory,
} from '@prisma/client';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { compositeAuditBadge } from './dual-logo-composite.service';

export class InvalidWorkflowTransitionError extends Error {
  constructor(public currentStatus: WorkflowStatus, public targetStatus: WorkflowStatus) {
    super(`Invalid workflow transition from ${currentStatus} to ${targetStatus}.`);
    this.name = 'InvalidWorkflowTransitionError';
  }
}

export class MissingRequiredEvidenceError extends Error {
  constructor(public missingQuestions: { questionId: string; text: string; clause: string }[]) {
    super(
      `Cannot submit: Evidence is strictly required for ${missingQuestions.length} question(s): ${missingQuestions
        .map((q) => `${q.clause} (${q.questionId})`)
        .join(', ')}.`
    );
    this.name = 'MissingRequiredEvidenceError';
  }
}

/** Every question needs an answer before a submission goes to the Lead Auditor. */
export class UnansweredQuestionsError extends Error {
  constructor(public missingQuestions: { questionId: string; text: string; clause: string }[]) {
    super(`Answer every question before submitting. ${missingQuestions.length} question(s) still need an answer.`);
    this.name = 'UnansweredQuestionsError';
  }
}

export const CREDENTIAL_MESSAGE_MAX_LENGTH = 100;

export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewValidationError';
  }
}

export class WorkflowNotFoundError extends Error {
  constructor() {
    super('Submission not found.');
    this.name = 'WorkflowNotFoundError';
  }
}

export class WorkflowForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowForbiddenError';
  }
}

export interface WorkflowActor {
  userId: string;
  role: string;
  licenseeId?: string | null;
}

export interface AnswerInput {
  questionId: string;
  value: string;
  evidenceDocumentId?: string | null;
}

export interface PerQuestionDecisionInput {
  questionId: string;
  accepted: boolean;
  reasonIfRejected: string | null;
}

export interface ReviewDecisionInput {
  reviewerAccreditation: string;
  overallDecision: ReviewOverallDecision;
  overallScore: number;
  perQuestionDecisions: PerQuestionDecisionInput[];
  reviewerNotes?: string | null;
}

export const VALID_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  [WorkflowStatus.ASSESSMENT_PENDING]: [WorkflowStatus.PREPARATION],
  [WorkflowStatus.PREPARATION]: [WorkflowStatus.DRAFT],
  [WorkflowStatus.DRAFT]: [WorkflowStatus.SUBMITTED],
  [WorkflowStatus.SUBMITTED]: [WorkflowStatus.AI_SCREENED, WorkflowStatus.UNDER_REVIEW],
  [WorkflowStatus.AI_SCREENED]: [WorkflowStatus.UNDER_REVIEW, WorkflowStatus.APPROVED, WorkflowStatus.REJECTED],
  [WorkflowStatus.UNDER_REVIEW]: [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED],
  [WorkflowStatus.REJECTED]: [WorkflowStatus.SUBMITTED],
  [WorkflowStatus.APPROVED]: [WorkflowStatus.PAID],
  [WorkflowStatus.PAID]: [WorkflowStatus.BADGE_ISSUED],
  [WorkflowStatus.BADGE_ISSUED]: [],
};

/**
 * Targets reachable through the generic transitionStatus path, and who may request them.
 * All other targets have a dedicated flow: AI_SCREENED (AI reviewer), APPROVED and REJECTED
 * (submitReview), PAID (verified Stripe webhook) and BADGE_ISSUED (setupBadge).
 */
const MANUAL_TRANSITION_ROLES: Partial<Record<WorkflowStatus, 'OWNER_OR_ADMIN' | 'ADMIN'>> = {
  [WorkflowStatus.SUBMITTED]: 'OWNER_OR_ADMIN',
  [WorkflowStatus.UNDER_REVIEW]: 'ADMIN',
};

type WorkflowDb = PrismaClient | Prisma.TransactionClient;

export class WorkflowEngineService {
  /**
   * Pass the transaction client from runWithRls so tenant row-level security applies.
   * The root PrismaClient is only for system work (seeding, background jobs).
   */
  constructor(private prisma: WorkflowDb) {}

  /** Runs fn atomically: opens a transaction on the root client, or reuses the caller's. */
  private atomic<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) {
      return this.prisma.$transaction(fn);
    }
    return fn(this.prisma);
  }

  /**
   * Lists active (non-retired) frameworks, optionally filtered by workflowType.
   */
  async listFrameworks(workflowType?: WorkflowType) {
    return this.prisma.workflowFramework.findMany({
      where: { retiredAt: null, ...(workflowType ? { workflowType } : {}) },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Initializes a new DRAFT submission for a licensee.
   */
  async createDraft(licenseeId: string, workflowType: WorkflowType, frameworkId: string, actorId: string) {
    const framework = await this.prisma.workflowFramework.findUnique({
      where: { id: frameworkId },
    });

    if (!framework) {
      throw new Error(`Framework with ID ${frameworkId} not found.`);
    }

    if (framework.retiredAt) {
      throw new Error(`Framework ${frameworkId} has been retired and cannot start new submissions.`);
    }

    if (framework.workflowType !== workflowType) {
      throw new Error(`Framework ${frameworkId} does not match workflowType ${workflowType}.`);
    }

    return this.atomic(async (tx) => {
      const submission = await tx.workflowSubmission.create({
        data: {
          licenseeId,
          workflowType,
          frameworkId,
          status: WorkflowStatus.DRAFT,
        },
      });

      await tx.workflowTransitionLog.create({
        data: {
          submissionId: submission.id,
          previousStatus: null,
          newStatus: WorkflowStatus.DRAFT,
          triggeredBy: actorId,
          triggerReason: 'Initialized draft questionnaire',
        },
      });

      return submission;
    });
  }

  /**
   * Autosaves answers to a draft or rejected submission.
   */
  async saveAnswers(submissionId: string, licenseeId: string, answers: AnswerInput[]) {
    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new Error('Submission not found.');
    }

    if (submission.licenseeId !== licenseeId) {
      throw new Error('Forbidden: Licensee mismatch.');
    }

    if (submission.status !== WorkflowStatus.DRAFT && submission.status !== WorkflowStatus.REJECTED) {
      throw new Error(`Cannot edit answers while submission is in ${submission.status} status.`);
    }

    const evidenceIds = [...new Set(answers.map((a) => a.evidenceDocumentId).filter((v): v is string => Boolean(v)))];
    if (evidenceIds.length > 0) {
      const owned = await this.prisma.auditEvidenceDocument.count({
        where: { id: { in: evidenceIds }, licenseeId: submission.licenseeId },
      });
      if (owned !== evidenceIds.length) {
        throw new Error('Evidence must be a file uploaded by this organisation.');
      }
    }

    return this.atomic(async (tx) => {
      for (const ans of answers) {
        await tx.workflowAnswer.upsert({
          where: {
            submissionId_questionId: {
              submissionId,
              questionId: ans.questionId,
            },
          },
          update: {
            value: ans.value,
            evidenceDocumentId: ans.evidenceDocumentId || null,
          },
          create: {
            submissionId,
            questionId: ans.questionId,
            value: ans.value,
            evidenceDocumentId: ans.evidenceDocumentId || null,
          },
        });
      }

      return tx.workflowSubmission.findUnique({
        where: { id: submissionId },
        include: { answers: { include: { question: true, evidenceDocument: true } } },
      });
    });
  }

  /**
   * Enforces legal state machine transitions and logs every step.
   */
  async transitionStatus(
    submissionId: string,
    targetStatus: WorkflowStatus,
    actor: WorkflowActor,
    triggerReason?: string
  ) {
    const requiredRole = MANUAL_TRANSITION_ROLES[targetStatus];
    if (!requiredRole) {
      throw new WorkflowForbiddenError(`Status ${targetStatus} can only be set by its dedicated review, payment or badge flow.`);
    }
    if (requiredRole === 'ADMIN' && actor.role !== 'ADMIN') {
      throw new WorkflowForbiddenError(`Only a Lead Auditor can move a submission to ${targetStatus}.`);
    }

    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: {
        framework: {
          include: { questions: true },
        },
        answers: true,
      },
    });

    if (!submission) {
      throw new WorkflowNotFoundError();
    }

    if (actor.role !== 'ADMIN' && submission.licenseeId !== actor.licenseeId) {
      throw new WorkflowForbiddenError('You do not have access to this submission.');
    }

    const currentStatus = submission.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      throw new InvalidWorkflowTransitionError(currentStatus, targetStatus);
    }

    // Gating checks per target status:
    // 1. Moving to SUBMITTED: Must satisfy evidence requirements
    if (targetStatus === WorkflowStatus.SUBMITTED) {
      const answered = new Set(submission.answers.filter((a) => a.value.trim() !== '').map((a) => a.questionId));
      const unanswered = submission.framework.questions
        .filter((q) => !answered.has(q.id))
        .map((q) => ({ questionId: q.id, text: q.text, clause: q.isoClauseReference }));
      if (unanswered.length > 0) {
        throw new UnansweredQuestionsError(unanswered);
      }

      const requiredQuestions = submission.framework.questions.filter((q) => q.evidenceRequired);
      const answerMap = new Map(submission.answers.map((a) => [a.questionId, a]));

      const missing = requiredQuestions
        .filter((q) => {
          const ans = answerMap.get(q.id);
          return !ans || !ans.evidenceDocumentId || !ans.evidenceDocumentId.trim();
        })
        .map((q) => ({ questionId: q.id, text: q.text, clause: q.isoClauseReference }));

      if (missing.length > 0) {
        throw new MissingRequiredEvidenceError(missing);
      }
    }

    return this.atomic(async (tx) => {
      const updateData: Prisma.WorkflowSubmissionUpdateInput = {
        status: targetStatus,
        ...(targetStatus === WorkflowStatus.SUBMITTED ? { submittedAt: new Date() } : {}),
      };

      const updated = await tx.workflowSubmission.update({
        where: { id: submissionId },
        data: updateData,
      });

      await tx.workflowTransitionLog.create({
        data: {
          submissionId,
          previousStatus: currentStatus,
          newStatus: targetStatus,
          triggeredBy: actor.userId,
          triggerReason: triggerReason || `Status changed from ${currentStatus} to ${targetStatus}`,
        },
      });

      return updated;
    });
  }

  /**
   * Records the Lead Auditor's decision (APPROVED or REJECTED) with a decision on every question.
   * The auditor's name is taken from their account; their accreditation is recorded as given.
   */
  async submitReview(submissionId: string, decision: ReviewDecisionInput, actor: WorkflowActor) {
    if (actor.role !== 'ADMIN') {
      throw new WorkflowForbiddenError('Only Lead Auditors can record review decisions.');
    }

    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: { framework: { include: { questions: true } } },
    });

    if (!submission) {
      throw new WorkflowNotFoundError();
    }

    if (submission.status !== WorkflowStatus.UNDER_REVIEW && submission.status !== WorkflowStatus.AI_SCREENED) {
      throw new InvalidWorkflowTransitionError(
        submission.status,
        decision.overallDecision === ReviewOverallDecision.APPROVED ? WorkflowStatus.APPROVED : WorkflowStatus.REJECTED
      );
    }

    const decisionsByQuestion = new Map(decision.perQuestionDecisions.map((d) => [d.questionId, d]));
    const questionIds = new Set(submission.framework.questions.map((q) => q.id));
    const undecided = submission.framework.questions.filter((q) => !decisionsByQuestion.has(q.id));
    const unknown = decision.perQuestionDecisions.filter((d) => !questionIds.has(d.questionId));
    if (undecided.length > 0 || unknown.length > 0) {
      throw new ReviewValidationError('A decision is required for every question in the framework, and only those questions.');
    }
    if (decision.perQuestionDecisions.some((d) => !d.accepted && !d.reasonIfRejected?.trim())) {
      throw new ReviewValidationError('Every rejected question needs a reason the client can act on.');
    }
    if (
      decision.overallDecision === ReviewOverallDecision.APPROVED &&
      decision.perQuestionDecisions.some((d) => !d.accepted)
    ) {
      throw new ReviewValidationError('A submission cannot be approved while any question is rejected.');
    }

    const reviewer = await this.prisma.portalUser.findUnique({
      where: { id: actor.userId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!reviewer) {
      throw new WorkflowForbiddenError('Reviewer account not found.');
    }
    const reviewerName = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || reviewer.email;

    const targetStatus =
      decision.overallDecision === ReviewOverallDecision.APPROVED ? WorkflowStatus.APPROVED : WorkflowStatus.REJECTED;
    const reviewData = {
      reviewerId: actor.userId,
      reviewerName,
      reviewerAccreditation: decision.reviewerAccreditation,
      overallDecision: decision.overallDecision,
      overallScore: decision.overallScore,
      perQuestionDecisions: decision.perQuestionDecisions as unknown as Prisma.InputJsonValue,
      reviewerNotes: decision.reviewerNotes || null,
    };

    return this.atomic(async (tx) => {
      await tx.workflowReviewDecision.upsert({
        where: { submissionId },
        update: reviewData,
        create: { submissionId, ...reviewData },
      });

      const updated = await tx.workflowSubmission.update({
        where: { id: submissionId },
        data: {
          status: targetStatus,
          complianceScore: decision.overallScore,
          reviewedAt: new Date(),
          reviewerId: actor.userId,
        },
      });

      await tx.workflowTransitionLog.create({
        data: {
          submissionId,
          previousStatus: submission.status,
          newStatus: targetStatus,
          triggeredBy: actor.userId,
          triggerReason: `Lead Auditor ${reviewerName} (${decision.reviewerAccreditation}) recorded ${decision.overallDecision} with score ${decision.overallScore}%`,
        },
      });

      return updated;
    });
  }

  /**
   * Retrieves the full submission dossier with answers, framework questions, review decision, and transition history.
   */
  async getSubmissionDossier(submissionId: string) {
    return this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: {
        framework: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        answers: {
          include: {
            evidenceDocument: true,
          },
        },
        reviewDecision: true,
        transitions: {
          orderBy: { timestamp: 'asc' },
        },
        credential: {
          select: { id: true, status: true, verificationSeal: true, warrantyExpiresAt: true, createdAt: true },
        },
      },
    });
  }

  /**
   * Screen 8: Issues the dual-logo credential for a paid submission (PAID -> BADGE_ISSUED).
   * The logo path must come from the server-side upload handler, never from the client.
   */
  async issueCredential(
    submissionId: string,
    input: { clientMessage: string; clientLogoPath: string },
    actor: WorkflowActor
  ) {
    const clientMessage = input.clientMessage.trim();
    if (!clientMessage) {
      throw new Error('Badge setup requires an attestation message.');
    }
    if (clientMessage.length > CREDENTIAL_MESSAGE_MAX_LENGTH) {
      throw new Error(`Client message exceeds maximum allowed length of ${CREDENTIAL_MESSAGE_MAX_LENGTH} characters.`);
    }

    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: { framework: true, licensee: true },
    });

    if (!submission) {
      throw new WorkflowNotFoundError();
    }

    if (actor.role !== 'ADMIN' && submission.licenseeId !== actor.licenseeId) {
      throw new WorkflowForbiddenError('You do not have access to this submission.');
    }

    if (submission.status !== WorkflowStatus.PAID) {
      throw new InvalidWorkflowTransitionError(submission.status, WorkflowStatus.BADGE_ISSUED);
    }

    // Composite outside the transaction: image rendering can exceed the interactive transaction timeout.
    const compositeResult = await compositeAuditBadge({
      clientLogoPath: input.clientLogoPath,
      clientMessage,
      licenseeName: submission.licensee.name,
      selectedFrameworks: [submission.framework.name],
    });

    return this.atomic(async (tx) => {
      // Conditional update so two concurrent requests cannot both issue a credential.
      const claimed = await tx.workflowSubmission.updateMany({
        where: { id: submissionId, status: WorkflowStatus.PAID },
        data: {
          status: WorkflowStatus.BADGE_ISSUED,
          clientMessage,
          clientLogoUrl: input.clientLogoPath,
          compositeBadgeUrl: compositeResult.dataUri,
        },
      });
      if (claimed.count !== 1) {
        throw new InvalidWorkflowTransitionError(submission.status, WorkflowStatus.BADGE_ISSUED);
      }

      const credential = await tx.auditWarrantyCredential.create({
        data: {
          licenseeId: submission.licenseeId,
          workflowSubmissionId: submissionId,
          clientMessage,
          clientLogoUrl: input.clientLogoPath,
          compositeBadgeUrl: compositeResult.dataUri,
          selectedFrameworks: [submission.framework.name],
          verificationSeal: compositeResult.verificationSeal,
          warrantyExpiresAt: new Date(compositeResult.warrantyExpiresAt),
          status: CredentialStatus.ISSUED,
        },
      });

      await tx.workflowTransitionLog.create({
        data: {
          submissionId,
          previousStatus: WorkflowStatus.PAID,
          newStatus: WorkflowStatus.BADGE_ISSUED,
          triggeredBy: actor.userId,
          triggerReason: `Credential ${credential.id} issued with SHA-256 seal ${compositeResult.verificationSeal.slice(0, 16)}`,
        },
      });

      const updated = await tx.workflowSubmission.findUniqueOrThrow({ where: { id: submissionId } });
      return { submission: updated, credential, compositeResult };
    });
  }

  /**
   * Screen 9 & 10: PDF Proof of Audit outcome stream generator.
   */
  async generatePdfProof(submissionId: string, actor: WorkflowActor): Promise<Buffer> {
    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: {
        framework: true,
        licensee: true,
        answers: { include: { question: true, evidenceDocument: true } },
        reviewDecision: true,
      },
    });

    if (!submission) {
      throw new WorkflowNotFoundError();
    }

    if (actor.role !== 'ADMIN' && submission.licenseeId !== actor.licenseeId) {
      throw new WorkflowForbiddenError('You do not have access to this submission.');
    }

    if (submission.status !== WorkflowStatus.BADGE_ISSUED) {
      throw new InvalidWorkflowTransitionError(submission.status, WorkflowStatus.BADGE_ISSUED);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Header
        doc
          .fontSize(22)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('GHG Emissions Registered Trade Mark', { align: 'center' });
        doc.moveDown(0.3);

        doc
          .fontSize(13)
          .font('Helvetica')
          .fillColor('#059669')
          .text('Official Audit Readiness & Conformance Warranty Certificate', { align: 'center' });
        doc.moveDown(0.2);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#64748b')
          .text('UKIPO Registered Trade Mark UK00003980004 | ISO 19011:2026 Audit Protocol', { align: 'center' });
        doc.moveDown(1.2);

        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
        doc.moveDown(1);

        // Licensee Details
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('AUDITEE SPECIFICATION');
        doc.moveDown(0.5);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#334155')
          .text(`Organization Name: ${submission.licensee.name}`)
          .text(`Licensee ID: ${submission.licensee.id}`)
          .text(`Submission ID: ${submission.id}`)
          .text(`Workflow Type: ${submission.workflowType}`)
          .text(`Audited Framework: ${submission.framework.name} (${submission.framework.code})`)
          .text(`Compliance Score: ${submission.complianceScore ?? 100}% Conformance`)
          .text(`Audit Status: ${submission.status}`);
        doc.moveDown(1);

        // Attestation Message
        if (submission.clientMessage) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text('CLIENT ATTESTATION');
          doc.moveDown(0.4);
          doc
            .fontSize(10)
            .font('Helvetica-Oblique')
            .fillColor('#475569')
            .text(`"${submission.clientMessage}"`);
          doc.moveDown(1);
        }

        // Questions & Answers Summary
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('AUDIT QUESTIONS & EVIDENCE DOSSIER');
        doc.moveDown(0.5);

        submission.answers.forEach((ans, idx) => {
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(`${idx + 1}. [${ans.question.isoClauseReference}] ${ans.question.text}`);
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#334155')
            .text(`Answer: ${ans.value}${ans.evidenceDocument ? ` | Evidence: ${ans.evidenceDocument.fileName} (${ans.evidenceDocument.sha256Hash.slice(0, 16)}...)` : ''}`);
          doc.moveDown(0.4);
        });

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
        doc.moveDown(0.8);

        // Mandatory Disclaimer per Part D.1
        doc
          .fontSize(8)
          .font('Helvetica-Oblique')
          .fillColor('#64748b')
          .text(
            'STATUTORY NOTICE: GHG Platform provides independent verification and compliance tracking. Verification badges issued through this platform reflect compliance with the selected framework criteria and do not replace formal ISO certification by an accredited certification body.',
            { align: 'justify' }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Screen 11: Scoped Telemetry API Key generation.
   * Generates a unique key scoped to (a) client, (b) workflowType.
   */
  async generateTelemetryApiKey(licenseeId: string, workflowType: WorkflowType, name?: string) {
    const rawSecret = crypto.randomBytes(16).toString('hex');
    const fullApiKey = `ghg_live_${workflowType.toLowerCase()}_${rawSecret}`;
    const keyHash = crypto.createHash('sha256').update(fullApiKey).digest('hex');
    const maskedKey = `ghg_live_${workflowType.toLowerCase()}_••••${fullApiKey.slice(-4)}`;

    const record = await this.prisma.workflowApiKey.create({
      data: {
        licenseeId,
        workflowType,
        keyHash,
        maskedKey,
        name: name || `${workflowType} Live Telemetry Ingestion Key`,
      },
    });

    return {
      apiKey: fullApiKey, // Shown ONCE to user
      maskedKey: record.maskedKey,
      id: record.id,
      workflowType: record.workflowType,
      name: record.name,
      createdAt: record.createdAt,
    };
  }

  /**
   * Screen 11: Lists masked telemetry keys for licensee.
   */
  async listTelemetryApiKeys(licenseeId: string) {
    return this.prisma.workflowApiKey.findMany({
      where: { licenseeId },
      select: {
        id: true,
        workflowType: true,
        maskedKey: true,
        name: true,
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
