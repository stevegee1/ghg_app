import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { PrismaClient, WorkflowType, WorkflowStatus, DeliveryType } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { logoUpload } from '../middleware/logo-upload.middleware';
import {
  WorkflowEngineService,
  InvalidWorkflowTransitionError,
  MissingRequiredEvidenceError,
  WorkflowForbiddenError,
  WorkflowNotFoundError,
  CREDENTIAL_MESSAGE_MAX_LENGTH,
} from '../services/workflow-engine.service';
import { CheckoutService } from '../services/checkout.service';
import { runWithRls } from '../db/rls';
import { getAssuranceFee } from '../services/assurance-fee.service';
import { PLATFORM_LICENSEE_ID } from '../services/platform-account.service';

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
      const fw = await prisma.workflowFramework.findFirst({
        where: { code },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });

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

      return res.status(200).json({ submissions });
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

      if (user.role !== 'ADMIN' && user.licenseeId && dossier.licenseeId !== user.licenseeId) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this submission.' });
      }

      return res.status(200).json({ submission: dossier });
    } catch (err: any) {
      console.error('[WORKFLOW DOSSIER GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve submission dossier.' });
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

      return res.status(200).json({ success: true, submission: updated });
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
        submission: submitted,
      });
    } catch (err: any) {
      if (err instanceof MissingRequiredEvidenceError) {
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
   * Triggers the AI Assurance Agent to evaluate a SUBMITTED submission.
   * The agent evaluates each answer against ISO clauses and produces structured
   * ClauseReviewFinding[] docket, then transitions the submission to AI_SCREENED.
   *
   * This runs asynchronously: returns immediately with a 202 Accepted.
   * Lead Auditor sees the findings when they open the submission in UNDER_REVIEW.
   *
   * Can be called by ADMIN or the owning licensee.
   */
  router.post('/api/workflow/submissions/:id/ai-screen', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    try {
      const submission = await prisma.workflowSubmission.findUnique({
        where: { id },
        select: { id: true, licenseeId: true, status: true },
      });

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      if (user.role !== 'ADMIN' && user.licenseeId && submission.licenseeId !== user.licenseeId) {
        return res.status(403).json({ error: 'Forbidden: Access to other licensees is prohibited.' });
      }

      const { AiAuditReviewer } = await import('../services/review-pipeline/ai-audit-reviewer.service');
      const reviewer = new AiAuditReviewer(prisma);

      // Run asynchronously so the HTTP response returns immediately
      reviewer.evaluateSubmission(id)
        .then((result) => {
          console.log(`[AI_SCREEN] Submission ${id} pre-screened: score=${result.complianceScore}%, decision=${result.decision}, by=${result.reviewedBy}`);
        })
        .catch((err) => {
          console.error(`[AI_SCREEN] Failed for submission ${id}:`, err.message);
        });

      return res.status(202).json({
        success: true,
        message: 'AI Assurance Agent screening initiated. The submission will transition to AI_SCREENED status when complete.',
        submissionId: id,
      });
    } catch (err: any) {
      console.error('[AI_SCREEN INIT ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to initiate AI screening.' });
    }
  });

  /**
   * GET /api/workflow/submissions/:id/ai-findings
   * Returns the AI pre-screen findings stored in WorkflowReviewDecision.
   * Used by the Lead Auditor console to view the AI docket before making a decision.
   */
  router.get('/api/workflow/submissions/:id/ai-findings', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    try {
      const submission = await prisma.workflowSubmission.findUnique({
        where: { id },
        select: { id: true, licenseeId: true, status: true, complianceScore: true },
      });

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      if (user.role !== 'ADMIN' && user.licenseeId && submission.licenseeId !== user.licenseeId) {
        return res.status(403).json({ error: 'Forbidden: Access to other licensees is prohibited.' });
      }

      const decision = await prisma.workflowReviewDecision.findUnique({
        where: { submissionId: id },
      });

      if (!decision) {
        return res.status(404).json({ error: 'No AI pre-screen findings found for this submission. Trigger /ai-screen first.' });
      }

      return res.status(200).json({
        submissionId: id,
        status: submission?.status,
        complianceScore: submission?.complianceScore,
        aiFindings: {
          overallDecision: decision.overallDecision,
          overallScore: decision.overallScore,
          reviewerNotes: decision.reviewerNotes,
          clauseFindings: decision.perQuestionDecisions,
          createdAt: decision.createdAt,
        },
      });
    } catch (err: any) {
      console.error('[AI_FINDINGS GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve AI screening findings.' });
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

      return res.status(200).json({ success: true, submission: updated });
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
   * POST /api/workflow/submissions/:id/review
   * Admin-only: Records structured review decision (APPROVED | REJECTED) with per-question breakdowns.
   */
  router.post('/api/workflow/submissions/:id/review', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;
    const { overallDecision, overallScore, perQuestionDecisions, reviewerNotes } = req.body || {};

    if (!overallDecision || (overallDecision !== 'APPROVED' && overallDecision !== 'REJECTED')) {
      return res.status(400).json({ error: "overallDecision must be 'APPROVED' or 'REJECTED'." });
    }

    if (typeof overallScore !== 'number' || overallScore < 0 || overallScore > 100) {
      return res.status(400).json({ error: 'overallScore must be an integer between 0 and 100.' });
    }

    if (!Array.isArray(perQuestionDecisions) || perQuestionDecisions.length === 0) {
      return res.status(400).json({
        error: 'perQuestionDecisions must be a non-empty array of { questionId, accepted, reasonIfRejected }.',
      });
    }

    try {
      const reviewed = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).submitReview(
          id,
          {
            overallDecision,
            overallScore,
            perQuestionDecisions,
            reviewerNotes,
          },
          { userId: user.userId, role: user.role }
        );
      });

      return res.status(200).json({
        success: true,
        message: `Submission marked ${overallDecision} with conformance score ${overallScore}%.`,
        submission: reviewed,
      });
    } catch (err: any) {
      console.error('[WORKFLOW REVIEW ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to record review decision.' });
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

      const fee = getAssuranceFee(submission.workflowType);
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const pipeline = submission.workflowType === WorkflowType.JOB ? 'workforce' : 'ghg';

      // The platform is the payee for assurance fees; the client licensee is recorded as the payer.
      const session = await checkoutService.createCheckoutSession({
        licenseeId: PLATFORM_LICENSEE_ID,
        itemTitle: `Assurance Fee: ${submission.framework.name}`,
        itemDescription: 'Audit-readiness review and dual-logo credential issuance.',
        grossAmountCents: fee.amountPence,
        currency: fee.currency,
        deliveryType: DeliveryType.DIGITAL,
        successUrl: `${baseUrl}/portal?view=workflow&pipeline=${pipeline}&submissionId=${id}&payment=success`,
        cancelUrl: `${baseUrl}/portal?view=workflow&pipeline=${pipeline}&submissionId=${id}&payment=cancelled`,
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
  router.post('/api/workflow/submissions/:id/badge-setup', authenticateToken, logoUpload.single('clientLogo'), async (req: Request, res: Response) => {
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
        submission: result.submission,
        credentialId: result.credential.id,
        verificationSeal: result.credential.verificationSeal,
        warrantyExpiresAt: result.credential.warrantyExpiresAt,
        verifyPath: `/api/credentials/${result.credential.id}/verify`,
        badgePath: `/api/credentials/${result.credential.id}/badge.svg`,
      });
    } catch (err: unknown) {
      if (err instanceof InvalidWorkflowTransitionError) {
        return res.status(409).json({ error: 'A credential can only be issued once, after payment is confirmed.' });
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
   * Registers evidence document for questionnaire answers.
   */
  router.post('/api/workflow/evidence/upload', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    const licenseeId = user.licenseeId || req.body.licenseeId;
    const { fileName, mimeType, fileSizeBytes, fileBufferBase64, category } = req.body || {};

    if (!licenseeId || !fileName) {
      return res.status(400).json({ error: 'licenseeId and fileName are required.' });
    }

    try {
      const buffer = fileBufferBase64 ? Buffer.from(fileBufferBase64, 'base64') : undefined;

      const doc = await runWithRls(prisma, user, async (tx) => {
        return new WorkflowEngineService(tx).uploadEvidenceDocument({
          licenseeId,
          uploadedBy: user.userId,
          fileName,
          mimeType: mimeType || 'application/pdf',
          fileSizeBytes: fileSizeBytes || (buffer ? buffer.length : 1024),
          fileBuffer: buffer,
          category,
        });
      });

      return res.status(201).json({
        success: true,
        evidenceDocument: doc,
      });
    } catch (err: any) {
      console.error('[WORKFLOW EVIDENCE UPLOAD ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to register evidence document.' });
    }
  });

  return router;
}

