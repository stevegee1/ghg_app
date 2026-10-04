/**
 * The ISO readiness pipeline is retired. Its routes are gone; the only thing left is issuing the
 * credential for a readiness submission that was approved and paid before retirement.
 */
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { PrismaClient, IsoReadinessStatus } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();
const app = createApp();
const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'nfty-logs-logo.png');

let licenseeId: string;
let otherLicenseeId: string;
let token: string;
let otherToken: string;
let adminToken: string;
let pendingId: string;
let unpaidId: string;

beforeAll(async () => {
  licenseeId = (await prisma.licensee.create({ data: { name: 'Legacy Readiness Ltd', vertical: 'B2B_CLEAN_TECH' } })).id;
  otherLicenseeId = (await prisma.licensee.create({ data: { name: 'Other Legacy Ltd', vertical: 'B2B_CLEAN_TECH' } })).id;
  token = jwt.sign({ userId: 'legacy-user', licenseeId, role: 'PARTNER' }, JWT_SECRET, { expiresIn: '1h' });
  otherToken = jwt.sign({ userId: 'legacy-other', licenseeId: otherLicenseeId, role: 'PARTNER' }, JWT_SECRET, { expiresIn: '1h' });
  adminToken = jwt.sign({ userId: 'legacy-admin', licenseeId: '', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

  pendingId = (
    await prisma.isoReadinessSubmission.create({
      data: { licenseeId, answers: [], status: IsoReadinessStatus.AUDIT_READY, paidAt: new Date(), selectedFrameworks: ['ISO_14064_1'] },
    })
  ).id;
  unpaidId = (
    await prisma.isoReadinessSubmission.create({ data: { licenseeId, answers: [], status: IsoReadinessStatus.SUBMITTED } })
  ).id;
});

afterAll(async () => {
  const ids = [licenseeId, otherLicenseeId].filter(Boolean);
  await prisma.auditWarrantyCredential.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.isoReadinessSubmission.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.licensee.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe('Retired ISO readiness pipeline', () => {
  it('no longer serves the questionnaire, submit, review, checkout, status or admin queue routes', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).get('/api/iso-readiness/framework').expect(404);
    await request(app).get('/api/iso-readiness/frameworks').expect(404);
    await request(app).post('/api/iso-readiness/submit').set(auth).send({ answers: [] }).expect(404);
    await request(app).post('/api/iso-readiness/checkout').set(auth).send({}).expect(404);
    await request(app).post('/api/iso-readiness/review').set('Authorization', `Bearer ${adminToken}`).send({}).expect(404);
    await request(app).get(`/api/iso-readiness/status/${licenseeId}`).set(auth).expect(404);
    await request(app).get('/api/admin/iso-submissions').set('Authorization', `Bearer ${adminToken}`).expect(404);
    await request(app).post('/api/credentials/compose').set(auth).expect(404);
  });

  it('lists only the client\'s own approved, paid submissions still awaiting a credential', async () => {
    const res = await request(app).get('/api/credentials/legacy-pending').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.submissions.map((s: any) => s.id)).toEqual([pendingId]);

    const other = await request(app).get('/api/credentials/legacy-pending').set('Authorization', `Bearer ${otherToken}`).expect(200);
    expect(other.body.submissions).toHaveLength(0);
  });

  it('refuses to issue for an unpaid or unapproved submission, or another licensee\'s', async () => {
    if (!fs.existsSync(LOGO_PATH)) return;
    const unpaid = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${token}`)
      .attach('clientLogo', LOGO_PATH)
      .field('clientMessage', 'Attempting unauthorized issuance')
      .field('submissionId', unpaidId);
    expect(unpaid.status).toBe(403);

    const foreign = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('clientLogo', LOGO_PATH)
      .field('clientMessage', 'Not my submission')
      .field('submissionId', pendingId);
    expect(foreign.status).toBe(403);
  });

  it('issues the pending credential once, then no longer lists it', async () => {
    if (!fs.existsSync(LOGO_PATH)) return;
    const res = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${token}`)
      .attach('clientLogo', LOGO_PATH)
      .field('clientMessage', 'Statutory ISO 14064-1 Audit Verified')
      .field('submissionId', pendingId);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ISSUED');
    expect(res.body.verificationSeal).toMatch(/^[a-f0-9]{64}$/);

    const again = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${token}`)
      .attach('clientLogo', LOGO_PATH)
      .field('clientMessage', 'Duplicate issuance attempt')
      .field('submissionId', pendingId);
    expect(again.status).toBe(409);

    const pending = await request(app).get('/api/credentials/legacy-pending').set('Authorization', `Bearer ${token}`).expect(200);
    expect(pending.body.submissions).toHaveLength(0);

    await request(app).get(`/api/credentials/${res.body.credentialId}/verify`).expect(200);
  });
});
