import request from 'supertest';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { seed } from '../prisma/seed';

const prisma = new PrismaClient();

// Stripe double: payment intents only, so checkout sessions return the recorded transaction.
const stripe = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({ id: 'pi_merch_mock', client_secret: 'pi_merch_mock_secret' }),
    retrieve: jest.fn(),
  },
  webhooks: { constructEvent: jest.fn() },
} as unknown as Stripe;
const app = createApp(stripe);

const adminToken = jwt.sign({ userId: 'admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
const clientToken = jwt.sign({ userId: 'usr_partner_001', role: 'PARTNER', licenseeId: 'lic_itm_power' }, JWT_SECRET, { expiresIn: '1h' });

let originalCapPrice: number | null = null;

beforeAll(async () => {
  await seed();
  originalCapPrice = (await prisma.merchProduct.findUniqueOrThrow({ where: { id: 'item_nfty_cap' } })).pricePence;
});

afterAll(async () => {
  await prisma.merchProduct.update({ where: { id: 'item_nfty_cap' }, data: { pricePence: originalCapPrice, active: true } });
  await prisma.$disconnect();
});

describe('Merch checkout is priced on the server', () => {
  it('charges the catalogue price times quantity and ignores any amount sent by the browser', async () => {
    const cap = await prisma.merchProduct.findUniqueOrThrow({ where: { id: 'item_nfty_cap' } });
    const res = await request(app)
      .post('/api/checkout/session')
      .send({ productId: 'item_nfty_cap', quantity: 2, grossAmountCents: 1, licenseeId: 'lic_itm_power' })
      .expect(200);

    const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: res.body.transactionId } });
    expect(tx.grossAmountCents).toBe(cap.pricePence! * 2);
    expect(tx.licenseeId).toBe(cap.licenseeId);
  });

  it('refuses enquiry-only, unknown, inactive and wrong-kind products and bad quantities', async () => {
    await request(app).post('/api/checkout/session').send({ productId: 'item_nfty_volcano_hoodie' }).expect(409);
    await request(app).post('/api/checkout/session').send({ productId: 'no_such_item' }).expect(404);
    await request(app).post('/api/checkout/session').send({ productId: 'T_SHIRT' }).expect(404);
    await request(app).post('/api/checkout/session').send({ productId: 'item_nfty_cap', quantity: 0 }).expect(400);
    await request(app).post('/api/checkout/session').send({}).expect(400);
  });
});

describe('Event souvenir orders', () => {
  it('price each logo drop from the catalogue', async () => {
    const drop = await prisma.merchProduct.findUniqueOrThrow({ where: { id: 'EVENT_LOGO_DROP' } });
    const email = `souvenir.${Date.now()}@example.org`;
    await request(app)
      .post('/api/souvenirs/order')
      .send({
        customerEmail: email,
        eventCategory: 'GALA',
        eventName: 'Spring Gala',
        logoDropCount: 25,
        grossAmountCents: 1,
        shippingAddress: { street: '1 High St', city: 'Leeds', country: 'United Kingdom', postalCode: 'LS1 1AA' },
      });
    const order = await prisma.souvenirOrder.findFirstOrThrow({ where: { customerEmail: email } });
    expect(order.grossAmountCents).toBe(drop.pricePence! * 25);
    expect(order.licensorCents + order.charityCents).toBe(order.grossAmountCents);
  });
});

describe('Administrators set merch prices', () => {
  it('only administrators can list or change products', async () => {
    await request(app).get('/api/admin/merch/products').set('Authorization', `Bearer ${clientToken}`).expect(403);
    await request(app)
      .patch('/api/admin/merch/products/item_nfty_cap')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ pricePence: 1 })
      .expect(403);
  });

  it('a new price applies to the next checkout, and invalid prices are rejected', async () => {
    await request(app)
      .patch('/api/admin/merch/products/item_nfty_cap')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pricePence: 12.5 })
      .expect(400);
    await request(app)
      .patch('/api/admin/merch/products/item_nfty_cap')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pricePence: -100 })
      .expect(400);
    await request(app).patch('/api/admin/merch/products/missing').set('Authorization', `Bearer ${adminToken}`).send({ active: false }).expect(404);

    const updated = await request(app)
      .patch('/api/admin/merch/products/item_nfty_cap')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pricePence: 4200 })
      .expect(200);
    expect(updated.body.product.pricePence).toBe(4200);
    expect(updated.body.product.updatedByUserId).toBe('admin');

    const res = await request(app).post('/api/checkout/session').send({ productId: 'item_nfty_cap' }).expect(200);
    const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: res.body.transactionId } });
    expect(tx.grossAmountCents).toBe(4200);

    const listed = await request(app).get('/api/admin/merch/products').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(listed.body.products.find((p: { id: string }) => p.id === 'VINTAGE_TEE')).toBeDefined();
  });

  it('a product taken off sale disappears from the store and cannot be bought', async () => {
    await request(app)
      .patch('/api/admin/merch/products/item_nfty_cap')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false })
      .expect(200);
    const store = await request(app).get('/api/merch/products').expect(200);
    expect(store.body.products.some((p: { id: string }) => p.id === 'item_nfty_cap')).toBe(false);
    await request(app).post('/api/checkout/session').send({ productId: 'item_nfty_cap' }).expect(404);
  });
});
