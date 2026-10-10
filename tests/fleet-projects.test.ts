import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();
const app = createApp();

let licenseeA: string;
let licenseeB: string;
let licenseeNoFleet: string;
let tokenA: string;
let tokenB: string;
let tokenNoFleet: string;
const assets: Record<string, string> = {};

beforeAll(async () => {
  const s = Date.now().toString(36);
  const lic = async (name: string, fleet: boolean) => {
    const l = await prisma.licensee.create({ data: { name: `${name} ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    if (fleet) await prisma.serviceEntitlement.create({ data: { licenseeId: l.id, serviceLine: 'FLEET', status: 'ACTIVE' } });
    return l.id;
  };
  licenseeA = await lic('Projects A', true);
  licenseeB = await lic('Projects B', true);
  licenseeNoFleet = await lic('Projects none', false);
  const token = (licenseeId: string) => jwt.sign({ userId: `u_${licenseeId}`, role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
  tokenA = token(licenseeA);
  tokenB = token(licenseeB);
  tokenNoFleet = token(licenseeNoFleet);
  for (const [licenseeId, tag] of [[licenseeA, 'EX-01'], [licenseeA, 'EX-02'], [licenseeB, 'EX-09']] as const) {
    const a = await prisma.fleetAsset.create({
      data: { licenseeId, assetTag: tag, name: tag, category: 'EXCAVATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true },
    });
    assets[tag] = a.id;
  }
});

afterAll(async () => {
  const ids = [licenseeA, licenseeB, licenseeNoFleet];
  await prisma.fleetProject.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.fleetAsset.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.serviceEntitlement.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.licensee.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

const project = {
  name: 'A14 junction upgrade',
  reference: 'C-2026-114',
  contractValuePence: 250_000_000,
  budgetedMarginBps: 1200,
  currency: 'GBP',
  startDate: '2026-09-01',
  endDate: '2027-03-31',
};

describe('Fleet projects', () => {
  let projectId: string;

  it('requires a signed-in client with an active Fleet subscription', async () => {
    await request(app).get('/api/fleet/projects').expect(401);
    await request(app).get('/api/fleet/projects').set('Authorization', `Bearer ${tokenNoFleet}`).expect(402);
  });

  it('creates a project and validates its fields', async () => {
    const post = (body: object) => request(app).post('/api/fleet/projects').set('Authorization', `Bearer ${tokenA}`).send(body);
    await post({ ...project, contractValuePence: 0 }).expect(400);
    await post({ ...project, budgetedMarginBps: 20000 }).expect(400);
    await post({ ...project, endDate: '2026-08-01' }).expect(400);
    await post({ ...project, currency: 'pounds' }).expect(400);
    const res = await post(project).expect(201);
    projectId = res.body.project.id;
    expect(res.body.project).toMatchObject({ name: project.name, contractValuePence: 250_000_000, startDate: '2026-09-01', status: 'ACTIVE' });
    await post(project).expect(409);
  });

  it('assigns machines inside the project dates and never to two projects at once', async () => {
    const assign = (id: string, body: object, token = tokenA) =>
      request(app).post(`/api/fleet/projects/${id}/assets`).set('Authorization', `Bearer ${token}`).send(body);
    await assign(projectId, { assetId: assets['EX-01'], fromDate: '2026-08-01', toDate: '2026-10-01' }).expect(400);
    await assign(projectId, { assetId: assets['EX-01'], fromDate: '2026-09-15' }).expect(400); // must end by project end
    const ok = await assign(projectId, { assetId: assets['EX-01'], fromDate: '2026-09-15', toDate: '2026-12-31' }).expect(201);
    expect(ok.body.project.assignments).toHaveLength(1);

    const other = await request(app)
      .post('/api/fleet/projects')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...project, name: 'Depot works', endDate: null })
      .expect(201);
    await assign(other.body.project.id, { assetId: assets['EX-01'], fromDate: '2026-12-01' }).expect(409);
    await assign(other.body.project.id, { assetId: assets['EX-01'], fromDate: '2027-01-01' }).expect(201);

    // Another client's machine is not visible.
    await assign(projectId, { assetId: assets['EX-09'], fromDate: '2026-09-15', toDate: '2026-10-01' }).expect(404);
  });

  it('ends and removes assignments, and keeps project dates consistent with them', async () => {
    const list = await request(app).get('/api/fleet/projects').set('Authorization', `Bearer ${tokenA}`).expect(200);
    const p = list.body.projects.find((x: { id: string }) => x.id === projectId);
    const assignmentId = p.assignments[0].id;

    await request(app)
      .patch(`/api/fleet/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ endDate: '2026-11-30' })
      .expect(409);
    await request(app)
      .patch(`/api/fleet/projects/${projectId}/assets/${assignmentId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ toDate: '2026-11-30' })
      .expect(200);
    const closed = await request(app)
      .patch(`/api/fleet/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ endDate: '2026-11-30', status: 'CLOSED' })
      .expect(200);
    expect(closed.body.project).toMatchObject({ endDate: '2026-11-30', status: 'CLOSED' });

    const removed = await request(app)
      .delete(`/api/fleet/projects/${projectId}/assets/${assignmentId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(removed.body.project.assignments).toHaveLength(0);
  });

  it("never shows one client's projects to another", async () => {
    const res = await request(app).get('/api/fleet/projects').set('Authorization', `Bearer ${tokenB}`).expect(200);
    expect(res.body.projects).toHaveLength(0);
    await request(app).patch(`/api/fleet/projects/${projectId}`).set('Authorization', `Bearer ${tokenB}`).send({ name: 'x' }).expect(404);
  });

  it('the database refuses overlapping assignments even if the service check is bypassed', async () => {
    const p = await prisma.fleetProject.create({
      data: { licenseeId: licenseeA, name: `Guard ${Date.now()}`, contractValuePence: BigInt(1), budgetedMarginBps: 0, currency: 'GBP', startDate: new Date('2026-01-01') },
    });
    await prisma.fleetProjectAsset.create({ data: { licenseeId: licenseeA, projectId: p.id, assetId: assets['EX-02'], fromDate: new Date('2026-01-01') } });
    await expect(
      prisma.fleetProjectAsset.create({ data: { licenseeId: licenseeA, projectId: p.id, assetId: assets['EX-02'], fromDate: new Date('2026-02-01') } })
    ).rejects.toThrow();
  });
});
