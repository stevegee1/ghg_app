import crypto from 'crypto';
import request from 'supertest';
import Stripe from 'stripe';
import { PrismaClient, VerificationSource, DeliveryType } from '@prisma/client';
import { CheckoutService } from '../src/services/checkout.service';
import { resolveActiveSplitConfig, SplitConfigMissingError } from '../src/services/split-config.service';
import { createApp } from '../src/expressApp';
import { seed } from './fixtures/sample-data';

const prisma = new PrismaClient();

function createMockStripe() {
  const mockPaymentIntentsCreate = jest.fn();
  const mockPaymentIntentsRetrieve = jest.fn();
  const mockTransfersCreate = jest.fn();
  const mockConstructEvent = jest.fn();

  const mockStripe = {
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      retrieve: mockPaymentIntentsRetrieve,
    },
    transfers: {
      create: mockTransfersCreate,
    },
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  } as unknown as Stripe;

  return {
    stripe: mockStripe,
    mockPaymentIntentsCreate,
    mockPaymentIntentsRetrieve,
    mockTransfersCreate,
    mockConstructEvent,
  };
}

describe('Milestone 5c: Versioned Split Configuration & Audit Trail Tests', () => {
  let adminToken: string;
  let partnerToken: string;

  beforeAll(async () => {
    await seed();

    // Login as ADMIN
    const adminLogin = await request(createApp()).post('/api/auth/login').send({
      email: 'admin@ghglogodrop.com',
      password: 'SecurePassword123!',
    });
    adminToken = adminLogin.body.token;

    // Login as PARTNER
    const partnerLogin = await request(createApp()).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'SecurePassword123!',
    });
    partnerToken = partnerLogin.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Writing a new split config deactivates the prior one and creates a new row with correct previousConfigId chaining
  test('1. POST /api/admin/split-config deactivates prior config and chains previousConfigId', async () => {
    const app = createApp();
    const testLicenseeId = `lic_chain_${Date.now()}`;

    // Create licensee in DB for foreign key constraint
    await prisma.licensee.create({
      data: {
        id: testLicenseeId,
        name: 'Chain Test Licensee',
        vertical: 'B2B_CLEAN_TECH',
      },
    });

    // 1. First config update for new licensee
    const res1 = await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licenseeId: testLicenseeId,
        royaltyBps: 8000,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 5000 },
          { charityId: 'charity_ocean_clean', bps: 5000 },
        ],
      });

    expect(res1.status).toBe(201);
    const config1 = res1.body;
    expect(config1.licenseeId).toBe(testLicenseeId);
    expect(config1.isActive).toBe(true);
    expect(config1.previousConfigId).toBeNull();

    // 2. Second config update for same licensee
    const res2 = await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licenseeId: testLicenseeId,
        royaltyBps: 7500,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 4000 },
          { charityId: 'charity_ocean_clean', bps: 6000 },
        ],
      });

    expect(res2.status).toBe(201);
    const config2 = res2.body;
    expect(config2.licenseeId).toBe(testLicenseeId);
    expect(config2.isActive).toBe(true);
    expect(config2.previousConfigId).toBe(config1.id);

    // Verify config1 was deactivated in DB
    const deactivated1 = await prisma.splitConfigHistory.findUnique({
      where: { id: config1.id },
    });
    expect(deactivated1?.isActive).toBe(false);
  });

  // Test 2: Non-ADMIN role is rejected from all three admin split-config routes
  test('2. Non-ADMIN users (PARTNER or unauthenticated) are rejected with 401 or 403', async () => {
    const app = createApp();

    // Unauthenticated (401)
    const unauthGet = await request(app).get('/api/admin/split-config');
    expect(unauthGet.status).toBe(401);

    const unauthPost = await request(app).post('/api/admin/split-config').send({});
    expect(unauthPost.status).toBe(401);

    const unauthHistory = await request(app).get('/api/admin/split-config/history');
    expect(unauthHistory.status).toBe(401);

    // Authenticated as PARTNER (403)
    const partnerGet = await request(app)
      .get('/api/admin/split-config')
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(partnerGet.status).toBe(403);
    expect(partnerGet.body.error).toContain('Admin access required');

    const partnerPost = await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({ royaltyBps: 8000, charityAllocationBps: [] });
    expect(partnerPost.status).toBe(403);

    const partnerHistory = await request(app)
      .get('/api/admin/split-config/history')
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(partnerHistory.status).toBe(403);
  });

  // Test 3: charityAllocationBps not summing to 10000 is rejected with 400 Bad Request
  test('3. charityAllocationBps not summing to 10000 is rejected with 400 Bad Request', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licenseeId: 'lic_itm_power',
        royaltyBps: 8500,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 4000 },
          { charityId: 'charity_ocean_clean', bps: 4000 },
          // Sum = 8000 != 10000
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input: charityAllocationBps must sum to 10000 (100.00%).');
  });

  // Test 4: The Core Immutability Guarantee Test
  test('4. CORE GUARANTEE: Creating a transaction under Config A, then updating split config to B, leaves historical transaction split strictly reflecting Config A', async () => {
    const runId = Date.now();
    const testLicenseeId = `lic_immutability_${runId}`;
    const { stripe, mockPaymentIntentsCreate } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);
    const app = createApp(stripe);

    await prisma.licensee.create({
      data: {
        id: testLicenseeId,
        name: 'Immutability Test Licensee',
        vertical: 'B2B_CLEAN_TECH',
        stripeConnectedAccountId: 'acct_immutability_123',
      },
    });

    // 1. Set Config A for testLicenseeId (e.g. 8500 royaltyBps = 85% royalty / 15% charity)
    await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licenseeId: testLicenseeId,
        royaltyBps: 8500,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 5000 },
          { charityId: 'charity_ocean_clean', bps: 5000 },
        ],
      });

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: `pi_config_a_${runId}`,
      client_secret: `pi_config_a_secret_${runId}`,
    });

    // 2. Initiate transaction T1 under Config A (£100.00 = 10000 cents)
    const checkout1 = await checkoutService.initiateCheckout({
      licenseeId: testLicenseeId,
      checkoutReferenceId: `ref_immutability_a_${runId}`,
      grossAmountCents: 10000,
      triggerEvent: {
        verificationSource: VerificationSource.CONSUMER_OPT_IN,
        deliveryType: DeliveryType.DIGITAL,
      },
    });

    const tx1Original = await prisma.transaction.findUnique({
      where: { id: checkout1.transactionId },
      include: {
        financialSplit: {
          include: { charityAllocations: true },
        },
      },
    });

    expect(tx1Original?.financialSplit?.licensorRoyaltyCents).toBe(8500); // 85%
    expect(tx1Original?.financialSplit?.charityGiftCents).toBe(1500); // 15%
    expect(tx1Original?.financialSplit?.charityAllocations.length).toBe(2);
    expect(tx1Original?.financialSplit?.charityAllocations[0].amountCents).toBe(750); // 50% of 1500
    expect(tx1Original?.financialSplit?.charityAllocations[1].amountCents).toBe(750);

    // 3. Admin changes config to Config B for testLicenseeId (7000 royaltyBps = 70% royalty / 30% charity)
    await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licenseeId: testLicenseeId,
        royaltyBps: 7000,
        charityAllocationBps: [
          { charityId: 'charity_youth_sport', bps: 10000 },
        ],
      });

    // 4. Re-fetch original transaction T1 from DB
    const tx1AfterConfigChange = await prisma.transaction.findUnique({
      where: { id: checkout1.transactionId },
      include: {
        financialSplit: {
          include: { charityAllocations: true },
        },
      },
    });

    // ASSERT: T1's FinancialSplit and CharityAllocations remain IDENTICAL to Config A
    expect(tx1AfterConfigChange?.financialSplit?.licensorRoyaltyCents).toBe(8500);
    expect(tx1AfterConfigChange?.financialSplit?.charityGiftCents).toBe(1500);
    expect(tx1AfterConfigChange?.financialSplit?.charityAllocations.length).toBe(2);
    expect(tx1AfterConfigChange?.financialSplit?.charityAllocations[0].amountCents).toBe(750);
    expect(tx1AfterConfigChange?.financialSplit?.charityAllocations[1].amountCents).toBe(750);

    // 5. Verify NEW transaction T2 created under Config B uses Config B's splits
    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: `pi_config_b_${runId}`,
      client_secret: `pi_config_b_secret_${runId}`,
    });

    const checkout2 = await checkoutService.initiateCheckout({
      licenseeId: testLicenseeId,
      checkoutReferenceId: `ref_immutability_b_${runId}`,
      grossAmountCents: 10000,
      triggerEvent: {
        verificationSource: VerificationSource.CONSUMER_OPT_IN,
        deliveryType: DeliveryType.DIGITAL,
      },
    });

    const tx2New = await prisma.transaction.findUnique({
      where: { id: checkout2.transactionId },
      include: {
        financialSplit: {
          include: { charityAllocations: true },
        },
      },
    });

    expect(tx2New?.financialSplit?.licensorRoyaltyCents).toBe(7000); // 70% under Config B
    expect(tx2New?.financialSplit?.charityGiftCents).toBe(3000); // 30% under Config B
    expect(tx2New?.financialSplit?.charityAllocations.length).toBe(1);
    expect(tx2New?.financialSplit?.charityAllocations[0].charityId).toBe('charity_youth_sport');
    expect(tx2New?.financialSplit?.charityAllocations[0].amountCents).toBe(3000);
  });

  // Test 5: Resolution precedence (Per-licensee override vs platform default)
  test('5. Per-licensee config takes precedence over platform default when both exist; platform default used when no override', async () => {
    const runId = Date.now();
    const app = createApp();
    const targetLicenseeId = `lic_override_${runId}`;

    await prisma.licensee.create({
      data: {
        id: targetLicenseeId,
        name: 'Override Test Licensee',
        vertical: 'B2C_SPORTS_MERCH',
      },
    });

    // 1. Query resolution for targetLicenseeId (currently has no per-licensee override)
    const defaultConfig = await resolveActiveSplitConfig(prisma, targetLicenseeId);
    expect(defaultConfig.licenseeId).toBeNull(); // Platform default used
    expect(defaultConfig.royaltyBps).toBe(8500);

    // 2. Admin sets per-licensee override for targetLicenseeId (9000 royaltyBps = 90% royalty / 10% charity)
    const overrideRes = await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licenseeId: targetLicenseeId,
        royaltyBps: 9000,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 10000 },
        ],
      });
    expect(overrideRes.status).toBe(201);

    // 3. Query resolution for targetLicenseeId again -> should now return per-licensee config
    const resolvedOverride = await resolveActiveSplitConfig(prisma, targetLicenseeId);
    expect(resolvedOverride.licenseeId).toBe(targetLicenseeId);
    expect(resolvedOverride.royaltyBps).toBe(9000);

    // 4. Query resolution for another licensee without override -> still falls back to platform default
    const fallbackConfig = await resolveActiveSplitConfig(prisma, `lic_unconfigured_${runId}`);
    expect(fallbackConfig.licenseeId).toBeNull();
    expect(fallbackConfig.royaltyBps).toBe(8500);
  });

  // Test 6: Audit History endpoint returns entries in correct order with accurate changedByUserId
  test('6. GET /api/admin/split-config/history returns ordered history with changedByUserId', async () => {
    const runId = Date.now();
    const app = createApp();
    const historyLicenseeId = `lic_history_${runId}`;

    await prisma.licensee.create({
      data: {
        id: historyLicenseeId,
        name: 'History Test Licensee',
        vertical: 'B2B_HEAVY_MANUFACTURING',
      },
    });

    // 1. Post Config 1
    const res1 = await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licenseeId: historyLicenseeId,
        royaltyBps: 8000,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 10000 },
        ],
      });
    expect(res1.status).toBe(201);

    // 2. Post Config 2
    const res2 = await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licenseeId: historyLicenseeId,
        royaltyBps: 7500,
        charityAllocationBps: [
          { charityId: 'charity_ocean_clean', bps: 10000 },
        ],
      });
    expect(res2.status).toBe(201);

    // 3. Query history endpoint
    const historyRes = await request(app)
      .get(`/api/admin/split-config/history?licenseeId=${historyLicenseeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historyRes.status).toBe(200);
    const history = historyRes.body;
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(2);

    // History is ordered by changedAt desc
    expect(new Date(history[0].changedAt).getTime()).toBeGreaterThanOrEqual(new Date(history[1].changedAt).getTime());
    expect(history[0].isActive).toBe(true);
    expect(history[0].previousConfigId).toBe(history[1].id);
    expect(history[1].isActive).toBe(false);
    expect(history[0].changedByUser.email).toBe('admin@ghglogodrop.com');
  });

  // Test 7: With no active configuration, payments are refused instead of using an invented split
  test('7. resolveActiveSplitConfig throws when no active configuration exists', async () => {
    const emptyPrisma = {
      splitConfigHistory: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    await expect(resolveActiveSplitConfig(emptyPrisma, 'lic_without_config')).rejects.toBeInstanceOf(SplitConfigMissingError);
  });

  // Test 8: A split with no charities holds the charity share; an administrator assigns it later
  test('8. A split with no charities holds the charity share until an administrator assigns and pays it', async () => {
    const runId = Date.now();
    const licenseeId = `lic_reserve_${runId}`;
    // A currency no other test uses, so the held balance belongs to this test alone.
    const currency = 'CHF';
    const { stripe, mockPaymentIntentsCreate, mockTransfersCreate } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);
    const app = createApp(stripe);

    await prisma.licensee.create({
      data: { id: licenseeId, name: 'Reserve Test Licensee', vertical: 'B2B_CLEAN_TECH', stripeConnectedAccountId: 'acct_reserve_123' },
    });

    const saved = await request(app)
      .post('/api/admin/split-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ licenseeId, royaltyBps: 8000, charityAllocationBps: [] });
    expect(saved.status).toBe(201);

    mockPaymentIntentsCreate.mockResolvedValue({ id: `pi_reserve_${runId}`, client_secret: `pi_reserve_secret_${runId}` });
    const checkout = await checkoutService.initiateCheckout({
      licenseeId,
      checkoutReferenceId: `ref_reserve_${runId}`,
      grossAmountCents: 10000,
      currency,
      triggerEvent: { verificationSource: VerificationSource.CONSUMER_OPT_IN, deliveryType: DeliveryType.DIGITAL },
    });

    const held = await prisma.financialSplit.findUniqueOrThrow({
      where: { transactionId: checkout.transactionId },
      include: { charityAllocations: true },
    });
    expect(held.charityGiftCents).toBe(2000);
    expect(held.charityAllocations).toHaveLength(0);
    expect(held.allocationsFinalized).toBe(false);

    // Unpaid payments are not part of the reserve.
    let reserve = await request(app).get('/api/admin/charity-reserve').set('Authorization', `Bearer ${adminToken}`);
    expect(reserve.status).toBe(200);
    expect(reserve.body.balances.find((b: { currency: string }) => b.currency === currency)).toBeUndefined();

    await prisma.transaction.update({ where: { id: checkout.transactionId }, data: { status: 'SETTLED' } });
    reserve = await request(app).get('/api/admin/charity-reserve').set('Authorization', `Bearer ${adminToken}`);
    expect(reserve.body.balances).toContainEqual({ currency, totalCents: 2000, paymentCount: 1 });

    await request(app).get('/api/admin/charity-reserve').set('Authorization', `Bearer ${partnerToken}`).expect(403);
    await request(app)
      .post('/api/admin/charity-reserve/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currency, charityAllocationBps: [{ charityId: 'charity_green_earth', bps: 6000 }] })
      .expect(400);

    mockTransfersCreate.mockImplementation(async () => ({ id: `tr_reserve_${crypto.randomUUID()}` }));
    const assigned = await request(app)
      .post('/api/admin/charity-reserve/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        currency,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 7500 },
          { charityId: 'charity_ocean_clean', bps: 2500 },
        ],
      });
    expect(assigned.status).toBe(201);
    expect(assigned.body).toMatchObject({ currency, totalCents: 2000, paymentCount: 1, failedTransfers: 0 });

    const after = await prisma.financialSplit.findUniqueOrThrow({
      where: { transactionId: checkout.transactionId },
      include: { charityAllocations: { orderBy: { amountCents: 'desc' } } },
    });
    expect(after.allocationsFinalized).toBe(true);
    expect(after.charityAllocations.map((a) => [a.charityId, a.amountCents])).toEqual([
      ['charity_green_earth', 1500],
      ['charity_ocean_clean', 500],
    ]);
    expect(after.charityAllocations.every((a) => a.reserveAssignmentId === assigned.body.assignmentId && a.stripeTransferId)).toBe(true);
    expect(mockTransfersCreate).toHaveBeenCalledTimes(2);

    // The same funds cannot be assigned twice.
    await request(app)
      .post('/api/admin/charity-reserve/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currency, charityAllocationBps: [{ charityId: 'charity_green_earth', bps: 10000 }] })
      .expect(409);

    // Deactivate this licensee's split so later tests fall back to the platform default, and remove the
    // assignment record so suites that clear all users are not blocked by it.
    await prisma.splitConfigHistory.updateMany({ where: { licenseeId }, data: { isActive: false } });
    await prisma.charityReserveAssignment.delete({ where: { id: assigned.body.assignmentId } });
  });
});
