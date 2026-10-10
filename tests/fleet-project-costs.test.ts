import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { recordHash } from '../src/services/canonical-hash.service';
import { verifyLedgerHash } from '../src/services/fleet/fleet-ledger.service';

const prisma = new PrismaClient();
const app = createApp();
const s = Date.now().toString(36);

let licenseeId: string;
let userId: string;
let token: string;
let adminToken: string;
let projectId: string;
let assetId: string;
const valueIds: string[] = [];
let steelId: string;
let factorId: string;

beforeAll(async () => {
  licenseeId = (await prisma.licensee.create({ data: { name: `Costs ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
  await prisma.serviceEntitlement.create({ data: { licenseeId, serviceLine: 'FLEET', status: 'ACTIVE' } });
  userId = (await prisma.portalUser.create({ data: { email: `costs.${s}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId } })).id;
  const adminId = (await prisma.portalUser.create({ data: { email: `costs.admin.${s}@test.example`, passwordHash: 'x', role: 'ADMIN' } })).id;
  token = jwt.sign({ userId, role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
  adminToken = jwt.sign({ userId: adminId, role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });

  assetId = (
    await prisma.fleetAsset.create({
      data: { licenseeId, assetTag: 'EX-1', name: 'Excavator', category: 'EXCAVATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true },
    })
  ).id;
  factorId = (
    await prisma.emissionFactor.create({
      data: { source: `TEST-${s}`, publicationYear: 2025, fuelType: 'DIESEL_MINERAL', unit: 'litre', kgCo2ePerUnit: 2.7, citation: 'test', createdByUserId: adminId },
    })
  ).id;
  const schema = await prisma.fleetSchemaVersion.findFirstOrThrow();
  // 10-day reading: 1000 l, 100 engine hours, 20 idle hours, 2700 kg CO2e.
  await prisma.fleetReading.create({
    data: {
      licenseeId,
      assetId,
      source: 'CSV_UPLOAD',
      periodStart: new Date('2025-03-01T00:00:00Z'),
      periodEnd: new Date('2025-03-11T00:00:00Z'),
      fuelQuantity: 1000,
      fuelUnit: 'litre',
      engineHours: 100,
      idleHours: 20,
      kgCo2e: 2700,
      emissionFactorId: factorId,
      schemaVersionId: schema.id,
    },
  });

  const idx = (code: string) => prisma.marketIndex.findUniqueOrThrow({ where: { code } });
  const diesel = await idx('UK_DIESEL_EX_VAT');
  const carbon = await idx('UK_ETS_CARBON_PRICE');
  const steel = await idx('UK_STEEL_REBAR');
  steelId = steel.id;
  for (const [indexId, date, value] of [
    [diesel.id, '2025-02-24', '1.6'],
    [carbon.id, '2025-01-01', '40'],
    [steel.id, '2025-03-01', '650'],
  ] as const) {
    const v = await prisma.marketIndexValue.create({ data: { indexId, effectiveDate: new Date(`${date}T00:00:00Z`), value, sourceReference: `cost test ${s}` } });
    valueIds.push(v.id);
  }
});

afterAll(async () => {
  await prisma.fleetProject.deleteMany({ where: { licenseeId } });
  await prisma.fleetReading.deleteMany({ where: { licenseeId } });
  await prisma.marketIndexValue.deleteMany({ where: { id: { in: valueIds } } });
  await prisma.emissionFactor.delete({ where: { id: factorId } });
  await prisma.fleetAsset.deleteMany({ where: { licenseeId } });
  await prisma.serviceEntitlement.deleteMany({ where: { licenseeId } });
  await prisma.portalUser.deleteMany({ where: { email: { in: [`costs.${s}@test.example`, `costs.admin.${s}@test.example`] } } });
  await prisma.licensee.delete({ where: { id: licenseeId } });
  await prisma.$disconnect();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('Contract cost calculation', () => {
  beforeAll(async () => {
    const p = await request(app)
      .post('/api/fleet/projects')
      .set(auth())
      .send({ name: 'Bridge deck', contractValuePence: 10_000_000, budgetedMarginBps: 1200, currency: 'GBP', startDate: '2025-03-01', endDate: '2025-03-31' })
      .expect(201);
    projectId = p.body.project.id;
    // On the project for the last 5 of the reading's 10 days.
    await request(app).post(`/api/fleet/projects/${projectId}/assets`).set(auth()).send({ assetId, fromDate: '2025-03-06', toDate: '2025-03-31' }).expect(201);
  });

  it('records contract materials against active material prices only', async () => {
    const prices = await request(app).get('/api/fleet/projects/material-prices').set(auth()).expect(200);
    expect(prices.body.indices.some((i: { id: string }) => i.id === steelId)).toBe(true);
    await request(app).put(`/api/fleet/projects/${projectId}/materials`).set(auth()).send({ indexId: steelId, quantity: '-1', budgetUnitPrice: '600' }).expect(400);
    const res = await request(app).put(`/api/fleet/projects/${projectId}/materials`).set(auth()).send({ indexId: steelId, quantity: '10', budgetUnitPrice: '600' }).expect(200);
    expect(res.body.materials).toHaveLength(1);
  });

  it('prices fuel, carbon, idle time and materials from dated market values and stores an immutable run', async () => {
    const res = await request(app).post(`/api/fleet/projects/${projectId}/costs`).set(auth()).send({}).expect(201);
    const { run } = res.body;
    expect(run.periodFrom).toBe('2025-03-01');
    expect(run.periodTo).toBe('2025-03-31');
    expect(run.methodVersion).toBe('CONTRACT_COST_2026.1');
    const r = run.results;
    expect(r.fuel).toEqual({ litres: '500', costPence: 80000, unpricedLitres: '0' }); // 500 l x 1.60
    expect(r.carbon.tonnesCo2e).toBe('1.35');
    expect(r.carbon.costPence).toBe(5400); // 1.35 t x 40
    expect(r.idle).toEqual({ hours: '10', fuelCostPence: 16000 }); // 800 x 20/100
    expect(r.operatingHours).toBe('50');
    expect(r.operatingCostPence).toBe(85400);
    expect(r.costPerOperatingHourPence).toBe(1708);
    expect(r.materialExposurePence).toBe(50000); // (650 - 600) x 10
    expect(r.budgetedMarginPence).toBe(1_200_000);
    expect(r.totalExposurePence).toBe(135400);
    expect(r.exposureShareOfMarginPercent).toBe('11.28');
    expect(r.marginAfterExposurePence).toBe(1_064_600);
    expect(r.warnings).toEqual([]);
    expect(run.inputs.marketValueIds.sort()).toEqual([...valueIds].sort());

    const stored = await prisma.fleetProjectCostRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(stored.recordSha256).toBe(
      recordHash({ projectId, periodFrom: '2025-03-01', periodTo: '2025-03-31', methodVersion: stored.methodVersion, inputs: stored.inputs, results: stored.results })
    );
    await expect(prisma.fleetProjectCostRun.update({ where: { id: run.id }, data: { methodVersion: 'x' } })).rejects.toThrow();

    const runs = await request(app).get(`/api/fleet/projects/${projectId}/costs`).set(auth()).expect(200);
    expect(runs.body.runs[0].id).toBe(run.id);
  });

  it('refuses to delete a market value a calculation used', async () => {
    const carbon = await prisma.marketIndex.findUniqueOrThrow({ where: { code: 'UK_ETS_CARBON_PRICE' } });
    await request(app)
      .delete(`/api/admin/market-indices/${carbon.id}/values/${valueIds[1]}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('reports missing prices as unpriced instead of assuming them', async () => {
    const schema = await prisma.fleetSchemaVersion.findFirstOrThrow();
    await prisma.fleetReading.create({
      data: {
        licenseeId,
        assetId,
        source: 'CSV_UPLOAD',
        periodStart: new Date('1999-06-01T00:00:00Z'),
        periodEnd: new Date('1999-06-11T00:00:00Z'),
        fuelQuantity: 200,
        fuelUnit: 'litre',
        engineHours: 10,
        kgCo2e: 540,
        emissionFactorId: factorId,
        schemaVersionId: schema.id,
      },
    });
    const p = await request(app)
      .post('/api/fleet/projects')
      .set(auth())
      .send({ name: 'Early works', contractValuePence: 1_000_000, budgetedMarginBps: 1000, currency: 'GBP', startDate: '1999-06-01', endDate: '1999-06-30' })
      .expect(201);
    await request(app).post(`/api/fleet/projects/${p.body.project.id}/assets`).set(auth()).send({ assetId, fromDate: '1999-06-01', toDate: '1999-06-30' }).expect(201);
    const res = await request(app).post(`/api/fleet/projects/${p.body.project.id}/costs`).set(auth()).send({}).expect(201);
    const r = res.body.run.results;
    expect(r.fuel).toEqual({ litres: '200', costPence: 0, unpricedLitres: '200' });
    expect(r.carbon.unpricedTonnesCo2e).toBe('0.54');
    expect(r.warnings.some((w: string) => w.startsWith('UK_DIESEL_EX_VAT has no value'))).toBe(true);
    expect(r.warnings.some((w: string) => w.startsWith('UK_ETS_CARBON_PRICE has no value'))).toBe(true);
  });

  it('validates the period', async () => {
    await request(app).post(`/api/fleet/projects/${projectId}/costs`).set(auth()).send({ from: '2025-02-01' }).expect(400);
    await request(app).post(`/api/fleet/projects/${projectId}/costs`).set(auth()).send({ from: '2025-03-20', to: '2025-03-10' }).expect(400);
  });
});

describe('Climate ledger export', () => {
  it('reports emissions, the carbon prices used and each project latest cost run, with a verifiable hash', async () => {
    await request(app).get('/api/fleet/ledger?from=2025-03-31&to=2025-03-01').set(auth()).expect(400);
    const res = await request(app).get('/api/fleet/ledger?from=2025-03-01&to=2025-03-31').set(auth()).expect(200);
    const l = res.body;
    expect(l.schema).toBe('NFTYLOGS-CLIMATE-LEDGER-2026.1');
    expect(l.period).toEqual({ from: '2025-03-01', to: '2025-03-31' });
    expect(l.ghgEmissions.scope1.tonnesCo2e).toBe('2.7');
    expect(l.internalCarbonPrices).toEqual([expect.objectContaining({ indexCode: 'UK_ETS_CARBON_PRICE', value: '40' })]);

    const latest = await prisma.fleetProjectCostRun.findFirstOrThrow({ where: { projectId }, orderBy: { createdAt: 'desc' } });
    const entry = l.transitionRiskExposure.projects.find((p: { costRunId: string }) => p.costRunId === latest.id);
    expect(entry).toMatchObject({ projectName: 'Bridge deck', recordSha256: latest.recordSha256, costPerOperatingHourPence: 1708, totalExposurePence: 135400 });
    expect(res.headers['x-ledger-sha256']).toBe(l.ledgerSha256);
    expect(verifyLedgerHash(l)).toBe(true);
    expect(verifyLedgerHash({ ...l, ghgEmissions: { ...l.ghgEmissions, scope1: { ...l.ghgEmissions.scope1, tonnesCo2e: '0' } } })).toBe(false);

    const csv = await request(app).get('/api/fleet/ledger?from=2025-03-01&to=2025-03-31&format=csv').set(auth()).expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.split('\n')[0]).toBe('section,item,metric,value,unit,reference');
    expect(csv.text).toContain('ghg_emissions,scope1,emissions,2.7,tCO2e');
    expect(csv.text).toContain('transition_risk,Bridge deck,cost_per_operating_hour,17.08,GBP');
  });
});

