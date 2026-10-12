import crypto from 'crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { resolveActiveSplitConfig } from '../src/services/split-config.service';
import { seed } from './fixtures/sample-data';

const prisma = new PrismaClient();
const checkoutSessionsCreate = jest.fn();
const stripe = {
  paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
  checkout: { sessions: { create: checkoutSessionsCreate } },
  webhooks: { constructEvent: jest.fn() },
} as unknown as Stripe;

beforeEach(() => {
  checkoutSessionsCreate.mockImplementation(async () => ({ id: `cs_drop_${crypto.randomUUID()}`, url: 'https://checkout.stripe.com/c/pay/cs_drop' }));
});
const app = createApp(stripe);

const token = (licenseeId: string) =>
  jwt.sign({ userId: `usr_${licenseeId}`, role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Portal logo drops are priced from the client account', () => {
  it('requires sign-in', async () => {
    await request(app).get('/api/portal/logo-drop/pricing').expect(401);
    await request(app).post('/api/portal/logo-drop').send({ quantity: 1, deliveryType: 'DIGITAL' }).expect(401);
  });

  it("returns the client's own price per drop and the active split", async () => {
    const licensee = await prisma.licensee.findUniqueOrThrow({ where: { id: 'lic_itm_power' } });
    const split = await resolveActiveSplitConfig(prisma, 'lic_itm_power');
    const res = await request(app).get('/api/portal/logo-drop/pricing').set('Authorization', `Bearer ${token('lic_itm_power')}`).expect(200);
    expect(res.body.pricePerDropPence).toBe(licensee.pricePerDropCents);
    expect(res.body.royaltyBps).toBe(split.royaltyBps);
  });

  it('charges quantity times the account price and ignores any amount from the browser', async () => {
    const licensee = await prisma.licensee.findUniqueOrThrow({ where: { id: 'lic_itm_power' } });
    const res = await request(app)
      .post('/api/portal/logo-drop')
      .set('Authorization', `Bearer ${token('lic_itm_power')}`)
      .send({ quantity: 3, deliveryType: 'DIGITAL', grossAmountCents: 1, licenseeId: 'lic_arsenal_fc' })
      .expect(200);
    const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: res.body.transactionId } });
    expect(tx.licenseeId).toBe('lic_itm_power');
    expect(tx.grossAmountCents).toBe(licensee.pricePerDropCents! * 3);
  });

  it('refuses accounts without a configured price and invalid input', async () => {
    const id = `lic_drop_${Date.now().toString(36)}`;
    await prisma.licensee.create({ data: { id, name: 'No Price Ltd', vertical: 'B2B_HEAVY_MANUFACTURING' } });
    try {
      await request(app).post('/api/portal/logo-drop').set('Authorization', `Bearer ${token(id)}`).send({ quantity: 1, deliveryType: 'DIGITAL' }).expect(409);
      const pricing = await request(app).get('/api/portal/logo-drop/pricing').set('Authorization', `Bearer ${token(id)}`).expect(200);
      expect(pricing.body.pricePerDropPence).toBeNull();
    } finally {
      await prisma.licensee.delete({ where: { id } });
    }
    const auth = `Bearer ${token('lic_itm_power')}`;
    await request(app).post('/api/portal/logo-drop').set('Authorization', auth).send({ quantity: 0, deliveryType: 'DIGITAL' }).expect(400);
    await request(app).post('/api/portal/logo-drop').set('Authorization', auth).send({ quantity: 2, deliveryType: 'DRONE' }).expect(400);
  });
});

describe('Administrators set each client price per drop', () => {
  const admin = jwt.sign({ userId: 'admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
  let original: number | null = null;
  beforeAll(async () => {
    original = (await prisma.licensee.findUniqueOrThrow({ where: { id: 'lic_itm_power' } })).pricePerDropCents;
  });
  afterAll(async () => {
    await prisma.licensee.update({ where: { id: 'lic_itm_power' }, data: { pricePerDropCents: original } });
  });

  it('only administrators can view or change prices, and the new price is used for the next order', async () => {
    await request(app).get('/api/admin/logo-drop/prices').set('Authorization', `Bearer ${token('lic_itm_power')}`).expect(403);
    await request(app).patch('/api/admin/logo-drop/prices/lic_itm_power').set('Authorization', `Bearer ${admin}`).send({ pricePerDropPence: 0 }).expect(400);
    await request(app).patch('/api/admin/logo-drop/prices/missing').set('Authorization', `Bearer ${admin}`).send({ pricePerDropPence: 100 }).expect(404);
    await request(app).patch('/api/admin/logo-drop/prices/lic_itm_power').set('Authorization', `Bearer ${admin}`).send({ pricePerDropPence: 640 }).expect(200);

    const res = await request(app)
      .post('/api/portal/logo-drop')
      .set('Authorization', `Bearer ${token('lic_itm_power')}`)
      .send({ quantity: 2, deliveryType: 'PHYSICAL' })
      .expect(200);
    const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: res.body.transactionId } });
    expect(tx.grossAmountCents).toBe(1280);
  });
});

