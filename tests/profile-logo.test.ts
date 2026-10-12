import fs from 'fs';
import path from 'path';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical, WorkflowStatus, WorkflowType } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { syncFrameworkRegistry } from '../src/services/framework-registry';
import { resolveStorageKey } from '../src/services/file-storage.service';

const prisma = new PrismaClient();
const app = createApp();
const LOGO = path.join(process.cwd(), 'public', 'images', 'nfty-logs-logo.png');
const suffix = Date.now().toString(36);

interface Client {
  licenseeId: string;
  userId: string;
  token: string;
}

async function makeClient(label: string): Promise<Client> {
  const licensee = await prisma.licensee.create({ data: { name: `Logo ${label} ${suffix}`, vertical: Vertical.B2B_CLEAN_TECH } });
  const user = await prisma.portalUser.create({ data: { email: `logo.${label}.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licensee.id } });
  return { licenseeId: licensee.id, userId: user.id, token: jwt.sign({ userId: user.id, role: 'PARTNER', licenseeId: licensee.id }, JWT_SECRET, { expiresIn: '1h' }) };
}

let a: Client;
let b: Client;
const logoDir = (c: Client) => path.join(process.env.FILE_STORAGE_DIR as string, 'logos', c.licenseeId);
const filesIn = (c: Client) => (fs.existsSync(logoDir(c)) ? fs.readdirSync(logoDir(c)).length : 0);
const auth = (c: Client) => ({ Authorization: `Bearer ${c.token}` });

beforeAll(async () => {
  await syncFrameworkRegistry(prisma);
  a = await makeClient('a');
  b = await makeClient('b');
});

afterAll(async () => {
  const ids = [a.licenseeId, b.licenseeId];
  await prisma.auditWarrantyCredential.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.workflowTransitionLog.deleteMany({ where: { submission: { licenseeId: { in: ids } } } });
  await prisma.workflowSubmission.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.portalUser.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.licensee.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe('Profile logo', () => {
  it('saves a logo privately and serves it only to its own organisation', async () => {
    const res = await request(app).put('/api/portal/profile/logo').set(auth(a)).attach('logo', LOGO).expect(200);
    expect(res.body.logoUrl).toBe('/api/portal/profile/logo');

    const got = await request(app).get('/api/portal/profile/logo').set(auth(a)).expect(200);
    expect(got.headers['content-type']).toBe('image/png');
    expect(got.headers['content-security-policy']).toContain('sandbox');
    expect(Buffer.compare(got.body as Buffer, fs.readFileSync(LOGO))).toBe(0);

    await request(app).get('/api/portal/profile/logo').set(auth(b)).expect(404);
    await request(app).get('/api/portal/profile/logo').expect(401);

    // The login response carries the logo path so the portal can show it.
    const licensee = await prisma.licensee.findUniqueOrThrow({ where: { id: a.licenseeId } });
    expect(licensee.logoUrl).toBe('/api/portal/profile/logo');
  });

  it('replaces the old file when a new logo is uploaded, and rejects non-images without leaving files', async () => {
    const before = await prisma.licensee.findUniqueOrThrow({ where: { id: a.licenseeId } });
    await request(app).put('/api/portal/profile/logo').set(auth(a)).attach('logo', LOGO).expect(200);
    expect(fs.existsSync(resolveStorageKey(before.logoStorageKey as string))).toBe(false);

    const count = filesIn(a);
    await request(app).put('/api/portal/profile/logo').set(auth(a)).attach('logo', Buffer.from('not an image'), 'notes.txt').expect(400);
    expect(filesIn(a)).toBe(count);
  });

  it('lets credential setup reuse the saved logo, as the credential\'s own copy', async () => {
    const saved = process.env.GHG_BILLING_ENABLED;
    process.env.GHG_BILLING_ENABLED = 'false';
    try {
      const sub = await prisma.workflowSubmission.create({
        data: {
          licenseeId: a.licenseeId,
          workflowType: WorkflowType.GHG,
          frameworkId: 'fwk_iso_14064',
          frameworkVersionId: 'fwk_iso_14064_v2026_1',
          status: WorkflowStatus.APPROVED,
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      });
      await request(app)
        .post(`/api/workflow/submissions/${sub.id}/badge-setup`)
        .set(auth(b))
        .field('clientMessage', 'Not my submission')
        .field('useProfileLogo', 'true')
        .expect(400);

      const res = await request(app)
        .post(`/api/workflow/submissions/${sub.id}/badge-setup`)
        .set(auth(a))
        .field('clientMessage', 'Reviewed with our saved logo')
        .field('useProfileLogo', 'true')
        .expect(201);
      const credential = await prisma.auditWarrantyCredential.findUniqueOrThrow({ where: { id: res.body.credentialId } });
      const profile = await prisma.licensee.findUniqueOrThrow({ where: { id: a.licenseeId } });
      expect(credential.clientLogoUrl).not.toBe(resolveStorageKey(profile.logoStorageKey as string));
      expect(fs.existsSync(credential.clientLogoUrl)).toBe(true);
    } finally {
      process.env.GHG_BILLING_ENABLED = saved;
    }
  });

  it('removes the logo and its file', async () => {
    const before = await prisma.licensee.findUniqueOrThrow({ where: { id: a.licenseeId } });
    await request(app).delete('/api/portal/profile/logo').set(auth(a)).expect(200);
    await request(app).get('/api/portal/profile/logo').set(auth(a)).expect(404);
    expect(fs.existsSync(resolveStorageKey(before.logoStorageKey as string))).toBe(false);
    const after = await prisma.licensee.findUniqueOrThrow({ where: { id: a.licenseeId } });
    expect(after).toMatchObject({ logoUrl: null, logoStorageKey: null });
  });
});
