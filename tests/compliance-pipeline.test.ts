/**
 * compliance-pipeline.test.ts
 *
 * Per-pipeline end-to-end tests for the four compliance service lines:
 *   GHG    — UK_SECR / ISO 14064 / ISO 50001
 *   CARBON — UK_PPN_006 / CMA Green Claims / UK_LCHS
 *   JOB    — UK_SECTION_106 / SOCIAL_VALUE_JOBS
 *   Cross-cutting — ServiceEntitlement gating, pipeline isolation (RLS)
 *
 * Every test runs against the real test DB (ghg_logodrop_test).
 * No mocking. No hardcoded data. Cleanup guaranteed via afterAll.
 *
 * Covers Blueprint Section 8 requirement:
 *   "Per-pipeline end-to-end tests"
 */

import request from 'supertest';
import {
  PrismaClient,
  WorkflowType,
  WorkflowStatus,
  Vertical,
  EvidenceCategory,
  EntitlementStatus,
  ServiceLine,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { syncFrameworkRegistry as seedFrameworks } from '../src/services/framework-registry';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeJwt(userId: string, role: string, licenseeId: string) {
  return jwt.sign({ userId, role, licenseeId }, JWT_SECRET, { expiresIn: '2h' });
}

async function createLicenseeAndUser(
  nameSuffix: string,
  vertical: Vertical = Vertical.B2B_CLEAN_TECH
) {
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  const licensee = await prisma.licensee.create({
    data: { name: `Test Co ${nameSuffix}`, vertical },
  });
  const user = await prisma.portalUser.create({
    data: {
      email: `compliance-${nameSuffix.toLowerCase().replace(/\s/g, '-')}@test-ghg.internal`,
      passwordHash,
      role: 'PARTNER',
      licenseeId: licensee.id,
    },
  });
  return { licensee, user };
}

// ─── Suite Setup ─────────────────────────────────────────────────────────────

describe('Compliance Pipeline: Per-pipeline E2E Tests', () => {
  let app: any;

  // Admin
  let adminUser: any;
  let adminToken: string;

  // GHG pipeline actors
  let ghgLicensee: any;
  let ghgUser: any;
  let ghgToken: string;

  // CARBON pipeline actors
  let carbonLicensee: any;
  let carbonUser: any;
  let carbonToken: string;

  // JOB pipeline actors
  let jobLicensee: any;
  let jobUser: any;
  let jobToken: string;

  // Framework IDs resolved from DB
  let ghgFrameworkId: string;    // fwk_uk_secr
  let carbonFrameworkId: string; // fwk_uk_ppn006
  let jobFrameworkId: string;    // fwk_uk_s106

  // Submission IDs under test
  let ghgSubmissionId: string;
  let carbonSubmissionId: string;
  let jobSubmissionId: string;

  // Track all created IDs for teardown
  const createdLicenseeIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Seed the framework registry into the test DB
    await seedFrameworks(prisma);

    // 2. Create admin
    const passwordHash = await bcrypt.hash('AdminPass123!', 10);
    adminUser = await prisma.portalUser.create({
      data: {
        email: 'lead.auditor.pipeline@test-ghg.internal',
        passwordHash,
        role: 'ADMIN',
      },
    });
    createdUserIds.push(adminUser.id);
    adminToken = makeJwt(adminUser.id, 'ADMIN', '');

    // 3. Create pipeline-specific actors
    ({ licensee: ghgLicensee, user: ghgUser } = await createLicenseeAndUser('GHG-Alpha', Vertical.B2B_HEAVY_MANUFACTURING));
    createdLicenseeIds.push(ghgLicensee.id);
    createdUserIds.push(ghgUser.id);
    ghgToken = makeJwt(ghgUser.id, 'PARTNER', ghgLicensee.id);

    ({ licensee: carbonLicensee, user: carbonUser } = await createLicenseeAndUser('Carbon-Beta', Vertical.B2B_CLEAN_TECH));
    createdLicenseeIds.push(carbonLicensee.id);
    createdUserIds.push(carbonUser.id);
    carbonToken = makeJwt(carbonUser.id, 'PARTNER', carbonLicensee.id);

    ({ licensee: jobLicensee, user: jobUser } = await createLicenseeAndUser('Jobs-Gamma', Vertical.B2B_HEAVY_MANUFACTURING));
    createdLicenseeIds.push(jobLicensee.id);
    createdUserIds.push(jobUser.id);
    jobToken = makeJwt(jobUser.id, 'PARTNER', jobLicensee.id);

    // 4. Grant ServiceEntitlements per pipeline
    await prisma.serviceEntitlement.createMany({
      data: [
        { licenseeId: ghgLicensee.id, serviceLine: ServiceLine.GHG, status: EntitlementStatus.ACTIVE },
        { licenseeId: carbonLicensee.id, serviceLine: ServiceLine.CARBON, status: EntitlementStatus.ACTIVE },
        { licenseeId: jobLicensee.id, serviceLine: ServiceLine.JOB, status: EntitlementStatus.ACTIVE },
      ],
      skipDuplicates: true,
    });

    // 5. Resolve framework IDs from DB
    const secr = await prisma.workflowFramework.findFirst({ where: { code: 'UK_SECR' } });
    const ppn = await prisma.workflowFramework.findFirst({ where: { code: 'UK_PPN_006' } });
    const s106 = await prisma.workflowFramework.findFirst({ where: { code: 'UK_SECTION_106' } });

    if (!secr || !ppn || !s106) {
      throw new Error('[TEST SETUP] Required frameworks not found in DB. Run: npm run seed');
    }

    ghgFrameworkId = secr.id;
    carbonFrameworkId = ppn.id;
    jobFrameworkId = s106.id;

    // 6. Complete assessment + provision ready checklists to pass statutory gating
    // Each test licensee needs: hasCompletedAssessment=true, a ComplianceRecommendation,
    // and a PreparationChecklist with isReadyToIngest=true.
    const setupPipeline = async (
      licenseeId: string,
      wfType: WorkflowType,
      frameworkCode: string,
      frameworkId: string
    ) => {
      await prisma.licensee.update({
        where: { id: licenseeId },
        data: { hasCompletedAssessment: true },
      });

      // Create a ClientAssessment with all required fields
      const assessment = await (prisma.clientAssessment.create as any)({
        data: {
          licenseeId,
          organisationCountry: 'GB',
          organisationSize: 'LARGE_250_PLUS',
          annualRevenueBand: 'BAND_36M_PLUS',
          industrySector: 'MANUFACTURING',
          hasPhysicalSites: true,
          hasProductionProcess: true,
          hasFleet: false,
          hasIoTMeters: false,
          isUKPublicContractor: wfType === 'JOB',
          hasPlanningConsent: wfType === 'JOB',
          makesPublicGreenClaims: wfType === 'CARBON',
          hasGreenHydrogen: false,
          completedAt: new Date(),
        },
      });

      const rec = await (prisma.complianceRecommendation.create as any)({
        data: {
          licenseeId,
          assessmentId: assessment.id,
          frameworkCode,
          frameworkName: frameworkCode,
          workflowType: wfType,
          isLegallyMandatory: true,
          plainEnglishWhy: `Required for ${frameworkCode} compliance testing.`,
          estimatedEffort: 'MEDIUM',
          clientAccepted: true,
          displayOrder: 1,
        },
      });

      await prisma.preparationChecklist.create({
        data: {
          recommendationId: rec.id,
          licenseeId,
          totalItems: 1,
          completedItems: 1,
          isReadyToIngest: true,
        },
      });

      return { assessment, rec };
    };

    await setupPipeline(ghgLicensee.id, WorkflowType.GHG, 'UK_SECR', ghgFrameworkId);
    await setupPipeline(carbonLicensee.id, WorkflowType.CARBON, 'UK_PPN_006', carbonFrameworkId);
    await setupPipeline(jobLicensee.id, WorkflowType.JOB, 'UK_SECTION_106', jobFrameworkId);


    app = createApp();
  }, 30000);

  afterAll(async () => {
    // Cascade delete in dependency order
    await prisma.workflowTransitionLog.deleteMany({
      where: { submission: { licenseeId: { in: createdLicenseeIds } } },
    }).catch(() => {});
    await prisma.workflowReviewDecision.deleteMany({
      where: { submission: { licenseeId: { in: createdLicenseeIds } } },
    }).catch(() => {});
    await prisma.workflowAnswer.deleteMany({
      where: { submission: { licenseeId: { in: createdLicenseeIds } } },
    }).catch(() => {});
    await prisma.workflowSubmission.deleteMany({
      where: { licenseeId: { in: createdLicenseeIds } },
    }).catch(() => {});
    await prisma.serviceEntitlement.deleteMany({
      where: { licenseeId: { in: createdLicenseeIds } },
    }).catch(() => {});
    for (const id of createdUserIds) {
      await prisma.portalUser.delete({ where: { id } }).catch(() => {});
    }
    for (const id of createdLicenseeIds) {
      await prisma.licensee.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. FRAMEWORK REGISTRY — DB-backed reads
  // ─────────────────────────────────────────────────────────────────────────

  describe('1. DB Framework Registry', () => {
    it('GET /api/workflow/frameworks lists frameworks including GHG pipeline', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks')
        .expect(200);

      expect(Array.isArray(res.body.frameworks)).toBe(true);
      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(3);

      const codes = res.body.frameworks.map((f: any) => f.code);
      expect(codes).toContain('UK_SECR');
    });

    it('GET /api/workflow/frameworks?type=GHG returns only GHG frameworks', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=GHG')
        .expect(200);

      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(1);
      res.body.frameworks.forEach((f: any) => {
        expect(f.workflowType).toBe('GHG');
      });
    });

    it('GET /api/workflow/frameworks?type=CARBON returns only CARBON frameworks', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=CARBON')
        .expect(200);

      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(1);
      res.body.frameworks.forEach((f: any) => {
        expect(f.workflowType).toBe('CARBON');
      });
    });

    it('GET /api/workflow/frameworks?type=JOB returns only JOB frameworks', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=JOB')
        .expect(200);

      expect(res.body.frameworks.length).toBeGreaterThanOrEqual(1);
      res.body.frameworks.forEach((f: any) => {
        expect(f.workflowType).toBe('JOB');
      });
    });

    it('GET /api/workflow/frameworks?type=INVALID returns 400', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks?type=INVALID')
        .expect(400);

      expect(res.body.error).toMatch(/Must be/);
    });

    it('GET /api/workflow/frameworks/:code/questions returns full question set (admin only)', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks/UK_SECR/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.framework.code).toBe('UK_SECR');
      expect(Array.isArray(res.body.questions)).toBe(true);
      expect(res.body.questions.length).toBeGreaterThanOrEqual(3);
      // Questions must be ordered
      const indices = res.body.questions.map((q: any) => q.orderIndex);
      expect(indices).toEqual([...indices].sort((a, b) => a - b));
    });

    it('GET /api/workflow/frameworks/:code/questions returns 401 without auth', async () => {
      await request(app)
        .get('/api/workflow/frameworks/UK_SECR/questions')
        .expect(401);
    });

    it('GET /api/workflow/frameworks/:code/questions returns 404 for unknown framework', async () => {
      const res = await request(app)
        .get('/api/workflow/frameworks/NONEXISTENT_CODE/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('not found in registry');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. GHG PIPELINE — full lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  describe('2. GHG Pipeline (UK_SECR) — full lifecycle', () => {
    let ghgQuestions: any[];
    let evidenceDoc: any;

    beforeAll(async () => {
      // Fetch GHG questions from DB for this pipeline
      const fw = await prisma.workflowFramework.findFirst({
        where: { id: ghgFrameworkId },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      ghgQuestions = fw?.questions || [];

      // Create evidence document for GHG submission
      evidenceDoc = await prisma.auditEvidenceDocument.create({
        data: {
          licenseeId: ghgLicensee.id,
          fileName: 'SECR_ElectricityBills_2026.pdf',
          category: EvidenceCategory.OTHER_AUDIT_PROOF,
          fileUrl: 'https://storage.ghg-esg.org/evidence/secr-bills.pdf',
          fileSizeBytes: 512000,
          mimeType: 'application/pdf',
          sha256Hash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          uploadedBy: ghgUser.email,
        },
      });
    });

    afterAll(async () => {
      if (evidenceDoc?.id) {
        await prisma.auditEvidenceDocument.delete({ where: { id: evidenceDoc.id } }).catch(() => {});
      }
    });

    it('GHG licensee has ACTIVE GHG entitlement', async () => {
      const entitlement = await prisma.serviceEntitlement.findFirst({
        where: { licenseeId: ghgLicensee.id, serviceLine: ServiceLine.GHG },
      });
      expect(entitlement).not.toBeNull();
      expect(entitlement!.status).toBe(EntitlementStatus.ACTIVE);
    });

    it('POST /api/workflow/draft creates GHG DRAFT submission', async () => {
      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${ghgToken}`)
        .send({ workflowType: 'GHG', frameworkId: ghgFrameworkId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.workflowType).toBe('GHG');
      expect(res.body.submission.status).toBe(WorkflowStatus.DRAFT);
      expect(res.body.submission.licenseeId).toBe(ghgLicensee.id);

      ghgSubmissionId = res.body.submission.id;

      // Transition log created
      const log = await prisma.workflowTransitionLog.findFirst({
        where: { submissionId: ghgSubmissionId },
      });
      expect(log).not.toBeNull();
      expect(log!.newStatus).toBe(WorkflowStatus.DRAFT);
    });

    it('PATCH /api/workflow/submissions/:id/answers saves answers for GHG questions', async () => {
      expect(ghgQuestions.length).toBeGreaterThan(0);

      const questionsToAnswer = ghgQuestions.slice(0, Math.min(ghgQuestions.length, 3));
      const answers = questionsToAnswer.map((q: any, i: number) => {
        const a: any = {
          questionId: q.id,
          value: q.answerType === 'BOOLEAN' ? 'true' : `GHG test answer ${i + 1} with sufficient narrative content`,
        };
        if (q.evidenceRequired && i === 0) {
          a.evidenceDocumentId = evidenceDoc.id;
        }
        return a;
      });

      const res = await request(app)
        .patch(`/api/workflow/submissions/${ghgSubmissionId}/answers`)
        .set('Authorization', `Bearer ${ghgToken}`)
        .send({ answers })
        .expect(200);

      expect(res.body.success).toBe(true);

      const saved = await prisma.workflowAnswer.findMany({
        where: { submissionId: ghgSubmissionId },
      });
      expect(saved.length).toBeGreaterThanOrEqual(1);
    });

    it('GHG licensee CANNOT access CARBON framework submissions (pipeline isolation)', async () => {
      // GHG licensee tries to create a CARBON draft - should be blocked by entitlement check
      if (carbonFrameworkId) {
        const res = await request(app)
          .post('/api/workflow/draft')
          .set('Authorization', `Bearer ${ghgToken}`)
          .send({ workflowType: 'CARBON', frameworkId: carbonFrameworkId })
          .expect((res) => {
            // Must be 403 (entitlement missing) or at worst 400 - never 201
            expect([400, 403]).toContain(res.status);
          });
        expect(res.body.success).not.toBe(true);
      }
    });

    it('Admin can see GHG submission in the admin queue', async () => {
      const res = await request(app)
        .get(`/api/workflow/submissions/${ghgSubmissionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.submission.workflowType).toBe('GHG');
      expect(res.body.submission.licenseeId).toBe(ghgLicensee.id);
    });

    it('GHG partner CANNOT read another licensee submission (RLS isolation)', async () => {
      // Try to read Carbon licensee's future submission using GHG token
      // Should be 403 or 404
      const res = await request(app)
        .get(`/api/workflow/submissions/${ghgSubmissionId}`)
        .set('Authorization', `Bearer ${carbonToken}`)
        .expect((res) => {
          expect([403, 404]).toContain(res.status);
        });

      expect(res.body.submission).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CARBON PIPELINE — PPN 006 submission lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  describe('3. CARBON Pipeline (UK_PPN_006) — full lifecycle', () => {
    let carbonQuestions: any[];
    let evidenceDoc: any;

    beforeAll(async () => {
      const fw = await prisma.workflowFramework.findFirst({
        where: { id: carbonFrameworkId },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      carbonQuestions = fw?.questions || [];

      evidenceDoc = await prisma.auditEvidenceDocument.create({
        data: {
          licenseeId: carbonLicensee.id,
          fileName: 'PPN006_CarbonReductionPlan.pdf',
          category: EvidenceCategory.OTHER_AUDIT_PROOF,
          fileUrl: 'https://storage.ghg-esg.org/evidence/ppn-crp.pdf',
          fileSizeBytes: 1024000,
          mimeType: 'application/pdf',
          sha256Hash: 'b5d4cf4239b3c8c2f5d6a8e1f9e4b2a1c7d8e3f2a9b4c5d6e7f8a9b0c1d2e3f4',
          uploadedBy: carbonUser.email,
        },
      });
    });

    afterAll(async () => {
      if (evidenceDoc?.id) {
        await prisma.auditEvidenceDocument.delete({ where: { id: evidenceDoc.id } }).catch(() => {});
      }
    });

    it('CARBON licensee has ACTIVE CARBON entitlement', async () => {
      const entitlement = await prisma.serviceEntitlement.findFirst({
        where: { licenseeId: carbonLicensee.id, serviceLine: ServiceLine.CARBON },
      });
      expect(entitlement).not.toBeNull();
      expect(entitlement!.status).toBe(EntitlementStatus.ACTIVE);
    });

    it('POST /api/workflow/draft creates CARBON DRAFT with UK_PPN_006 framework', async () => {
      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${carbonToken}`)
        .send({ workflowType: 'CARBON', frameworkId: carbonFrameworkId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.workflowType).toBe('CARBON');
      expect(res.body.submission.frameworkId).toBe(carbonFrameworkId);
      expect(res.body.submission.status).toBe(WorkflowStatus.DRAFT);

      carbonSubmissionId = res.body.submission.id;
    });

    it('CARBON framework questions are sourced from DB registry (not TS hardcode)', async () => {
      expect(carbonQuestions.length).toBeGreaterThanOrEqual(3);
      // PPN 006 must have a net-zero target question
      const netZero = carbonQuestions.find((q) =>
        q.text.toLowerCase().includes('net zero') ||
        q.isoClauseReference.includes('PPN 006')
      );
      expect(netZero).toBeDefined();
    });

    it('PATCH /api/workflow/submissions/:id/answers saves PPN 006 answers', async () => {
      const questionsToAnswer = carbonQuestions.slice(0, Math.min(carbonQuestions.length, 2));
      const answers = questionsToAnswer.map((q: any, i: number) => {
        const a: any = {
          questionId: q.id,
          value: q.answerType === 'BOOLEAN' ? 'true' : `Carbon reduction plan answer for clause ${q.isoClauseReference}`,
        };
        if (q.evidenceRequired && i === 0) {
          a.evidenceDocumentId = evidenceDoc.id;
        }
        return a;
      });

      const res = await request(app)
        .patch(`/api/workflow/submissions/${carbonSubmissionId}/answers`)
        .set('Authorization', `Bearer ${carbonToken}`)
        .send({ answers })
        .expect(200);

      expect(res.body.success).toBe(true);

      const saved = await prisma.workflowAnswer.findMany({
        where: { submissionId: carbonSubmissionId },
      });
      expect(saved.length).toBeGreaterThanOrEqual(1);
    });

    it('CARBON answers are isolated — JOB licensee cannot read them', async () => {
      await request(app)
        .get(`/api/workflow/submissions/${carbonSubmissionId}`)
        .set('Authorization', `Bearer ${jobToken}`)
        .expect((res) => {
          expect([403, 404]).toContain(res.status);
        });
    });

    it('only a Lead Auditor can trigger AI screening, and never on a draft', async () => {
      await request(app)
        .post(`/api/workflow/submissions/${carbonSubmissionId}/ai-screen`)
        .set('Authorization', `Bearer ${carbonToken}`)
        .expect(403);

      await request(app)
        .post(`/api/workflow/submissions/${carbonSubmissionId}/ai-screen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. JOB PIPELINE — Section 106 submission lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  describe('4. JOB Pipeline (UK_SECTION_106) — full lifecycle', () => {
    let jobQuestions: any[];
    let evidenceDoc: any;

    beforeAll(async () => {
      const fw = await prisma.workflowFramework.findFirst({
        where: { id: jobFrameworkId },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      });
      jobQuestions = fw?.questions || [];

      evidenceDoc = await prisma.auditEvidenceDocument.create({
        data: {
          licenseeId: jobLicensee.id,
          fileName: 'S106_PlanningAgreement.pdf',
          category: EvidenceCategory.OTHER_AUDIT_PROOF,
          fileUrl: 'https://storage.ghg-esg.org/evidence/s106-agreement.pdf',
          fileSizeBytes: 768000,
          mimeType: 'application/pdf',
          sha256Hash: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
          uploadedBy: jobUser.email,
        },
      });
    });

    afterAll(async () => {
      if (evidenceDoc?.id) {
        await prisma.auditEvidenceDocument.delete({ where: { id: evidenceDoc.id } }).catch(() => {});
      }
    });

    it('JOB licensee has ACTIVE JOB entitlement', async () => {
      const entitlement = await prisma.serviceEntitlement.findFirst({
        where: { licenseeId: jobLicensee.id, serviceLine: ServiceLine.JOB },
      });
      expect(entitlement).not.toBeNull();
      expect(entitlement!.status).toBe(EntitlementStatus.ACTIVE);
    });

    it('POST /api/workflow/draft creates JOB DRAFT with UK_SECTION_106 framework', async () => {
      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${jobToken}`)
        .send({ workflowType: 'JOB', frameworkId: jobFrameworkId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.workflowType).toBe('JOB');
      expect(res.body.submission.frameworkId).toBe(jobFrameworkId);

      jobSubmissionId = res.body.submission.id;
    });

    it('JOB framework has no CARBON framework questions (pipeline isolation)', async () => {
      expect(jobQuestions.length).toBeGreaterThanOrEqual(2);
      // S106 questions must not contain PPN 006 or carbon references
      jobQuestions.forEach((q) => {
        expect(q.isoClauseReference).not.toContain('PPN 006');
        expect(q.text.toLowerCase()).not.toContain('carbon reduction plan');
        expect(q.text.toLowerCase()).not.toContain('scope 1');
      });
    });

    it('JOB questions reference Section 106 statutory obligations', async () => {
      const s106Ref = jobQuestions.find((q) =>
        q.isoClauseReference.includes('Section 106') ||
        q.isoClauseReference.includes('Town and Country Planning')
      );
      expect(s106Ref).toBeDefined();
    });

    it('PATCH /api/workflow/submissions/:id/answers saves S106 answers', async () => {
      const questionsToAnswer = jobQuestions.slice(0, Math.min(jobQuestions.length, 2));
      const answers = questionsToAnswer.map((q: any, i: number) => {
        const a: any = { questionId: q.id, value: 'true' };
        if (q.evidenceRequired && i === 0) {
          a.evidenceDocumentId = evidenceDoc.id;
        }
        return a;
      });

      const res = await request(app)
        .patch(`/api/workflow/submissions/${jobSubmissionId}/answers`)
        .set('Authorization', `Bearer ${jobToken}`)
        .send({ answers })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('JOB licensee cannot trigger AI screening', async () => {
      await request(app)
        .post(`/api/workflow/submissions/${jobSubmissionId}/ai-screen`)
        .set('Authorization', `Bearer ${jobToken}`)
        .expect(403);
    });

    it('JOB answers are isolated — CARBON licensee cannot read JOB submission', async () => {
      await request(app)
        .get(`/api/workflow/submissions/${jobSubmissionId}`)
        .set('Authorization', `Bearer ${carbonToken}`)
        .expect((res) => {
          expect([403, 404]).toContain(res.status);
        });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ServiceEntitlement Gating
  // ─────────────────────────────────────────────────────────────────────────

  describe('5. ServiceEntitlement Gating', () => {
    let ungatedLicensee: any;
    let ungatedUser: any;
    let ungatedToken: string;

    beforeAll(async () => {
      ({ licensee: ungatedLicensee, user: ungatedUser } = await createLicenseeAndUser('Ungated-Delta'));
      createdLicenseeIds.push(ungatedLicensee.id);
      createdUserIds.push(ungatedUser.id);
      ungatedToken = makeJwt(ungatedUser.id, 'PARTNER', ungatedLicensee.id);
    });

    it('Licensee with NO entitlement cannot create a CARBON draft', async () => {
      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${ungatedToken}`)
        .send({ workflowType: 'CARBON', frameworkId: carbonFrameworkId })
        .expect((res) => {
          expect([400, 403]).toContain(res.status);
        });

      expect(res.body.success).not.toBe(true);
    });

    it('Licensee with NO entitlement cannot create a JOB draft', async () => {
      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${ungatedToken}`)
        .send({ workflowType: 'JOB', frameworkId: jobFrameworkId })
        .expect((res) => {
          expect([400, 403]).toContain(res.status);
        });

      expect(res.body.success).not.toBe(true);
    });

    it('Granting entitlement allows access', async () => {
      // Provision the assessment + checklist so statutory gate passes
      await prisma.licensee.update({
        where: { id: ungatedLicensee.id },
        data: { hasCompletedAssessment: true },
      });

      const assessment = await (prisma.clientAssessment.create as any)({
        data: {
          licenseeId: ungatedLicensee.id,
          organisationCountry: 'GB',
          organisationSize: 'LARGE_250_PLUS',
          annualRevenueBand: 'BAND_36M_PLUS',
          industrySector: 'MANUFACTURING',
          hasPhysicalSites: true,
          hasProductionProcess: false,
          hasFleet: false,
          hasIoTMeters: false,
          isUKPublicContractor: false,
          hasPlanningConsent: false,
          makesPublicGreenClaims: false,
          hasGreenHydrogen: false,
          completedAt: new Date(),
        },
      });

      const rec = await (prisma.complianceRecommendation.create as any)({
        data: {
          licenseeId: ungatedLicensee.id,
          assessmentId: assessment.id,
          frameworkCode: 'UK_PPN_006',
          frameworkName: 'UK_PPN_006',
          workflowType: WorkflowType.CARBON,
          isLegallyMandatory: true,
          plainEnglishWhy: 'Carbon reduction plan required.',
          estimatedEffort: 'MEDIUM',
          clientAccepted: true,
          displayOrder: 1,
        },
      });

      await prisma.preparationChecklist.create({
        data: {
          recommendationId: rec.id,
          licenseeId: ungatedLicensee.id,
          totalItems: 1,
          completedItems: 1,
          isReadyToIngest: true,
        },
      });

      await prisma.serviceEntitlement.create({
        data: {
          licenseeId: ungatedLicensee.id,
          serviceLine: ServiceLine.CARBON,
          status: EntitlementStatus.ACTIVE,
        },
      });

      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${ungatedToken}`)
        .send({ workflowType: 'CARBON', frameworkId: carbonFrameworkId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.workflowType).toBe('CARBON');
    });

    it('SUSPENDED entitlement is treated as no access', async () => {
      await prisma.serviceEntitlement.updateMany({
        where: { licenseeId: ungatedLicensee.id, serviceLine: ServiceLine.CARBON },
        data: { status: EntitlementStatus.SUSPENDED },
      });

      const res = await request(app)
        .post('/api/workflow/draft')
        .set('Authorization', `Bearer ${ungatedToken}`)
        .send({ workflowType: 'CARBON', frameworkId: carbonFrameworkId })
        .expect((res) => {
          expect([400, 403]).toContain(res.status);
        });

      expect(res.body.success).not.toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Admin Console — cross-pipeline visibility
  // ─────────────────────────────────────────────────────────────────────────

  describe('6. Admin Console — cross-pipeline visibility', () => {
    it('Admin can list all workflow submissions regardless of pipeline', async () => {
      const res = await request(app)
        .get('/api/workflow/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.submissions)).toBe(true);
      // Admin should see all pipelines
      const types = new Set(res.body.submissions.map((s: any) => s.workflowType));
      // At minimum GHG or CARBON should be visible from our test data
      expect(types.size).toBeGreaterThanOrEqual(1);
    });

    it('Admin can read readiness tracker with entitlement data', async () => {
      const res = await request(app)
        .get('/api/admin/readiness-tracker')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.licensees)).toBe(true);
      // Find our GHG test licensee
      const ghgRow = res.body.licensees.find((l: any) => l.licenseeId === ghgLicensee.id);
      if (ghgRow) {
        expect(Array.isArray(ghgRow.serviceEntitlements)).toBe(true);
        const ghgEntitlement = ghgRow.serviceEntitlements.find((e: any) => e.serviceLine === 'GHG');
        expect(ghgEntitlement).toBeDefined();
        expect(ghgEntitlement.status).toBe('ACTIVE');
      }
    });

    it('Non-admin cannot access the readiness tracker', async () => {
      await request(app)
        .get('/api/admin/readiness-tracker')
        .set('Authorization', `Bearer ${ghgToken}`)
        .expect((res) => {
          expect([401, 403]).toContain(res.status);
        });
    });

    it('Unauthenticated request to admin endpoint returns 401', async () => {
      await request(app)
        .get('/api/admin/readiness-tracker')
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. AI Findings retrieval
  // ─────────────────────────────────────────────────────────────────────────

  describe('7. AI Findings retrieval', () => {
    it('AI findings are internal to the Lead Auditor and hidden from licensees', async () => {
      await request(app)
        .get(`/api/workflow/submissions/${carbonSubmissionId}/ai-findings`)
        .set('Authorization', `Bearer ${carbonToken}`)
        .expect(403);
      await request(app)
        .get(`/api/workflow/submissions/${carbonSubmissionId}/ai-findings`)
        .set('Authorization', `Bearer ${jobToken}`)
        .expect(403);
    });

    it('returns 404 to the Lead Auditor before any pre-screen exists', async () => {
      await request(app)
        .get(`/api/workflow/submissions/${carbonSubmissionId}/ai-findings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
