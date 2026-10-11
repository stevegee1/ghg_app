import request from 'supertest';
import { PrismaClient, Vertical, WorkflowStatus, WorkflowType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { syncFrameworkRegistry as seedFrameworks } from '../src/services/framework-registry';
import { grantPipelineAccess } from './helpers/pipelineAccess';

const prisma = new PrismaClient();
const app = createApp();

const AI_FIELDS = ['aiScreenedAt', 'aiReviewer', 'aiScore', 'aiRecommendation', 'aiSummary', 'aiClauseFindings', 'reviewerId', 'stripeSessionId'];

describe('Workflow client view: frameworks, fees, withheld AI findings and revision reasons', () => {
  let licenseeA: any;
  let licenseeB: any;
  let userA: any;
  let userB: any;
  let admin: any;
  let tokenA: string;
  let tokenB: string;
  let adminToken: string;
  let submissionId: string;
  let questionIds: string[];

  beforeAll(async () => {
    await seedFrameworks(prisma);
    const passwordHash = await bcrypt.hash('ClientViewPass123!', 10);

    licenseeA = await prisma.licensee.create({ data: { name: 'Client View Ltd', vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    licenseeB = await prisma.licensee.create({ data: { name: 'Elsewhere Ltd', vertical: Vertical.B2B_CLEAN_TECH } });
    userA = await prisma.portalUser.create({ data: { email: 'client@client-view.test', passwordHash, role: 'PARTNER', licenseeId: licenseeA.id } });
    userB = await prisma.portalUser.create({ data: { email: 'other@client-view.test', passwordHash, role: 'PARTNER', licenseeId: licenseeB.id } });
    admin = await prisma.portalUser.create({
      data: { email: 'auditor@client-view.test', passwordHash, role: 'ADMIN', firstName: 'Dana', lastName: 'Reviewer' },
    });

    tokenA = jwt.sign({ userId: userA.id, role: 'PARTNER', licenseeId: licenseeA.id }, JWT_SECRET, { expiresIn: '1h' });
    tokenB = jwt.sign({ userId: userB.id, role: 'PARTNER', licenseeId: licenseeB.id }, JWT_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ userId: admin.id, role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });

    await grantPipelineAccess(prisma, licenseeA.id, WorkflowType.GHG, 'ISO_14064_1');
    await grantPipelineAccess(prisma, licenseeB.id, WorkflowType.JOB, 'UK_SECTION_106');
  });

  afterAll(async () => {
    const licenseeIds = [licenseeA?.id, licenseeB?.id].filter(Boolean);
    const submissions = await prisma.workflowSubmission.findMany({ where: { licenseeId: { in: licenseeIds } }, select: { id: true } });
    const ids = submissions.map((s) => s.id);
    await prisma.workflowTransitionLog.deleteMany({ where: { submissionId: { in: ids } } });
    await prisma.workflowReviewDecision.deleteMany({ where: { submissionId: { in: ids } } });
    await prisma.workflowAnswer.deleteMany({ where: { submissionId: { in: ids } } });
    await prisma.workflowSubmission.deleteMany({ where: { id: { in: ids } } });
    await prisma.portalUser.deleteMany({ where: { id: { in: [userA?.id, userB?.id, admin?.id].filter(Boolean) } } });
    for (const id of licenseeIds) {
      await prisma.licensee.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('returns each pipeline fee from env', async () => {
    const res = await request(app).get('/api/workflow/fees').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(res.body.fees).toEqual({
      GHG: { amountPence: Number(process.env.GHG_ASSURANCE_FEE_PENCE), currency: process.env.ASSURANCE_FEE_CURRENCY },
      WORKFORCE: { amountPence: Number(process.env.WORKFORCE_ASSURANCE_FEE_PENCE), currency: process.env.ASSURANCE_FEE_CURRENCY },
    });
    await request(app).get('/api/workflow/fees').expect(401);
  });

  it('lists only the client\'s own frameworks for the requested pipeline', async () => {
    await request(app).get('/api/workflow/my-frameworks?service=FLEET').set('Authorization', `Bearer ${tokenA}`).expect(400);

    const ghg = await request(app).get('/api/workflow/my-frameworks?service=GHG').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(ghg.body.frameworks).toHaveLength(1);
    expect(ghg.body.frameworks[0]).toMatchObject({
      frameworkId: 'fwk_iso_14064',
      code: 'ISO_14064_1',
      entitled: true,
      isLegallyMandatory: true,
      preparation: { totalItems: 1, completedItems: 1, ready: true },
      latestSubmission: null,
    });

    const workforce = await request(app).get('/api/workflow/my-frameworks?service=WORKFORCE').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(workforce.body.frameworks).toHaveLength(0);
  });

  it('shows the latest submission so the client can resume it', async () => {
    const draft = await request(app)
      .post('/api/workflow/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ workflowType: 'GHG', frameworkId: 'fwk_iso_14064' })
      .expect(201);
    submissionId = draft.body.submission.id;

    const res = await request(app).get('/api/workflow/my-frameworks?service=GHG').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(res.body.frameworks[0].latestSubmission).toMatchObject({ id: submissionId, status: 'DRAFT', open: true });

    const framework = await prisma.workflowFramework.findUnique({
      where: { id: 'fwk_iso_14064' },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    questionIds = framework!.questions.map((q) => q.id);
  });

  it('withholds the AI pre-screen from the client but not from the auditor', async () => {
    await prisma.workflowSubmission.update({
      where: { id: submissionId },
      data: {
        status: WorkflowStatus.UNDER_REVIEW,
        aiScreenedAt: new Date(),
        aiReviewer: 'Rules Engine (no AI model review)',
        aiScore: 41,
        aiRecommendation: 'REJECT',
        aiSummary: 'Internal advisory summary',
        aiClauseFindings: [{ clause: '5.2', finding: 'Internal advisory finding' }],
      },
    });

    const view = await request(app).get(`/api/workflow/submissions/${submissionId}/view`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    const dossier = await request(app).get(`/api/workflow/submissions/${submissionId}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    const list = await request(app).get('/api/workflow/submissions').set('Authorization', `Bearer ${tokenA}`).expect(200);

    for (const body of [view.body.submission, dossier.body.submission, list.body.submissions[0]]) {
      for (const field of AI_FIELDS) expect(body).not.toHaveProperty(field);
      expect(JSON.stringify(body)).not.toContain('Internal advisory');
    }
    expect(view.body.submission.questions).toHaveLength(questionIds.length);

    const adminDossier = await request(app).get(`/api/workflow/submissions/${submissionId}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(adminDossier.body.submission.aiScore).toBe(41);
    expect(adminDossier.body.submission.aiSummary).toBe('Internal advisory summary');
  });

  it('gives the client the auditor\'s reason against each question that needs revision', async () => {
    const reason = 'Attach the signed boundary statement covering all UK sites.';
    await request(app)
      .post(`/api/workflow/submissions/${submissionId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        overallDecision: 'REJECTED',
        overallScore: 55,
        reviewerAccreditation: 'IEMA Lead Auditor',
        reviewerNotes: 'Two items need more evidence.',
        perQuestionDecisions: questionIds.map((questionId, i) =>
          i === 0 ? { questionId, accepted: false, reasonIfRejected: reason } : { questionId, accepted: true }
        ),
      })
      .expect(200);

    const res = await request(app).get(`/api/workflow/submissions/${submissionId}/view`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    const submission = res.body.submission;

    expect(submission.status).toBe('REJECTED');
    expect(submission.review).toMatchObject({
      decision: 'REJECTED',
      score: 55,
      reviewerName: 'Dana Reviewer',
      reviewerAccreditation: 'IEMA Lead Auditor',
      notes: 'Two items need more evidence.',
    });
    expect(submission.review).not.toHaveProperty('reviewerId');
    expect(submission.questions[0].revisionReason).toBe(reason);
    expect(submission.questions.slice(1).every((q: any) => q.revisionReason === null)).toBe(true);
    expect(submission.history.map((h: any) => h.status)).toEqual(expect.arrayContaining(['DRAFT', 'REJECTED']));

    const frameworks = await request(app).get('/api/workflow/my-frameworks?service=GHG').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(frameworks.body.frameworks[0].latestSubmission).toMatchObject({ status: 'REJECTED', open: true });
  });

  it('hides another organisation\'s submission', async () => {
    await request(app).get(`/api/workflow/submissions/${submissionId}/view`).set('Authorization', `Bearer ${tokenB}`).expect(404);
    await request(app).get(`/api/workflow/submissions/${submissionId}`).set('Authorization', `Bearer ${tokenB}`).expect(404);
    const list = await request(app).get('/api/workflow/submissions').set('Authorization', `Bearer ${tokenB}`).expect(200);
    expect(list.body.submissions).toHaveLength(0);
  });
});
