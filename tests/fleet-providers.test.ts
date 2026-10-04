import crypto from 'crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { EntitlementStatus, FleetFuelType, PrismaClient, ServiceLine, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { FieldMappingError, applyFieldMapping, readPath, validateFieldMapping } from '../src/services/fleet/fleet-field-mapping';
import { decryptSecret } from '../src/services/secret-box.service';
import { FLEET_SCHEMA_VERSION_ID } from '../src/services/fleet/fleet-schema';

const prisma = new PrismaClient();
const app = createApp();

/** A made-up tracker format: minutes, US gallons, miles, epoch seconds, nested fields. */
const MAPPING = {
  messagesPath: 'readings',
  deviceIdPath: 'imei',
  observedAt: { path: 'ts', format: 'epoch_seconds' },
  fields: {
    cumulativeOperatingHours: { path: 'engine.minutes', unit: 'minute' },
    cumulativeFuelUsedLitres: { path: 'fuel.totalGal', unit: 'us_gallon' },
    fuelRemainingPercent: { path: 'fuel.level', unit: 'fraction' },
    odometerKm: { path: 'odo', unit: 'mile' },
    engineRunning: { path: 'ign', trueValues: ['ON'] },
    latitude: { path: 'gps[0]' },
    longitude: { path: 'gps[1]' },
  },
  faultCodes: { path: 'dtc', codePath: 'c', severityPath: 's' },
};

describe('Field mapping', () => {
  it('reads nested and indexed paths', () => {
    expect(readPath({ a: { b: [{ c: 5 }] } }, 'a.b[0].c')).toBe(5);
    expect(readPath({ a: 1 }, 'a.b.c')).toBeUndefined();
  });

  it('converts units exactly and fills the standard schema', () => {
    const { externalDeviceId, snapshot } = applyFieldMapping(validateFieldMapping(MAPPING), {
      imei: 356938035643809,
      ts: 1772366400,
      engine: { minutes: 90 },
      fuel: { totalGal: '10', level: 0.425 },
      odo: 100,
      ign: 'ON',
      gps: [51.50722, -0.12758],
      dtc: [{ c: 'P0217', s: 3 }],
    });
    expect(externalDeviceId).toBe('356938035643809');
    expect(snapshot).toEqual({
      observedAt: '2026-03-01T12:00:00.000Z',
      cumulativeOperatingHours: '1.50',
      cumulativeFuelUsedLitres: '37.854',
      fuelRemainingPercent: '42.50',
      odometerKm: '160.93',
      engineRunning: true,
      location: { latitude: '51.507220', longitude: '-0.127580' },
      faultCodes: [{ code: 'P0217', severity: '3', description: null }],
    });
  });

  it('lists every problem in a bad mapping', () => {
    try {
      validateFieldMapping({ deviceIdPath: 'id;drop', observedAt: { path: 't', format: 'unix' }, fields: { fuelBurned: { path: 'f' }, odometerKm: { path: 'o', unit: 'furlong' }, latitude: { path: 'lat' } } });
      throw new Error('expected a FieldMappingError');
    } catch (err) {
      expect(err).toBeInstanceOf(FieldMappingError);
      expect((err as FieldMappingError).problems).toEqual([
        expect.stringMatching(/deviceIdPath must be a path/),
        expect.stringMatching(/observedAt.format/),
        expect.stringMatching(/fuelBurned is not a field/),
        expect.stringMatching(/odometerKm.unit/),
        expect.stringMatching(/both latitude and longitude/),
      ]);
    }
  });
});

describe('Fleet providers and device ingestion', () => {
  let licenseeA: string;
  let licenseeB: string;
  let licenseeC: string;
  let adminId: string;
  let userA: string;
  let adminToken: string;
  let partnerToken: string;
  let sharedProviderId: string;
  let hmacProviderId: string;
  const assets: Record<string, string> = {};
  const SHARED_SECRET = 'shared-secret-for-test-device-01';
  const HMAC_SECRET = 'hmac-secret-for-test-device-0002';

  beforeAll(async () => {
    const s = Date.now().toString(36);
    licenseeA = (await prisma.licensee.create({ data: { name: `Providers A ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
    licenseeB = (await prisma.licensee.create({ data: { name: `Providers B ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
    licenseeC = (await prisma.licensee.create({ data: { name: `Providers C ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
    adminId = (await prisma.portalUser.create({ data: { email: `prov.admin.${s}@test.example`, passwordHash: 'x', role: 'ADMIN' } })).id;
    userA = (await prisma.portalUser.create({ data: { email: `prov.a.${s}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licenseeA } })).id;
    adminToken = jwt.sign({ userId: adminId, role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
    partnerToken = jwt.sign({ userId: userA, role: 'PARTNER', licenseeId: licenseeA }, JWT_SECRET, { expiresIn: '1h' });

    for (const id of [licenseeA, licenseeB]) {
      await prisma.serviceEntitlement.create({ data: { licenseeId: id, serviceLine: ServiceLine.FLEET, status: EntitlementStatus.ACTIVE } });
    }
    await prisma.emissionFactor.create({
      data: { source: 'TEST FIXTURE PROVIDERS', publicationYear: 2026, fuelType: FleetFuelType.DIESEL_MINERAL, unit: 'litre', kgCo2ePerUnit: '2.500000', citation: 'Test fixture', createdByUserId: adminId },
    });
    const make = async (key: string, licenseeId: string, tag: string, branch: 'TRACKING_DEVICE' | 'CLOUD_CONNECTED') => {
      assets[key] = (
        await prisma.fleetAsset.create({
          data: { licenseeId, assetTag: tag, name: tag, category: 'GENERATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true, connectionBranch: branch },
        })
      ).id;
    };
    await make('A1', licenseeA, 'GEN-01', 'TRACKING_DEVICE');
    await make('A2', licenseeA, 'GEN-02', 'TRACKING_DEVICE');
    await make('Acloud', licenseeA, 'EX-09', 'CLOUD_CONNECTED');
    await make('B1', licenseeB, 'GEN-01', 'TRACKING_DEVICE');
    await make('C1', licenseeC, 'GEN-01', 'TRACKING_DEVICE');
  });

  afterAll(async () => {
    const ids = [licenseeA, licenseeB, licenseeC];
    await prisma.fleetReading.deleteMany({ where: { licenseeId: { in: ids } } });
    await prisma.fleetFaultCode.deleteMany({ where: { licenseeId: { in: ids } } });
    await prisma.fleetTelemetrySnapshot.deleteMany({ where: { licenseeId: { in: ids } } });
    await prisma.fleetDeviceBinding.deleteMany({ where: { licenseeId: { in: ids } } });
    await prisma.fleetDataProvider.deleteMany({ where: { createdById: adminId } });
    await prisma.fleetAsset.deleteMany({ where: { licenseeId: { in: ids } } });
    await prisma.serviceEntitlement.deleteMany({ where: { licenseeId: { in: ids } } });
    await prisma.emissionFactor.deleteMany({ where: { createdByUserId: adminId } });
    await prisma.portalUser.deleteMany({ where: { id: { in: [adminId, userA] } } });
    await prisma.licensee.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  const admin = (method: 'get' | 'post' | 'patch', path: string) => request(app)[method](path).set('Authorization', `Bearer ${adminToken}`);
  const device = (providerId: string, body: unknown, headers: Record<string, string>) => {
    let req = request(app).post(`/api/fleet/ingest/devices/${providerId}`).set('Content-Type', 'application/json');
    for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
    return req.send(JSON.stringify(body));
  };
  const reading = (imei: string, ts: number, gallons: number, minutes: number) => ({ imei, ts, fuel: { totalGal: gallons }, engine: { minutes } });

  it('is configured by administrators only, and never returns the secret', async () => {
    await request(app).get('/api/admin/fleet/providers').set('Authorization', `Bearer ${partnerToken}`).expect(403);

    const bad = await admin('post', '/api/admin/fleet/providers').send({ name: 'Bad', kind: 'TRACKING_DEVICE', authType: 'DEVICE_SHARED_KEY', secret: SHARED_SECRET, fieldMapping: { fields: {} } });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/deviceIdPath is required/);
    await admin('post', '/api/admin/fleet/providers').send({ name: 'Short', kind: 'TRACKING_DEVICE', authType: 'DEVICE_SHARED_KEY', secret: 'short', fieldMapping: MAPPING }).expect(400);
    await admin('post', '/api/admin/fleet/providers').send({ name: 'Cloud', kind: 'OEM_CLOUD', authType: 'HTTP_BASIC', secret: SHARED_SECRET, fieldMapping: MAPPING }).expect(400);

    const res = await admin('post', '/api/admin/fleet/providers')
      .send({ name: `Shared-key tracker ${Date.now()}`, kind: 'TRACKING_DEVICE', authType: 'DEVICE_SHARED_KEY', authConfig: { headerName: 'X-Tracker-Key' }, secret: SHARED_SECRET, fieldMapping: MAPPING })
      .expect(201);
    sharedProviderId = res.body.provider.id;
    expect(res.body.provider).toMatchObject({ hasSecret: true, authConfig: { headerName: 'x-tracker-key' }, schemaVersionId: FLEET_SCHEMA_VERSION_ID });
    expect(res.body.provider).not.toHaveProperty('secretCiphertext');
    expect(JSON.stringify(res.body)).not.toContain(SHARED_SECRET);

    const stored = await prisma.fleetDataProvider.findUnique({ where: { id: sharedProviderId } });
    expect(stored!.secretCiphertext).not.toContain(SHARED_SECRET);
    expect(decryptSecret(stored!.secretCiphertext!)).toBe(SHARED_SECRET);

    const hmac = await admin('post', '/api/admin/fleet/providers')
      .send({ name: `HMAC tracker ${Date.now()}`, kind: 'TRACKING_DEVICE', authType: 'DEVICE_HMAC_SHA256', secret: HMAC_SECRET, fieldMapping: MAPPING })
      .expect(201);
    hmacProviderId = hmac.body.provider.id;
    expect(hmac.body.provider.authConfig).toEqual({ signatureHeader: 'x-signature', timestampHeader: 'x-timestamp', toleranceSeconds: 300 });
  });

  it('dry-runs a mapping against a sample without storing anything', async () => {
    const res = await admin('post', '/api/admin/fleet/providers/test-mapping')
      .send({ fieldMapping: MAPPING, sample: { readings: [reading('111', 1772366400, 10, 60), { imei: '222' }] } })
      .expect(200);
    expect(res.body.results[0]).toMatchObject({ ok: true, externalDeviceId: '111', snapshot: { cumulativeFuelUsedLitres: '37.854', cumulativeOperatingHours: '1.00' } });
    expect(res.body.results[1]).toMatchObject({ ok: false, error: expect.stringMatching(/No timestamp/) });
    expect(await prisma.fleetTelemetrySnapshot.count({ where: { licenseeId: licenseeA } })).toBe(0);
  });

  it('binds devices only to tracking-device assets, one active device per asset', async () => {
    await admin('post', '/api/admin/fleet/device-bindings').send({ providerId: sharedProviderId, assetId: assets.Acloud, externalDeviceId: 'IMEI-X' }).expect(400);
    await admin('post', '/api/admin/fleet/device-bindings').send({ providerId: sharedProviderId, assetId: assets.A1, externalDeviceId: 'IMEI-A1' }).expect(201);
    await admin('post', '/api/admin/fleet/device-bindings').send({ providerId: sharedProviderId, assetId: assets.A2, externalDeviceId: 'IMEI-A1' }).expect(409);
    await admin('post', '/api/admin/fleet/device-bindings').send({ providerId: sharedProviderId, assetId: assets.A1, externalDeviceId: 'IMEI-OTHER' }).expect(409);
    await admin('post', '/api/admin/fleet/device-bindings').send({ providerId: sharedProviderId, assetId: assets.B1, externalDeviceId: 'IMEI-B1' }).expect(201);
    await admin('post', '/api/admin/fleet/device-bindings').send({ providerId: sharedProviderId, assetId: assets.C1, externalDeviceId: 'IMEI-C1' }).expect(201);
    await admin('post', '/api/admin/fleet/device-bindings').send({ providerId: hmacProviderId, assetId: assets.A2, externalDeviceId: 'HMAC-A2' }).expect(201);

    const list = await admin('get', '/api/admin/fleet/device-bindings').expect(200);
    const tags = list.body.trackingDeviceAssets.filter((a: any) => [licenseeA, licenseeB].includes(a.licensee.id)).map((a: any) => a.assetTag);
    expect(tags.sort()).toEqual(['GEN-01', 'GEN-01', 'GEN-02']);
  });

  it('refuses unknown providers and wrong keys alike', async () => {
    const body = { readings: [reading('IMEI-A1', 1772366400, 100, 600)] };
    await device(sharedProviderId, body, {}).expect(401);
    await device(sharedProviderId, body, { 'X-Tracker-Key': 'wrong-secret-of-same-size!!!!!!!' }).expect(401);
    await device('provider-that-does-not-exist', body, { 'X-Tracker-Key': SHARED_SECRET }).expect(401);
  });

  it('stores readings per bound asset and client, converted to the standard schema', async () => {
    const res = await device(
      sharedProviderId,
      {
        readings: [
          reading('IMEI-A1', 1772366400, 100, 600),
          reading('IMEI-A1', 1772409600, 110, 1200),
          reading('IMEI-B1', 1772366400, 5, 60),
          reading('IMEI-C1', 1772366400, 5, 60),
          reading('IMEI-UNKNOWN', 1772366400, 5, 60),
          { imei: 'IMEI-A1' },
        ],
      },
      { 'X-Tracker-Key': SHARED_SECRET }
    ).expect(201);

    expect(res.body).toMatchObject({ received: 6, accepted: 3, readingsCreated: 1, schemaVersion: FLEET_SCHEMA_VERSION_ID });
    expect(res.body.rejected).toEqual([
      { index: 3, reason: expect.stringMatching(/without an active Fleet subscription/) },
      { index: 4, reason: 'Device IMEI-UNKNOWN is not bound to an asset.' },
      { index: 5, reason: expect.stringMatching(/No timestamp/) },
    ]);

    const readingA = await prisma.fleetReading.findFirst({ where: { licenseeId: licenseeA, source: 'TRACKING_DEVICE' } });
    // 10 US gallons = 37.854 L; 600 minutes = 10 hours
    expect(readingA).toMatchObject({ schemaVersionId: FLEET_SCHEMA_VERSION_ID });
    expect(readingA!.fuelQuantity.toFixed(3)).toBe('37.854');
    expect(readingA!.engineHours!.toFixed(2)).toBe('10.00');
    expect(readingA!.kgCo2e.toFixed(3)).toBe('94.635');

    expect(await prisma.fleetTelemetrySnapshot.count({ where: { licenseeId: licenseeB, source: 'TRACKING_DEVICE' } })).toBe(1);
    expect(await prisma.fleetTelemetrySnapshot.count({ where: { licenseeId: licenseeC } })).toBe(0);
  });

  it('checks HMAC signatures and their timestamps', async () => {
    const body = JSON.stringify({ readings: [reading('HMAC-A2', 1772366400, 1, 1)] });
    const sign = (ts: string, secret = HMAC_SECRET) => crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
    const now = String(Math.floor(Date.now() / 1000));
    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const post = (headers: Record<string, string>) => {
      let req = request(app).post(`/api/fleet/ingest/devices/${hmacProviderId}`).set('Content-Type', 'application/json');
      for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
      return req.send(body);
    };
    await post({ 'X-Timestamp': now, 'X-Signature': sign(now, 'not-the-right-secret-at-all!!!') }).expect(401);
    await post({ 'X-Timestamp': old, 'X-Signature': sign(old) }).expect(401);
    await post({ 'X-Timestamp': now, 'X-Signature': `sha256=${sign(now)}` }).expect(201);
  });

  it('stops accepting a device once it is unbound or its provider is switched off', async () => {
    const bindings = await admin('get', '/api/admin/fleet/device-bindings').expect(200);
    const b1 = bindings.body.bindings.find((b: any) => b.externalDeviceId === 'IMEI-B1');
    await admin('post', `/api/admin/fleet/device-bindings/${b1.id}/deactivate`).expect(200);
    const after = await device(sharedProviderId, { readings: [reading('IMEI-B1', 1772452800, 9, 90)] }, { 'X-Tracker-Key': SHARED_SECRET });
    expect(after.status).toBe(422);
    expect(after.body.rejected[0].reason).toMatch(/not bound/);

    // The released device id keeps its record and can be bound again.
    const released = await prisma.fleetDeviceBinding.findUnique({ where: { id: b1.id } });
    expect(released).toMatchObject({ externalDeviceId: 'IMEI-B1', active: false, activeKey: null });
    await admin('post', '/api/admin/fleet/device-bindings').send({ providerId: sharedProviderId, assetId: assets.B1, externalDeviceId: 'IMEI-B1' }).expect(201);

    await admin('patch', `/api/admin/fleet/providers/${sharedProviderId}`).send({ active: false }).expect(200);
    await device(sharedProviderId, { readings: [reading('IMEI-A1', 1772452800, 120, 1800)] }, { 'X-Tracker-Key': SHARED_SECRET }).expect(401);
  });
});
