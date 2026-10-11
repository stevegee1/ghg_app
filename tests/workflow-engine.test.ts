import request from 'supertest';
import Stripe from 'stripe';
import path from 'path';
import {
  PrismaClient,
  WorkflowType,
  WorkflowStatus,
  ReviewOverallDecision,
  Vertical,
  EvidenceCategory,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { syncFrameworkRegistry as seedFrameworks } from '../src/services/framework-registry';
import { grantPipelineAccess } from './helpers/pipelineAccess';
import { ensurePlatformSplitConfig } from './helpers/platformSplit';
import { getAssuranceFee, validateAssuranceFeeConfig } from '../src/services/assurance-fee.service';
import { AiAuditReviewer, RULES_ENGINE_REVIEWER } from '../src/services/review-pipeline/ai-audit-reviewer.service';

const prisma = new PrismaClient();

/** An answer for every question in a framework, typed to each question's answer type. */
function answerAll(
  questions: Array<{ id: string; answerType: string; options: string[] }>,
  evidenceDocumentId: string | null
) {
  return questions.map((q) => ({
    questionId: q.id,
    value: q.answerType === 'BOOLEAN' ? 'true' : q.answerType === 'NUMBER' ? '1000' : q.answerType === 'SELECT' ? q.options[0] : 'Documented and verified',
    evidenceDocumentId,
  }));
}
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'nfty-logs-logo.png');

describe('Part B.1–B.3: Workflow Engine & Data Model', () => {
  let app: any;
  let adminUser: any;
  let partnerUserA: any;
  let partnerUserB: any;
  let licenseeA: any;
  let licenseeB: any;
  let adminToken: string;
  let partnerTokenA: string;
  let partnerTokenB: string;
  let evidenceDocA: any;

  beforeAll(async () => {
    // 1. Seed the framework registry
    await seedFrameworks(prisma);

    const passwordHash = await bcrypt.hash('SecureWorkflowPass123!', 10);

    // Create Admin User
    adminUser = await prisma.portalUser.create({
      data: {
        email: 'lead.auditor.workflow@ghg-esg.org',
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Create Licensee A & User A
    licenseeA = await prisma.licensee.create({
      data: {
        name: 'Apex Industrial Technologies',
        vertical: Vertical.B2B_HEAVY_MANUFACTURING,
      },
    });

    partnerUserA = await prisma.portalUser.create({
      data: {
        email: 'compliance@apex-ind.com',
        passwordHash,
        role: 'PARTNER',
        licenseeId: licenseeA.id,
      },
    });

    // Create Licensee B & User B
    licenseeB = await prisma.licensee.create({
      data: {
        name: 'Vanguard Solar Systems',
        vertical: Vertical.B2B_CLEAN_TECH,
      },
    });

    partnerUserB = await prisma.portalUser.create({
      data: {
        email: 'audit@vanguard-solar.com',
        passwordHash,
        role: 'PARTNER',
        licenseeId: licenseeB.id,
      },
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, role: 'ADMIN', licenseeId: '' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    partnerTokenA = jwt.sign(
      { userId: partnerUserA.id, role: 'PARTNER', licenseeId: licenseeA.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    partnerTokenB = jwt.sign(
      { userId: partnerUserB.id, role: 'PARTNER', licenseeId: licenseeB.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    await grantPipelineAccess(prisma, licenseeA.id, WorkflowType.GHG, 'ISO_14064_1');
    await grantPipelineAccess(prisma, licenseeA.id, WorkflowType.JOB, 'UK_SECTION_106');
    await grantPipelineAccess(prisma, licenseeB.id, WorkflowType.GHG, 'ISO_14064_1');

    // Create sample evidence document for Licensee A
    evidenceDocA = await prisma.auditEvidenceDocument.create({
      data: {
        licenseeId: licenseeA.id,
        fileName: 'Apex_Operational_Boundary_2026.pdf',
        category: EvidenceCategory.OTHER_AUDIT_PROOF,
        fileUrl: 'https://storage.ghg-esg.org/evidence/apex-boundary.pdf',
        fileSizeBytes: 1048576,
        mimeType: 'application/pdf',
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        uploadedBy: partnerUserA.email,
      },
    });

    app = createApp();
  });

  afterAll(async () => {
    // Clean up test fixtures cleanly
    await prisma.workflowTransitionLog.deleteMany();
    await prisma.workflowReviewDecision.deleteMany();
    await prisma.workflowAnswer.deleteMany();
    await prisma.workflowSubmission.deleteMany();
    if (evidenceDocA?.id) {
      await prisma.auditEvidenceDocument.delete({ where: { id: evidenceDocA.id } }).catch(() => {});
    }
    if (adminUser?.id) await prisma.portalUser.delete({ where: { id: adminUser.id } }).catch(() => {});
    if (partnerUserA?.id) await prisma.portalUser.delete({ where: { id: partnerUserA.id } }).catch(() => {});
    if (partnerUserB?.id) await prisma.portalUser.delete({ where: { id: partnerUserB.id } }).catch(() => {});
    if (licenseeA?.id) await prisma.licensee.delete({ where: { id: licenseeA.id } }).catch(() => {});
    if (licenseeB?.id) await prisma.licensee.delete({ where: { id: licenseeB.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('1. Framework Discovery & Question Registry (Part B.2 & B.3)', () => {
    it('GET /api/workflow/frameworks lists registry frameworks with ordered questions', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks')
        .expect(200);

      expect(Array.isArray(res.body.frameworks)).toBe(true);
      const iso14064 = res.body.frameworks.find((f: any) => f.id === 'fwk_iso_14064');
      expect(iso14064).toBeDefined();
      expect(iso14064.workflowType).toBe('GHG');
      expect(iso14064.questions.length).toBe(4);
      expect(iso14064.questions[0].orderIndex).toBe(1);
    });

    it('GET /api/workflow/frameworks?type=GHG returns only GHG frameworks', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=GHG')
        .expect(200);

      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(3);
      expect(res.body.frameworks.every((f: any) => f.workflowType === 'GHG')).toBe(true);
    });

    it('GET /api/workflow/frameworks?type=JOB returns only workforce frameworks', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=JOB')
        .expect(200);

      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(2);
      expect(res.body.frameworks.every((f: any) => f.workflowType === 'JOB')).toBe(true);
    });

    it('retired frameworks are not listed and cannot start a draft', async () => {
      await prisma.workflowFramework.upsert({
        where: { id: 'fwk_test_retired' },
        update: { retiredAt: new Date() },
        create: {
          id: 'fwk_test_retired',
          workflowType: WorkflowType.GHG,
          code: 'TEST_RETIRED',
          name: 'Retired Test Framework',
          retiredAt: new Date(),
        },
      });

      const list = await request(app).get('/api/workflow/frameworks').expect(200);
      expect(list.body.frameworks.some((f: any) => f.id === 'fwk_test_retired')).toBe(false);

      const draft = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({ workflowType: 'GHG', frameworkId: 'fwk_test_retired' })
        .expect(400);
      expect(draft.body.error).toContain('retired');
    });

    it('GET /api/workflow/frameworks?type=INVALID returns 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=INVALID')
        .expect(400);

      expect(res.body.error).toContain("Must be 'GHG', 'CARBON', or 'JOB'");
    });
  });

  describe('2. Draft Initialization & Autosave (Part B.1 & B.2)', () => {
    let submissionId: string;
    let question1Id: string;
    let question2Id: string;

    it('POST /api/workflow/draft creates DRAFT submission and logs transition', async () => {
      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'GHG',
          frameworkId: 'fwk_iso_14064',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.status).toBe(WorkflowStatus.DRAFT);
      expect(res.body.submission.licenseeId).toBe(licenseeA.id);
      expect(res.body.submission.workflowType).toBe('GHG');
      expect(res.body.submission.frameworkId).toBe('fwk_iso_14064');

      submissionId = res.body.submission.id;

      // Verify transition log
      const logs = await prisma.workflowTransitionLog.findMany({
        where: { submissionId },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].newStatus).toBe(WorkflowStatus.DRAFT);
      expect(logs[0].triggeredBy).toBe(partnerUserA.id);
    });

    it('PATCH /api/workflow/submissions/:id/answers autosaves answers in DRAFT status', async () => {
      const framework = await prisma.workflowFramework.findUnique({
        where: { id: 'fwk_iso_14064' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      question1Id = framework!.questions[0].id;
      question2Id = framework!.questions[1].id;

      const res = await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          answers: [
            { questionId: question1Id, value: 'true', evidenceDocumentId: null },
            { questionId: question2Id, value: '4250.75', evidenceDocumentId: null },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.answers).toHaveLength(2);

      const dbAnswers = await prisma.workflowAnswer.findMany({
        where: { submissionId },
      });
      expect(dbAnswers).toHaveLength(2);
    });

    it('GET /api/workflow/submissions/:id retrieves full dossier with answers and logs', async () => {
      const res = await request(app)
        .get(`/api/workflow/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(res.body.submission.id).toBe(submissionId);
      expect(res.body.submission.answers).toHaveLength(2);
      expect(res.body.submission.transitions).toHaveLength(1);
      expect(res.body.submission.framework.code).toBe('ISO_14064_1');
    });
  });

  describe('3. Evidence Gating & State Machine Progression (Part B.1 & B.4)', () => {
    let submissionId: string;
    let q1: any;
    let q2: any;
    let questions: any[];

    beforeAll(async () => {
      const framework = await prisma.workflowFramework.findUnique({
        where: { id: 'fwk_iso_14064' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      questions = framework!.questions;
      q1 = questions[0];
      q2 = questions[1];

      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'GHG',
          frameworkId: 'fwk_iso_14064',
        });
      submissionId = res.body.submission.id;
    });

    it('POST /api/workflow/submissions/:id/submit fails with 422 until every question is answered', async () => {
      await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          answers: [
            { questionId: q1.id, value: 'true', evidenceDocumentId: null },
            { questionId: q2.id, value: '   ', evidenceDocumentId: null },
          ],
        })
        .expect(200);

      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(422);

      expect(res.body.error).toContain('Answer every question');
      const missingIds = res.body.missingQuestions.map((m: any) => m.questionId);
      expect(missingIds).toEqual(questions.slice(1).map((q) => q.id));
    });

    it('POST /api/workflow/submissions/:id/submit fails with 422 if evidenceRequired question lacks evidence', async () => {
      // Answer every question, without evidence
      await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({ answers: answerAll(questions, null) })
        .expect(200);

      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(422);

      expect(res.body.error).toContain('Evidence is strictly required');
      expect(Array.isArray(res.body.missingQuestions)).toBe(true);
      expect(res.body.missingQuestions.some((m: any) => m.questionId === q1.id)).toBe(true);
    });

    it('POST /api/workflow/submissions/:id/submit succeeds once all required evidence is attached', async () => {
      // Attach valid evidence document to all required questions
      await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({ answers: answerAll(questions, evidenceDocA.id) })
        .expect(200);

      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.status).toBe(WorkflowStatus.SUBMITTED);
      expect(res.body.submission.submittedAt).toBeDefined();

      const dbSub = await prisma.workflowSubmission.findUnique({ where: { id: submissionId } });
      expect(dbSub!.status).toBe(WorkflowStatus.SUBMITTED);
    });

    it('PATCH /api/workflow/submissions/:id/answers rejects editing when status is SUBMITTED', async () => {
      const res = await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          answers: [{ questionId: q1.id, value: 'false' }],
        })
        .expect(400);

      expect(res.body.error).toContain('Cannot edit answers while submission is in SUBMITTED status');
    });

    it('Illegal status leap (e.g. SUBMITTED -> SUBMITTED) fails with 400 InvalidWorkflowTransitionError', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStatus: WorkflowStatus.SUBMITTED,
        })
        .expect(400);

      expect(res.body.error).toContain('Invalid workflow transition from SUBMITTED to SUBMITTED');
    });

    it('Non-admin user cannot transition submission to UNDER_REVIEW (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          targetStatus: WorkflowStatus.UNDER_REVIEW,
        })
        .expect(403);

      expect(res.body.error).toContain('Only a Lead Auditor');
    });

    it('Lead Auditor (ADMIN) transitions submission to UNDER_REVIEW', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStatus: WorkflowStatus.UNDER_REVIEW,
          reason: 'Auditor opened dossier for formal ISO 14064-1 compliance review',
        })
        .expect(200);

      expect(res.body.submission.status).toBe(WorkflowStatus.UNDER_REVIEW);
    });
  });

  describe('4. Structured Review Rejection & Resubmission Cycle (Part B.1 & B.4)', () => {
    let submissionId: string;
    let q1: any;
    let q2: any;
    let q3: any;
    let q4: any;

    beforeAll(async () => {
      const framework = await prisma.workflowFramework.findUnique({
        where: { id: 'fwk_uk_s106' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      q1 = framework!.questions[0];
      q2 = framework!.questions[1];
      q3 = framework!.questions[2];
      q4 = framework!.questions[3];

      // Create Job draft, populate answers with evidence, submit, and transition to UNDER_REVIEW
      const draftRes = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'JOB',
          frameworkId: 'fwk_uk_s106',
        });
      submissionId = draftRes.body.submission.id;

      await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({ answers: answerAll(framework!.questions, evidenceDocA.id) })
        .expect(200);

      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${partnerTokenA}`);

      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: WorkflowStatus.UNDER_REVIEW });
    });

    it('POST /api/workflow/submissions/:id/review rejects non-admin with 403', async () => {
      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/review`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          overallDecision: 'REJECTED',
          overallScore: 40,
          perQuestionDecisions: [{ questionId: q1.id, accepted: true, reasonIfRejected: null }],
        })
        .expect(403);
    });

    it('Lead Auditor records structured REJECTED decision with per-question reasons', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          overallDecision: 'REJECTED',
          overallScore: 55,
          reviewerAccreditation: 'IEMA Lead Auditor 12345',
          reviewerNotes: 'Apprenticeship weeks do not meet statutory CITB benchmark.',
          perQuestionDecisions: [
            { questionId: q1.id, accepted: true, reasonIfRejected: null },
            {
              questionId: q2.id,
              accepted: false,
              reasonIfRejected: 'Reported 45 weeks is below mandatory 52-week annual apprentice threshold.',
            },
            { questionId: q3.id, accepted: true, reasonIfRejected: null },
            { questionId: q4.id, accepted: true, reasonIfRejected: null },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.status).toBe(WorkflowStatus.REJECTED);
      expect(res.body.submission.complianceScore).toBe(55);

      const dossier = await request(app)
        .get(`/api/workflow/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(dossier.body.submission.reviewDecision.overallDecision).toBe('REJECTED');
      expect(dossier.body.submission.reviewDecision.perQuestionDecisions).toHaveLength(4);
      expect(dossier.body.submission.reviewDecision.reviewerAccreditation).toBe('IEMA Lead Auditor 12345');
      expect(dossier.body.submission.reviewDecision.reviewerName).toBe(adminUser.email);
      expect(dossier.body.submission.reviewDecision.perQuestionDecisions[1].accepted).toBe(false);
    });

    it('Client edits answers in REJECTED status and successfully resubmits (REJECTED -> SUBMITTED)', async () => {
      // Client updates the rejected question answer
      await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          answers: [{ questionId: q2.id, value: '60', evidenceDocumentId: evidenceDocA.id }],
        })
        .expect(200);

      // Resubmit back to SUBMITTED
      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(res.body.submission.status).toBe(WorkflowStatus.SUBMITTED);

      // Verify full transition audit log
      const logs = await prisma.workflowTransitionLog.findMany({
        where: { submissionId },
        orderBy: { timestamp: 'asc' },
      });

      const sequence = logs.map((l) => l.newStatus);
      expect(sequence).toEqual([
        WorkflowStatus.DRAFT,
        WorkflowStatus.SUBMITTED,
        WorkflowStatus.UNDER_REVIEW,
        WorkflowStatus.REJECTED,
        WorkflowStatus.SUBMITTED,
      ]);
    });
  });

  describe('5. Full Approval, Payment, and Badge Pipeline (Part B.1)', () => {
    let submissionId: string;
    let allQuestionIds: string[];

    beforeAll(async () => {
      const framework = await prisma.workflowFramework.findUnique({
        where: { id: 'fwk_iso_14064' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      allQuestionIds = framework!.questions.map((q) => q.id);

      const draftRes = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'GHG',
          frameworkId: 'fwk_iso_14064',
        });
      submissionId = draftRes.body.submission.id;

      await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          answers: framework!.questions.map((q) => ({
            questionId: q.id,
            value: 'Verified compliant',
            evidenceDocumentId: evidenceDocA.id,
          })),
        });

      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/submit`)
        .set('Authorization', `Bearer ${partnerTokenA}`);

      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: WorkflowStatus.UNDER_REVIEW });
    });

    it('Lead Auditor approves submission with 100% compliance score (UNDER_REVIEW -> APPROVED)', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          overallDecision: 'APPROVED',
          overallScore: 100,
          reviewerAccreditation: 'IEMA Lead Auditor 12345',
          reviewerNotes: 'Exemplary Scope 1 and 2 carbon accounting with verified primary evidence.',
          perQuestionDecisions: allQuestionIds.map((questionId) => ({ questionId, accepted: true, reasonIfRejected: null })),
        })
        .expect(200);

      expect(res.body.submission.status).toBe(WorkflowStatus.APPROVED);
      expect(res.body.submission.complianceScore).toBe(100);
    });

    it('PAID and BADGE_ISSUED cannot be forced through /transition, even by an admin', async () => {
      const paid = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: WorkflowStatus.PAID, reason: 'Manual payment override attempt' })
        .expect(403);
      expect(paid.body.error).toContain('dedicated');

      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: WorkflowStatus.BADGE_ISSUED })
        .expect(403);

      const dossier = await request(app)
        .get(`/api/workflow/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(dossier.body.submission.status).toBe(WorkflowStatus.APPROVED);
      expect(dossier.body.submission.paidAt).toBeNull();

      const logStatuses = dossier.body.submission.transitions.map((l: any) => l.newStatus);
      expect(logStatuses).toEqual([
        WorkflowStatus.DRAFT,
        WorkflowStatus.SUBMITTED,
        WorkflowStatus.UNDER_REVIEW,
        WorkflowStatus.APPROVED,
      ]);
      const approvalLog = dossier.body.submission.transitions[3];
      expect(approvalLog.previousStatus).toBe(WorkflowStatus.UNDER_REVIEW);
    });
  });

  describe('6. Row-Level Security & Multi-Tenant Isolation (Part D.3)', () => {
    let subAId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'GHG',
          frameworkId: 'fwk_iso_14064',
        });
      subAId = res.body.submission.id;
    });

    it('Partner User B cannot access or view Partner User A submission (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/workflow/submissions/${subAId}`)
        .set('Authorization', `Bearer ${partnerTokenB}`);

      expect([403, 404]).toContain(res.status);
    });

    it('Partner User B cannot save answers to Partner User A submission (400 / 403)', async () => {
      const res = await request(app)
        .patch(`/api/workflow/submissions/${subAId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenB}`)
        .send({
          answers: [{ questionId: 'any', value: 'tampered' }],
        });

      expect([400, 403]).toContain(res.status);
    });

    it('Admin user can view any licensee submission', async () => {
      const res = await request(app)
        .get(`/api/workflow/submissions/${subAId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.submission.id).toBe(subAId);
    });
  });

  describe('7. Screens 7–11 Lifecycle Endpoints (Checkout, Badge Setup, PDF, Telemetry)', () => {
    let lifecycleSubId: string;

    beforeAll(async () => {
      // Create a submission through to APPROVED
      const draft = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'GHG',
          frameworkId: 'fwk_iso_14064',
        });
      lifecycleSubId = draft.body.submission.id;

      const fw = await prisma.workflowFramework.findUnique({
        where: { id: 'fwk_iso_14064' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      const qIds = fw!.questions.map((q) => q.id);

      // Answer every question with evidence attached
      await request(app)
        .patch(`/api/workflow/submissions/${lifecycleSubId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({ answers: answerAll(fw!.questions, evidenceDocA.id) })
        .expect(200);

      // Submit
      await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/submit`)
        .set('Authorization', `Bearer ${partnerTokenA}`);

      // Transition to UNDER_REVIEW
      await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStatus: WorkflowStatus.UNDER_REVIEW,
          notes: 'Moving to Lead Auditor review queue',
        });

      // Admin Reviews and approves
      await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          overallDecision: 'APPROVED',
          overallScore: 100,
          reviewerAccreditation: 'IEMA Lead Auditor 12345',
          reviewerNotes: 'Approved for production checkout and badge issuance.',
          perQuestionDecisions: qIds.map((qid) => ({ questionId: qid, accepted: true, reasonIfRejected: null })),
        })
        .expect(200);
    });

    it('Screen 9: PDF proof is unavailable before the credential is issued', async () => {
      await request(app)
        .get(`/api/workflow/submissions/${lifecycleSubId}/download-pdf`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(409);
    });

    it('Screen 8: badge-setup never reads a file path supplied by the client', async () => {
      await prisma.workflowSubmission.update({
        where: { id: lifecycleSubId },
        data: { status: WorkflowStatus.PAID, paidAt: new Date() },
      });

      const res = await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/badge-setup`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({ clientMessage: 'Attempted path read', clientLogoUrl: path.join(process.cwd(), '.env') })
        .expect(400);

      expect(res.body.error).toContain('clientLogo');
      const row = await prisma.workflowSubmission.findUnique({ where: { id: lifecycleSubId } });
      expect(row!.status).toBe(WorkflowStatus.PAID);
    });

    it('Screen 8: badge-setup issues a verifiable credential for a PAID submission', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/badge-setup`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .field('clientMessage', 'Net Zero Operational Attestation 2026')
        .attach('clientLogo', LOGO_PATH)
        .expect(201);

      expect(res.body.submission.status).toBe(WorkflowStatus.BADGE_ISSUED);
      expect(res.body.submission.clientMessage).toBe('Net Zero Operational Attestation 2026');
      expect(res.body.verificationSeal).toMatch(/^[a-f0-9]{64}$/);

      const credential = await prisma.auditWarrantyCredential.findUnique({
        where: { workflowSubmissionId: lifecycleSubId },
      });
      expect(credential).not.toBeNull();
      expect(credential!.id).toBe(res.body.credentialId);
      expect(credential!.licenseeId).toBe(licenseeA.id);
      expect(credential!.status).toBe('ISSUED');

      const verify = await request(app).get(res.body.verifyPath).expect(200);
      expect(verify.body.valid).toBe(true);
      expect(verify.body.licenseeName).toBe(licenseeA.name);
    });

    it('Screen 8: a credential cannot be issued twice', async () => {
      await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/badge-setup`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .field('clientMessage', 'Second issuance attempt')
        .attach('clientLogo', LOGO_PATH)
        .expect(409);

      expect(await prisma.auditWarrantyCredential.count({ where: { workflowSubmissionId: lifecycleSubId } })).toBe(1);
    });

    it('Screen 9: PDF proof requires login and ownership', async () => {
      await request(app).get(`/api/workflow/submissions/${lifecycleSubId}/download-pdf`).expect(401);
      // Row-level security hides another licensee's submission entirely.
      await request(app)
        .get(`/api/workflow/submissions/${lifecycleSubId}/download-pdf`)
        .set('Authorization', `Bearer ${partnerTokenB}`)
        .expect(404);
    });

    it('Screen 9: GET /api/workflow/submissions/:id/download-pdf streams audit certificate PDF', async () => {
      const res = await request(app)
        .get(`/api/workflow/submissions/${lifecycleSubId}/download-pdf`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.body).toBeDefined();
    });

    it('Screen 10: GET /api/workflow/my-badges returns issued badges for licensee', async () => {
      const res = await request(app)
        .get('/api/workflow/my-badges')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.badges)).toBe(true);
      expect(res.body.badges.length).toBeGreaterThanOrEqual(1);
      const found = res.body.badges.find((b: any) => b.id === lifecycleSubId);
      expect(found).toBeDefined();
      expect(found.frameworkCode).toBe('ISO_14064_1');
      expect(found.frameworkName).toContain('Corporate Greenhouse Gas Inventories');
    });

    it('Screen 11: POST /api/workflow/telemetry-key generates and returns scoped telemetry key', async () => {
      const res = await request(app)
        .post('/api/workflow/telemetry-key')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({ keyLabel: 'Production Pipeline Sensor Key' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.key.apiKey).toMatch(/^ghg_live_carbon_/);
    });
  });

  describe('8. State Machine Access Control', () => {
    let screenedId: string;
    let draftAId: string;

    beforeAll(async () => {
      const screened = await prisma.workflowSubmission.create({
        data: {
          licenseeId: licenseeA.id,
          workflowType: WorkflowType.GHG,
          frameworkId: 'fwk_iso_14064',
          frameworkVersionId: 'fwk_iso_14064_v2026_1',
          status: WorkflowStatus.AI_SCREENED,
          submittedAt: new Date(),
        },
      });
      screenedId = screened.id;

      const draft = await prisma.workflowSubmission.create({
        data: {
          licenseeId: licenseeA.id,
          workflowType: WorkflowType.GHG,
          frameworkId: 'fwk_iso_14064',
          frameworkVersionId: 'fwk_iso_14064_v2026_1',
          status: WorkflowStatus.DRAFT,
        },
      });
      draftAId = draft.id;
    });

    it.each([WorkflowStatus.APPROVED, WorkflowStatus.REJECTED, WorkflowStatus.UNDER_REVIEW])(
      'licensee cannot move their own AI_SCREENED submission to %s',
      async (targetStatus) => {
        await request(app)
          .post(`/api/workflow/submissions/${screenedId}/transition`)
          .set('Authorization', `Bearer ${partnerTokenA}`)
          .send({ targetStatus })
          .expect(403);

        const row = await prisma.workflowSubmission.findUnique({ where: { id: screenedId } });
        expect(row!.status).toBe(WorkflowStatus.AI_SCREENED);
      }
    );

    it('admin cannot approve through /transition and must use the structured review', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${screenedId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: WorkflowStatus.APPROVED })
        .expect(403);
      expect(res.body.error).toContain('dedicated');
    });

    it('licensee cannot submit another licensee draft', async () => {
      await request(app)
        .post(`/api/workflow/submissions/${draftAId}/transition`)
        .set('Authorization', `Bearer ${partnerTokenB}`)
        .send({ targetStatus: WorkflowStatus.SUBMITTED })
        .expect(404);

      const row = await prisma.workflowSubmission.findUnique({ where: { id: draftAId } });
      expect(row!.status).toBe(WorkflowStatus.DRAFT);
    });
  });

  describe('9. Assurance Fee Payment (Stripe Checkout and webhook only)', () => {
    let payApp: any;
    let mockSessionsCreate: jest.Mock;
    let mockConstructEvent: jest.Mock;
    let approvedId: string;

    const createApproved = async () => {
      const sub = await prisma.workflowSubmission.create({
        data: {
          licenseeId: licenseeA.id,
          workflowType: WorkflowType.GHG,
          frameworkId: 'fwk_iso_14064',
          frameworkVersionId: 'fwk_iso_14064_v2026_1',
          status: WorkflowStatus.APPROVED,
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      });
      return sub.id;
    };

    beforeAll(async () => {
      mockSessionsCreate = jest.fn();
      mockConstructEvent = jest.fn();
      const mockStripe = {
        paymentIntents: {
          create: jest.fn().mockResolvedValue({ id: 'pi_fee_test', client_secret: 'pi_fee_test_secret' }),
          retrieve: jest.fn(),
        },
        checkout: { sessions: { create: mockSessionsCreate, retrieve: jest.fn() } },
        webhooks: { constructEvent: mockConstructEvent },
        transfers: { create: jest.fn() },
      } as unknown as Stripe;
      payApp = createApp(mockStripe);
      await ensurePlatformSplitConfig(prisma);
      approvedId = await createApproved();
    });

    beforeEach(() => {
      mockSessionsCreate.mockReset();
      mockConstructEvent.mockReset();
    });

    it('charges the configured GHG fee and links the Stripe session to the submission', async () => {
      mockSessionsCreate.mockResolvedValueOnce({ id: 'cs_fee_linked', url: 'https://checkout.stripe.com/c/pay/cs_fee_linked' });

      const res = await request(payApp)
        .post(`/api/workflow/submissions/${approvedId}/checkout-session`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(res.body.grossAmountCents).toBe(Number(process.env.GHG_ASSURANCE_FEE_PENCE));
      expect(res.body.currency).toBe(process.env.ASSURANCE_FEE_CURRENCY);
      expect(res.body.checkoutUrl).toBe('https://checkout.stripe.com/c/pay/cs_fee_linked');

      const params = mockSessionsCreate.mock.calls[0][0];
      expect(params.line_items[0].price_data.unit_amount).toBe(Number(process.env.GHG_ASSURANCE_FEE_PENCE));
      expect(params.metadata.workflowSubmissionId).toBe(approvedId);
      expect(params.shipping_address_collection).toBeUndefined();

      const row = await prisma.workflowSubmission.findUnique({ where: { id: approvedId } });
      expect(row!.stripeSessionId).toBe('cs_fee_linked');
      expect(row!.status).toBe(WorkflowStatus.APPROVED);
    });

    it('returns an error and never a success URL when Stripe fails', async () => {
      mockSessionsCreate.mockRejectedValueOnce(new Error('Stripe unavailable'));

      const res = await request(payApp)
        .post(`/api/workflow/submissions/${approvedId}/checkout-session`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(502);

      expect(res.body.checkoutUrl).toBeUndefined();
      const row = await prisma.workflowSubmission.findUnique({ where: { id: approvedId } });
      expect(row!.status).toBe(WorkflowStatus.APPROVED);
      expect(row!.paidAt).toBeNull();
    });

    it('has no client-callable endpoint that marks a submission paid', async () => {
      await request(payApp)
        .post(`/api/workflow/submissions/${approvedId}/pay`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({ stripeSessionId: 'cs_forged' })
        .expect(404);
    });

    it('ignores a completed session that is not linked to the submission', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_unrelated', metadata: { submissionId: approvedId }, payment_intent: null } },
      });

      await request(payApp)
        .post('/webhooks/stripe')
        .set('stripe-signature', 't=1,v1=test')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({}))
        .expect(200);

      const row = await prisma.workflowSubmission.findUnique({ where: { id: approvedId } });
      expect(row!.status).toBe(WorkflowStatus.APPROVED);
    });

    it('marks the submission PAID only from the signed checkout.session.completed webhook', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_fee_linked', metadata: { workflowSubmissionId: approvedId }, payment_intent: null } },
      });

      await request(payApp)
        .post('/webhooks/stripe')
        .set('stripe-signature', 't=1,v1=test')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({}))
        .expect(200);

      const row = await prisma.workflowSubmission.findUnique({
        where: { id: approvedId },
        include: { transitions: { orderBy: { timestamp: 'asc' } } },
      });
      expect(row!.status).toBe(WorkflowStatus.PAID);
      expect(row!.paidAt).not.toBeNull();
      const last = row!.transitions[row!.transitions.length - 1];
      expect(last.newStatus).toBe(WorkflowStatus.PAID);
      expect(last.triggeredBy).toBe('STRIPE_WEBHOOK');
    });

    it('fee configuration rejects missing or invalid values at validation time', () => {
      const saved = {
        ghg: process.env.GHG_ASSURANCE_FEE_PENCE,
        currency: process.env.ASSURANCE_FEE_CURRENCY,
      };
      try {
        process.env.GHG_ASSURANCE_FEE_PENCE = '0';
        expect(() => validateAssuranceFeeConfig()).toThrow(/GHG_ASSURANCE_FEE_PENCE/);
        process.env.GHG_ASSURANCE_FEE_PENCE = '12.50';
        expect(() => validateAssuranceFeeConfig()).toThrow(/GHG_ASSURANCE_FEE_PENCE/);
        process.env.GHG_ASSURANCE_FEE_PENCE = saved.ghg;
        delete process.env.ASSURANCE_FEE_CURRENCY;
        expect(() => validateAssuranceFeeConfig()).toThrow(/ASSURANCE_FEE_CURRENCY/);
      } finally {
        process.env.GHG_ASSURANCE_FEE_PENCE = saved.ghg;
        process.env.ASSURANCE_FEE_CURRENCY = saved.currency;
      }
      expect(() => validateAssuranceFeeConfig()).not.toThrow();
      expect(getAssuranceFee(WorkflowType.JOB).amountPence).toBe(Number(process.env.WORKFORCE_ASSURANCE_FEE_PENCE));
    });

    it('rejects a webhook with an invalid signature', async () => {
      mockConstructEvent.mockImplementationOnce(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      const res = await request(payApp)
        .post('/webhooks/stripe')
        .set('stripe-signature', 't=1,v1=forged')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({}))
        .expect(400);
      expect(res.text).toBe('Webhook Error: Invalid signature');
    });
  });

  describe('10. AI pre-screen and Lead Auditor decision are kept separately', () => {
    let subId: string;
    let questionIds: string[];
    type QuestionDecision = { questionId: string; accepted: boolean; reasonIfRejected: string | null };
    const approveAll = (): QuestionDecision[] =>
      questionIds.map((questionId) => ({ questionId, accepted: true, reasonIfRejected: null }));

    beforeAll(async () => {
      const framework = await prisma.workflowFramework.findUnique({
        where: { id: 'fwk_iso_14064' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      questionIds = framework!.questions.map((q) => q.id);

      const sub = await prisma.workflowSubmission.create({
        data: {
          licenseeId: licenseeA.id,
          workflowType: WorkflowType.GHG,
          frameworkId: 'fwk_iso_14064',
          frameworkVersionId: 'fwk_iso_14064_v2026_1',
          status: WorkflowStatus.SUBMITTED,
          submittedAt: new Date(),
          answers: {
            create: framework!.questions.map((q) => ({
              questionId: q.id,
              value: 'true',
              evidenceDocumentId: evidenceDocA.id,
            })),
          },
        },
      });
      subId = sub.id;
    });

    it('records the pre-screen on the submission and labels it when no AI model ran', async () => {
      const reviewer = new AiAuditReviewer(prisma, []);
      await reviewer.evaluateSubmission(subId);

      const row = await prisma.workflowSubmission.findUnique({ where: { id: subId } });
      expect(row!.status).toBe(WorkflowStatus.AI_SCREENED);
      expect(row!.aiReviewer).toBe(RULES_ENGINE_REVIEWER);
      expect(typeof row!.aiScore).toBe('number');
      expect(row!.aiClauseFindings).not.toBeNull();
      expect(await prisma.workflowReviewDecision.findUnique({ where: { submissionId: subId } })).toBeNull();

      const findings = await request(app)
        .get(`/api/workflow/submissions/${subId}/ai-findings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(findings.body.aiFindings.reviewer).toBe(RULES_ENGINE_REVIEWER);
      expect(Array.isArray(findings.body.aiFindings.clauseFindings)).toBe(true);

      await request(app)
        .get(`/api/workflow/submissions/${subId}/ai-findings`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(403);
    });

    it.each([
      ['missing accreditation', { reviewerAccreditation: '' }, /reviewerAccreditation/],
      ['an undecided question', { dropLast: true }, /every question/],
      ['a rejection without a reason', { rejectFirst: '' }, /reason/],
      ['approval with a rejected question', { rejectFirst: 'Boundary evidence incomplete.' }, /cannot be approved/],
    ])('rejects a review with %s', async (_label, variant, message) => {
      const v = variant as { reviewerAccreditation?: string; dropLast?: boolean; rejectFirst?: string };
      let decisions = approveAll();
      if (v.dropLast) decisions = decisions.slice(0, -1);
      if (v.rejectFirst !== undefined) {
        decisions = decisions.map((d, i) => (i === 0 ? { ...d, accepted: false, reasonIfRejected: v.rejectFirst || null } : d));
      }

      const res = await request(app)
        .post(`/api/workflow/submissions/${subId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          overallDecision: 'APPROVED',
          overallScore: 90,
          reviewerAccreditation: v.reviewerAccreditation ?? 'IEMA Lead Auditor 12345',
          perQuestionDecisions: decisions,
        })
        .expect(400);
      expect(res.body.error).toMatch(message);

      const row = await prisma.workflowSubmission.findUnique({ where: { id: subId } });
      expect(row!.status).toBe(WorkflowStatus.AI_SCREENED);
    });

    it("keeps the AI pre-screen after the Lead Auditor's decision", async () => {
      await request(app)
        .post(`/api/workflow/submissions/${subId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          overallDecision: 'APPROVED',
          overallScore: 92,
          reviewerAccreditation: 'IEMA Lead Auditor 12345',
          perQuestionDecisions: approveAll(),
        })
        .expect(200);

      const row = await prisma.workflowSubmission.findUnique({
        where: { id: subId },
        include: { reviewDecision: true, transitions: { orderBy: { timestamp: 'asc' } } },
      });
      expect(row!.status).toBe(WorkflowStatus.APPROVED);
      expect(row!.complianceScore).toBe(92);
      expect(row!.aiReviewer).toBe(RULES_ENGINE_REVIEWER);
      expect(row!.aiClauseFindings).not.toBeNull();
      expect(row!.reviewDecision!.reviewerId).toBe(adminUser.id);
      expect(row!.reviewDecision!.reviewerName).toBe(adminUser.email);
      const last = row!.transitions[row!.transitions.length - 1];
      expect(last.previousStatus).toBe(WorkflowStatus.AI_SCREENED);
      expect(last.newStatus).toBe(WorkflowStatus.APPROVED);
    });
  });
});
