import request from 'supertest';
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
import { WorkflowEngineService } from '../src/services/workflow-engine.service';

const prisma = new PrismaClient();

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
    // 1. Seed standard frameworks
    const workflowService = new WorkflowEngineService(prisma);
    await workflowService.seedStandardFrameworks();

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
    it('GET /api/workflow/frameworks lists all frameworks with ordered questions', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks')
        .expect(200);

      expect(Array.isArray(res.body.frameworks)).toBe(true);
      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(4);

      const iso14064 = res.body.frameworks.find((f: any) => f.id === 'ISO_14064_1');
      expect(iso14064).toBeDefined();
      expect(iso14064.workflowType).toBe('CARBON');
      expect(iso14064.questions.length).toBeGreaterThanOrEqual(3);
      expect(iso14064.questions[0].orderIndex).toBe(1);
    });

    it('GET /api/workflow/frameworks?type=CARBON returns only carbon frameworks', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=CARBON')
        .expect(200);

      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(2);
      expect(res.body.frameworks.every((f: any) => f.workflowType === 'CARBON')).toBe(true);
    });

    it('GET /api/workflow/frameworks?type=JOB returns only job reporting frameworks', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=JOB')
        .expect(200);

      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(2);
      expect(res.body.frameworks.every((f: any) => f.workflowType === 'JOB')).toBe(true);
    });

    it('GET /api/workflow/frameworks?type=INVALID returns 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=INVALID')
        .expect(400);

      expect(res.body.error).toContain("Must be 'CARBON' or 'JOB'");
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
          workflowType: 'CARBON',
          frameworkId: 'ISO_14064_1',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.status).toBe(WorkflowStatus.DRAFT);
      expect(res.body.submission.licenseeId).toBe(licenseeA.id);
      expect(res.body.submission.workflowType).toBe('CARBON');
      expect(res.body.submission.frameworkId).toBe('ISO_14064_1');

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
        where: { id: 'ISO_14064_1' },
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
      expect(res.body.submission.framework.code).toBe('ISO 14064-1');
    });
  });

  describe('3. Evidence Gating & State Machine Progression (Part B.1 & B.4)', () => {
    let submissionId: string;
    let q1: any;
    let q2: any;
    let q3: any;

    beforeAll(async () => {
      const framework = await prisma.workflowFramework.findUnique({
        where: { id: 'ISO_14064_1' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      q1 = framework!.questions[0];
      q2 = framework!.questions[1];
      q3 = framework!.questions[2];

      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'CARBON',
          frameworkId: 'ISO_14064_1',
        });
      submissionId = res.body.submission.id;
    });

    it('POST /api/workflow/submissions/:id/submit fails with 422 if evidenceRequired question lacks evidence', async () => {
      // Save answer without evidenceDocumentId for required question
      await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          answers: [
            { questionId: q1.id, value: 'true', evidenceDocumentId: null },
            { questionId: q2.id, value: '1000', evidenceDocumentId: null },
          ],
        });

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
        .send({
          answers: [
            { questionId: q1.id, value: 'true', evidenceDocumentId: evidenceDocA.id },
            { questionId: q2.id, value: '12500', evidenceDocumentId: evidenceDocA.id },
            { questionId: q3.id, value: 'true', evidenceDocumentId: evidenceDocA.id },
          ],
        });

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

    it('Illegal status leap (e.g. SUBMITTED -> MINTED) fails with 400 InvalidWorkflowTransitionError', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStatus: WorkflowStatus.MINTED,
        })
        .expect(400);

      expect(res.body.error).toContain('Invalid workflow transition from SUBMITTED to MINTED');
    });

    it('Non-admin user cannot transition submission to UNDER_REVIEW (400 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          targetStatus: WorkflowStatus.UNDER_REVIEW,
        })
        .expect(400);

      expect(res.body.error).toContain('Only an authorized Lead Auditor can transition');
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

    beforeAll(async () => {
      const framework = await prisma.workflowFramework.findUnique({
        where: { id: 'UK_SECTION_106' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      q1 = framework!.questions[0];
      q2 = framework!.questions[1];
      q3 = framework!.questions[2];

      // Create Job draft, populate answers with evidence, submit, and transition to UNDER_REVIEW
      const draftRes = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'JOB',
          frameworkId: 'UK_SECTION_106',
        });
      submissionId = draftRes.body.submission.id;

      await request(app)
        .patch(`/api/workflow/submissions/${submissionId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          answers: [
            { questionId: q1.id, value: 'true', evidenceDocumentId: evidenceDocA.id },
            { questionId: q2.id, value: '45', evidenceDocumentId: evidenceDocA.id },
            { questionId: q3.id, value: 'true', evidenceDocumentId: evidenceDocA.id },
          ],
        });

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
          reviewerNotes: 'Apprenticeship weeks do not meet statutory CITB benchmark.',
          perQuestionDecisions: [
            { questionId: q1.id, accepted: true, reasonIfRejected: null },
            {
              questionId: q2.id,
              accepted: false,
              reasonIfRejected: 'Reported 45 weeks is below mandatory 52-week annual apprentice threshold.',
            },
            { questionId: q3.id, accepted: true, reasonIfRejected: null },
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
      expect(dossier.body.submission.reviewDecision.perQuestionDecisions).toHaveLength(3);
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

  describe('5. Full Approval, Payment, and Minting Pipeline (Part B.1)', () => {
    let submissionId: string;
    let q1: any;

    beforeAll(async () => {
      const framework = await prisma.workflowFramework.findUnique({
        where: { id: 'ISO_14064_1' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      q1 = framework!.questions[0];

      const draftRes = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'CARBON',
          frameworkId: 'ISO_14064_1',
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
          reviewerNotes: 'Exemplary Scope 1 and 2 carbon accounting with verified primary evidence.',
          perQuestionDecisions: [
            { questionId: q1.id, accepted: true, reasonIfRejected: null },
          ],
        })
        .expect(200);

      expect(res.body.submission.status).toBe(WorkflowStatus.APPROVED);
      expect(res.body.submission.complianceScore).toBe(100);
    });

    it('Completes lifecycle: APPROVED -> PAID -> BADGE_ISSUED -> MINTED with complete audit log', async () => {
      // 1. APPROVED -> PAID
      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: WorkflowStatus.PAID, reason: 'Stripe flat fee checkout completed' })
        .expect(200);

      // 2. PAID -> BADGE_ISSUED
      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: WorkflowStatus.BADGE_ISSUED, reason: 'Dual logo composite badge generated' })
        .expect(200);

      // 3. BADGE_ISSUED -> MINTED
      await request(app)
        .post(`/api/workflow/submissions/${submissionId}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetStatus: WorkflowStatus.MINTED, reason: 'ERC-1155 token minted on Polygon PoS' })
        .expect(200);

      // Verify the final submission state and complete log
      const dossier = await request(app)
        .get(`/api/workflow/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(dossier.body.submission.status).toBe(WorkflowStatus.MINTED);
      expect(dossier.body.submission.paidAt).toBeDefined();

      const logStatuses = dossier.body.submission.transitions.map((l: any) => l.newStatus);
      expect(logStatuses).toEqual([
        WorkflowStatus.DRAFT,
        WorkflowStatus.SUBMITTED,
        WorkflowStatus.UNDER_REVIEW,
        WorkflowStatus.APPROVED,
        WorkflowStatus.PAID,
        WorkflowStatus.BADGE_ISSUED,
        WorkflowStatus.MINTED,
      ]);
    });
  });

  describe('6. Row-Level Security & Multi-Tenant Isolation (Part D.3)', () => {
    let subAId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'CARBON',
          frameworkId: 'ISO_14064_1',
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

  describe('7. Screens 7–11 Lifecycle Endpoints (Checkout, Badge Setup, Mint, PDF, Telemetry)', () => {
    let lifecycleSubId: string;

    beforeAll(async () => {
      // Create a submission through to APPROVED
      const draft = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          workflowType: 'CARBON',
          frameworkId: 'ISO_14064_1',
        });
      lifecycleSubId = draft.body.submission.id;

      const fw = await prisma.workflowFramework.findUnique({
        where: { id: 'ISO_14064_1' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      const qIds = fw!.questions.map((q) => q.id);

      // Add answers for all 3 questions with required evidence
      await request(app)
        .patch(`/api/workflow/submissions/${lifecycleSubId}/answers`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          answers: [
            { questionId: qIds[0], value: 'true', evidenceDocumentId: evidenceDocA.id },
            { questionId: qIds[1], value: '450.5', evidenceDocumentId: evidenceDocA.id },
            { questionId: qIds[2], value: 'true', evidenceDocumentId: evidenceDocA.id },
          ],
        });

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
          reviewerNotes: 'Approved for production checkout and minting.',
          perQuestionDecisions: qIds.map((qid) => ({ questionId: qid, accepted: true, reasonIfRejected: null })),
        })
        .expect(200);
    });

    it('Screen 7: POST /api/workflow/submissions/:id/checkout-session generates checkout URL', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/checkout-session`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.checkoutUrl).toBeDefined();
      expect(res.body.grossAmountCents).toBe(150000);
      expect(res.body.charitySplitCents).toBe(22500);
    });

    it('Screen 8: POST /api/workflow/submissions/:id/badge-setup saves message & logo URL and transitions to BADGE_ISSUED', async () => {
      // Simulate payment transition first
      await prisma.workflowSubmission.update({
        where: { id: lifecycleSubId },
        data: { status: WorkflowStatus.PAID, paidAt: new Date() },
      });

      const res = await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/badge-setup`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          badgeMessage: 'Net Zero Operational Attestation 2026',
          badgeLogoUrl: '',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.status).toBe(WorkflowStatus.BADGE_ISSUED);
      expect(res.body.submission.clientMessage).toBe('Net Zero Operational Attestation 2026');
    });

    it('Screen 9: POST /api/workflow/submissions/:id/mint records wallet address and polygon tx hash', async () => {
      const res = await request(app)
        .post(`/api/workflow/submissions/${lifecycleSubId}/mint`)
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .send({
          recipientAddress: '0x71C841832049987C653199d7559eB8b99c080eE1',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.status).toBe(WorkflowStatus.MINTED);
      expect(res.body.submission.tokenId).toBeDefined();
      expect(res.body.mintResult).toBeDefined();
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

    it('Screen 10: GET /api/workflow/my-badges returns minted and issued credentials for licensee', async () => {
      const res = await request(app)
        .get('/api/workflow/my-badges')
        .set('Authorization', `Bearer ${partnerTokenA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.badges)).toBe(true);
      expect(res.body.badges.length).toBeGreaterThanOrEqual(1);
      const found = res.body.badges.find((b: any) => b.id === lifecycleSubId);
      expect(found).toBeDefined();
      expect(found.frameworkCode).toBe('ISO 14064-1');
      expect(found.frameworkName).toContain('Corporate Greenhouse Gas');
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
});
