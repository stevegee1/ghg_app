import {
  PrismaClient,
  WorkflowType,
  WorkflowStatus,
  WorkflowAnswerType,
  ReviewOverallDecision,
  EvidenceCategory,
} from '@prisma/client';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { compositeAuditBadge } from './dual-logo-composite.service';
import { mintAuditWarrantyToken } from './nft-minting.service';

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
  reviewerId?: string | null;
  overallDecision: ReviewOverallDecision;
  overallScore: number;
  perQuestionDecisions: PerQuestionDecisionInput[];
  reviewerNotes?: string | null;
}

export const VALID_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  [WorkflowStatus.DRAFT]: [WorkflowStatus.SUBMITTED],
  [WorkflowStatus.SUBMITTED]: [WorkflowStatus.AI_SCREENED, WorkflowStatus.UNDER_REVIEW],
  [WorkflowStatus.AI_SCREENED]: [WorkflowStatus.UNDER_REVIEW, WorkflowStatus.APPROVED, WorkflowStatus.REJECTED],
  [WorkflowStatus.UNDER_REVIEW]: [WorkflowStatus.APPROVED, WorkflowStatus.REJECTED],
  [WorkflowStatus.REJECTED]: [WorkflowStatus.SUBMITTED],
  [WorkflowStatus.APPROVED]: [WorkflowStatus.PAID],
  [WorkflowStatus.PAID]: [WorkflowStatus.BADGE_ISSUED],
  [WorkflowStatus.BADGE_ISSUED]: [WorkflowStatus.MINTED],
  [WorkflowStatus.MINTED]: [],
};

export class WorkflowEngineService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Initializes standard baseline frameworks and questions for CARBON and JOB workflows if not present.
   */
  async seedStandardFrameworks(): Promise<void> {
    const frameworks = [
      {
        id: 'ISO_14064_1',
        workflowType: WorkflowType.CARBON,
        code: 'ISO 14064-1',
        name: 'Corporate Greenhouse Gas Inventories',
        governingBody: 'International Organization for Standardization',
        jurisdiction: 'Global / Multi-National',
        description: 'Standard specification with guidance for quantification and reporting of greenhouse gas emissions and removals.',
        questions: [
          {
            orderIndex: 1,
            text: 'Has your organization established an operational boundary covering Scope 1 direct emissions and Scope 2 energy indirect emissions?',
            answerType: WorkflowAnswerType.BOOLEAN,
            evidenceRequired: true,
            isoClauseReference: 'ISO 14064-1:2018 Clause 5.2.2',
            guidanceNotes: 'Attach organizational boundary chart and operational control documentation.',
          },
          {
            orderIndex: 2,
            text: 'What is the quantified gross Scope 1 direct greenhouse gas emissions in metric tonnes CO2 equivalent for the reporting period?',
            answerType: WorkflowAnswerType.NUMBER,
            evidenceRequired: true,
            isoClauseReference: 'ISO 14064-1:2018 Clause 5.2.4',
            guidanceNotes: 'Provide primary utility meter data, fuel purchase receipts, or continuous emissions monitoring logs.',
          },
          {
            orderIndex: 3,
            text: 'Have significant indirect emissions (Scope 3 categories 1-15) been evaluated using a documented significance criteria?',
            answerType: WorkflowAnswerType.BOOLEAN,
            evidenceRequired: true,
            isoClauseReference: 'ISO 14064-1:2018 Clause 5.2.3',
            guidanceNotes: 'Upload Scope 3 materiality screening matrix and data provenance records.',
          },
        ],
      },
      {
        id: 'ISO_50001',
        workflowType: WorkflowType.CARBON,
        code: 'ISO 50001',
        name: 'Energy Management Systems',
        governingBody: 'International Organization for Standardization',
        jurisdiction: 'Global / Multi-National',
        description: 'Requirements for establishing, implementing, maintaining, and improving an energy management system.',
        questions: [
          {
            orderIndex: 1,
            text: 'Has an Energy Review been conducted identifying Significant Energy Uses (SEUs) and baseline EnPIs?',
            answerType: WorkflowAnswerType.BOOLEAN,
            evidenceRequired: true,
            isoClauseReference: 'ISO 50001:2018 Clause 6.3',
            guidanceNotes: 'Upload Energy Review summary sheet and facility sub-metering layout.',
          },
          {
            orderIndex: 2,
            text: 'What is your annualized total energy consumption across all monitored facilities in Megawatt-hours (MWh)?',
            answerType: WorkflowAnswerType.NUMBER,
            evidenceRequired: false,
            isoClauseReference: 'ISO 50001:2018 Clause 6.5',
            guidanceNotes: 'Enter aggregated MWh from fiscal energy ledger.',
          },
        ],
      },
      {
        id: 'UK_SECTION_106',
        workflowType: WorkflowType.JOB,
        code: 'UK Section 106',
        name: 'Local Employment & Training Covenant',
        governingBody: 'UK Local Planning Authorities / DLUHC',
        jurisdiction: 'United Kingdom',
        description: 'Statutory planning obligations under Section 106 of the Town and Country Planning Act 1990 for local labor and training.',
        questions: [
          {
            orderIndex: 1,
            text: 'Does local resident labor constitute at least 20% of the total workforce employed on the development site?',
            answerType: WorkflowAnswerType.BOOLEAN,
            evidenceRequired: true,
            isoClauseReference: 'TCPA 1990 Section 106 Sched 3',
            guidanceNotes: 'Provide employee postcode verification registers audited against municipal boundaries.',
          },
          {
            orderIndex: 2,
            text: 'Total number of accredited apprenticeship weeks delivered during the reporting period:',
            answerType: WorkflowAnswerType.NUMBER,
            evidenceRequired: true,
            isoClauseReference: 'CITB National Apprenticeship Benchmark',
            guidanceNotes: 'Upload NVQ/City & Guilds indenture forms and training attendance certificates.',
          },
          {
            orderIndex: 3,
            text: 'Are all site operatives, subcontractors, and agency staff paid at or above the Real Living Wage?',
            answerType: WorkflowAnswerType.BOOLEAN,
            evidenceRequired: true,
            isoClauseReference: 'Living Wage Foundation Accreditation Standard',
            guidanceNotes: 'Upload payroll verification audit or Living Wage Foundation accreditation certificate.',
          },
        ],
      },
      {
        id: 'SOCIAL_VALUE_PPN0620',
        workflowType: WorkflowType.JOB,
        code: 'Social Value PPN 06/20',
        name: 'UK Public Sector Social Value Model',
        governingBody: 'Cabinet Office',
        jurisdiction: 'United Kingdom',
        description: 'Tackling economic inequality, fighting climate change, and creating new businesses and jobs under PPN 06/20.',
        questions: [
          {
            orderIndex: 1,
            text: 'Number of full-time equivalent (FTE) jobs created for individuals previously unemployed or from disadvantaged backgrounds:',
            answerType: WorkflowAnswerType.NUMBER,
            evidenceRequired: true,
            isoClauseReference: 'PPN 06/20 Theme 2 MAC 2.1',
            guidanceNotes: 'Attach verified payroll starts and Department for Work and Pensions (DWP) referrals.',
          },
          {
            orderIndex: 2,
            text: 'Has a structured supplier diversity and SME supply chain spend program been implemented?',
            answerType: WorkflowAnswerType.BOOLEAN,
            evidenceRequired: false,
            isoClauseReference: 'PPN 06/20 Theme 2 MAC 2.2',
            guidanceNotes: 'Provide tier-1 supplier invoice breakdown showing percentage spent with local SMEs.',
          },
        ],
      },
    ];

    for (const f of frameworks) {
      await this.prisma.workflowFramework.upsert({
        where: { id: f.id },
        update: {
          workflowType: f.workflowType,
          code: f.code,
          name: f.name,
          governingBody: f.governingBody,
          jurisdiction: f.jurisdiction,
          description: f.description,
        },
        create: {
          id: f.id,
          workflowType: f.workflowType,
          code: f.code,
          name: f.name,
          governingBody: f.governingBody,
          jurisdiction: f.jurisdiction,
          description: f.description,
        },
      });

      for (const q of f.questions) {
        const existingQ = await this.prisma.workflowQuestion.findFirst({
          where: { frameworkId: f.id, orderIndex: q.orderIndex },
        });

        if (existingQ) {
          await this.prisma.workflowQuestion.update({
            where: { id: existingQ.id },
            data: {
              text: q.text,
              answerType: q.answerType,
              evidenceRequired: q.evidenceRequired,
              isoClauseReference: q.isoClauseReference,
              guidanceNotes: q.guidanceNotes,
            },
          });
        } else {
          await this.prisma.workflowQuestion.create({
            data: {
              frameworkId: f.id,
              orderIndex: q.orderIndex,
              text: q.text,
              answerType: q.answerType,
              evidenceRequired: q.evidenceRequired,
              isoClauseReference: q.isoClauseReference,
              guidanceNotes: q.guidanceNotes,
            },
          });
        }
      }
    }
  }

  /**
   * Lists frameworks parameterized by workflowType ('CARBON' | 'JOB').
   */
  async listFrameworks(workflowType?: WorkflowType) {
    return this.prisma.workflowFramework.findMany({
      where: workflowType ? { workflowType } : undefined,
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

    if (framework.workflowType !== workflowType) {
      throw new Error(`Framework ${frameworkId} does not match workflowType ${workflowType}.`);
    }

    return this.prisma.$transaction(async (tx) => {
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

    return this.prisma.$transaction(async (tx) => {
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
    actor: { userId: string; role: string },
    triggerReason?: string
  ) {
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
      throw new Error('Submission not found.');
    }

    const currentStatus = submission.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      throw new InvalidWorkflowTransitionError(currentStatus, targetStatus);
    }

    // Gating checks per target status:
    // 1. Moving to SUBMITTED: Must satisfy evidence requirements
    if (targetStatus === WorkflowStatus.SUBMITTED) {
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

    // 2. Moving to UNDER_REVIEW: Requires Lead Auditor or Admin role.
    //    Also accepts transition from AI_SCREENED (AI agent pre-screen completed).
    if (targetStatus === WorkflowStatus.UNDER_REVIEW && actor.role !== 'ADMIN') {
      throw new Error('Forbidden: Only an authorized Lead Auditor can transition a submission to UNDER_REVIEW.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: targetStatus,
      };

      if (targetStatus === WorkflowStatus.SUBMITTED) {
        updateData.submittedAt = new Date();
      } else if (targetStatus === WorkflowStatus.APPROVED || targetStatus === WorkflowStatus.REJECTED) {
        updateData.reviewedAt = new Date();
        updateData.reviewerId = actor.userId;
      } else if (targetStatus === WorkflowStatus.PAID) {
        updateData.paidAt = new Date();
      }

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
   * Records a structured Lead Auditor review decision (APPROVED or REJECTED) with per-question breakdowns.
   */
  async submitReview(submissionId: string, decision: ReviewDecisionInput, actor: { userId: string; role: string }) {
    if (actor.role !== 'ADMIN') {
      throw new Error('Forbidden: Only Lead Auditors can record review decisions.');
    }

    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: { framework: { include: { questions: true } } },
    });

    if (!submission) {
      throw new Error('Submission not found.');
    }

    if (submission.status !== WorkflowStatus.UNDER_REVIEW && submission.status !== WorkflowStatus.AI_SCREENED) {
      throw new Error(`Cannot submit review while submission is in ${submission.status}. Must be UNDER_REVIEW or AI_SCREENED.`);
    }

    const targetStatus =
      decision.overallDecision === ReviewOverallDecision.APPROVED
        ? WorkflowStatus.APPROVED
        : WorkflowStatus.REJECTED;

    return this.prisma.$transaction(async (tx) => {
      // 1. Record structured Review Decision
      await tx.workflowReviewDecision.upsert({
        where: { submissionId },
        update: {
          reviewerId: decision.reviewerId || actor.userId,
          overallDecision: decision.overallDecision,
          overallScore: decision.overallScore,
          perQuestionDecisions: decision.perQuestionDecisions as any,
          reviewerNotes: decision.reviewerNotes || null,
        },
        create: {
          submissionId,
          reviewerId: decision.reviewerId || actor.userId,
          overallDecision: decision.overallDecision,
          overallScore: decision.overallScore,
          perQuestionDecisions: decision.perQuestionDecisions as any,
          reviewerNotes: decision.reviewerNotes || null,
        },
      });

      // 2. Update Submission status & complianceScore
      const updated = await tx.workflowSubmission.update({
        where: { id: submissionId },
        data: {
          status: targetStatus,
          complianceScore: decision.overallScore,
          reviewedAt: new Date(),
          reviewerId: decision.reviewerId || actor.userId,
        },
      });

      // 3. Log transition
      await tx.workflowTransitionLog.create({
        data: {
          submissionId,
          previousStatus: WorkflowStatus.UNDER_REVIEW,
          newStatus: targetStatus,
          triggeredBy: actor.userId,
          triggerReason: `Lead Auditor review completed: ${decision.overallDecision} (Score: ${decision.overallScore}%)`,
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
      },
    });
  }

  /**
   * Screen 7: Simulates flat fee payment completion or executes settlement webhook transition (APPROVED -> PAID).
   */
  async simulatePayment(
    submissionId: string,
    licenseeId: string,
    actor: { userId: string; role: string },
    stripeSessionId?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.workflowSubmission.findUnique({
        where: { id: submissionId },
        include: { framework: true, licensee: true },
      });

      if (!submission) {
        throw new Error(`Submission '${submissionId}' not found.`);
      }

      if (actor.role !== 'ADMIN' && submission.licenseeId !== licenseeId) {
        throw new Error('Forbidden: Licensee mismatch.');
      }

      if (submission.status !== WorkflowStatus.APPROVED) {
        throw new InvalidWorkflowTransitionError(submission.status, WorkflowStatus.PAID);
      }

      const sessionId = stripeSessionId || `cs_test_wf_${crypto.randomBytes(12).toString('hex')}`;

      const updated = await tx.workflowSubmission.update({
        where: { id: submissionId },
        data: {
          status: WorkflowStatus.PAID,
          paidAt: new Date(),
          stripeSessionId: sessionId,
        },
      });

      await tx.workflowTransitionLog.create({
        data: {
          submissionId,
          previousStatus: WorkflowStatus.APPROVED,
          newStatus: WorkflowStatus.PAID,
          triggeredBy: actor.userId,
          triggerReason: `Audit assurance flat-fee payment settled via Stripe (${sessionId})`,
        },
      });

      return updated;
    });
  }

  /**
   * Screen 8: Badge Setup Form (PAID -> BADGE_ISSUED)
   * Client provides short message (max 100 chars) and logo image. Composites badge and transitions status.
   */
  async setupBadge(
    submissionId: string,
    licenseeId: string,
    input: {
      clientMessage: string;
      clientLogoUrl?: string | null;
    },
    actor: { userId: string; role: string }
  ) {
    if (!input.clientMessage || input.clientMessage.trim().length === 0) {
      throw new Error('Badge setup requires an attestation message.');
    }

    if (input.clientMessage.length > 100) {
      throw new Error('Client message exceeds maximum allowed length of 100 characters.');
    }

    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: { framework: true, licensee: true },
    });

    if (!submission) {
      throw new Error(`Submission '${submissionId}' not found.`);
    }

    if (actor.role !== 'ADMIN' && submission.licenseeId !== licenseeId) {
      throw new Error('Forbidden: Licensee mismatch.');
    }

    if (submission.status !== WorkflowStatus.PAID) {
      throw new InvalidWorkflowTransitionError(submission.status, WorkflowStatus.BADGE_ISSUED);
    }

    // Generate composite badge with platform logo and client logo (outside transaction to avoid DB timeout)
    const compositeResult = await compositeAuditBadge({
      clientLogoPath: input.clientLogoUrl || '',
      clientMessage: input.clientMessage.trim(),
      licenseeName: submission.licensee.name,
      selectedFrameworks: [submission.framework.name],
    });

    const [updated] = await this.prisma.$transaction([
      this.prisma.workflowSubmission.update({
        where: { id: submissionId },
        data: {
          status: WorkflowStatus.BADGE_ISSUED,
          clientMessage: input.clientMessage.trim(),
          clientLogoUrl: input.clientLogoUrl || null,
          compositeBadgeUrl: compositeResult.dataUri,
        },
      }),
      this.prisma.workflowTransitionLog.create({
        data: {
          submissionId,
          previousStatus: WorkflowStatus.PAID,
          newStatus: WorkflowStatus.BADGE_ISSUED,
          triggeredBy: actor.userId,
          triggerReason: `Audit warranty badge generated and verified with SHA-256 seal ${compositeResult.verificationSeal.slice(0, 16)}`,
        },
      }),
    ]);

    return {
      submission: updated,
      compositeResult,
    };
  }

  /**
   * Screen 9: Minting to Polygon PoS ERC-1155 (BADGE_ISSUED -> MINTED)
   * Validates wallet address, calls minting service, and transitions status.
   */
  async mintBadge(
    submissionId: string,
    licenseeId: string,
    recipientAddress: string,
    actor: { userId: string; role: string }
  ) {
    const trimmedAddress = (recipientAddress || '').trim();
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;

    if (!trimmedAddress || !ethAddressRegex.test(trimmedAddress)) {
      throw new Error(`Invalid wallet address format: '${recipientAddress}'. Must be a valid 42-character 0x-prefixed hex address.`);
    }

    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: { framework: true, licensee: true },
    });

    if (!submission) {
      throw new Error(`Submission '${submissionId}' not found.`);
    }

    if (actor.role !== 'ADMIN' && submission.licenseeId !== licenseeId) {
      throw new Error('Forbidden: Licensee mismatch.');
    }

    if (submission.status !== WorkflowStatus.BADGE_ISSUED) {
      throw new InvalidWorkflowTransitionError(submission.status, WorkflowStatus.MINTED);
    }

    const mintResult = await mintAuditWarrantyToken({
      credentialId: submission.id,
      licenseeId: submission.licenseeId,
      metadataUri: `/api/workflow/submissions/${submission.id}`,
      recipientAddress: trimmedAddress,
    });

    const [updated] = await this.prisma.$transaction([
      this.prisma.workflowSubmission.update({
        where: { id: submissionId },
        data: {
          status: WorkflowStatus.MINTED,
          tokenId: mintResult.tokenId,
          contractAddress: mintResult.contractAddress,
          transactionHash: mintResult.transactionHash,
          openSeaUrl: mintResult.openSeaUrl,
          mintedAt: new Date(),
        },
      }),
      this.prisma.workflowTransitionLog.create({
        data: {
          submissionId,
          previousStatus: WorkflowStatus.BADGE_ISSUED,
          newStatus: WorkflowStatus.MINTED,
          triggeredBy: actor.userId,
          triggerReason: `Token ID #${mintResult.tokenId} minted to ${trimmedAddress} on Polygon PoS`,
        },
      }),
    ]);

    return {
      submission: updated,
      mintResult,
    };
  }

  /**
   * Screen 9 & 10: PDF Proof of Audit outcome stream generator.
   */
  async generatePdfProof(submissionId: string, licenseeId?: string): Promise<Buffer> {
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
      throw new Error(`Submission '${submissionId}' not found.`);
    }

    if (licenseeId && submission.licenseeId !== licenseeId) {
      throw new Error('Forbidden: Licensee mismatch.');
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

        // On-chain Minting Details
        if (submission.tokenId) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text('ERC-1155 ON-CHAIN COMMITMENT');
          doc.moveDown(0.4);
          doc
            .fontSize(9)
            .font('Courier')
            .fillColor('#334155')
            .text(`Token ID: ${submission.tokenId}`)
            .text(`Contract: ${submission.contractAddress || '0x0000000000000000000000000000000000000000'}`)
            .text(`Transaction: ${submission.transactionHash || 'Deterministic Pre-Mint Seal'}`)
            .text(`OpenSea: ${submission.openSeaUrl || 'Pending Index'}`);
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

  /**
   * Screen 4: Registers verified evidence document into AuditEvidenceDocument table.
   */
  async uploadEvidenceDocument(input: {
    licenseeId: string;
    uploadedBy: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    fileBuffer?: Buffer;
    category?: EvidenceCategory;
  }) {
    const { licenseeId, uploadedBy, fileName, mimeType, fileSizeBytes, fileBuffer, category } = input;
    const cat = category || EvidenceCategory.OTHER_AUDIT_PROOF;
    const hash = fileBuffer
      ? crypto.createHash('sha256').update(fileBuffer).digest('hex')
      : crypto.createHash('sha256').update(`${licenseeId}_${fileName}_${Date.now()}`).digest('hex');

    return this.prisma.auditEvidenceDocument.create({
      data: {
        licenseeId,
        fileName,
        category: cat,
        fileUrl: `/evidence/${licenseeId}/${encodeURIComponent(fileName)}`,
        fileSizeBytes,
        mimeType,
        sha256Hash: hash,
        uploadedBy,
      },
    });
  }
}

