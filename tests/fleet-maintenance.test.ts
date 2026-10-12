import request from 'supertest';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { MODEL_TRAINING_CONSENT_TEXT } from '../src/services/fleet/fleet-maintenance.service';

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
});

afterAll(async () => {
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
