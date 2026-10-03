import request from 'supertest';
import { PrismaClient, IsoReadinessStatus, Vertical, EvidenceCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();
const app = createApp();

describe('Lead Auditor Submissions Queue & Gate 1 Statutory Review Engine', () => {
  let licenseeA: any;
  let licenseeB: any;
  let partnerUserA: any;
  let partnerUserB: any;
  let adminUser: any;
  let tokenA: string;
  let tokenB: string;
  let tokenAdmin: string;
  let submissionA: any;
  let submissionB: any;

  beforeAll(async () => {
    // 1. Clean test DB in correct foreign key dependency order
    await prisma.auditEvidenceDocument.deleteMany();
    await prisma.isoReadinessSubmission.deleteMany();
    await prisma.splitConfigHistory.deleteMany();
    await prisma.charityAllocation.deleteMany();
    await prisma.financialSplit.deleteMany();
    await prisma.triggerEvent.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.jobCreationReport.deleteMany();
    await prisma.telemetryLog.deleteMany();
    await prisma.assetCalibrationRecord.deleteMany();
    await prisma.portalUser.deleteMany();
    await prisma.licensee.deleteMany();

    const passwordHash = await bcrypt.hash('SecureAuditPass123!', 10);

    // 2. Seed Licensees
    licenseeA = await prisma.licensee.create({
      data: {
        id: 'lic_audit_client_alpha',
        name: 'Alpha Hydrogen Storage plc',
        vertical: Vertical.B2B_CLEAN_TECH,
        royaltyBps: 8500,
        stripeConnectedAccountId: 'acct_test_alpha',
      },
    });

    licenseeB = await prisma.licensee.create({
      data: {
        id: 'lic_audit_client_beta',
        name: 'Beta Concrete Decarbonisation Ltd',
        vertical: Vertical.B2B_HEAVY_MANUFACTURING,
        royaltyBps: 8500,
        stripeConnectedAccountId: 'acct_test_beta',
      },
    });

    // 3. Seed Users
    partnerUserA = await prisma.portalUser.create({
      data: {
        email: 'esg.lead@alpha-h2.com',
        passwordHash,
        licenseeId: licenseeA.id,
        role: 'PARTNER',
      },
    });

    partnerUserB = await prisma.portalUser.create({
      data: {
        email: 'compliance@beta-concrete.co.uk',
        passwordHash,
        licenseeId: licenseeB.id,
        role: 'PARTNER',
      },
    });

    adminUser = await prisma.portalUser.create({
      data: {
        email: 'lead.auditor@iso-accredited.org',
        passwordHash,
        role: 'ADMIN',
      },
    });

    tokenA = jwt.sign({ userId: partnerUserA.id, licenseeId: licenseeA.id, role: 'PARTNER' }, JWT_SECRET);
    tokenB = jwt.sign({ userId: partnerUserB.id, licenseeId: licenseeB.id, role: 'PARTNER' }, JWT_SECRET);
    tokenAdmin = jwt.sign({ userId: adminUser.id, role: 'ADMIN' }, JWT_SECRET);

    // 4. Seed Submissions
    submissionA = await prisma.isoReadinessSubmission.create({
      data: {
        id: 'sub_test_alpha_001',
        licenseeId: licenseeA.id,
        tierSelected: 'TIER_1_READINESS',
        selectedFrameworks: ['ISO_14064_1', 'ISO_50001', 'UK_SECR'],
        complianceScore: 82,
        status: IsoReadinessStatus.SUBMITTED,
        answers: [
          {
            questionId: 'S1-Q1',
            questionText: 'Context of the organisation documented?',
            answer: 'Fully compliant and verified by internal audit team.',
            isoClause: 'ISO 14001:2015 Clause 4.1',
          },
          {
            questionId: 'S1-Q2',
            questionText: 'Boundary scope documented?',
            answer: 'Scope document approved by board of directors.',
            isoClause: 'ISO 14001:2015 Clause 4.3',
          },
        ],
      },
    });

    submissionB = await prisma.isoReadinessSubmission.create({
      data: {
        id: 'sub_test_beta_002',
        licenseeId: licenseeB.id,
        tierSelected: 'TIER_2_CONTINUOUS',
        selectedFrameworks: ['ISO_14064_1', 'EU_CSRD'],
        complianceScore: 65,
        status: IsoReadinessStatus.REVISION_REQUIRED,
        reviewerNotes: 'Missing calibration records for cement kiln telemetry sensors.',
        answers: [
          {
            questionId: 'S1-Q1',
            questionText: 'Context of the organisation documented?',
            answer: 'Partially documented.',
            isoClause: 'ISO 14001:2015 Clause 4.1',
          },
        ],
      },
    });

    // 5. Seed Evidence Documents for Licensee A
    await prisma.auditEvidenceDocument.create({
      data: {
        licenseeId: licenseeA.id,
        fileName: 'alpha_ems_manual_2026.pdf',
        category: EvidenceCategory.CALIBRATION_CERTIFICATE,
        fileUrl: 'https://storage.example.com/alpha_ems.pdf',
        fileSizeBytes: 2048500,
        mimeType: 'application/pdf',
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        uploadedBy: partnerUserA.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.auditEvidenceDocument.deleteMany();
    await prisma.isoReadinessSubmission.deleteMany();
    await prisma.splitConfigHistory.deleteMany();
    await prisma.charityAllocation.deleteMany();
    await prisma.financialSplit.deleteMany();
    await prisma.triggerEvent.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.jobCreationReport.deleteMany();
    await prisma.telemetryLog.deleteMany();
    await prisma.assetCalibrationRecord.deleteMany();
    await prisma.portalUser.deleteMany();
    await prisma.licensee.deleteMany();
    await prisma.$disconnect();
  });

  describe('1. Access Control on Lead Auditor Queue', () => {
    it('returns 401 Unauthorized if no JWT token provided', async () => {
      const res = await request(app).get('/api/admin/iso-submissions');
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden if non-admin partner calls the review queue', async () => {
      const res = await request(app)
        .get('/api/admin/iso-submissions')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Lead Auditor access required/i);
    });

    it('returns 200 and paginated submissions for Admin', async () => {
      const res = await request(app)
        .get('/api/admin/iso-submissions')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('filters review queue by status correctly', async () => {
      const res = await request(app)
        .get('/api/admin/iso-submissions?status=SUBMITTED')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(res.body.items.every((item: any) => item.status === 'SUBMITTED')).toBe(true);
    });

    it('filters review queue by licensee search name correctly', async () => {
      const res = await request(app)
        .get('/api/admin/iso-submissions?search=Alpha')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].licenseeName).toContain('Alpha');
    });
  });

  describe('2. Single Submission Dossier & Cryptographic Evidence Retrieval', () => {
    it('returns 403 Forbidden if non-admin requests dossier', async () => {
      const res = await request(app)
        .get(`/api/admin/iso-submissions/${submissionA.id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent submission id', async () => {
      const res = await request(app)
        .get('/api/admin/iso-submissions/sub_non_existent')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(404);
    });

    it('returns full submission dossier and evidence documents for Admin', async () => {
      const res = await request(app)
        .get(`/api/admin/iso-submissions/${submissionA.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.submission).toBeDefined();
      expect(res.body.submission.id).toBe(submissionA.id);
      expect(Array.isArray(res.body.evidenceDocuments)).toBe(true);
      expect(res.body.evidenceDocuments.length).toBe(1);
      expect(res.body.evidenceDocuments[0].fileName).toBe('alpha_ems_manual_2026.pdf');
      expect(res.body.evidenceDocuments[0].sha256Hash).toBeDefined();
    });
  });

  describe('3. Pluggable Lead Auditor Review & Gate 1 Authorization', () => {
    it('allows Lead Auditor to Approve submission as AUDIT_READY and clears Gate 1', async () => {
      const res = await request(app)
        .post('/api/iso-readiness/review')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          submissionId: submissionA.id,
          decision: 'APPROVE',
          complianceScore: 94,
          auditorNotes: 'ISO 19011:2026 Annex A remote verification completed. 94% statutory conformance confirmed.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe(IsoReadinessStatus.AUDIT_READY);
      expect(res.body.submission.complianceScore).toBe(94);
      expect(res.body.submission.reviewerNotes).toContain('94% statutory conformance confirmed');

      // Verify DB persistence
      const subFromDb = await prisma.isoReadinessSubmission.findUnique({ where: { id: submissionA.id } });
      expect(subFromDb?.status).toBe(IsoReadinessStatus.AUDIT_READY);
      expect(subFromDb?.auditReadyAt).not.toBeNull();
    });

    it('allows Lead Auditor to Reject and demand revisions with clear findings', async () => {
      const res = await request(app)
        .post('/api/iso-readiness/review')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          submissionId: submissionA.id,
          decision: 'REQUIRE_REVISION',
          complianceScore: 60,
          auditorNotes: 'Section 4.1 external context register requires annual board revision. Re-upload before Gate 1 approval.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe(IsoReadinessStatus.REVISION_REQUIRED);
      expect(res.body.submission.complianceScore).toBe(60);

      // Verify DB persistence
      const subFromDb = await prisma.isoReadinessSubmission.findUnique({ where: { id: submissionA.id } });
      expect(subFromDb?.status).toBe(IsoReadinessStatus.REVISION_REQUIRED);
    });

    it('enforces Gate 1 checkout rejection when submission is in REVISION_REQUIRED state', async () => {
      const res = await request(app)
        .post('/api/iso-readiness/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          submissionId: submissionA.id,
          tierSelected: 'TIER_1_READINESS',
          successUrl: 'https://client.example/success',
          cancelUrl: 'https://client.example/cancel',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('AUDIT_NOT_READY');
    });
  });
});
