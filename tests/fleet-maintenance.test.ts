import request from 'supertest';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { MODEL_TRAINING_CONSENT_TEXT } from '../src/services/fleet/fleet-maintenance.service';
import { MachineHistory, computeFeatures } from '../src/services/fleet/maintenance-features';
import { evaluateCondition } from '../src/services/fleet/maintenance-insight.service';
import { FLEET_SCHEMA_VERSION_ID } from '../src/services/fleet/fleet-schema';
import type { MaintenanceRuleSet } from '@prisma/client';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const app = createApp({ webhooks: { constructEvent: jest.fn() } } as unknown as Stripe);

interface Client {
  licenseeId: string;
  userId: string;
  token: string;
  assetId: string;
}

const suffix = Date.now().toString(36);

async function makeClient(label: string, fleetActive: boolean): Promise<Client> {
  const licensee = await prisma.licensee.create({ data: { name: `Maint ${label} ${suffix}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
  const user = await prisma.portalUser.create({
    data: { email: `maint.${label}.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licensee.id },
  });
  if (fleetActive) {
    await prisma.serviceEntitlement.create({ data: { licenseeId: licensee.id, serviceLine: 'FLEET', status: 'ACTIVE' } });
  }
  const asset = await prisma.fleetAsset.create({
    data: {
      licenseeId: licensee.id,
      assetTag: 'EX-1',
      name: 'Excavator 1',
      category: 'EXCAVATOR',
      fuelType: 'DIESEL_MINERAL',
      ownership: 'OWNED',
      operationalControl: true,
    },
  });
  const token = jwt.sign({ userId: user.id, role: 'PARTNER', licenseeId: licensee.id }, JWT_SECRET, { expiresIn: '1h' });
  return { licenseeId: licensee.id, userId: user.id, token, assetId: asset.id };
}

let a: Client;
let b: Client;
let inactive: Client;

beforeAll(async () => {
  a = await makeClient('a', true);
  b = await makeClient('b', true);
  inactive = await makeClient('off', false);
  const admin = await prisma.portalUser.create({ data: { email: `maint.admin.${suffix}@test.example`, passwordHash: 'x', role: 'ADMIN' } });
  adminUserId = admin.id;
  adminToken = jwt.sign({ userId: admin.id, role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
});

let adminToken: string;
let adminUserId: string;

afterAll(async () => {
  await prisma.maintenanceRuleSet.deleteMany({ where: { createdByUserId: adminUserId } });
  await prisma.portalUser.deleteMany({ where: { id: adminUserId } });
  const ids = [a.licenseeId, b.licenseeId, inactive.licenseeId];
  await prisma.portalUser.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.licensee.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

const auth = (c: Client) => ({ Authorization: `Bearer ${c.token}` });

describe('Fleet maintenance records', () => {
  it('requires an active Fleet service', async () => {
    await request(app).get('/api/fleet/maintenance').set(auth(inactive)).expect(402);
  });

  it('sets a service interval with its source and rejects a zero interval', async () => {
    await request(app).put('/api/fleet/maintenance/plans').set(auth(a)).send({ assetId: a.assetId, serviceIntervalHours: '0', intervalSource: 'Manual' }).expect(400);
    await request(app).put('/api/fleet/maintenance/plans').set(auth(a)).send({ assetId: a.assetId, serviceIntervalHours: '500' }).expect(400);
    const res = await request(app)
      .put('/api/fleet/maintenance/plans')
      .set(auth(a))
      .send({ assetId: a.assetId, serviceIntervalHours: '500', intervalSource: "Maker's manual, 500-hour service" })
      .expect(200);
    expect(res.body.plan.serviceIntervalHours).toBe('500');
  });

  it('records a breakdown, refuses future dates and duplicates', async () => {
    const occurredAt = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const body = { assetId: a.assetId, type: 'BREAKDOWN', occurredAt, operatingHours: '1234.5', downtimeHours: '16', component: 'Hydraulics' };
    const res = await request(app).post('/api/fleet/maintenance/events').set(auth(a)).send(body).expect(201);
    expect(res.body.event).toMatchObject({ type: 'BREAKDOWN', source: 'PORTAL', component: 'Hydraulics' });
    await request(app).post('/api/fleet/maintenance/events').set(auth(a)).send(body).expect(409);
    await request(app)
      .post('/api/fleet/maintenance/events')
      .set(auth(a))
      .send({ ...body, occurredAt: new Date(Date.now() + 86400000).toISOString() })
      .expect(400);
    await request(app).post('/api/fleet/maintenance/events').set(auth(a)).send({ ...body, type: 'EXPLOSION' }).expect(400);
  });

  it('never lets one client see or write to another client machine', async () => {
    await request(app)
      .post('/api/fleet/maintenance/events')
      .set(auth(b))
      .send({ assetId: a.assetId, type: 'BREAKDOWN', occurredAt: new Date(Date.now() - 86400000).toISOString() })
      .expect(404);
    const list = await request(app).get('/api/fleet/maintenance').set(auth(b)).expect(200);
    expect(list.body.events).toHaveLength(0);
    expect(list.body.plans).toHaveLength(0);
  });

  it('imports history all or nothing, and skips rows already recorded', async () => {
    const bad = 'asset_tag,date,type,operating_hours\nEX-1,2026-01-10,SCHEDULED_SERVICE,500\nNOPE-9,2026-02-01,BREAKDOWN,640\n';
    const rejected = await request(app).post('/api/fleet/maintenance/import').set(auth(a)).attach('file', Buffer.from(bad), 'history.csv').expect(422);
    expect(rejected.body.rowsAccepted).toBe(0);
    expect(rejected.body.rejections[0]).toMatchObject({ line: 3 });

    const good = 'asset_tag,date,type,operating_hours,downtime_hours,component,description\nex-1,2026-01-10,scheduled service,500,,,\nEX-1,2026-02-01,BREAKDOWN,640,24,Engine,Overheated\n';
    const first = await request(app).post('/api/fleet/maintenance/import').set(auth(a)).attach('file', Buffer.from(good), 'history.csv').expect(201);
    expect(first.body).toMatchObject({ rowsReceived: 2, rowsAccepted: 2, duplicates: 0 });
    const again = await request(app).post('/api/fleet/maintenance/import').set(auth(a)).attach('file', Buffer.from(good), 'history.csv').expect(201);
    expect(again.body).toMatchObject({ rowsAccepted: 0, duplicates: 2 });

    const template = await request(app).get('/api/fleet/templates/maintenance').set(auth(a)).expect(200);
    expect(template.text).toBe('asset_tag,date,type,operating_hours,downtime_hours,component,description\r\n');
  });

  it('records consent to model training with its wording, and withdrawal', async () => {
    const none = await request(app).get('/api/fleet/model-consent').set(auth(a)).expect(200);
    expect(none.body).toMatchObject({ granted: false, text: MODEL_TRAINING_CONSENT_TEXT });
    await request(app).put('/api/fleet/model-consent').set(auth(a)).send({ granted: 'yes' }).expect(400);

    const granted = await request(app).put('/api/fleet/model-consent').set(auth(a)).send({ granted: true }).expect(200);
    expect(granted.body.granted).toBe(true);
    expect(granted.body.consent.consentText).toBe(MODEL_TRAINING_CONSENT_TEXT);
    expect(granted.body.consent.grantedByUserId).toBe(a.userId);

    const withdrawn = await request(app).put('/api/fleet/model-consent').set(auth(a)).send({ granted: false }).expect(200);
    expect(withdrawn.body.granted).toBe(false);
    expect(withdrawn.body.consent.withdrawnAt).not.toBeNull();
  });
});

const DAY = 24 * 3600 * 1000;
const RULES = {
  id: 'rs_test',
  version: 't1',
  source: 'test',
  lookbackDays: 30,
  baselineDays: 60,
  dueSoonHours: new Prisma.Decimal('50'),
  fuelDriftPct: new Prisma.Decimal('15'),
  idleRatioPct: new Prisma.Decimal('40'),
  faultRecurrenceCount: 3,
  staleDataHours: 48,
  highSeverityLabels: ['HIGH', 'Red'],
  active: true,
  createdByUserId: 'x',
  createdAt: new Date(),
} as MaintenanceRuleSet;

describe('Condition features and rules', () => {
  const at = new Date('2026-06-30T00:00:00Z');
  const day = (n: number) => new Date(at.getTime() - n * DAY);
  const history: MachineHistory = {
    serviceIntervalHours: 500,
    usage: [
      // Baseline: 10 litres per engine hour
      { periodStart: day(80), periodEnd: day(40), fuel: 2000, engineHours: 200, idleHours: 40 },
      // Recent: 12 litres per engine hour, half the time idling
      { periodStart: day(30), periodEnd: day(0), fuel: 1200, engineHours: 100, idleHours: 50 },
    ],
    faults: [
      { observedAt: day(5), code: 'E101', severity: 'red' },
      { observedAt: day(4), code: 'E202', severity: 'low' },
      { observedAt: day(3), code: 'E202', severity: 'low' },
      { observedAt: day(2), code: 'E202', severity: 'low' },
      // After the evaluation time: must be ignored
      { observedAt: new Date(at.getTime() + DAY), code: 'E999', severity: 'HIGH' },
    ],
    maintenance: [
      { type: 'SCHEDULED_SERVICE', occurredAt: day(100), operatingHours: 1000 },
      { type: 'BREAKDOWN', occurredAt: day(200), operatingHours: null },
      { type: 'BREAKDOWN', occurredAt: new Date(at.getTime() + DAY), operatingHours: null },
    ],
    meters: [{ observedAt: day(1), receivedAt: day(1), cumulativeOperatingHours: 1480 }],
    weather: [{ date: day(10), harshHours: 6 }, { date: day(40), harshHours: 9 }],
  };

  it('computes each feature from data before the evaluation time only', () => {
    const f = computeFeatures(history, at, RULES);
    expect(f.operatingHours).toBe(100);
    expect(f.fuelPerHour).toBe(12);
    expect(f.baselineFuelPerHour).toBe(10);
    expect(f.fuelDriftPct).toBe(20);
    expect(f.idleRatioPct).toBe(50);
    expect(f.faultCount).toBe(4);
    expect(f.highSeverityFaults).toBe(1);
    expect(f).toMatchObject({ maxFaultRecurrence: 3, mostRecurrentFaultCode: 'E202' });
    expect(f.hoursSinceService).toBe(480);
    expect(f.serviceIntervalUsed).toBe(0.96);
    expect(f.harshWeatherHours).toBe(6);
    expect(f.priorFailures365).toBe(1);
    expect(f.hoursSinceData).toBe(0);
  });

  it('turns the features into findings with the worst priority on top', () => {
    const f = computeFeatures(history, at, RULES);
    const result = evaluateCondition(f, RULES, at);
    expect(result.priority).toBe('HIGH');
    expect(result.findings.map((x) => x.code).sort()).toEqual(['FUEL_BURN_RISING', 'HIGH_IDLE', 'HIGH_SEVERITY_FAULT', 'RECURRING_FAULT', 'SERVICE_DUE_SOON']);
    expect(result.nextService).toEqual({ hoursRemaining: 20, projectedDate: '2026-07-06' });
  });

  it('says what is missing instead of guessing', () => {
    const empty: MachineHistory = { serviceIntervalHours: null, usage: [], faults: [], maintenance: [], meters: [], weather: [] };
    const result = evaluateCondition(computeFeatures(empty, at, RULES), RULES, at);
    expect(result.findings.map((x) => x.code)).toEqual(['NO_SERVICE_PLAN', 'NOT_REPORTING']);
    expect(result.nextService).toBeNull();
  });
});

describe('Maintenance insights API', () => {
  it('reports that no rule set is published yet, rather than inventing thresholds', async () => {
    await prisma.maintenanceRuleSet.updateMany({ where: { active: true }, data: { active: false } });
    const res = await request(app).get('/api/fleet/maintenance/insights').set(auth(a)).expect(200);
    expect(res.body).toEqual({ configured: false, conditions: [] });
  });

  it('lets only administrators publish thresholds, with validation', async () => {
    const body = {
      version: `t-${suffix}`,
      source: 'Maker service guidance and fleet manager review',
      lookbackDays: 30,
      baselineDays: 60,
      dueSoonHours: '50',
      fuelDriftPct: '15',
      idleRatioPct: '40',
      faultRecurrenceCount: 3,
      staleDataHours: 48,
      highSeverityLabels: ['HIGH', 'RED'],
    };
    await request(app).post('/api/admin/maintenance/rules').set(auth(a)).send(body).expect(403);
    await request(app).post('/api/admin/maintenance/rules').set('Authorization', `Bearer ${adminToken}`).send({ ...body, idleRatioPct: '140' }).expect(400);
    await request(app).post('/api/admin/maintenance/rules').set('Authorization', `Bearer ${adminToken}`).send({ ...body, highSeverityLabels: [] }).expect(400);
    const res = await request(app).post('/api/admin/maintenance/rules').set('Authorization', `Bearer ${adminToken}`).send(body).expect(201);
    expect(res.body.set.active).toBe(true);
  });

  it('flags an overdue service from the hours meter and a high-severity fault', async () => {
    const now = Date.now();
    await prisma.fleetTelemetrySnapshot.create({
      data: {
        licenseeId: a.licenseeId,
        assetId: a.assetId,
        schemaVersionId: FLEET_SCHEMA_VERSION_ID,
        source: 'CLIENT_API',
        observedAt: new Date(now - 3600 * 1000),
        cumulativeOperatingHours: new Prisma.Decimal('1300'),
        payloadSha256: 'a'.repeat(64),
      },
    });
    await prisma.fleetFaultCode.create({
      data: { licenseeId: a.licenseeId, assetId: a.assetId, source: 'CLIENT_API', observedAt: new Date(now - 2 * 3600 * 1000), code: 'P0217', severity: 'red' },
    });
    // Plan of 500 hours (set earlier); last service logged at 500 hours, so 800 hours have run.
    await request(app)
      .post('/api/fleet/maintenance/events')
      .set(auth(a))
      .send({ assetId: a.assetId, type: 'SCHEDULED_SERVICE', occurredAt: new Date(now - 20 * DAY).toISOString(), operatingHours: '500' })
      .expect(201);

    const res = await request(app).get('/api/fleet/maintenance/insights').set(auth(a)).expect(200);
    expect(res.body.configured).toBe(true);
    expect(res.body.ruleSet.version).toBe(`t-${suffix}`);
    const machine = res.body.conditions.find((c: { assetId: string }) => c.assetId === a.assetId);
    expect(machine.priority).toBe('HIGH');
    expect(machine.findings.map((x: { code: string }) => x.code)).toEqual(expect.arrayContaining(['SERVICE_OVERDUE', 'HIGH_SEVERITY_FAULT']));
    expect(machine.nextService.hoursRemaining).toBe(-300);

    const other = await request(app).get('/api/fleet/maintenance/insights').set(auth(b)).expect(200);
    expect(other.body.conditions.every((c: { assetId: string }) => c.assetId !== a.assetId)).toBe(true);
  });
});
