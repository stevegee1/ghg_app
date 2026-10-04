import request from 'supertest';
import { EvidenceCategory, PrismaClient, Vertical, WorkflowStatus, WorkflowType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { seedFrameworks } from '../prisma/seeds/framework-seed';

const prisma = new PrismaClient();
const app = createApp();

describe('Lead Auditor review queue and dossier', () => {
  let licensee: any;
  let client: any;
  let admin: any;
  let clientToken: string;
  let adminToken: string;
  let evidence: any;
  let questions: any[];
  let screenedId: string;
  let submittedId: string;

  beforeAll(async () => {
    await seedFrameworks(prisma);
    const passwordHash = await bcrypt.hash('ReviewQueuePass123!', 10);
    licensee = await prisma.licensee.create({ data: { name: 'Review Queue Ltd', vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    client = await prisma.portalUser.create({ data: { email: 'client@review-queue.test', passwordHash, role: 'PARTNER', licenseeId: licensee.id } });
    admin = await prisma.portalUser.create({
      data: { email: 'auditor@review-queue.test', passwordHash, role: 'ADMIN', firstName: 'Priya', lastName: 'Nair' },
    });
    clientToken = jwt.sign({ userId: client.id, role: 'PARTNER', licenseeId: licensee.id }, JWT_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ userId: admin.id, role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });

    const framework = await prisma.workflowFramework.findUnique({
      where: { id: 'fwk_iso_14064' },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    questions = framework!.questions;
    evidence = await prisma.auditEvidenceDocument.create({
      data: {
        licenseeId: licensee.id,
        fileName: 'boundary.pdf',
        category: EvidenceCategory.OTHER_AUDIT_PROOF,
        fileUrl: '/api/evidence/boundary/file',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
        sha256Hash: 'c'.repeat(64),
        uploadedBy: client.id,
      },
    });

    const create = async (status: WorkflowStatus, submittedAt: Date, ai: boolean) =>
      prisma.workflowSubmission.create({
        data: {
          licenseeId: licensee.id,
          workflowType: WorkflowType.GHG,
          frameworkId: 'fwk_iso_14064',
          frameworkVersionId: 'fwk_iso_14064_v2026_1',
          status,
          submittedAt,
          ...(ai
            ? {
                aiScreenedAt: new Date(),
                aiReviewer: 'Rules Engine (no AI model review)',
                aiScore: 70,
                aiRecommendation: 'REQUIRE_REVISION',
                aiSummary: 'One question lacks support.',
                aiClauseFindings: [
                  { questionId: questions[0].id, status: 'INSUFFICIENT_EVIDENCE', findings: 'Boundary chart not provided.', evidenceVerified: false, confidence: 0.8 },
                ],
              }
            : {}),
          answers: {
            create: questions.map((q) => ({ questionId: q.id, value: 'true', evidenceDocumentId: evidence.id })),
          },
        },
      });

    screenedId = (await create(WorkflowStatus.AI_SCREENED, new Date('2026-09-01T09:00:00Z'), true)).id;
    submittedId = (await create(WorkflowStatus.SUBMITTED, new Date('2026-09-02T09:00:00Z'), false)).id;
  });

  afterAll(async () => {
    const ids = [screenedId, submittedId].filter(Boolean);
    await prisma.workflowTransitionLog.deleteMany({ where: { submissionId: { in: ids } } });
    await prisma.workflowReviewDecision.deleteMany({ where: { submissionId: { in: ids } } });
    await prisma.workflowAnswer.deleteMany({ where: { submissionId: { in: ids } } });
    await prisma.workflowSubmission.deleteMany({ where: { id: { in: ids } } });
    await prisma.auditEvidenceDocument.deleteMany({ where: { licenseeId: licensee?.id } });
    await prisma.portalUser.deleteMany({ where: { id: { in: [client?.id, admin?.id].filter(Boolean) } } });
    if (licensee?.id) await prisma.licensee.delete({ where: { id: licensee.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('is closed to clients', async () => {
    await request(app).get('/api/workflow/review-queue').set('Authorization', `Bearer ${clientToken}`).expect(403);
    await request(app).get(`/api/workflow/submissions/${screenedId}/review-dossier`).set('Authorization', `Bearer ${clientToken}`).expect(403);
    await request(app).get('/api/workflow/reviewer-profile').set('Authorization', `Bearer ${clientToken}`).expect(403);
  });

  it('lists submissions awaiting review, oldest first, with the AI advice summarised', async () => {
    await request(app).get('/api/workflow/review-queue?stage=bogus').set('Authorization', `Bearer ${adminToken}`).expect(400);
    const res = await request(app).get('/api/workflow/review-queue').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const ours = res.body.submissions.filter((s: any) => s.licensee.id === licensee.id);
    expect(ours.map((s: any) => s.id)).toEqual([screenedId, submittedId]);
    expect(ours[0]).toMatchObject({ status: 'AI_SCREENED', ai: { score: 70, recommendation: 'REQUIRE_REVISION' } });
    expect(ours[1].ai).toBeNull();
  });

  it('puts each answer, its evidence and the AI finding side by side', async () => {
    const res = await request(app).get(`/api/workflow/submissions/${screenedId}/review-dossier`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    const d = res.body.submission;
    expect(d).toMatchObject({ canDecide: true, canStartReview: false, canRerunAi: true, licensee: { name: 'Review Queue Ltd' } });
    expect(d.ai).toMatchObject({ score: 70, summary: 'One question lacks support.' });
    expect(d.questions).toHaveLength(questions.length);
    expect(d.questions[0]).toMatchObject({
      answer: 'true',
      evidence: { fileName: 'boundary.pdf', stored: false },
      aiFinding: { status: 'INSUFFICIENT_EVIDENCE', findings: 'Boundary chart not provided.' },
    });
    expect(d.questions[1].aiFinding).toBeNull();

    const submitted = await request(app).get(`/api/workflow/submissions/${submittedId}/review-dossier`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(submitted.body.submission).toMatchObject({ canDecide: false, canStartReview: true, ai: null });
  });

  it('signs decisions with the auditor\'s own name and remembers their accreditation', async () => {
    const before = await request(app).get('/api/workflow/reviewer-profile').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(before.body.profile).toEqual({ name: 'Priya Nair', lastAccreditation: null });

    await request(app)
      .post(`/api/workflow/submissions/${screenedId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        overallDecision: 'REJECTED',
        overallScore: 64,
        reviewerAccreditation: 'IEMA Full Member, ISO 14064-3 verifier',
        perQuestionDecisions: questions.map((q, i) =>
          i === 0 ? { questionId: q.id, accepted: false, reasonIfRejected: 'Upload the boundary chart.' } : { questionId: q.id, accepted: true }
        ),
      })
      .expect(200);

    const after = await request(app).get('/api/workflow/reviewer-profile').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(after.body.profile.lastAccreditation).toBe('IEMA Full Member, ISO 14064-3 verifier');

    const dossier = await request(app).get(`/api/workflow/submissions/${screenedId}/review-dossier`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(dossier.body.submission.review).toMatchObject({ decision: 'REJECTED', reviewerName: 'Priya Nair' });
    expect(dossier.body.submission.questions[0].previousDecision).toEqual({ accepted: false, reasonIfRejected: 'Upload the boundary chart.' });

    const decided = await request(app).get('/api/workflow/review-queue?stage=decided').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(decided.body.submissions.find((s: any) => s.id === screenedId)).toMatchObject({ status: 'REJECTED', decidedBy: 'Priya Nair' });
  });
});
