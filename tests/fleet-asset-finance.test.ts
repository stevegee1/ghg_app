import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();
const app = createApp();
const s = Date.now().toString(36);
let licenseeId: string;
let otherId: string;
let assetId: string;
let token: string;
let otherToken: string;

beforeAll(async () => {
  const mk = async (name: string) => {
    const l = await prisma.licensee.create({ data: { name: `${name} ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    await prisma.serviceEntitlement.create({ data: { licenseeId: l.id, serviceLine: 'FLEET', status: 'ACTIVE' } });
    return l.id;
  };
  licenseeId = await mk('Finance');
  otherId = await mk('Finance other');
  token = jwt.sign({ userId: 'u1', role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
  otherToken = jwt.sign({ userId: 'u2', role: 'PARTNER', licenseeId: otherId }, JWT_SECRET, { expiresIn: '1h' });
  assetId = (
    await prisma.fleetAsset.create({
      data: { licenseeId, assetTag: 'EX-F', name: 'Excavator', category: 'EXCAVATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true },
    })
  ).id;
});

afterAll(async () => {
  for (const id of [licenseeId, otherId]) {
    await prisma.fleetAsset.deleteMany({ where: { licenseeId: id } });
    await prisma.serviceEntitlement.deleteMany({ where: { licenseeId: id } });
    await prisma.licensee.delete({ where: { id } });
  }
  await prisma.$disconnect();
});

const valid = {
  currency: 'GBP',
  acquisitionCostPence: 18_500_000,
  acquisitionDate: '2023-04-01',
  expectedLifeYears: '8',
  expectedLifeHours: '12000',
  residualValuePence: 3_000_000,
};

describe('Machine finance details', () => {
  it('validates and records purchase cost, life and residual value', async () => {
    const put = (body: object, t = token) => request(app).put(`/api/fleet/finance/${assetId}`).set('Authorization', `Bearer ${t}`).send(body);
    await put({ ...valid, residualValuePence: 20_000_000 }).expect(400);
    await put({ ...valid, acquisitionDate: '2999-01-01' }).expect(400);
    await put({ ...valid, expectedLifeYears: '0' }).expect(400);
    await put({ ...valid, acquisitionCostPence: 1.5 }).expect(400);
    await put(valid, otherToken).expect(404);

    const res = await put(valid).expect(200);
    expect(res.body.finance).toMatchObject({ acquisitionCostPence: 18_500_000, expectedLifeHours: '12000', residualValuePence: 3_000_000 });
    const again = await put({ ...valid, expectedLifeHours: '' }).expect(200);
    expect(again.body.finance.expectedLifeHours).toBeNull();

    const list = await request(app).get('/api/fleet/finance').set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.assets).toEqual([expect.objectContaining({ assetTag: 'EX-F', finance: expect.objectContaining({ acquisitionDate: '2023-04-01' }) })]);
    const other = await request(app).get('/api/fleet/finance').set('Authorization', `Bearer ${otherToken}`).expect(200);
    expect(other.body.assets).toEqual([]);
  });
});
