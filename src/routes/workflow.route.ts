import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { PrismaClient, WorkflowType, WorkflowStatus, DeliveryType, EvidenceCategory } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { discardLogoOnFailure, logoUpload } from '../middleware/logo-upload.middleware';
import { evidenceUpload } from '../middleware/evidence-upload.middleware';
import { storeEvidenceFile } from '../services/evidence-file.service';
import {
  WorkflowEngineService,
  InvalidWorkflowTransitionError,
  MissingRequiredEvidenceError,
  UnansweredQuestionsError,
  WorkflowForbiddenError,
  WorkflowNotFoundError,
  ReviewValidationError,
  CREDENTIAL_MESSAGE_MAX_LENGTH,
} from '../services/workflow-engine.service';
import { CheckoutService } from '../services/checkout.service';
import { runWithRls } from '../db/rls';
import { getAssuranceFee } from '../services/assurance-fee.service';
import { isWorkflowBillingEnabled } from '../services/billing-config.service';
import { PLATFORM_LICENSEE_ID } from '../services/platform-account.service';
import { configuredLlmProviderId } from '../services/review-pipeline/llm-provider.interface';
import {
  isPipelineService,
  listClientFrameworks,
  pipelineFees,
  redactSubmissionForRole,
  toClientSubmission,
  toClientSubmissionSummary,
} from '../services/workflow-client-view.service';
import { currentVersionInclude } from '../services/framework-version.service';
import { getReviewDossier, getReviewerProfile, isReviewQueueStage, listReviewQueue } from '../services/workflow-review-view.service';

export function createWorkflowRouter(prisma: PrismaClient, checkoutService?: CheckoutService): Router {
  const router = Router();
  const workflowService = new WorkflowEngineService(prisma);

  const requireAdmin = (req: Request, res: Response, next: () => void) => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  };

  /**
   * GET /api/workflow/frameworks
   * Lists supported frameworks from the DB registry, optionally filtered by workflowType (GHG | CARBON | JOB).
   */
  router.get('/api/workflow/frameworks', async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      let workflowType: WorkflowType | undefined = undefined;

      if (type && typeof type === 'string') {
        const upper = type.toUpperCase();
        if (upper === 'GHG' || upper === 'CARBON' || upper === 'JOB') {
          workflowType = upper as WorkflowType;
        } else {
          return res.status(400).json({ error: `Invalid workflow type: ${type}. Must be 'GHG', 'CARBON', or 'JOB'.` });
        }
      }

      const frameworks = await workflowService.listFrameworks(workflowType);
      return res.status(200).json({ frameworks });
    } catch (err: any) {
      console.error('[WORKFLOW FRAMEWORKS GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve workflow frameworks.' });
    }
  });

  /**
   * GET /api/workflow/frameworks/:code/questions
   * Admin-only: Returns the full question set for a framework from the DB registry.
   * Used by the admin framework registry UI to inspect and validate question content.
   */
  router.get('/api/workflow/frameworks/:code/questions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { code } = req.params;
    try {
      const found = await prisma.workflowFramework.findFirst({
        where: { code },
        include: { versions: currentVersionInclude() },
      });
      const current = found?.versions[0];
      const fw = found && current ? { ...found, version: current, questions: current.questions } : null;

      if (!fw) {
        return res.status(404).json({ error: `Framework '${code}' not found in registry.` });
      }

      return res.status(200).json({
        framework: {
          id: fw.id,
          code: fw.code,
          name: fw.name,
          workflowType: fw.workflowType,
          governingBody: fw.governingBody,
          jurisdiction: fw.jurisdiction,
          description: fw.description,
        },
        version: { id: fw.version.id, version: fw.version.version, standardReference: fw.version.standardReference },
        questions: fw.questions,
        totalQuestions: fw.questions.length,
      });
    } catch (err: any) {
      console.error('[FRAMEWORK QUESTIONS GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve framework questions.' });
    }
  });

  /**
   * POST /api/workflow/draft
   * Initializes a new DRAFT submission for the authenticated licensee.
   */
  router.post('/api/workflow/draft', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    const licenseeId = user.licenseeId || req.body.licenseeId;

    if (!licenseeId) {
      return res.status(400).json({ error: 'licenseeId is required.' });
    }

    const { workflowType, frameworkId } = req.body || {};

    if (!workflowType || (workflowType !== 'GHG' && workflowType !== 'CARBON' && workflowType !== 'JOB')) {
      return res.status(400).json({ error: "workflowType must be 'GHG', 'CARBON', or 'JOB'." });
    }

    if (!frameworkId || typeof frameworkId !== 'string') {
      return res.status(400).json({ error: 'frameworkId is required.' });
    }

    // Statutory gating check for non-admin licensees
    if (user.role !== 'ADMIN') {
      // Gate 1: Active ServiceEntitlement for requested pipeline
      const serviceLineMap: Record<string, string> = { GHG: 'GHG', CARBON: 'CARBON', JOB: 'JOB' };
      const requiredServiceLine = serviceLineMap[workflowType as string];
      const entitlement = await prisma.serviceEntitlement.findFirst({
        where: {
          licenseeId,
          serviceLine: requiredServiceLine as any,
          status: 'ACTIVE',
        },
      });

      if (!entitlement) {
        return res.status(403).json({
          error: `Active ${workflowType} service entitlement required. Contact your account manager to activate this compliance pipeline.`,
          code: 'ENTITLEMENT_REQUIRED',
        });
      }

      // Gate 2: Intake assessment completed
      const licensee = await prisma.licensee.findUnique({
        where: { id: licenseeId },
        select: { hasCompletedAssessment: true },
      });

      if (!licensee?.hasCompletedAssessment) {
        return res.status(403).json({
          error: 'Statutory intake assessment required before initializing workflow draft.',
          code: 'INTAKE_ASSESSMENT_REQUIRED',
        });
      }

      const checklists = await prisma.preparationChecklist.findMany({
        where: {
          licenseeId,
          recommendation: {
            workflowType: workflowType as WorkflowType,
            assessment: { supersededAt: null },
          },
        },
        include: {
          recommendation: true,
        },
      });

      if (checklists.length === 0) {
        return res.status(403).json({
          error: 'Statutory preparation checklist incomplete. You must complete all mandatory preparation items before launching the assurance diagnostic.',
          code: 'PREPARATION_INCOMPLETE',
        });
      }

      const mandatoryLists = checklists.filter(
        (c) => c.recommendation?.isLegallyMandatory && c.recommendation?.clientAccepted !== false
      );
      const relevantLists = mandatoryLists.length > 0 ? mandatoryLists : checklists;
      const allReady = relevantLists.every((c) => c.isReadyToIngest);

      if (!allReady) {
        return res.status(403).json({
          error: 'Preparation checklist incomplete. You must complete all mandatory preparation items before launching the assurance diagnostic.',
          code: 'PREPARATION_INCOMPLETE',
        });
      }
    }

    try {
      const submission = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).createDraft(
          licenseeId,
          workflowType as WorkflowType,
          frameworkId,
          user.userId
        );
      });

      return res.status(201).json({
        success: true,
        submission,
      });
    } catch (err: any) {
      console.error('[WORKFLOW DRAFT CREATE ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to create workflow draft.' });
    }
  });

  /**
   * GET /api/workflow/my-frameworks?service=GHG|WORKFORCE
   * The client's frameworks in one pipeline, from their current accepted recommendations, with
   * preparation readiness and the latest submission for each so they can start or resume.
   */
  router.get('/api/workflow/my-frameworks', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    const service = typeof req.query.service === 'string' ? req.query.service.toUpperCase() : '';

    if (!isPipelineService(service)) {
      return res.status(400).json({ error: "service must be 'GHG' or 'WORKFORCE'." });
    }
    if (!user.licenseeId) {
      return res.status(403).json({ error: 'A client organisation account is required.' });
    }

    try {
      const frameworks = await runWithRls(prisma, user, (tx) => listClientFrameworks(tx, user.licenseeId!, service));
      return res.status(200).json({ service, frameworks });
    } catch (err: unknown) {
      console.error('[WORKFLOW MY FRAMEWORKS ERROR]', err);
      return res.status(500).json({ error: 'Failed to load your frameworks.' });
    }
  });

  /**
   * GET /api/workflow/fees
   * The assurance fee for each pipeline, as configured in env.
   */
  router.get('/api/workflow/fees', authenticateToken, (_req: Request, res: Response) => {
    try {
      return res.status(200).json({ fees: pipelineFees() });
    } catch (err: unknown) {
      console.error('[WORKFLOW FEES ERROR]', err);
      return res.status(500).json({ error: 'Fees are temporarily unavailable.' });
    }
  });

  /**
   * GET /api/workflow/submissions
   * Lists submissions scoped to the tenant (or all for Admin).
   */
  router.get('/api/workflow/submissions', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    const { workflowType, status } = req.query;

    try {
      const submissions = await runWithRls(prisma, user, async (tx) => {
        const where: any = {};

        if (user.role !== 'ADMIN' && user.licenseeId) {
          where.licenseeId = user.licenseeId;
        } else if (req.query.licenseeId && typeof req.query.licenseeId === 'string') {
          where.licenseeId = req.query.licenseeId;
        }

        if (workflowType && typeof workflowType === 'string') {
          where.workflowType = workflowType.toUpperCase() as WorkflowType;
        }

        if (status && typeof status === 'string') {
          where.status = status.toUpperCase() as WorkflowStatus;
        }

        return tx.workflowSubmission.findMany({
          where,
          include: {
            framework: { select: { id: true, code: true, name: true } },
            licensee: { select: { id: true, name: true } },
            _count: { select: { answers: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      return res.status(200).json({
        submissions: user.role === 'ADMIN' ? submissions : submissions.map(toClientSubmissionSummary),
      });
    } catch (err: any) {
      console.error('[WORKFLOW SUBMISSIONS LIST ERROR]', err);
      return res.status(500).json({ error: 'Failed to list submissions.' });
    }
  });

  /**
   * GET /api/workflow/submissions/:id
   * Retrieves full submission dossier with answers, evidence, and transition logs.
   */
  router.get('/api/workflow/submissions/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    try {
      const dossier = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).getSubmissionDossier(id);
      });

      if (!dossier) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      if (user.role !== 'ADMIN' && dossier.licenseeId !== user.licenseeId) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      return res.status(200).json({ submission: redactSubmissionForRole(dossier, user.role) });
    } catch (err: any) {
      console.error('[WORKFLOW DOSSIER GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve submission dossier.' });
    }
  });

  /**
   * GET /api/workflow/submissions/:id/view
   * The client's view of a submission: questions with their answers and evidence, the Lead
   * Auditor's decision and per-question revision reasons, and the status history. The AI
   * pre-screen is advice to the auditor and is not included.
   */
  router.get('/api/workflow/submissions/:id/view', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;

    try {
      const dossier = await runWithRls(prisma, user, (tx) => new WorkflowEngineService(tx).getSubmissionDossier(req.params.id));
      if (!dossier || (user.role !== 'ADMIN' && dossier.licenseeId !== user.licenseeId)) {
        return res.status(404).json({ error: 'Submission not found.' });
      }
      return res.status(200).json({ submission: toClientSubmission(dossier) });
    } catch (err: unknown) {
      console.error('[WORKFLOW CLIENT VIEW ERROR]', err);
      return res.status(500).json({ error: 'Failed to load the submission.' });
    }
  });

  /**
   * PATCH /api/workflow/submissions/:id/answers
   * Autosaves answers to a draft or rejected submission.
   */
  router.patch('/api/workflow/submissions/:id/answers', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const { answers } = req.body || {};

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers must be an array of { questionId, value, evidenceDocumentId? }.' });
    }

    try {
      const updated = await runWithRls(prisma, user, async (tx) => {
        const existing = await tx.workflowSubmission.findUnique({ where: { id } });
        if (!existing) throw new Error('Submission not found.');

        const effectiveLicenseeId = user.role === 'ADMIN' ? existing.licenseeId : user.licenseeId!;
        return new WorkflowEngineService(tx).saveAnswers(id, effectiveLicenseeId, answers);
      });

      return res.status(200).json({ success: true, submission: updated && redactSubmissionForRole(updated, user.role) });
    } catch (err: any) {
      console.error('[WORKFLOW ANSWERS SAVE ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to save answers.' });
    }
  });

  /**
   * POST /api/workflow/submissions/:id/submit
   * Submits a DRAFT (or resubmits REJECTED) for Lead Auditor review.
   * Validates that all questions with evidenceRequired: true have valid evidence attachments.
   */
  router.post('/api/workflow/submissions/:id/submit', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    try {
      const submitted = await runWithRls(prisma, user, async (tx) => {
        const existing = await tx.workflowSubmission.findUnique({ where: { id } });
        if (!existing) throw new Error('Submission not found.');

        if (user.role !== 'ADMIN' && user.licenseeId && existing.licenseeId !== user.licenseeId) {
          throw new Error('Forbidden: Licensee mismatch.');
        }

        if (user.role !== 'ADMIN') {
          const checklists = await tx.preparationChecklist.findMany({
            where: {
              licenseeId: existing.licenseeId,
              recommendation: {
                workflowType: existing.workflowType,
                assessment: { supersededAt: null },
              },
            },
            include: { recommendation: true },
          });

          if (checklists.length === 0) {
            throw new Error('Preparation checklist incomplete. You must complete all mandatory preparation items before submitting for assurance review.');
          }

          const mandatoryLists = checklists.filter(
            (c) => c.recommendation?.isLegallyMandatory && c.recommendation?.clientAccepted !== false
          );
          const relevantLists = mandatoryLists.length > 0 ? mandatoryLists : checklists;
          const allReady = relevantLists.every((c) => c.isReadyToIngest);

          if (!allReady) {
            throw new Error('Preparation checklist incomplete. You must complete all mandatory preparation items before submitting for assurance review.');
          }
        }

        return new WorkflowEngineService(tx).transitionStatus(
          id,
          WorkflowStatus.SUBMITTED,
          { userId: user.userId, role: user.role, licenseeId: user.licenseeId },
          'Client finalized and submitted questionnaire for review'
        );
      });

      // Automatically trigger AI Assurance Agent asynchronously (production / dev)
      if (process.env.NODE_ENV !== 'test') {
        import('../services/review-pipeline/ai-audit-reviewer.service')
          .then(({ AiAuditReviewer }) => {
            const reviewer = new AiAuditReviewer(prisma);
            return reviewer.evaluateSubmission(id);
          })
          .then((result) => {
            console.log(`[AUTO_AI_SCREEN] Submission ${id} auto-evaluated: score=${result.complianceScore}%, decision=${result.decision}`);
          })
          .catch((err) => {
            console.warn(`[AUTO_AI_SCREEN] Non-blocking notice for submission ${id}:`, err?.message);
          });
      }

      return res.status(200).json({
        success: true,
        message: 'Submission successfully submitted for Lead Auditor review.',
        submission: redactSubmissionForRole(submitted, user.role),
      });
    } catch (err: any) {
      if (err instanceof MissingRequiredEvidenceError || err instanceof UnansweredQuestionsError) {
        return res.status(422).json({
          error: err.message,
          missingQuestions: err.missingQuestions,
        });
      }
      if (err instanceof InvalidWorkflowTransitionError) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof WorkflowForbiddenError) {
        return res.status(403).json({ error: err.message });
      }
      if (err instanceof WorkflowNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      console.error('[WORKFLOW SUBMIT ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to submit questionnaire.' });
    }
  });


  /**
   * POST /api/workflow/submissions/:id/ai-screen
   * Admin-only: re-runs the AI pre-screen for a SUBMITTED or AI_SCREENED submission (for example
   * after the automatic run failed). Returns 202 and runs in the background.
   */
  router.post('/api/workflow/submissions/:id/ai-screen', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const submission = await prisma.workflowSubmission.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }
      if (submission.status !== WorkflowStatus.SUBMITTED && submission.status !== WorkflowStatus.AI_SCREENED) {
        return res.status(409).json({ error: `AI pre-screen cannot run while the submission is ${submission.status}.` });
      }

      const { AiAuditReviewer } = await import('../services/review-pipeline/ai-audit-reviewer.service');
      new AiAuditReviewer(prisma).evaluateSubmission(id).catch((err: unknown) => {
        console.error(`[AI_SCREEN] Failed for submission ${id}:`, err);
      });

      return res.status(202).json({ success: true, submissionId: id });
    } catch (err: unknown) {
      console.error('[AI_SCREEN INIT ERROR]', err);
      return res.status(500).json({ error: 'Failed to start AI pre-screen.' });
    }
  });

  /**
   * GET /api/workflow/submissions/:id/ai-findings
   * Admin-only: the AI pre-screen docket shown to the Lead Auditor. It is advice to the auditor,
   * not a decision, so it is not exposed to licensees.
   */
  router.get('/api/workflow/submissions/:id/ai-findings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const submission = await prisma.workflowSubmission.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          aiScreenedAt: true,
          aiReviewer: true,
          aiScore: true,
          aiRecommendation: true,
          aiSummary: true,
          aiClauseFindings: true,
        },
      });

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }
      if (!submission.aiScreenedAt) {
        return res.status(404).json({ error: 'No AI pre-screen has been recorded for this submission yet.' });
      }

      return res.status(200).json({
        submissionId: id,
        status: submission.status,
        aiFindings: {
          screenedAt: submission.aiScreenedAt,
          reviewer: submission.aiReviewer,
          score: submission.aiScore,
          recommendation: submission.aiRecommendation,
          summary: submission.aiSummary,
          clauseFindings: submission.aiClauseFindings,
        },
      });
    } catch (err: unknown) {
      console.error('[AI_FINDINGS GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve AI pre-screen findings.' });
    }
  });

  /**
   * POST /api/workflow/submissions/:id/transition
   * Allows authorized transition across the state machine.
   */
  router.post('/api/workflow/submissions/:id/transition', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const { targetStatus, reason, notes } = req.body || {};
    const triggerReason = reason || notes;

    if (!targetStatus || !Object.values(WorkflowStatus).includes(targetStatus)) {
      return res.status(400).json({ error: `Invalid targetStatus: ${targetStatus}.` });
    }

    try {
      const updated = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).transitionStatus(
          id,
          targetStatus as WorkflowStatus,
          { userId: user.userId, role: user.role, licenseeId: user.licenseeId },
          triggerReason
        );
      });

      return res.status(200).json({ success: true, submission: redactSubmissionForRole(updated, user.role) });
    } catch (err: any) {
      if (err instanceof InvalidWorkflowTransitionError) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof WorkflowForbiddenError) {
        return res.status(403).json({ error: err.message });
      }
      if (err instanceof WorkflowNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      console.error('[WORKFLOW TRANSITION ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to transition workflow status.' });
    }
  });


  /**
   * GET /api/workflow/review-queue?stage=awaiting|decided|all
   * Admin-only: the Lead Auditor's queue across every client and pipeline.
   */
  router.get('/api/workflow/review-queue', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const stage = req.query.stage ?? 'awaiting';
    if (!isReviewQueueStage(stage)) {
      return res.status(400).json({ error: "stage must be 'awaiting', 'decided' or 'all'." });
    }
    try {
      const submissions = await runWithRls(prisma, req.user!, (tx) => listReviewQueue(tx, stage));
      return res.status(200).json({ stage, submissions });
    } catch (err: unknown) {
      console.error('[WORKFLOW REVIEW QUEUE ERROR]', err);
      return res.status(500).json({ error: 'Failed to load the review queue.' });
    }
  });

  /**
   * GET /api/workflow/submissions/:id/review-dossier
   * Admin-only: each question with the client's answer, evidence and the AI pre-screen finding.
   */
  router.get('/api/workflow/submissions/:id/review-dossier', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const dossier = await runWithRls(prisma, req.user!, (tx) => getReviewDossier(tx, req.params.id));
      if (!dossier) return res.status(404).json({ error: 'Submission not found.' });
      return res.status(200).json({ submission: dossier });
    } catch (err: unknown) {
      console.error('[WORKFLOW REVIEW DOSSIER ERROR]', err);
      return res.status(500).json({ error: 'Failed to load the submission.' });
    }
  });

  /**
   * GET /api/workflow/reviewer-profile
   * Admin-only: the name decisions are signed with and the accreditation last used.
   */
  router.get('/api/workflow/reviewer-profile', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const profile = await runWithRls(prisma, req.user!, (tx) => getReviewerProfile(tx, req.user!.userId));
      if (!profile) return res.status(404).json({ error: 'Reviewer account not found.' });
      // aiProvider tells the Lead Auditor whether pre-screens use an AI model or the rules engine only.
      return res.status(200).json({ profile, aiProvider: configuredLlmProviderId() });
    } catch (err: unknown) {
      console.error('[WORKFLOW REVIEWER PROFILE ERROR]', err);
      return res.status(500).json({ error: 'Failed to load your reviewer profile.' });
    }
  });

  /**
   * POST /api/workflow/submissions/:id/review
   * Admin-only: the Lead Auditor's decision (APPROVED | REJECTED) with a decision on every question.
   */
  router.post('/api/workflow/submissions/:id/review', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const { overallDecision, overallScore, perQuestionDecisions, reviewerNotes, reviewerAccreditation } = req.body || {};

    if (overallDecision !== 'APPROVED' && overallDecision !== 'REJECTED') {
      return res.status(400).json({ error: "overallDecision must be 'APPROVED' or 'REJECTED'." });
    }
    if (typeof overallScore !== 'number' || !Number.isInteger(overallScore) || overallScore < 0 || overallScore > 100) {
      return res.status(400).json({ error: 'overallScore must be an integer between 0 and 100.' });
    }
    if (typeof reviewerAccreditation !== 'string' || !reviewerAccreditation.trim()) {
      return res.status(400).json({ error: 'reviewerAccreditation is required for every review decision.' });
    }
    if (reviewerNotes !== undefined && reviewerNotes !== null && typeof reviewerNotes !== 'string') {
      return res.status(400).json({ error: 'reviewerNotes must be text.' });
    }
    const decisionsValid =
      Array.isArray(perQuestionDecisions) &&
      perQuestionDecisions.length > 0 &&
      perQuestionDecisions.every(
        (d: unknown) =>
          typeof d === 'object' &&
          d !== null &&
          typeof (d as { questionId?: unknown }).questionId === 'string' &&
          typeof (d as { accepted?: unknown }).accepted === 'boolean'
      );
    if (!decisionsValid) {
      return res.status(400).json({
        error: 'perQuestionDecisions must be a non-empty array of { questionId, accepted, reasonIfRejected }.',
      });
    }

    const cleanDecisions = (perQuestionDecisions as Array<{ questionId: string; accepted: boolean; reasonIfRejected?: unknown }>).map(
      (d) => ({
        questionId: d.questionId,
        accepted: d.accepted,
        reasonIfRejected: typeof d.reasonIfRejected === 'string' ? d.reasonIfRejected.trim() : null,
      })
    );

    try {
      const reviewed = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).submitReview(
          id,
          {
            reviewerAccreditation: reviewerAccreditation.trim(),
            overallDecision,
            overallScore,
            perQuestionDecisions: cleanDecisions,
            reviewerNotes: typeof reviewerNotes === 'string' ? reviewerNotes.trim() : null,
          },
          { userId: user.userId, role: user.role, licenseeId: user.licenseeId }
        );
      });

      return res.status(200).json({
        success: true,
        message: `Submission marked ${overallDecision} with conformance score ${overallScore}%.`,
        submission: reviewed,
      });
    } catch (err: unknown) {
      if (err instanceof ReviewValidationError) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof InvalidWorkflowTransitionError) {
        return res.status(409).json({ error: err.message });
      }
      if (err instanceof WorkflowNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof WorkflowForbiddenError) {
        return res.status(403).json({ error: err.message });
      }
      console.error('[WORKFLOW REVIEW ERROR]', err);
      return res.status(500).json({ error: 'Failed to record review decision.' });
    }
  });

  /**
   * Screen 7: POST /api/workflow/submissions/:id/checkout-session
   * Creates a Stripe Checkout session for the pipeline's assurance fee. The submission only
   * becomes PAID when the signed checkout.session.completed webhook is received.
   */
  router.post('/api/workflow/submissions/:id/checkout-session', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    if (!checkoutService) {
      console.error('[WORKFLOW CHECKOUT SESSION ERROR] Checkout service is not configured.');
      return res.status(503).json({ error: 'Payments are temporarily unavailable.' });
    }

    try {
      const submission = await runWithRls(prisma, user, async (tx) => {
        return tx.workflowSubmission.findUnique({
          where: { id },
          include: { framework: true },
        });
      });

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      if (user.role !== 'ADMIN' && submission.licenseeId !== user.licenseeId) {
        return res.status(403).json({ error: 'Forbidden: Licensee mismatch.' });
      }

      if (submission.status !== WorkflowStatus.APPROVED) {
        return res.status(409).json({
          error: `Cannot initiate checkout for submission in '${submission.status}' status. Submission must be 'APPROVED'.`,
        });
      }

      if (!isWorkflowBillingEnabled(submission.workflowType)) {
        return res.status(409).json({ error: 'This service has no assurance fee. Set up your credential instead.' });
      }

      const fee = getAssuranceFee(submission.workflowType);
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const scope = submission.workflowType === WorkflowType.JOB ? 'JOB_REPORTING' : 'CARBON_EMISSION';
      const returnPath = `${baseUrl}/portal?tab=workflow&scope=${scope}&submission_id=${encodeURIComponent(id)}`;

      // The platform is the payee for assurance fees; the client licensee is recorded as the payer.
      const session = await checkoutService.createCheckoutSession({
        licenseeId: PLATFORM_LICENSEE_ID,
        itemTitle: `Assurance Fee: ${submission.framework.name}`,
        itemDescription: 'Audit-readiness review and dual-logo credential issuance.',
        grossAmountCents: fee.amountPence,
        currency: fee.currency,
        deliveryType: DeliveryType.DIGITAL,
        successUrl: `${returnPath}&payment=success`,
        cancelUrl: `${returnPath}&payment=cancelled`,
        metadata: { workflowSubmissionId: id, payerLicenseeId: submission.licenseeId },
      });

      if (!session.sessionId || !session.sessionUrl) {
        throw new Error('Stripe did not return a checkout session.');
      }

      await runWithRls(prisma, user, async (tx) => {
        return tx.workflowSubmission.update({
          where: { id },
          data: { stripeSessionId: session.sessionId },
        });
      });

      return res.status(200).json({
        success: true,
        submissionId: id,
        grossAmountCents: fee.amountPence,
        currency: fee.currency,
        checkoutUrl: session.sessionUrl,
        stripeSessionId: session.sessionId,
      });
    } catch (err: unknown) {
      console.error('[WORKFLOW CHECKOUT SESSION ERROR]', err);
      return res.status(502).json({ error: 'Unable to start checkout. Please try again.' });
    }
  });

  /**
   * Screen 8: POST /api/workflow/submissions/:id/badge-setup
   * Multipart: clientLogo (image file) and clientMessage. Issues the dual-logo credential
   * for a PAID submission and transitions it to BADGE_ISSUED.
   */
  router.post('/api/workflow/submissions/:id/badge-setup', authenticateToken, logoUpload.single('clientLogo'), discardLogoOnFailure, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const clientMessage = typeof req.body?.clientMessage === 'string' ? req.body.clientMessage : '';

    if (!req.file) {
      return res.status(400).json({ error: 'clientLogo image file is required.' });
    }
    if (!clientMessage.trim()) {
      return res.status(400).json({ error: 'clientMessage is required.' });
    }
    if (clientMessage.trim().length > CREDENTIAL_MESSAGE_MAX_LENGTH) {
      return res.status(400).json({ error: `clientMessage must not exceed ${CREDENTIAL_MESSAGE_MAX_LENGTH} characters.` });
    }

    try {
      // Runs on the root client: badge compositing can exceed the RLS transaction timeout.
      // issueCredential enforces licensee ownership itself.
      const result = await workflowService.issueCredential(
        id,
        { clientMessage, clientLogoPath: req.file.path },
        { userId: user.userId, role: user.role, licenseeId: user.licenseeId }
      );

      return res.status(201).json({
        success: true,
        message: 'Dual-logo credential issued.',
        submission: redactSubmissionForRole(result.submission, user.role),
        credentialId: result.credential.id,
        verificationSeal: result.credential.verificationSeal,
        warrantyExpiresAt: result.credential.warrantyExpiresAt,
        verifyPath: `/api/credentials/${result.credential.id}/verify`,
        badgePath: `/api/credentials/${result.credential.id}/badge.svg`,
      });
    } catch (err: unknown) {
      if (err instanceof InvalidWorkflowTransitionError) {
        return res.status(409).json({ error: 'A credential can be issued once, when the submission is ready for it (approved, and paid where the service charges).' });
      }
      if (err instanceof WorkflowForbiddenError) {
        return res.status(403).json({ error: err.message });
      }
      if (err instanceof WorkflowNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      console.error('[WORKFLOW BADGE SETUP ERROR]', err);
      return res.status(500).json({ error: 'Failed to issue credential.' });
    }
  });

  /**
   * Screen 9 & 10: GET /api/workflow/submissions/:id/pdf & /download-pdf
   * Streams downloadable PDF Proof of Audit and Badge Warranty Certificate.
   */
  router.get(['/api/workflow/submissions/:id/pdf', '/api/workflow/submissions/:id/download-pdf'], authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    try {
      const pdfBuffer = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).generatePdfProof(id, {
          userId: user.userId,
          role: user.role,
          licenseeId: user.licenseeId,
        });
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="GHG-Audit-Proof-${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.status(200).send(pdfBuffer);
    } catch (err: unknown) {
      if (err instanceof WorkflowForbiddenError) {
        return res.status(403).json({ error: err.message });
      }
      if (err instanceof WorkflowNotFoundError) {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof InvalidWorkflowTransitionError) {
        return res.status(409).json({ error: 'The audit proof is available once the credential has been issued.' });
      }
      console.error('[WORKFLOW PDF ERROR]', err);
      return res.status(404).json({ error: 'Audit proof not found.' });
    }
  });

  /**
   * Screen 10: GET /api/workflow/my-badges
   * Returns all issued badges for the authenticated licensee.
   */
  router.get('/api/workflow/my-badges', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    const licenseeId = user.licenseeId || (req.query.licenseeId as string);

    try {
      const submissions = await runWithRls(prisma, user, async (tx) => {
        return tx.workflowSubmission.findMany({
          where: {
            ...(licenseeId ? { licenseeId } : {}),
            status: WorkflowStatus.BADGE_ISSUED,
          },
          include: { framework: true, licensee: true },
          orderBy: { updatedAt: 'desc' },
        });
      });

      const badges = submissions.map((sub) => ({
        id: sub.id,
        workflowType: sub.workflowType,
        frameworkId: sub.frameworkId,
        frameworkCode: sub.framework.code,
        frameworkName: sub.framework.name,
        companyName: sub.licensee.name,
        badgeMessage: sub.clientMessage,
        badgeLogoUrl: sub.clientLogoUrl,
        auditDate: sub.reviewedAt ? sub.reviewedAt.toISOString() : sub.updatedAt.toISOString(),
        status: sub.status,
        pdfDownloadUrl: `/api/workflow/submissions/${sub.id}/pdf`,
      }));

      return res.status(200).json({ success: true, badges });
    } catch (err: any) {
      console.error('[MY BADGES ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch badges.' });
    }
  });

  /**
   * Screen 11: POST /api/workflow/telemetry-keys & /telemetry-key
   * Generates a unique scoped API key for that client & workflow type.
   * Returns full raw key ONCE.
   */
  router.post(['/api/workflow/telemetry-keys', '/api/workflow/telemetry-key'], authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    const licenseeId = user.licenseeId || req.body.licenseeId;
    const workflowType = req.body?.workflowType || 'CARBON';
    const name = req.body?.name || req.body?.keyLabel || `${workflowType} Live Sensor Key`;

    if (!licenseeId) {
      return res.status(400).json({ error: 'licenseeId is required.' });
    }

    if (workflowType !== 'CARBON' && workflowType !== 'JOB') {
      return res.status(400).json({ error: "workflowType must be 'CARBON' or 'JOB'." });
    }

    try {
      const result = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).generateTelemetryApiKey(
          licenseeId,
          workflowType as WorkflowType,
          name
        );
      });

      return res.status(201).json({
        success: true,
        key: result,
      });
    } catch (err: any) {
      console.error('[WORKFLOW TELEMETRY KEY ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to generate telemetry key.' });
    }
  });

  /**
   * Screen 11: GET /api/workflow/telemetry-keys
   * Lists masked keys for authenticated tenant.
   */
  router.get('/api/workflow/telemetry-keys', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    const licenseeId = user.licenseeId || (req.query.licenseeId as string);

    if (!licenseeId) {
      return res.status(400).json({ error: 'licenseeId is required.' });
    }

    try {
      const keys = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).listTelemetryApiKeys(licenseeId);
      });

      return res.status(200).json({ keys });
    } catch (err: any) {
      console.error('[WORKFLOW TELEMETRY KEYS LIST ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to list telemetry keys.' });
    }
  });

  /**
   * Screen 4: POST /api/workflow/evidence/upload
   * Uploads one evidence file (multipart, field "file") into private storage for questionnaire answers.
   * Clients upload for their own organisation; administrators must name an existing licensee.
   */
  router.post('/api/workflow/evidence/upload', authenticateToken, evidenceUpload, async (req: Request, res: Response) => {
    const user = req.user!;
    const requested = typeof req.body?.licenseeId === 'string' ? req.body.licenseeId.trim() : '';
    const licenseeId = user.role === 'ADMIN' ? requested : user.licenseeId;

    if (!licenseeId) {
      return res.status(400).json({ error: 'licenseeId is required.' });
    }
    if (user.role !== 'ADMIN' && requested && requested !== user.licenseeId) {
      return res.status(403).json({ error: 'Forbidden: Cannot upload evidence for other licensees.' });
    }
    if (!(await prisma.licensee.findUnique({ where: { id: licenseeId }, select: { id: true } }))) {
      return res.status(400).json({ error: 'Unknown licensee.' });
    }

    const category = req.body?.category;
    if (category && !Object.values(EvidenceCategory).includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${Object.values(EvidenceCategory).join(', ')}` });
    }

    try {
      const doc = await runWithRls(prisma, user, (tx) =>
        storeEvidenceFile(tx, {
          licenseeId,
          uploadedBy: user.userId,
          file: req.file!,
          category: category as EvidenceCategory | undefined,
        })
      );

      return res.status(201).json({
        success: true,
        evidenceDocument: doc,
      });
    } catch (err: unknown) {
      console.error('[WORKFLOW EVIDENCE UPLOAD ERROR]', err);
      return res.status(500).json({ error: 'Failed to upload the evidence file.' });
    }
  });

  return router;
}

