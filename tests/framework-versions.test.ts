import request from 'supertest';
import { CredentialStatus, PrismaClient, Vertical, WorkflowAnswerType, WorkflowType } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { questionSetHash } from '../src/services/framework-version.service';
import { FrameworkSeedRecord, PublishedVersionChangedError, syncFrameworkRegistry as seedFrameworks } from '../src/services/framework-registry';

const prisma = new PrismaClient();
const app = createApp();

const FRAMEWORK_ID = 'fwk_test_versioning';

/** A test-only framework, so publishing versions here never touches the real registry. */
function framework(version: string, effectiveFrom: Date, questions: FrameworkSeedRecord['questions']): FrameworkSeedRecord {
  return {
    id: FRAMEWORK_ID,
    workflowType: WorkflowType.JOB,
    code: 'TEST_VERSIONING',
    name: 'Versioning Test Standard',
    governingBody: 'Test Authority',
    jurisdiction: 'United Kingdom',
    description: 'Used only by the versioning tests.',
    version: { version, standardReference: `Test Standard edition ${version}`, effectiveFrom, changeSummary: `Edition ${version}.` },
    questions,
  };
}

const V1_QUESTIONS: FrameworkSeedRecord['questions'] = [
  { id: 'tv1_q1', orderIndex: 1, text: 'Do you hold the signed agreement?', answerType: WorkflowAnswerType.BOOLEAN, options: [], evidenceRequired: false, isoClauseReference: 'Clause 1', guidanceNotes: 'The executed agreement.' },
  { id: 'tv1_q2', orderIndex: 2, text: 'How many local hires this period?', answerType: WorkflowAnswerType.NUMBER, options: [], evidenceRequired: false, isoClauseReference: 'Clause 2', guidanceNotes: 'Headcount.' },
];
const V2_QUESTIONS: FrameworkSeedRecord['questions'] = [
  { id: 'tv2_q1', orderIndex: 1, text: 'Do you hold the signed agreement and its variations?', answerType: WorkflowAnswerType.BOOLEAN, options: [], evidenceRequired: false, isoClauseReference: 'Clause 1 (2027)', guidanceNotes: 'Agreement and variations.' },
];

const V1 = framework('2026.1', new Date('2026-01-01T00:00:00Z'), V1_QUESTIONS);

let licenseeId: string;
let clientToken: string;
let adminToken: string;
let v1SubmissionId: string;

async function startDraft() {
  const res = await request(app)
    .post('/api/workflow/draft')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ workflowType: 'JOB', frameworkId: FRAMEWORK_ID, licenseeId })
    .expect(201);
  return res.body.submission;
}

beforeAll(async () => {
  licenseeId = (await prisma.licensee.create({ data: { name: 'Versioning Client Ltd', vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
  clientToken = jwt.sign({ userId: 'versioning-client', role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
  adminToken = jwt.sign({ userId: 'versioning-admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  const subs = await prisma.workflowSubmission.findMany({ where: { frameworkId: FRAMEWORK_ID }, select: { id: true } });
  const ids = subs.map((s) => s.id);
  await prisma.auditWarrantyCredential.deleteMany({ where: { workflowSubmissionId: { in: ids } } });
  await prisma.workflowTransitionLog.deleteMany({ where: { submissionId: { in: ids } } });
  await prisma.workflowAnswer.deleteMany({ where: { submissionId: { in: ids } } });
  await prisma.workflowSubmission.deleteMany({ where: { id: { in: ids } } });
  await prisma.workflowFramework.deleteMany({ where: { id: FRAMEWORK_ID } });
  await prisma.licensee.deleteMany({ where: { id: licenseeId } });
  await prisma.$disconnect();
});

describe('Versioned compliance standards', () => {
  it('publishes a version with its questions and a sealed content hash', async () => {
    await seedFrameworks(prisma, [V1]);
    const version = await prisma.workflowFrameworkVersion.findUnique({
      where: { frameworkId_version: { frameworkId: FRAMEWORK_ID, version: '2026.1' } },
      include: { questions: true },
    });
    expect(version).toMatchObject({ standardReference: 'Test Standard edition 2026.1', contentHash: questionSetHash(V1_QUESTIONS) });
    expect(version!.questions.map((q) => q.id).sort()).toEqual(['tv1_q1', 'tv1_q2']);

    // Rerunning an unchanged seed is a no-op.
    await expect(seedFrameworks(prisma, [V1])).resolves.toBeUndefined();
  });

  it('pins a new draft to the current version and records it in the transition log', async () => {
    const draft = await startDraft();
    v1SubmissionId = draft.id;
    expect(draft.frameworkVersionId).toBe(`${FRAMEWORK_ID}_v2026_1`);
    const log = await prisma.workflowTransitionLog.findFirst({ where: { submissionId: draft.id } });
    expect(log!.triggerReason).toContain('2026.1 (Test Standard edition 2026.1)');
  });

  it('refuses to edit a published version', async () => {
    const edited = framework('2026.1', new Date('2026-01-01T00:00:00Z'), [{ ...V1_QUESTIONS[0], text: 'Reworded question' }, V1_QUESTIONS[1]]);
    await expect(seedFrameworks(prisma, [edited])).rejects.toBeInstanceOf(PublishedVersionChangedError);

    const unchanged = await prisma.workflowQuestion.findUnique({ where: { id: 'tv1_q1' } });
    expect(unchanged!.text).toBe('Do you hold the signed agreement?');
  });

  it('refuses a new version that reuses earlier question ids', async () => {
    const reused = framework('2027.1', new Date('2026-02-01T00:00:00Z'), V1_QUESTIONS);
    await expect(seedFrameworks(prisma, [reused])).rejects.toBeInstanceOf(PublishedVersionChangedError);
    expect(await prisma.workflowFrameworkVersion.count({ where: { frameworkId: FRAMEWORK_ID } })).toBe(1);
  });

  it('starts new drafts on a newly published version while existing submissions keep theirs', async () => {
    await seedFrameworks(prisma, [framework('2027.1', new Date('2026-02-01T00:00:00Z'), V2_QUESTIONS)]);

    const next = await startDraft();
    expect(next.frameworkVersionId).toBe(`${FRAMEWORK_ID}_v2027_1`);

    const oldView = await request(app).get(`/api/workflow/submissions/${v1SubmissionId}/view`).set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(oldView.body.submission.version).toMatchObject({ version: '2026.1', standardReference: 'Test Standard edition 2026.1' });
    expect(oldView.body.submission.questions.map((q: any) => q.id)).toEqual(['tv1_q1', 'tv1_q2']);

    const newView = await request(app).get(`/api/workflow/submissions/${next.id}/view`).set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(newView.body.submission.version.version).toBe('2027.1');
    expect(newView.body.submission.questions.map((q: any) => q.id)).toEqual(['tv2_q1']);

    const dossier = await request(app).get(`/api/workflow/submissions/${v1SubmissionId}/review-dossier`).set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(dossier.body.submission.version.version).toBe('2026.1');
    expect(dossier.body.submission.questions).toHaveLength(2);
  });

  it('does not start drafts on a version that is not yet in effect', async () => {
    await seedFrameworks(prisma, [framework('2099.1', new Date('2099-01-01T00:00:00Z'), [{ ...V2_QUESTIONS[0], id: 'tv3_q1' }])]);
    const draft = await startDraft();
    expect(draft.frameworkVersionId).toBe(`${FRAMEWORK_ID}_v2027_1`);
  });

  it("submits against only its own version's questions", async () => {
    await request(app)
      .patch(`/api/workflow/submissions/${v1SubmissionId}/answers`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ answers: [{ questionId: 'tv1_q1', value: 'true' }, { questionId: 'tv1_q2', value: '12' }] })
      .expect(200);
    // Every question of version 2026.1 is answered; the newer version's questions are not required.
    const res = await request(app).post(`/api/workflow/submissions/${v1SubmissionId}/submit`).set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(res.body.submission.status).toBe('SUBMITTED');
  });

  it('names the assessed version in the public verification record', async () => {
    const credential = await prisma.auditWarrantyCredential.create({
      data: {
        licenseeId,
        workflowSubmissionId: v1SubmissionId,
        clientMessage: 'Versioned assessment',
        clientLogoUrl: 'logos/test.png',
        status: CredentialStatus.ISSUED,
        verificationSeal: 'd'.repeat(64),
        warrantyExpiresAt: new Date(Date.now() + 864e5),
      },
    });
    const res = await request(app).get(`/api/credentials/${credential.id}/verify`).expect(200);
    expect(res.body.assessedAgainst).toMatchObject({
      frameworkCode: 'TEST_VERSIONING',
      version: '2026.1',
      standardReference: 'Test Standard edition 2026.1',
    });
  });
});
