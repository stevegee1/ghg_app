import crypto from 'crypto';
import fs from 'fs';
import request from 'supertest';
import { PrismaClient, Vertical, WorkflowType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { resolveStorageKey } from '../src/services/file-storage.service';
import { syncFrameworkRegistry as seedFrameworks } from '../src/services/framework-registry';
import { grantPipelineAccess } from './helpers/pipelineAccess';

const prisma = new PrismaClient();
const app = createApp();

const sha256 = (content: Buffer) => crypto.createHash('sha256').update(content).digest('hex');

describe('Evidence storage: private files, real hashes and ownership', () => {
  let licenseeA: any;
  let licenseeB: any;
  let userA: any;
  let userB: any;
  let admin: any;
  let tokenA: string;
  let tokenB: string;
  let adminToken: string;

  beforeAll(async () => {
    await seedFrameworks(prisma);
    const passwordHash = await bcrypt.hash('EvidenceStoragePass123!', 10);

    licenseeA = await prisma.licensee.create({ data: { name: 'Evidence Owner Ltd', vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    licenseeB = await prisma.licensee.create({ data: { name: 'Other Tenant Ltd', vertical: Vertical.B2B_CLEAN_TECH } });
    userA = await prisma.portalUser.create({ data: { email: 'owner@evidence-storage.test', passwordHash, role: 'PARTNER', licenseeId: licenseeA.id } });
    userB = await prisma.portalUser.create({ data: { email: 'other@evidence-storage.test', passwordHash, role: 'PARTNER', licenseeId: licenseeB.id } });
    admin = await prisma.portalUser.create({ data: { email: 'admin@evidence-storage.test', passwordHash, role: 'ADMIN' } });

    tokenA = jwt.sign({ userId: userA.id, role: 'PARTNER', licenseeId: licenseeA.id }, JWT_SECRET, { expiresIn: '1h' });
    tokenB = jwt.sign({ userId: userB.id, role: 'PARTNER', licenseeId: licenseeB.id }, JWT_SECRET, { expiresIn: '1h' });
    adminToken = jwt.sign({ userId: admin.id, role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });

    await grantPipelineAccess(prisma, licenseeA.id, WorkflowType.GHG, 'ISO_14064_1');
  });

  afterAll(async () => {
    const licenseeIds = [licenseeA?.id, licenseeB?.id].filter(Boolean);
    const submissions = await prisma.workflowSubmission.findMany({ where: { licenseeId: { in: licenseeIds } }, select: { id: true } });
    const submissionIds = submissions.map((s) => s.id);
    await prisma.workflowTransitionLog.deleteMany({ where: { submissionId: { in: submissionIds } } });
    await prisma.workflowAnswer.deleteMany({ where: { submissionId: { in: submissionIds } } });
    await prisma.workflowSubmission.deleteMany({ where: { id: { in: submissionIds } } });
    await prisma.auditEvidenceDocument.deleteMany({ where: { licenseeId: { in: licenseeIds } } });
    await prisma.portalUser.deleteMany({ where: { id: { in: [userA?.id, userB?.id, admin?.id].filter(Boolean) } } });
    for (const id of licenseeIds) {
      await prisma.licensee.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  function uploadAsA(content: Buffer, filename = 'utility_bill.pdf', contentType = 'application/pdf') {
    return request(app)
      .post('/api/workflow/evidence/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', content, { filename, contentType });
  }

  it('stores the uploaded bytes privately and records their real SHA-256', async () => {
    const content = Buffer.from('%PDF-1.4 electricity bill March 2026');
    const res = await uploadAsA(content).expect(201);
    const doc = res.body.evidenceDocument;

    expect(doc.licenseeId).toBe(licenseeA.id);
    expect(doc.sha256Hash).toBe(sha256(content));
    expect(doc.fileSizeBytes).toBe(content.length);
    expect(doc.fileUrl).toBe(`/api/evidence/${doc.id}/file`);

    const stored = await prisma.auditEvidenceDocument.findUnique({ where: { id: doc.id } });
    expect(stored!.storageKey).toMatch(new RegExp(`^evidence/${licenseeA.id}/`));
    expect(fs.readFileSync(resolveStorageKey(stored!.storageKey!)).equals(content)).toBe(true);
  });

  it('lets the owner and an administrator download the exact file', async () => {
    const content = Buffer.from('scope,kwh\nsite-1,1200\n');
    const { body } = await uploadAsA(content, 'meter_reads.csv', 'text/csv').expect(201);
    const url = body.evidenceDocument.fileUrl;

    for (const token of [tokenA, adminToken]) {
      const res = await request(app).get(url).set('Authorization', `Bearer ${token}`).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['content-disposition']).toContain('meter_reads.csv');
      expect(sha256(res.body)).toBe(sha256(content));
      expect(res.headers['x-evidence-integrity']).toBe('verified');
    }
  });

  it('refuses a file that changed after upload, and warns the reviewer', async () => {
    const { body } = await uploadAsA(Buffer.from('%PDF-1.4 gas bill'), 'gas_bill.pdf').expect(201);
    const doc = body.evidenceDocument;

    const draft = await request(app).post('/api/workflow/draft').set('Authorization', `Bearer ${tokenA}`).send({ workflowType: 'GHG', frameworkId: 'fwk_iso_14064' });
    const submissionId = draft.status === 201 ? draft.body.submission.id : (await prisma.workflowSubmission.findFirstOrThrow({ where: { licenseeId: licenseeA.id, status: 'DRAFT' } })).id;
    const question = (await prisma.workflowFramework.findUniqueOrThrow({ where: { id: 'fwk_iso_14064' }, include: { questions: { orderBy: { orderIndex: 'asc' } } } })).questions[0];
    await request(app)
      .patch(`/api/workflow/submissions/${submissionId}/answers`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ answers: [{ questionId: question.id, value: 'true', evidenceDocumentId: doc.id }] })
      .expect(200);

    const dossierEvidence = async () => {
      const res = await request(app).get(`/api/workflow/submissions/${submissionId}/review-dossier`).set('Authorization', `Bearer ${adminToken}`).expect(200);
      return res.body.submission.questions.find((q: { id: string }) => q.id === question.id).evidence;
    };
    expect((await dossierEvidence()).integrity).toBe('verified');

    // Someone edits the stored file directly on the volume.
    const stored = await prisma.auditEvidenceDocument.findUniqueOrThrow({ where: { id: doc.id } });
    fs.writeFileSync(resolveStorageKey(stored.storageKey!), Buffer.from('%PDF-1.4 gas bill (edited)'));

    const res = await request(app).get(doc.fileUrl).set('Authorization', `Bearer ${adminToken}`).expect(409);
    expect(res.body.code).toBe('INTEGRITY_MISMATCH');
    expect((await dossierEvidence()).integrity).toBe('changed');

    fs.unlinkSync(resolveStorageKey(stored.storageKey!));
    await request(app).get(doc.fileUrl).set('Authorization', `Bearer ${tokenA}`).expect(404);
    expect((await dossierEvidence()).integrity).toBe('missing');
  });

  it('hides another licensee\'s evidence and refuses anonymous downloads', async () => {
    const { body } = await uploadAsA(Buffer.from('%PDF-1.4 private')).expect(201);
    await request(app).get(body.evidenceDocument.fileUrl).set('Authorization', `Bearer ${tokenB}`).expect(404);
    await request(app).get(body.evidenceDocument.fileUrl).expect(401);
  });

  it('does not serve uploaded files from a public path', async () => {
    const { body } = await uploadAsA(Buffer.from('%PDF-1.4 not public')).expect(201);
    const stored = await prisma.auditEvidenceDocument.findUnique({ where: { id: body.evidenceDocument.id } });
    // Unknown paths fall through to the single-page app shell, so check the bytes never leak.
    for (const publicPath of [`/uploads/${stored!.storageKey}`, `/${stored!.storageKey}`]) {
      const res = await request(app).get(publicPath);
      expect(res.headers['content-type'] ?? '').not.toContain('application/pdf');
      expect(res.text ?? '').not.toContain('not public');
    }
  });

  it('rejects unsupported types, missing files and uploads for another licensee', async () => {
    await uploadAsA(Buffer.from('MZ'), 'tool.exe', 'application/octet-stream').expect(400);
    await request(app).post('/api/workflow/evidence/upload').set('Authorization', `Bearer ${tokenA}`).field('category', 'OTHER_AUDIT_PROOF').expect(400);

    const res = await request(app)
      .post('/api/workflow/evidence/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('licenseeId', licenseeB.id)
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(403);
  });

  it('requires administrators to name an existing licensee', async () => {
    const file = { filename: 'admin.pdf', contentType: 'application/pdf' };
    await request(app).post('/api/workflow/evidence/upload').set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('%PDF-1.4'), file).expect(400);
    await request(app).post('/api/workflow/evidence/upload').set('Authorization', `Bearer ${adminToken}`)
      .field('licenseeId', 'lic_does_not_exist').attach('file', Buffer.from('%PDF-1.4'), file).expect(400);
    const ok = await request(app).post('/api/workflow/evidence/upload').set('Authorization', `Bearer ${adminToken}`)
      .field('licenseeId', licenseeB.id).attach('file', Buffer.from('%PDF-1.4 admin'), file).expect(201);
    expect(ok.body.evidenceDocument.licenseeId).toBe(licenseeB.id);
  });

  it('refuses to attach evidence owned by another organisation to an answer', async () => {
    const foreign = await request(app)
      .post('/api/workflow/evidence/upload')
      .set('Authorization', `Bearer ${tokenB}`)
      .attach('file', Buffer.from('%PDF-1.4 foreign'), { filename: 'foreign.pdf', contentType: 'application/pdf' })
      .expect(201);
    const own = await uploadAsA(Buffer.from('%PDF-1.4 own')).expect(201);

    const draft = await request(app)
      .post('/api/workflow/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ workflowType: 'GHG', frameworkId: 'fwk_iso_14064' })
      .expect(201);
    const framework = await prisma.workflowFramework.findUnique({
      where: { id: 'fwk_iso_14064' },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    const questionId = framework!.questions[0].id;
    const answersUrl = `/api/workflow/submissions/${draft.body.submission.id}/answers`;

    const rejected = await request(app)
      .patch(answersUrl)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ answers: [{ questionId, value: 'true', evidenceDocumentId: foreign.body.evidenceDocument.id }] })
      .expect(400);
    expect(rejected.body.error).toContain('uploaded by this organisation');

    await request(app)
      .patch(answersUrl)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ answers: [{ questionId, value: 'true', evidenceDocumentId: own.body.evidenceDocument.id }] })
      .expect(200);
  });
});
