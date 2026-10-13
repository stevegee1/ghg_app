import crypto from 'crypto';
import path from 'path';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { seed } from './fixtures/sample-data';

const prisma = new PrismaClient();

// Stripe double: a Checkout Session per order; a separate PaymentIntent should never be created.
const paymentIntentsCreate = jest.fn();
const checkoutSessionsCreate = jest.fn();
const stripe = {
  paymentIntents: { create: paymentIntentsCreate, retrieve: jest.fn() },
  checkout: { sessions: { create: checkoutSessionsCreate, retrieve: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
} as unknown as Stripe;

beforeEach(() => {
  checkoutSessionsCreate.mockImplementation(async () => ({ id: `cs_merch_${crypto.randomUUID()}`, url: 'https://checkout.stripe.com/c/pay/cs_merch' }));
});
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

    // The Checkout Session makes the only PaymentIntent, and it carries the transaction for refunds.
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    const sessionParams = checkoutSessionsCreate.mock.calls[0][0];
    expect(sessionParams.payment_intent_data.metadata.transactionId).toBe(tx.id);
    expect(sessionParams.line_items[0].price_data.unit_amount).toBe(cap.pricePence! * 2);
  });

  it('says the shop cannot take payments when no split is configured, instead of a generic failure', async () => {
    const cap = await prisma.merchProduct.findUniqueOrThrow({ where: { id: 'item_nfty_cap' } });
    const active = await prisma.splitConfigHistory.findMany({
      where: { isActive: true, OR: [{ licenseeId: null }, { licenseeId: cap.licenseeId }] },
      select: { id: true },
    });
    const ids = active.map((c) => c.id);
    await prisma.splitConfigHistory.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
    try {
      const res = await request(app).post('/api/checkout/session').send({ productId: 'item_nfty_cap' }).expect(503);
      expect(res.body.error).toBe('The shop cannot take payments yet. Please try again later.');
      expect(checkoutSessionsCreate).not.toHaveBeenCalled();
    } finally {
      await prisma.splitConfigHistory.updateMany({ where: { id: { in: ids } }, data: { isActive: true } });
    }
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

describe('Administrators add products', () => {
  const PHOTO = path.join(process.cwd(), 'public', 'images', 'nfty-logs-logo.png');
  const admin = { Authorization: `Bearer ${adminToken}` };
  const created: string[] = [];

  afterAll(async () => {
    await prisma.merchProduct.deleteMany({ where: { id: { in: created } } });
  });

  it('only administrators can add products, and bad input is refused', async () => {
    const body = { kind: 'CATALOGUE', title: 'Team T-shirt', pricePence: 2500 };
    await request(app).post('/api/admin/merch/products').send(body).expect(401);
    await request(app).post('/api/admin/merch/products').set('Authorization', `Bearer ${clientToken}`).send(body).expect(403);
    await request(app).post('/api/admin/merch/products').set(admin).send({ ...body, kind: 'EVENT_SOUVENIR' }).expect(400);
    await request(app).post('/api/admin/merch/products').set(admin).send({ ...body, title: '' }).expect(400);
    await request(app).post('/api/admin/merch/products').set(admin).send({ ...body, pricePence: 0 }).expect(400);
    const noPrice = await request(app).post('/api/admin/merch/products').set(admin).send({ kind: 'CATALOGUE', title: 'Team T-shirt' }).expect(400);
    expect(noPrice.body.error).toMatch(/contact for order/);
  });

  it('a priced shop item with a photo appears in the store and can be bought at its price', async () => {
    const res = await request(app)
      .post('/api/admin/merch/products')
      .set(admin)
      .send({ kind: 'CATALOGUE', title: 'Team T-shirt', description: 'Organic cotton', category: 'T-shirts', pricePence: 2500, active: true })
      .expect(201);
    const id = res.body.product.id as string;
    created.push(id);
    expect(id).toMatch(/^item_team_t_shirt_[0-9a-f]{6}$/);
    expect(res.body.product).toMatchObject({ kind: 'CATALOGUE', pricePence: 2500, active: true, licenseeId: 'lic_ghg_official' });

    const upload = await request(app).put(`/api/admin/merch/products/${id}/image`).set(admin).attach('image', PHOTO).expect(200);
    const imageUrl = upload.body.product.imageUrl as string;
    expect(imageUrl).toMatch(new RegExp(`^/api/merch/products/${id}/image\\?v=[0-9a-f]{12}$`));

    const store = await request(app).get('/api/merch/products').expect(200);
    const listed = store.body.products.find((p: { id: string }) => p.id === id);
    expect(listed).toMatchObject({ title: 'Team T-shirt', pricePence: 2500, imageUrl });
    expect(listed).not.toHaveProperty('imageStorageKey');

    const photo = await request(app).get(imageUrl).expect(200);
    expect(photo.headers['content-type']).toBe('image/png');

    const checkout = await request(app).post('/api/checkout/session').send({ productId: id, quantity: 2 }).expect(200);
    const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: checkout.body.transactionId } });
    expect(tx.grossAmountCents).toBe(5000);
  });

  it('a contact-for-order product is listed without a price and cannot be paid for', async () => {
    const res = await request(app)
      .post('/api/admin/merch/products')
      .set(admin)
      .send({ kind: 'CATALOGUE', title: 'Club Hoodie', pricePence: null, active: true })
      .expect(201);
    created.push(res.body.product.id);
    const store = await request(app).get('/api/merch/products').expect(200);
    expect(store.body.products.find((p: { id: string }) => p.id === res.body.product.id).pricePence).toBeNull();
    await request(app).post('/api/checkout/session').send({ productId: res.body.product.id }).expect(409);
  });

  it('a Frenzy Studio garment can be added, and a replaced photo gets a new address', async () => {
    const res = await request(app)
      .post('/api/admin/merch/products')
      .set(admin)
      .send({ kind: 'CUSTOM_GARMENT', title: 'Retro Polo', pricePence: 3200, active: true })
      .expect(201);
    const id = res.body.product.id as string;
    created.push(id);
    const first = await request(app).put(`/api/admin/merch/products/${id}/image`).set(admin).attach('image', PHOTO).expect(200);
    const second = await request(app).put(`/api/admin/merch/products/${id}/image`).set(admin).attach('image', PHOTO).expect(200);
    expect(second.body.product.imageUrl).not.toBe(first.body.product.imageUrl);
    const store = await request(app).get('/api/merch/products').expect(200);
    expect(store.body.products.find((p: { id: string }) => p.id === id).kind).toBe('CUSTOM_GARMENT');
  });

  it('refuses photos that are not PNG, JPG or WEBP, and photos for unknown products', async () => {
    const id = created[0];
    await request(app).put(`/api/admin/merch/products/${id}/image`).set(admin).attach('image', Buffer.from('<svg/>'), 'x.svg').expect(400);
    await request(app).put('/api/admin/merch/products/item_missing/image').set(admin).attach('image', PHOTO).expect(404);
    await request(app).get('/api/merch/products/item_missing/image').expect(404);
  });
});
