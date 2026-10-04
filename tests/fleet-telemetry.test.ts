import request from 'supertest';
import jwt from 'jsonwebtoken';
import { EntitlementStatus, FleetFuelType, PrismaClient, ServiceLine, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { FLEET_SCHEMA_FIELDS, FLEET_SCHEMA_VERSION_ID } from '../src/services/fleet/fleet-schema';
import { importFleetReadings } from '../src/services/fleet/fleet-import.service';
import { purgeExpiredLocations } from '../src/services/fleet/fleet-retention.service';

const prisma = new PrismaClient();
const app = createApp();

// Fixture factor values for tests only. Production factors are entered from the published source.
const FIXTURE_SOURCE = 'TEST FIXTURE TELEMETRY';
const DIESEL_2026 = '2.600000';

let licenseeA: string;
let licenseeB: string;
let userA: string;
let userB: string;
let adminId: string;
let tokenA: string;
let tokenB: string;
let writeKeyA: string;
let readKeyA: string;
let keyB: string;

const snap = (assetTag: string, observedAt: string, meters: Record<string, unknown> = {}) => ({ assetTag, observedAt, ...meters });

async function sendTelemetry(key: string, snapshots: unknown[]) {
  return request(app).post('/api/fleet/v1/telemetry').set('Authorization', `Bearer ${key}`).send({ snapshots });
}

async function createKey(token: string, name: string, scopes: string[]) {
  const res = await request(app).post('/api/fleet/api-keys').set('Authorization', `Bearer ${token}`).send({ name, scopes }).expect(201);
  return res.body.key;
}

beforeAll(async () => {
  const suffix = Date.now().toString(36);
  licenseeA = (await prisma.licensee.create({ data: { name: `Telemetry A ${suffix}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
  licenseeB = (await prisma.licensee.create({ data: { name: `Telemetry B ${suffix}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
  userA = (await prisma.portalUser.create({ data: { email: `tel.a.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licenseeA } })).id;
  userB = (await prisma.portalUser.create({ data: { email: `tel.b.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licenseeB } })).id;
  adminId = (await prisma.portalUser.create({ data: { email: `tel.admin.${suffix}@test.example`, passwordHash: 'x', role: 'ADMIN' } })).id;
  tokenA = jwt.sign({ userId: userA, role: 'PARTNER', licenseeId: licenseeA }, JWT_SECRET, { expiresIn: '1h' });
  tokenB = jwt.sign({ userId: userB, role: 'PARTNER', licenseeId: licenseeB }, JWT_SECRET, { expiresIn: '1h' });

  await prisma.serviceEntitlement.create({ data: { licenseeId: licenseeA, serviceLine: ServiceLine.FLEET, status: EntitlementStatus.ACTIVE } });
  await prisma.emissionFactor.create({
    data: { source: FIXTURE_SOURCE, publicationYear: 2026, fuelType: FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND, unit: 'litre', kgCo2ePerUnit: DIESEL_2026, citation: 'Test fixture', createdByUserId: adminId },
  });
  const asset = (licenseeId: string, assetTag: string, fuelType: FleetFuelType) => ({
    licenseeId, assetTag, name: assetTag, category: 'EXCAVATOR' as const, fuelType, ownership: 'OWNED' as const, operationalControl: true,
  });
  await prisma.fleetAsset.createMany({
    data: [
      asset(licenseeA, 'EX-01', FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND),
      asset(licenseeA, 'EX-02', FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND),
      asset(licenseeA, 'GEN-03', FleetFuelType.PETROL_MINERAL),
      asset(licenseeA, 'CSV-04', FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND),
      asset(licenseeB, 'EX-01', FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND),
    ],
  });
});

afterAll(async () => {
  const ids = [licenseeA, licenseeB];
  await prisma.fleetReading.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.fleetImportBatch.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.fleetFaultCode.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.fleetTelemetrySnapshot.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.fleetApiKey.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.fleetAsset.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.serviceEntitlement.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.emissionFactor.deleteMany({ where: { createdByUserId: adminId } });
  await prisma.portalUser.deleteMany({ where: { id: { in: [userA, userB, adminId] } } });
  await prisma.licensee.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe('Fleet standard schema', () => {
  it('publishes version aemp2-2026.1 with exactly the documented fields', async () => {
    const res = await request(app).get('/api/fleet/v1/schema').expect(200);
    expect(res.body).toMatchObject({ id: FLEET_SCHEMA_VERSION_ID, fields: FLEET_SCHEMA_FIELDS });
    const stored = await prisma.fleetSchemaVersion.findUnique({ where: { id: FLEET_SCHEMA_VERSION_ID } });
    expect(stored!.fieldSpec).toEqual(FLEET_SCHEMA_FIELDS);
  });
});

describe('Fleet API keys', () => {
  it('shows a new key once and stores only its hash', async () => {
    const created = await createKey(tokenA, 'Telematics bridge', ['telemetry:write']);
    writeKeyA = created.key;
    expect(writeKeyA).toMatch(/^flt_[0-9A-Za-z]{40}$/);
    readKeyA = (await createKey(tokenA, 'Reporting', ['fleet:read'])).key;
    keyB = (await createKey(tokenB, 'Other tenant', ['telemetry:write', 'fleet:read'])).key;

    const list = await request(app).get('/api/fleet/api-keys').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(list.body.keys).toHaveLength(2);
    expect(JSON.stringify(list.body)).not.toContain(writeKeyA);
    expect(list.body.keys[0]).not.toHaveProperty('keyHash');
    const stored = await prisma.fleetApiKey.findFirst({ where: { licenseeId: licenseeA, name: 'Telematics bridge' } });
    expect(stored!.keyHash).not.toBe(writeKeyA);
    expect(stored!.keyPrefix).toBe(writeKeyA.slice(0, 12));
  });

  it('rejects bad input when creating a key', async () => {
    await request(app).post('/api/fleet/api-keys').set('Authorization', `Bearer ${tokenA}`).send({ name: '', scopes: ['fleet:read'] }).expect(400);
    await request(app).post('/api/fleet/api-keys').set('Authorization', `Bearer ${tokenA}`).send({ name: 'x', scopes: ['admin'] }).expect(400);
  });

  it('refuses missing, unknown and wrongly scoped keys', async () => {
    await request(app).post('/api/fleet/v1/telemetry').send({ snapshots: [] }).expect(401);
    await sendTelemetry('flt_' + 'x'.repeat(40), [snap('EX-01', '2026-03-01T00:00:00Z')]).then((r) => expect(r.status).toBe(401));
    await sendTelemetry(readKeyA, [snap('EX-01', '2026-03-01T00:00:00Z')]).then((r) => expect(r.status).toBe(403));
    await request(app).get('/api/fleet/v1/assets').set('X-API-Key', writeKeyA).expect(403);
  });

  it('requires an active Fleet subscription to send telemetry', async () => {
    const res = await sendTelemetry(keyB, [snap('EX-01', '2026-03-01T00:00:00Z')]);
    expect(res.status).toBe(402);
  });

  it('stops working once revoked', async () => {
    const temp = await createKey(tokenA, 'Temporary', ['fleet:read']);
    await request(app).get('/api/fleet/v1/assets').set('Authorization', `Bearer ${temp.key}`).expect(200);
    await request(app).post(`/api/fleet/api-keys/${temp.id}/revoke`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    await request(app).get('/api/fleet/v1/assets').set('Authorization', `Bearer ${temp.key}`).expect(401);
    await request(app).post(`/api/fleet/api-keys/${temp.id}/revoke`).set('Authorization', `Bearer ${tokenB}`).expect(404);
  });
});

describe('Fleet telemetry ingestion', () => {
  it('uses the first snapshot as the starting meters', async () => {
    const res = await sendTelemetry(writeKeyA, [
      snap('EX-01', '2026-03-01T06:00:00Z', {
        cumulativeOperatingHours: 1200,
        cumulativeIdleHours: 300,
        cumulativeFuelUsedLitres: '45000.000',
        odometerKm: 0,
        location: { latitude: 51.5072, longitude: -0.1276 },
      }),
    ]);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ accepted: 1, readingsCreated: 0, schemaVersion: FLEET_SCHEMA_VERSION_ID });
  });

  it('calculates fuel, hours and CO2e between consecutive snapshots', async () => {
    const res = await sendTelemetry(writeKeyA, [
      snap('EX-01', '2026-03-01T18:00:00Z', {
        cumulativeOperatingHours: '1210.50',
        cumulativeIdleHours: '302.25',
        cumulativeFuelUsedLitres: '45180.500',
        odometerKm: 0,
        engineRunning: false,
        faultCodes: [{ code: 'SPN 110 FMI 0', severity: 'high', description: 'Engine coolant temperature high' }],
      }),
    ]);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ accepted: 1, readingsCreated: 1, totalKgCo2e: '469.300' });

    const reading = await prisma.fleetReading.findFirst({ where: { licenseeId: licenseeA, source: 'CLIENT_API' } });
    expect(reading).toMatchObject({ schemaVersionId: FLEET_SCHEMA_VERSION_ID });
    expect(reading!.fuelQuantity.toFixed(3)).toBe('180.500');
    expect(reading!.engineHours!.toFixed(2)).toBe('10.50');
    expect(reading!.idleHours!.toFixed(2)).toBe('2.25');
    expect(reading!.periodStart.toISOString()).toBe('2026-03-01T06:00:00.000Z');
    expect(reading!.periodEnd.toISOString()).toBe('2026-03-01T18:00:00.000Z');
    expect(reading!.startSnapshotId).toBeTruthy();
    expect(reading!.endSnapshotId).toBeTruthy();
    expect(await prisma.fleetFaultCode.count({ where: { licenseeId: licenseeA, code: 'SPN 110 FMI 0' } })).toBe(1);
  });

  it('treats a resent snapshot as a duplicate and an older one as out of order', async () => {
    const dup = await sendTelemetry(writeKeyA, [snap('EX-01', '2026-03-01T18:00:00Z', { cumulativeFuelUsedLitres: '45180.500' })]);
    expect(dup.status).toBe(200);
    expect(dup.body).toMatchObject({ accepted: 0, duplicates: 1, readingsCreated: 0 });

    const old = await sendTelemetry(writeKeyA, [snap('EX-01', '2026-03-01T12:00:00Z', { cumulativeFuelUsedLitres: '45100' })]);
    expect(old.status).toBe(422);
    expect(old.body.rejected[0].reason).toMatch(/older than one already received/);
  });

  it('never calculates across a meter that went backwards', async () => {
    const res = await sendTelemetry(writeKeyA, [
      snap('EX-01', '2026-03-02T06:00:00Z', { cumulativeOperatingHours: 2, cumulativeFuelUsedLitres: 40 }),
      snap('EX-01', '2026-03-02T18:00:00Z', { cumulativeOperatingHours: 10, cumulativeFuelUsedLitres: 140 }),
    ]);
    expect(res.body.accepted).toBe(2);
    expect(res.body.readingsCreated).toBe(1);
    expect(res.body.notCalculated[0]).toMatchObject({ index: 0, reason: expect.stringMatching(/went backwards/) });
    const after = await prisma.fleetReading.findFirst({ where: { licenseeId: licenseeA, periodStart: new Date('2026-03-02T06:00:00Z') } });
    expect(after!.fuelQuantity.toFixed(3)).toBe('100.000');
  });

  it('rejects invalid snapshots individually with reasons', async () => {
    const res = await sendTelemetry(writeKeyA, [
      snap('ZZ-99', '2026-03-03T00:00:00Z'),
      snap('EX-02', '2999-01-01T00:00:00Z'),
      snap('EX-02', '2026-03-03T00:00:00'),
      snap('EX-02', '2026-03-03T00:00:00Z', { location: { latitude: 51 } }),
      snap('EX-02', '2026-03-03T00:00:00Z', { cumulativeOperatingHours: 10, cumulativeIdleHours: 11 }),
      snap('EX-02', '2026-03-03T00:00:00Z', { cumulativeFuelUsedLitres: -5 }),
      snap('EX-02', '2026-03-03T00:00:00Z', { cumulativeFuelUsedLitres: 100 }),
    ]);
    expect(res.status).toBe(201);
    expect(res.body.accepted).toBe(1);
    expect(res.body.rejected.map((r: any) => r.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(res.body.rejected.map((r: any) => r.reason)).toEqual([
      expect.stringMatching(/not registered/),
      expect.stringMatching(/future/),
      expect.stringMatching(/time zone/),
      expect.stringMatching(/both latitude and longitude/),
      expect.stringMatching(/cannot exceed/),
      expect.stringMatching(/between 0/),
    ]);
    await sendTelemetry(writeKeyA, []).then((r) => expect(r.status).toBe(400));
    await request(app).post('/api/fleet/v1/telemetry').set('Authorization', `Bearer ${writeKeyA}`).send({}).expect(400);
  });

  it('does not store a snapshot whose period has no emission factor, so nothing is lost', async () => {
    await sendTelemetry(writeKeyA, [snap('GEN-03', '2026-03-01T00:00:00Z', { cumulativeFuelUsedLitres: 10 })]);
    const missing = await sendTelemetry(writeKeyA, [snap('GEN-03', '2026-03-02T00:00:00Z', { cumulativeFuelUsedLitres: 60 })]);
    expect(missing.status).toBe(422);
    expect(missing.body.rejected[0].reason).toMatch(/No emission factor.*not stored/);

    await prisma.emissionFactor.create({
      data: { source: FIXTURE_SOURCE, publicationYear: 2026, fuelType: FleetFuelType.PETROL_MINERAL, unit: 'litre', kgCo2ePerUnit: '2.000000', citation: 'Test fixture', createdByUserId: adminId },
    });
    const resent = await sendTelemetry(writeKeyA, [snap('GEN-03', '2026-03-02T00:00:00Z', { cumulativeFuelUsedLitres: 60 })]);
    expect(resent.body).toMatchObject({ accepted: 1, readingsCreated: 1, totalKgCo2e: '100.000' });
  });

  it('does not count fuel twice when the period is already recorded from an upload', async () => {
    const csv = ['asset_tag,period_start,period_end,fuel_litres', 'CSV-04,2026-03-01,2026-03-31,900'].join('\n');
    const imported = await importFleetReadings(prisma, { userId: userA, licenseeId: licenseeA }, 'march.csv', csv);
    expect(imported.rowsAccepted).toBe(1);
    const csvReading = await prisma.fleetReading.findFirst({ where: { licenseeId: licenseeA, source: 'CSV_UPLOAD' } });
    expect(csvReading!.schemaVersionId).toBe(FLEET_SCHEMA_VERSION_ID);

    const res = await sendTelemetry(writeKeyA, [
      snap('CSV-04', '2026-03-10T00:00:00Z', { cumulativeFuelUsedLitres: 1000 }),
      snap('CSV-04', '2026-03-11T00:00:00Z', { cumulativeFuelUsedLitres: 1100 }),
    ]);
    expect(res.body).toMatchObject({ accepted: 2, readingsCreated: 0 });
    expect(res.body.notCalculated[0].reason).toMatch(/already recorded from CSV_UPLOAD/);
  });

  it('keeps tenants apart', async () => {
    await prisma.serviceEntitlement.create({ data: { licenseeId: licenseeB, serviceLine: ServiceLine.FLEET, status: EntitlementStatus.ACTIVE } });
    const res = await sendTelemetry(keyB, [snap('EX-01', '2026-03-05T00:00:00Z', { cumulativeFuelUsedLitres: 5 })]);
    expect(res.status).toBe(201);
    const bAssets = await request(app).get('/api/fleet/v1/assets').set('Authorization', `Bearer ${keyB}`).expect(200);
    expect(bAssets.body.assets.map((a: any) => a.assetTag)).toEqual(['EX-01']);
    expect(bAssets.body.assets[0].latestTelemetry.observedAt).toBe('2026-03-05T00:00:00.000Z');
    expect(await prisma.fleetTelemetrySnapshot.count({ where: { licenseeId: licenseeA, observedAt: new Date('2026-03-05T00:00:00Z') } })).toBe(0);
  });

  it('serves assets with latest telemetry and a summary that includes telemetry readings', async () => {
    const assets = await request(app).get('/api/fleet/v1/assets').set('Authorization', `Bearer ${readKeyA}`).expect(200);
    const ex01 = assets.body.assets.find((a: any) => a.assetTag === 'EX-01');
    expect(ex01.latestTelemetry).toMatchObject({ source: 'CLIENT_API', observedAt: '2026-03-02T18:00:00.000Z' });
    expect(ex01).not.toHaveProperty('id');

    const summary = await request(app).get('/api/fleet/v1/summary?from=2026-03-01&to=2026-03-31').set('Authorization', `Bearer ${readKeyA}`).expect(200);
    // 469.300 + 260.000 (EX-01) + 100.000 (GEN-03) + 2340.000 (CSV-04 upload)
    expect(summary.body.scope1.kgCo2e).toBe('3169.300');
  });
});

describe('Fleet location retention', () => {
  it('clears location history older than 90 days but keeps each asset\'s latest position', async () => {
    const now = new Date('2026-09-01T00:00:00Z');
    // EX-01's located snapshot (2026-03-01) is its latest located one, so it is kept.
    await sendTelemetry(writeKeyA, [
      snap('EX-02', '2026-03-04T00:00:00Z', { cumulativeFuelUsedLitres: 100, location: { latitude: 52.1, longitude: -1.2 } }),
      snap('EX-02', '2026-03-05T00:00:00Z', { cumulativeFuelUsedLitres: 100, location: { latitude: 52.2, longitude: -1.3 } }),
    ]);
    await purgeExpiredLocations(prisma, now);

    const ex02 = await prisma.fleetTelemetrySnapshot.findMany({
      where: { licenseeId: licenseeA, asset: { assetTag: 'EX-02' }, observedAt: { gte: new Date('2026-03-04T00:00:00Z') } },
      orderBy: { observedAt: 'asc' },
    });
    expect(ex02.map((s) => s.latitude?.toFixed(1) ?? null)).toEqual([null, '52.2']);
    const ex01 = await prisma.fleetTelemetrySnapshot.findFirst({ where: { licenseeId: licenseeA, asset: { assetTag: 'EX-01' }, latitude: { not: null } } });
    expect(ex01!.latitude!.toFixed(4)).toBe('51.5072');
  });
});
