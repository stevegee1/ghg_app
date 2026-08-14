import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, DeliveryType, FulfillmentStatus, VerificationSource, TransactionStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { seed } from '../prisma/seed';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const app = createApp();

describe('Milestone 5a: B2B Trigger Integration & Quantity Pricing Tests', () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: B2B trigger with quantity: 12, pricePerDropCents: 500 produces grossAmountCents: 6000
  test('1. B2B trigger with quantity: 12, pricePerDropCents: 500 produces grossAmountCents: 6000', async () => {
    const res = await request(app)
      .post('/api/b2b/trigger')
      .set('X-API-Key', 'b2b_key_itm_secret')
      .send({
        licenseeId: 'lic_itm_power',
        quantity: 12,
        deliveryType: 'DIGITAL',
        externalReferenceId: 'ext_ref_qty_12_test',
        weatherCondition: 'Sunny 25C',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('transactionId');

    const createdTx = await prisma.transaction.findUnique({
      where: { id: res.body.transactionId },
      include: { triggerEvent: true },
    });

    expect(createdTx).toBeDefined();
    expect(createdTx?.grossAmountCents).toBe(6000); // 12 * 500
    expect(createdTx?.triggerEvent?.verificationSource).toBe(VerificationSource.THIRD_PARTY_API);
    expect(createdTx?.triggerEvent?.deliveryType).toBe(DeliveryType.DIGITAL);
    expect(createdTx?.triggerEvent?.fulfillmentStatus).toBeNull();
  });

  // Test 2: B2B trigger rejects with 400 when licensee's pricePerDropCents is null
  test('2. B2B trigger rejects with 400 when licensee pricePerDropCents is null', async () => {
    // Seed Arsenal FC with a B2B API Key but pricePerDropCents = null
    const arsenalKeyHash = await bcrypt.hash('b2b_key_arsenal_secret', 10);
    await prisma.licensee.update({
      where: { id: 'lic_arsenal_fc' },
      data: { b2bApiKeyHash: arsenalKeyHash, pricePerDropCents: null },
    });

    const res = await request(app)
      .post('/api/b2b/trigger')
      .set('X-API-Key', 'b2b_key_arsenal_secret')
      .send({
        licenseeId: 'lic_arsenal_fc',
        quantity: 10,
        deliveryType: 'DIGITAL',
        externalReferenceId: 'ext_ref_null_price_test',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('does not have quantity-based pricing configured (pricePerDropCents is null)');
  });

  // Test 3: B2B trigger endpoint rejects requests without valid authentication
  test('3. B2B trigger endpoint rejects requests without valid authentication', async () => {
    // Missing API Key (401)
    const res1 = await request(app)
      .post('/api/b2b/trigger')
      .send({
        licenseeId: 'lic_itm_power',
        quantity: 5,
        deliveryType: 'DIGITAL',
        externalReferenceId: 'ext_ref_no_auth',
      });

    expect(res1.status).toBe(401);
    expect(res1.body.error).toContain('Unauthorized');

    // Invalid API Key (401)
    const res2 = await request(app)
      .post('/api/b2b/trigger')
      .set('X-API-Key', 'invalid_garbage_key')
      .send({
        licenseeId: 'lic_itm_power',
        quantity: 5,
        deliveryType: 'DIGITAL',
        externalReferenceId: 'ext_ref_invalid_key',
      });

    expect(res2.status).toBe(401);
    expect(res2.body.error).toContain('Unauthorized');

    // Missing licenseeId (400 before any bcrypt work)
    const res3 = await request(app)
      .post('/api/b2b/trigger')
      .set('X-API-Key', 'b2b_key_itm_secret')
      .send({
        quantity: 5,
        deliveryType: 'DIGITAL',
        externalReferenceId: 'ext_ref_no_licensee',
      });

    expect(res3.status).toBe(400);
    expect(res3.body.error).toBe('Invalid input: licenseeId must be a non-empty string.');
  });

  // Test 4: DB check constraint rejects raw SQL insert with invalid deliveryType / fulfillmentStatus combinations
  test('4. DB check constraint rejects raw SQL insert where deliveryType = DIGITAL but fulfillmentStatus is non-null (and PHYSICAL with null status)', async () => {
    const rawTx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        grossAmountCents: 1000,
      },
    });

    // Case A: DIGITAL with non-null fulfillmentStatus (PENDING)
    const sqlDigitalWithStatus = `
      INSERT INTO "TriggerEvent" ("id", "transactionId", "verificationSource", "deliveryType", "fulfillmentStatus", "createdAt")
      VALUES ('trig_bad_digital', '${rawTx.id}', 'THIRD_PARTY_API', 'DIGITAL', 'PENDING', NOW());
    `;

    await expect(prisma.$executeRawUnsafe(sqlDigitalWithStatus)).rejects.toThrow(
      /check_delivery_fulfillment_status/
    );

    // Case B: PHYSICAL with null fulfillmentStatus
    const sqlPhysicalWithNullStatus = `
      INSERT INTO "TriggerEvent" ("id", "transactionId", "verificationSource", "deliveryType", "fulfillmentStatus", "createdAt")
      VALUES ('trig_bad_physical', '${rawTx.id}', 'THIRD_PARTY_API', 'PHYSICAL', NULL, NOW());
    `;

    await expect(prisma.$executeRawUnsafe(sqlPhysicalWithNullStatus)).rejects.toThrow(
      /check_delivery_fulfillment_status/
    );
  });

  // Test 5: Fulfillment update endpoint rejects updating a DIGITAL trigger event's status
  test("5. Fulfillment update endpoint rejects updating a DIGITAL trigger event's status", async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'SecurePassword123!',
    });
    const token = loginRes.body.token;

    // tx_itm_001 has deliveryType: DIGITAL
    const res = await request(app)
      .patch('/api/portal/transactions/tx_itm_001/fulfillment')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Fulfillment status can only be updated for PHYSICAL delivery transactions.');
  });

  // Test 6: Fulfillment update endpoint rejects a PARTNER updating another licensee's transaction
  test("6. Fulfillment update endpoint rejects a PARTNER updating another licensee's transaction", async () => {
    const testId = `test_jcb_phys_${Date.now()}`;
    // Create a PHYSICAL transaction for JCB Test (lic_jcb_test)
    const jcbPhysicalTx = await prisma.transaction.create({
      data: {
        id: `tx_${testId}`,
        licenseeId: 'lic_jcb_test',
        grossAmountCents: 15000,
        currency: 'GBP',
        status: TransactionStatus.SETTLED,
        triggerEvent: {
          create: {
            id: `trig_${testId}`,
            verificationSource: VerificationSource.THIRD_PARTY_API,
            deliveryType: DeliveryType.PHYSICAL,
            fulfillmentStatus: FulfillmentStatus.PENDING,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 12000,
            charityGiftCents: 3000,
          },
        },
      },
    });

    // Authenticate as ITM Power PARTNER user (lic_itm_power)
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'SecurePassword123!',
    });
    const token = loginRes.body.token;

    // Attempt to update JCB's physical transaction status while logged in as ITM Power
    const res = await request(app)
      .patch(`/api/portal/transactions/${jcbPhysicalTx.id}/fulfillment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Transaction not found or access denied.');

    // Verify in DB that status remained PENDING
    const checkTx = await prisma.triggerEvent.findUnique({
      where: { id: `trig_${testId}` },
    });
    expect(checkTx?.fulfillmentStatus).toBe(FulfillmentStatus.PENDING);
  });

  // Test 7: Confirm M3 consumer-checkout tests still pass with deliveryType required
  test('7. POST /api/checkout (M3 consumer flow) creates trigger event with deliveryType: DIGITAL', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({
        licenseeId: 'lic_itm_power',
        checkoutReferenceId: 'm3_consumer_optin_deliv_test_1',
        grossAmountCents: 5000,
        currency: 'GBP',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('transactionId');

    const createdTx = await prisma.transaction.findUnique({
      where: { id: res.body.transactionId },
      include: { triggerEvent: true },
    });

    expect(createdTx?.triggerEvent?.verificationSource).toBe(VerificationSource.CONSUMER_OPT_IN);
    expect(createdTx?.triggerEvent?.deliveryType).toBe(DeliveryType.DIGITAL);
    expect(createdTx?.triggerEvent?.fulfillmentStatus).toBeNull();
  });
});
