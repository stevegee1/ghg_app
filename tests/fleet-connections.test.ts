import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();
const app = createApp();

let licenseeA: string;
let licenseeB: string;
let userA: string;
let userB: string;
let adminId: string;
let tokenA: string;
let tokenB: string;
let adminToken: string;
const assetIds: Record<string, string> = {};

beforeAll(async () => {
  const s = Date.now().toString(36);
  licenseeA = (await prisma.licensee.create({ data: { name: `Connections A ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
  licenseeB = (await prisma.licensee.create({ data: { name: `Connections B ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
  userA = (await prisma.portalUser.create({ data: { email: `conn.a.${s}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licenseeA } })).id;
  userB = (await prisma.portalUser.create({ data: { email: `conn.b.${s}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licenseeB } })).id;
  adminId = (await prisma.portalUser.create({ data: { email: `conn.admin.${s}@test.example`, passwordHash: 'x', role: 'ADMIN' } })).id;
  tokenA = jwt.sign({ userId: userA, role: 'PARTNER', licenseeId: licenseeA }, JWT_SECRET, { expiresIn: '1h' });
  tokenB = jwt.sign({ userId: userB, role: 'PARTNER', licenseeId: licenseeB }, JWT_SECRET, { expiresIn: '1h' });
  adminToken = jwt.sign({ userId: adminId, role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });

  for (const [licenseeId, tag] of [[licenseeA, 'EX-01'], [licenseeA, 'EX-02'], [licenseeA, 'GEN-03'], [licenseeB, 'EX-01']] as const) {
    const asset = await prisma.fleetAsset.create({
      data: { licenseeId, assetTag: tag, name: tag, category: 'EXCAVATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true },
    });
    assetIds[`${licenseeId === licenseeA ? 'A' : 'B'}:${tag}`] = asset.id;
  }

  await prisma.clientAssessment.create({
    data: {
      licenseeId: licenseeA,
      organisationCountry: 'GB',
      organisationSize: 'MEDIUM_50_249',
      annualRevenueBand: 'BAND_10M_36M',
      industrySector: 'CONSTRUCTION',
      hasPhysicalSites: true,
      hasProductionProcess: false,
      hasFleet: true,
      hasIoTMeters: false,
      isUKPublicContractor: false,
      hasPlanningConsent: false,
      makesPublicGreenClaims: false,
      serviceLinesRequested: ['FLEET'],
      fleetProfile: { assetCountBand: 'BAND_11_50', categories: ['EXCAVATOR', 'GENERATOR'], cloudConnection: 'SOME' },
      completedAt: new Date(),
    },
  });
});

afterAll(async () => {
  const ids = [licenseeA, licenseeB];
  await prisma.fleetSetupRequest.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.serviceRoutingEvent.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.clientAssessment.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.fleetAsset.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.portalUser.deleteMany({ where: { id: { in: [userA, userB, adminId] } } });
  await prisma.licensee.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

const setBranch = (token: string, ids: string[], branch: string) =>
  request(app).post('/api/fleet/assets/connection').set('Authorization', `Bearer ${token}`).send({ assetIds: ids, branch });

describe('Fleet asset connections', () => {
  it('starts every asset unconfirmed and shows the onboarding answer only as a hint', async () => {
    const res = await request(app).get('/api/fleet/connections').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(res.body.counts).toEqual({ UNCONFIRMED: 3, CLOUD_CONNECTED: 0, TRACKING_DEVICE: 0, MANUAL: 0 });
    expect(res.body.onboardingCloudConnection).toBe('SOME');
  });

  it('rejects unknown branches, a reset to unconfirmed, and other tenants\' assets', async () => {
    await setBranch(tokenA, [assetIds['A:EX-01']], 'WIFI').expect(400);
    await setBranch(tokenA, [assetIds['A:EX-01']], 'UNCONFIRMED').expect(400);
    await setBranch(tokenA, [], 'MANUAL').expect(400);
    await setBranch(tokenA, [assetIds['B:EX-01']], 'MANUAL').expect(404);
    const b = await prisma.fleetAsset.findUnique({ where: { id: assetIds['B:EX-01'] } });
    expect(b!.connectionBranch).toBe('UNCONFIRMED');
  });

  it('records each confirmation and logs it as a routing decision', async () => {
    const res = await setBranch(tokenA, [assetIds['A:EX-01'], assetIds['A:EX-02']], 'CLOUD_CONNECTED').expect(200);
    expect(res.body).toEqual({ updated: 2, unchanged: 0 });
    await setBranch(tokenA, [assetIds['A:GEN-03']], 'TRACKING_DEVICE').expect(200);

    const ex01 = await prisma.fleetAsset.findUnique({ where: { id: assetIds['A:EX-01'] } });
    expect(ex01).toMatchObject({ connectionBranch: 'CLOUD_CONNECTED', connectionConfirmedById: userA });
    expect(ex01!.connectionConfirmedAt).toBeInstanceOf(Date);

    const events = await prisma.serviceRoutingEvent.findMany({ where: { licenseeId: licenseeA, eventType: 'FLEET_ASSET_BRANCH_SET' }, orderBy: { createdAt: 'asc' } });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ serviceLine: 'FLEET', actor: userA });
    expect(events[0].detail).toEqual({
      branch: 'CLOUD_CONNECTED',
      assets: [
        { assetTag: 'EX-01', from: 'UNCONFIRMED', to: 'CLOUD_CONNECTED' },
        { assetTag: 'EX-02', from: 'UNCONFIRMED', to: 'CLOUD_CONNECTED' },
      ],
    });

    // Confirming the same branch again changes nothing and logs nothing.
    const again = await setBranch(tokenA, [assetIds['A:EX-01']], 'CLOUD_CONNECTED').expect(200);
    expect(again.body).toEqual({ updated: 0, unchanged: 1 });
    expect(await prisma.serviceRoutingEvent.count({ where: { licenseeId: licenseeA, eventType: 'FLEET_ASSET_BRANCH_SET' } })).toBe(2);

    const overview = await request(app).get('/api/fleet/connections').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(overview.body.counts).toEqual({ UNCONFIRMED: 0, CLOUD_CONNECTED: 2, TRACKING_DEVICE: 1, MANUAL: 0 });
  });
});

describe('Tracking-device set-up calls', () => {
  const requestCall = (token: string, body: Record<string, unknown>) =>
    request(app).post('/api/fleet/setup-requests').set('Authorization', `Bearer ${token}`).send(body);

  it('accepts a request only for tracking-device assets, with a valid contact', async () => {
    await requestCall(tokenA, { assetIds: [assetIds['A:EX-01']], contactName: 'Sam', contactEmail: 'sam@example.com' }).expect(400);
    await requestCall(tokenA, { assetIds: [assetIds['A:GEN-03']], contactName: 'Sam', contactEmail: 'not-an-email' }).expect(400);
    await requestCall(tokenA, { assetIds: [assetIds['A:GEN-03']], contactEmail: 'sam@example.com' }).expect(400);

    const res = await requestCall(tokenA, {
      assetIds: [assetIds['A:GEN-03']],
      contactName: 'Sam Ade',
      contactEmail: 'sam@example.com',
      preferredTimes: 'Weekday mornings',
    }).expect(201);
    expect(res.body.request).toMatchObject({ status: 'REQUESTED', requestedById: userA, assetIds: [assetIds['A:GEN-03']] });

    const dup = await requestCall(tokenA, { assetIds: [assetIds['A:GEN-03']], contactName: 'Sam', contactEmail: 'sam@example.com' }).expect(409);
    expect(dup.body.error).toMatch(/already requested for: GEN-03/);
  });

  it('lets administrators, and only administrators, see and schedule requests', async () => {
    await request(app).get('/api/admin/fleet/setup-requests').set('Authorization', `Bearer ${tokenA}`).expect(403);

    const list = await request(app).get('/api/admin/fleet/setup-requests').set('Authorization', `Bearer ${adminToken}`).expect(200);
    const ours = list.body.requests.find((r: any) => r.licenseeId === licenseeA);
    expect(ours.assets.map((a: any) => a.assetTag)).toEqual(['GEN-03']);
    expect(ours.licensee.id).toBe(licenseeA);

    await request(app).patch(`/api/admin/fleet/setup-requests/${ours.id}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'SCHEDULED' }).expect(400);
    const scheduled = await request(app)
      .patch(`/api/admin/fleet/setup-requests/${ours.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SCHEDULED', scheduledFor: '2026-10-08T09:30:00Z', adminNotes: 'Bring two trackers.' })
      .expect(200);
    expect(scheduled.body.request).toMatchObject({ status: 'SCHEDULED', scheduledFor: '2026-10-08T09:30:00.000Z' });

    const clientView = await request(app).get('/api/fleet/connections').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(clientView.body.setupRequests[0]).toMatchObject({ status: 'SCHEDULED' });
    expect(clientView.body.setupRequests[0]).not.toHaveProperty('adminNotes');

    const other = await request(app).get('/api/fleet/connections').set('Authorization', `Bearer ${tokenB}`).expect(200);
    expect(other.body.setupRequests).toHaveLength(0);
    expect(other.body.onboardingCloudConnection).toBeNull();
  });
});
