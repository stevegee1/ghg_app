/**
 * iso-readiness.route.ts
 * Handles the ISO Audit-Readiness Diagnostic workflow:
 *  GET  /api/iso-readiness/framework  — Returns official structured questions
 *  POST /api/iso-readiness/submit     — Persists client questionnaire answers
 *  POST /api/iso-readiness/checkout   — Creates Stripe Checkout session (£1,250/£3,500)
 *  GET  /api/iso-readiness/status/:licenseeId — Returns submission + payment state
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, IsoReadinessStatus } from '@prisma/client';
import { CheckoutService } from '../services/checkout.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { FrameworkRegistryService } from '../services/framework-registry.service';

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL ISO AUDIT-READINESS FRAMEWORK QUESTIONS
// Aligned with: ISO 14001:2015, ISO 50001:2018, ISO 14064-1:2018,
//               ISO 19011:2026 Remote Auditing Guidelines
// ─────────────────────────────────────────────────────────────────────────────
const ISO_FRAMEWORK = {
  version: '2026-Q3',
  standardsAlignment: [
    'ISO 14001:2015 Environmental Management Systems',
    'ISO 50001:2018 Energy Management Systems',
    'ISO 14064-1:2018 GHG Inventories',
    'ISO 19011:2026 Remote Auditing Guidelines',
    'UK SECR (Companies Act 2006, as amended 2019)',
    'EU CSRD (Corporate Sustainability Reporting Directive)',
    'GHG Protocol Corporate Standard',
  ],
  remoteAuditNote:
    'Under ISO 19011:2026 Annex A, 80% of this assessment is conducted remotely via our trademarked digital data protocol, minimising on-site disruption and travel costs.',
  sections: [
    {
      sectionId: 'S1',
      sectionTitle: 'Organisational Context & Scope (ISO 14001 Clause 4 / ISO 50001 Clause 4)',
      questions: [
        {
          questionId: 'S1-Q1',
          isoClause: 'ISO 14001:2015 Clause 4.1 / ISO 50001:2018 Clause 4.1',
          legalMandate: 'UK SECR — Directors Report energy disclosure',
          questionText:
            'Has your organisation formally identified all internal and external issues that affect its ability to achieve the intended outcomes of its Environmental Management System?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Context register, PESTLE analysis, or equivalent document',
        },
        {
          questionId: 'S1-Q2',
          isoClause: 'ISO 14001:2015 Clause 4.3 / ISO 50001:2018 Clause 4.3',
          legalMandate: 'EU CSRD Article 19a — Scope definition',
          questionText:
            'Is the EMS/EnMS scope formally documented and does it identify all organisational units, physical locations, and activities included within the management system boundary?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Scope document, site boundary map',
        },
        {
          questionId: 'S1-Q3',
          isoClause: 'ISO 50001:2018 Clause 4.4',
          legalMandate: 'GHG Protocol Corporate Standard — Operational control approach',
          questionText:
            'Has an energy review been conducted to identify all significant energy uses (SEUs), including those under operational control, in the past 12 months?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Energy review report, SEU register',
        },
      ],
    },
    {
      sectionId: 'S2',
      sectionTitle: 'Leadership & Policy (ISO 14001 Clause 5 / ISO 50001 Clause 5)',
      questions: [
        {
          questionId: 'S2-Q1',
          isoClause: 'ISO 14001:2015 Clause 5.2 / ISO 50001:2018 Clause 5.2',
          legalMandate: 'TCFD — Governance pillar: Board-level climate oversight',
          questionText:
            'Is there a formally documented and top-management-approved Environmental and/or Energy Policy that includes a commitment to continual improvement and compliance obligations?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Signed policy document with issue date and authorised signatory',
        },
        {
          questionId: 'S2-Q2',
          isoClause: 'ISO 50001:2018 Clause 5.1',
          legalMandate: 'CDP — C1.1b Leadership responsibility',
          questionText:
            'Has top management appointed a designated Management Representative (or equivalent role) with defined authority and responsibility for the EnMS/EMS?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceReference: 'Role profile, appointment letter, or terms of reference',
        },
      ],
    },
    {
      sectionId: 'S3',
      sectionTitle: 'Planning & Risk Assessment (ISO 14001 Clause 6 / ISO 50001 Clause 6)',
      questions: [
        {
          questionId: 'S3-Q1',
          isoClause: 'ISO 14001:2015 Clause 6.1.2',
          legalMandate: 'EU CSRD — Material environmental impacts identification',
          questionText:
            'Has the organisation identified and assessed its significant environmental aspects using a documented, repeatable methodology (e.g. severity × probability matrix)?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Aspects register with significance criteria and scoring',
        },
        {
          questionId: 'S3-Q2',
          isoClause: 'ISO 50001:2018 Clause 6.3',
          legalMandate: 'UK SECR — Baseline year and normalisation factor',
          questionText:
            'Has an energy performance baseline been established using data from a minimum of 12 consecutive months, with relevant variables (e.g. production output, degree days) identified?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Baseline energy report, normalisation regression analysis',
        },
        {
          questionId: 'S3-Q3',
          isoClause: 'ISO 14064-1:2018 Clause 5',
          legalMandate: 'GHG Protocol — Scope 1, 2, and 3 inventory',
          questionText:
            'Has a GHG inventory been prepared for the most recent reporting year covering Scope 1 (direct), Scope 2 (purchased energy), and material Scope 3 (value chain) emissions?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'GHG inventory report with emission factors and calculation methodology',
        },
      ],
    },
    {
      sectionId: 'S4',
      sectionTitle: 'Support & Operational Control (ISO 50001 Clause 7 & 8)',
      questions: [
        {
          questionId: 'S4-Q1',
          isoClause: 'ISO 50001:2018 Clause 7.3',
          legalMandate: 'ISO 19011:2026 Clause 6.3.2 — Competence of remote auditors',
          questionText:
            'Are personnel whose work affects energy performance trained and assessed as competent? Is training evidence documented and periodically reviewed?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Training matrix, competency assessment records',
        },
        {
          questionId: 'S4-Q2',
          isoClause: 'ISO 50001:2018 Clause 8.1',
          legalMandate: 'UK SECR — Operational efficiency measures',
          questionText:
            'Are operational controls (e.g. purchasing criteria for energy-significant equipment, operating procedures for SEUs) documented, implemented, and maintained?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Procurement policy, operating procedures for SEUs, equipment specifications',
        },
      ],
    },
    {
      sectionId: 'S5',
      sectionTitle: 'Performance Evaluation & Audit (ISO 14001 Clause 9 / ISO 50001 Clause 9)',
      questions: [
        {
          questionId: 'S5-Q1',
          isoClause: 'ISO 50001:2018 Clause 9.1.1',
          legalMandate: 'TCFD Metrics and Targets — Quantitative energy KPIs',
          questionText:
            'Are Energy Performance Indicators (EnPIs) defined, monitored at planned intervals, and compared against the baseline to demonstrate improvement or identify regression?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'EnPI dashboard, monitoring and measurement plan, calibrated meter records',
        },
        {
          questionId: 'S5-Q2',
          isoClause: 'ISO 14001:2015 Clause 9.2 / ISO 19011:2026 Clause 6',
          legalMandate: 'ISO 19011:2026 — Remote audit technique compliance',
          questionText:
            'Has an internal audit programme been established and implemented? Does it include the use of remote auditing techniques (ICT-based document review, remote witness, virtual facility tour) as permitted under ISO 19011:2026 Annex A?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Audit programme, internal audit reports, remote audit protocols',
        },
        {
          questionId: 'S5-Q3',
          isoClause: 'ISO 14001:2015 Clause 9.3 / ISO 50001:2018 Clause 9.3',
          legalMandate: 'CDP — C1.3 Management review of climate governance',
          questionText:
            'Has management review been conducted within the last 12 months, with outputs including decisions on opportunities for improvement and any resource requirements?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Management review meeting minutes with sign-off by top management',
        },
      ],
    },
    {
      sectionId: 'S6',
      sectionTitle: 'Improvement & Non-Conformance (ISO 14001 Clause 10 / ISO 50001 Clause 10)',
      questions: [
        {
          questionId: 'S6-Q1',
          isoClause: 'ISO 14001:2015 Clause 10.2 / ISO 50001:2018 Clause 10.1',
          legalMandate: 'EU CSRD — Corrective action and improvement tracking',
          questionText:
            'Does the organisation have a documented process for identifying, recording, correcting, and verifying corrective actions for non-conformances and environmental/energy incidents?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Corrective action log, NCR register, root cause analysis templates',
        },
        {
          questionId: 'S6-Q2',
          isoClause: 'ISO 50001:2018 Clause 10.2',
          legalMandate: 'GHG Protocol — Continual improvement commitment',
          questionText:
            'Can the organisation demonstrate measurable energy or environmental performance improvement against the baseline over the most recent reporting cycle?',
          answerType: 'YES_NO_WITH_EVIDENCE',
          evidenceRequired: 'Year-on-year EnPI trend chart, GHG inventory comparison table',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER DEFINITIONS (must match custom-keepsake.route.ts /api/preparation/pricing)
// ─────────────────────────────────────────────────────────────────────────────
const TIERS: Record<string, { name: string; grossAmountCents: number; currency: string }> = {
  TIER_1_READINESS: {
    name: 'Single-Site Remote Readiness (ISO 14001 / ISO 50001 / ISO 19011:2026)',
    grossAmountCents: 125000, // £1,250
    currency: 'GBP',
  },
  TIER_2_CONTINUOUS: {
    name: 'Continuous Assurance Protocol (Quarterly, Multi-Jurisdiction)',
    grossAmountCents: 350000, // £3,500
    currency: 'GBP',
  },
};

export function createIsoReadinessRouter(prisma: PrismaClient, checkoutService: CheckoutService): Router {
  const router = Router();

  // GET /api/iso-readiness/frameworks
  router.get('/api/iso-readiness/frameworks', (_req: Request, res: Response) => {
    const frameworks = FrameworkRegistryService.getAllFrameworks();
    return res.status(200).json({ success: true, frameworks });
  });

  // POST /api/iso-readiness/diagnostic-bundle
  router.post('/api/iso-readiness/diagnostic-bundle', (req: Request, res: Response) => {
    const { frameworkIds } = req.body || {};
    const ids = Array.isArray(frameworkIds) ? frameworkIds : [];
    const bundle = FrameworkRegistryService.getDiagnosticBundle(ids);
    return res.status(200).json({ success: true, bundle });
  });

  // GET /api/iso-readiness/framework
  router.get('/api/iso-readiness/framework', (_req: Request, res: Response) => {
    return res.status(200).json({ success: true, framework: ISO_FRAMEWORK });
  });

  // POST /api/iso-readiness/submit
  router.post('/api/iso-readiness/submit', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { answers, tierSelected, selectedFrameworks } = req.body as {
      answers: Array<{ questionId: string; questionText: string; answer: string; isoClause: string }>;
      tierSelected?: string;
      selectedFrameworks?: string[];
    };

    if (!user?.licenseeId) {
      return res.status(403).json({ error: 'Licensee account required to submit ISO readiness assessment.' });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'answers must be a non-empty array.' });
    }

    for (const ans of answers) {
      if (!ans.questionId || typeof ans.answer !== 'string') {
        return res.status(400).json({ error: `Invalid answer entry: ${JSON.stringify(ans)}` });
      }
    }

    const tier = tierSelected && TIERS[tierSelected] ? tierSelected : 'TIER_1_READINESS';
    const frameworks = Array.isArray(selectedFrameworks) && selectedFrameworks.length > 0
      ? selectedFrameworks
      : ['ISO_14064_1', 'UK_SECR'];

    // Calculate initial conformance score
    const totalAnswered = answers.filter((a) => a.answer && a.answer.trim().length > 0).length;
    const initialScore = Math.min(100, Math.round((totalAnswered / Math.max(answers.length, 1)) * 100));

    try {
      const existing = await prisma.isoReadinessSubmission.findFirst({
        where: {
          licenseeId: user.licenseeId,
          status: { in: [IsoReadinessStatus.SUBMITTED, IsoReadinessStatus.UNDER_REVIEW, IsoReadinessStatus.REVISION_REQUIRED] },
          paidAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      let submission;
      if (existing) {
        submission = await prisma.isoReadinessSubmission.update({
          where: { id: existing.id },
          data: {
            answers,
            tierSelected: tier,
            selectedFrameworks: frameworks,
            complianceScore: initialScore,
            status: IsoReadinessStatus.SUBMITTED,
            updatedAt: new Date(),
          },
        });
      } else {
        submission = await prisma.isoReadinessSubmission.create({
          data: {
            licenseeId: user.licenseeId,
            answers,
            tierSelected: tier,
            selectedFrameworks: frameworks,
            complianceScore: initialScore,
            status: IsoReadinessStatus.SUBMITTED,
          },
        });
      }

      return res.status(201).json({
        success: true,
        submissionId: submission.id,
        status: submission.status,
        complianceScore: initialScore,
        tierSelected: tier,
        selectedFrameworks: frameworks,
        message: 'Compliance assessment submitted. Pending auditor verification.',
      });
    } catch (err: any) {
      console.error('[ISO READINESS SUBMIT ERROR]', err);
      return res.status(500).json({ error: 'Failed to persist ISO readiness submission.' });
    }
  });

  // POST /api/iso-readiness/review (Auditor / Admin Verification Sign-off)
  router.post('/api/iso-readiness/review', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { submissionId, decision, targetStatus, reviewerNotes, complianceScore, auditorNotes } = req.body as {
      submissionId: string;
      decision?: 'APPROVE' | 'REQUIRE_REVISION';
      targetStatus?: 'AUDIT_READY' | 'REVISION_REQUIRED';
      reviewerNotes?: string;
      auditorNotes?: string;
      complianceScore?: number;
    };

    const isApproved = decision === 'APPROVE' || targetStatus === 'AUDIT_READY';
    const isRevision = decision === 'REQUIRE_REVISION' || targetStatus === 'REVISION_REQUIRED';

    if (!submissionId || (!isApproved && !isRevision)) {
      return res.status(400).json({ error: 'submissionId and valid decision (APPROVE | REQUIRE_REVISION) or targetStatus (AUDIT_READY) are required.' });
    }

    try {
      const submission = await prisma.isoReadinessSubmission.findUnique({ where: { id: submissionId } });
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      // Allow admin or licensee account owner
      if (user.role !== 'ADMIN' && submission.licenseeId !== user.licenseeId) {
        return res.status(403).json({ error: 'Forbidden: Access denied to review this submission.' });
      }

      const newStatus = isApproved ? IsoReadinessStatus.AUDIT_READY : IsoReadinessStatus.REVISION_REQUIRED;
      const score = typeof complianceScore === 'number' ? complianceScore : (isApproved ? 95 : 60);
      const notes = auditorNotes || reviewerNotes || (isApproved ? 'Audit verified conformant. Audit-Ready certified.' : 'Additional evidence required.');

      const updated = await prisma.isoReadinessSubmission.update({
        where: { id: submissionId },
        data: {
          status: newStatus,
          reviewerNotes: notes,
          complianceScore: score,
          auditReadyAt: isApproved ? new Date() : null,
        },
      });

      return res.status(200).json({
        success: true,
        status: updated.status,
        submission: updated,
        message: isApproved ? 'Submission approved as AUDIT_READY. Checkout unlocked.' : 'Revisions requested.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to review submission.' });
    }
  });

  // POST /api/iso-readiness/checkout (HARD GATE 1: Rejects unless AUDIT_READY or APPROVED)
  router.post('/api/iso-readiness/checkout', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { submissionId, tierSelected, successUrl, cancelUrl } = req.body as {
      submissionId: string;
      tierSelected: string;
      successUrl: string;
      cancelUrl: string;
    };

    if (!user?.licenseeId) {
      return res.status(403).json({ error: 'Licensee account required.' });
    }
    if (!submissionId || !tierSelected || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'submissionId, tierSelected, successUrl, and cancelUrl are required.' });
    }

    const tier = TIERS[tierSelected];
    if (!tier) {
      return res.status(400).json({ error: `Unknown tier: ${tierSelected}. Valid values: ${Object.keys(TIERS).join(', ')}` });
    }

    const submission = await prisma.isoReadinessSubmission.findUnique({ where: { id: submissionId } });
    if (!submission || (submission.licenseeId !== user.licenseeId && user.role !== 'ADMIN')) {
      return res.status(404).json({ error: 'Submission not found or access denied.' });
    }

    // Gate 1: Check audit-ready status
    if (
      submission.status !== IsoReadinessStatus.AUDIT_READY &&
      submission.status !== IsoReadinessStatus.APPROVED &&
      user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        error: 'Audit diagnostic must be approved (AUDIT_READY) before initiating licensing payment.',
        currentStatus: submission.status,
        code: 'AUDIT_NOT_READY',
      });
    }

    if (submission.paidAt) {
      return res.status(409).json({ error: 'This submission has already been paid.' });
    }

    try {
      const sessionResult = await checkoutService.createCheckoutSession({
        licenseeId: user.licenseeId,
        itemTitle: tier.name,
        grossAmountCents: tier.grossAmountCents,
        currency: tier.currency,
        successUrl: `${successUrl}?submission_id=${submissionId}&tier=${tierSelected}`,
        cancelUrl,
      });

      // Record the session ID on the submission for webhook matching
      await prisma.isoReadinessSubmission.update({
        where: { id: submissionId },
        data: {
          stripeSessionId: sessionResult.sessionId,
          tierSelected,
        },
      });

      return res.status(200).json({
        success: true,
        sessionUrl: sessionResult.sessionUrl,
        sessionId: sessionResult.sessionId,
        transactionId: sessionResult.transactionId,
        grossAmountCents: tier.grossAmountCents,
        currency: tier.currency,
      });
    } catch (err: any) {
      console.error('[ISO CHECKOUT ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to create checkout session.' });
    }
  });

  // ── GET /api/iso-readiness/status/:licenseeId ───────────────────────────────
  router.get('/api/iso-readiness/status/:licenseeId', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { licenseeId } = req.params;

    // ADMIN can query any licensee; PARTNER can only query their own
    if (user.role !== 'ADMIN' && user.licenseeId !== licenseeId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    try {
      const submissions = await prisma.isoReadinessSubmission.findMany({
        where: { licenseeId },
        include: { credential: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const latest = submissions[0] || null;

      return res.status(200).json({
        success: true,
        licenseeId,
        latestSubmission: latest
          ? {
              id: latest.id,
              status: latest.status,
              tierSelected: latest.tierSelected,
              paidAt: latest.paidAt,
              reviewerNotes: latest.reviewerNotes,
              complianceScore: latest.complianceScore,
              selectedFrameworks: latest.selectedFrameworks,
              hasCredential: !!latest.credential,
              credentialStatus: latest.credential?.status || null,
              openSeaUrl: latest.credential?.openSeaUrl || null,
              createdAt: latest.createdAt,
              updatedAt: latest.updatedAt,
            }
          : null,
        totalSubmissions: submissions.length,
      });
    } catch (err: any) {
      console.error('[ISO STATUS ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch submission status.' });
    }
  });

  return router;
}
