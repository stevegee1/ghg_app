import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { INDUSTRY_SECTOR_OPTIONS, PRIMARY_ROLE_OPTIONS } from '../src/components/portal/profileOptions';

const prisma = new PrismaClient();
const app = createApp();
const suffix = Date.now().toString(36);
let token: string;
let userId: string;
let licenseeId: string;

beforeAll(async () => {
  const licensee = await prisma.licensee.create({ data: { name: `Profile ${suffix}`, vertical: Vertical.B2B_CLEAN_TECH } });
  const user = await prisma.portalUser.create({ data: { email: `profile.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licensee.id } });
  licenseeId = licensee.id;
  userId = user.id;
  token = jwt.sign({ userId, role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await prisma.portalUser.deleteMany({ where: { id: userId } });
  await prisma.licensee.deleteMany({ where: { id: licenseeId } });
  await prisma.$disconnect();
});

describe('Profile settings', () => {
  it('saves every role and industry the form offers', async () => {
    for (const role of PRIMARY_ROLE_OPTIONS) {
      await request(app).patch('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ primaryRole: role.value }).expect(200);
    }
    for (const sector of INDUSTRY_SECTOR_OPTIONS) {
      await request(app).patch('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ industrySector: sector.value }).expect(200);
    }
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Segun', lastName: 'Ogar', jobTitle: 'CTO', primaryRole: 'FINANCE_DIRECTOR' })
      .expect(200);
    expect(res.body.user).toMatchObject({ firstName: 'Segun', jobTitle: 'CTO', primaryRole: 'FINANCE_DIRECTOR' });
  });

  it('rejects a value outside the list with a plain message, never a database error', async () => {
    const res = await request(app).patch('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ primaryRole: 'SUSTAINABILITY_DIRECTOR' }).expect(400);
    expect(res.body.error).toBe('Choose a role from the list.');
    const sector = await request(app).patch('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ industrySector: 'TECH' }).expect(400);
    expect(sector.body.error).toBe('Choose an industry from the list.');
    expect(JSON.stringify(sector.body)).not.toMatch(/prisma|invocation/i);
  });

  it('asks an expired session to sign in again', async () => {
    const expired = jwt.sign({ userId, role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).patch('/api/auth/profile').set('Authorization', `Bearer ${expired}`).send({ jobTitle: 'CEO' }).expect(401);
    expect(res.body.error).toMatch(/sign in again/i);
  });
});
