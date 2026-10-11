import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { recordHash } from '../src/services/canonical-hash.service';
import { collectFingerprints } from '../src/services/anchor/anchor-batch.service';

const prisma = new PrismaClient();
const app = createApp();
const s = Date.now().toString(36);
let licenseeId: string;
let assetId: string;
let adminId: string;
let token: string;
let adminToken: string;
let factorId: string;
let thresholdId: string;
const valueIds: string[] = [];

beforeAll(async () => {
  licenseeId = (await prisma.licensee.create({ data: { name: `Valuation ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
  await prisma.serviceEntitlement.create({ data: { licenseeId, serviceLine: 'FLEET', status: 'ACTIVE' } });
  adminId = (await prisma.portalUser.create({ data: { email: `val.admin.${s}@test.example`, passwordHash: 'x', role: 'ADMIN' } })).id;
  token = jwt.sign({ userId: `u_${s}`, role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
  adminToken = jwt.sign({ userId: adminId, role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
  assetId = (
    await prisma.fleetAsset.create({
      data: { licenseeId, assetTag: 'EX-V', name: 'Excavator', category: 'EXCAVATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true },
    })
  ).id;
  factorId = (
    await prisma.emissionFactor.create({
      data: { source: `VAL-${s}`, publicationYear: 2025, fuelType: 'DIESEL_MINERAL', unit: 'litre', kgCo2ePerUnit: 2.7, citation: 'test', createdByUserId: adminId },
    })
  ).id;
  const schema = await prisma.fleetSchemaVersion.findFirstOrThrow();
  await prisma.fleetReading.create({
    data: {
      licenseeId,
      assetId,
      source: 'CSV_UPLOAD',
      periodStart: new Date('2025-03-01T00:00:00Z'),
      periodEnd: new Date('2025-03-11T00:00:00Z'),
      fuelQuantity: 1000,
      fuelUnit: 'litre',
      engineHours: 500,
      kgCo2e: 2700,
      emissionFactorId: factorId,
      schemaVersionId: schema.id,
    },
  });
  thresholdId = (
    await prisma.weatherThresholdSet.create({
      data: { version: `val-${s}`, heatAboveC: 30, frostBelowC: 0, heavyRainMmPerHour: 4, highWindKmh: 50, source: 'test', createdByUserId: adminId },
    })
  ).id;
  await prisma.fleetWeatherExposure.create({
    data: { licenseeId, assetId, date: new Date('2025-03-05'), operatingHours: 500, heatHours: 0, frostHours: 100, heavyRainHours: 50, highWindHours: 0, thresholdSetId: thresholdId, source: 'test' },
  });
  for (const [code, date, value] of [
    ['UK_DIESEL_EX_VAT', '2025-03-04', '1.5'],
    ['UK_ETS_CARBON_PRICE', '2025-03-03', '50'],
  ] as const) {
    const index = await prisma.marketIndex.findUniqueOrThrow({ where: { code } });
    valueIds.push((await prisma.marketIndexValue.create({ data: { indexId: index.id, effectiveDate: new Date(`${date}T00:00:00Z`), value, sourceReference: `valuation test ${s}` } })).id);
  }
});

afterAll(async () => {
  await prisma.fleetAssetValuation.deleteMany({ where: { licenseeId } });
  await prisma.fleetWeatherExposure.deleteMany({ where: { licenseeId } });
  await prisma.fleetReading.deleteMany({ where: { licenseeId } });
  await prisma.marketIndexValue.deleteMany({ where: { id: { in: valueIds } } });
  await prisma.emissionFactor.delete({ where: { id: factorId } });
  await prisma.weatherThresholdSet.delete({ where: { id: thresholdId } });
  await prisma.fleetAsset.deleteMany({ where: { licenseeId } });
  await prisma.serviceEntitlement.deleteMany({ where: { licenseeId } });
  await prisma.licensee.delete({ where: { id: licenseeId } });
  await prisma.$disconnect();
});

describe('Machine value and total cost of ownership', () => {
  it('needs finance details first', async () => {
    await request(app).post(`/api/fleet/value/${assetId}`).set('Authorization', `Bearer ${token}`).send({ asOf: '2025-12-31' }).expect(409);
    await request(app)
      .put(`/api/fleet/finance/${assetId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'GBP', acquisitionCostPence: 10_000_000, acquisitionDate: '2025-01-01', expectedLifeYears: '10', expectedLifeHours: '10000', residualValuePence: 2_000_000 })
      .expect(200);
  });

  it('only administrators publish wear coefficients, as immutable versions', async () => {
    const body = {
      version: `wear-${s}`,
      source: 'Test coefficients',
      coefficients: [{ category: 'EXCAVATOR', heatPctPerHour: '0', frostPctPerHour: '0.01', rainPctPerHour: '0.02', windPctPerHour: '0' }],
    };
    await request(app).post('/api/admin/wear-coefficients').set('Authorization', `Bearer ${token}`).send(body).expect(403);
    await request(app).post('/api/admin/wear-coefficients').set('Authorization', `Bearer ${adminToken}`).send({ ...body, coefficients: [] }).expect(400);
    await request(app).post('/api/admin/wear-coefficients').set('Authorization', `Bearer ${adminToken}`).send(body).expect(201);
    await request(app).post('/api/admin/wear-coefficients').set('Authorization', `Bearer ${adminToken}`).send(body).expect(409);
    const set = await prisma.wearCoefficientSet.findUniqueOrThrow({ where: { version: `wear-${s}` }, include: { coefficients: true } });
    await expect(prisma.wearCoefficient.update({ where: { id: set.coefficients[0].id }, data: { frostPctPerHour: 5 } })).rejects.toThrow();
  });

  it('estimates value from use and weather, and ownership cost from dated fuel and carbon prices', async () => {
    const res = await request(app).post(`/api/fleet/value/${assetId}`).set('Authorization', `Bearer ${token}`).send({ asOf: '2025-12-31' }).expect(201);
    const v = res.body.valuation;
    const r = v.results;
    expect(v.methodVersion).toBe('VALUE_TCO_2026.1');
    expect(r.baseWearBasis).toBe('OPERATING_HOURS');
    expect(r.baseWearPence).toBe(400_000); // 80,000 x 500/10,000
    expect(r.weatherWearPence).toBe(160_000); // 80,000 x (100 x 0.01% + 50 x 0.02%)
    expect(r.valueLostPence).toBe(560_000);
    expect(r.estimatedValuePence).toBe(9_440_000);
    expect(r.fuel.costPence).toBe(150_000); // 1000 l x 1.50
    expect(r.carbon.costPence).toBe(13_500); // 2.7 t x 50
    expect(r.totalCostOfOwnershipPence).toBe(723_500);
    expect(r.tcoPerOperatingHourPence).toBe(1447);
    expect(r.notIncluded).toContain('maintenance');
    expect(v.inputs.wearCoefficients.version).toBe(`wear-${s}`);
    expect(v.inputs.marketValueIds.sort()).toEqual([...valueIds].sort());

    const stored = await prisma.fleetAssetValuation.findUniqueOrThrow({ where: { id: v.id } });
    expect(stored.recordSha256).toBe(recordHash({ assetId, asOf: '2025-12-31', methodVersion: stored.methodVersion, inputs: stored.inputs, results: stored.results }));
    await expect(prisma.fleetAssetValuation.update({ where: { id: v.id }, data: { methodVersion: 'x' } })).rejects.toThrow();

    const latest = await request(app).get('/api/fleet/value').set('Authorization', `Bearer ${token}`).expect(200);
    expect(latest.body.valuations[0].id).toBe(v.id);

    await collectFingerprints(prisma);
    const leaf = await prisma.anchorLeaf.findUnique({ where: { kind_recordId: { kind: 'FLEET_ASSET_VALUATION', recordId: v.id } } });
    expect(leaf?.recordSha256).toBe(stored.recordSha256);
  });

  it('never values a machine below its residual value', async () => {
    const res = await request(app).post(`/api/fleet/value/${assetId}`).set('Authorization', `Bearer ${token}`).send({ asOf: '2025-12-31' }).expect(201);
    expect(res.body.valuation.results.estimatedValuePence).toBeGreaterThanOrEqual(2_000_000);
    await request(app).post(`/api/fleet/value/${assetId}`).set('Authorization', `Bearer ${token}`).send({ asOf: '2024-01-01' }).expect(400);
  });
});
