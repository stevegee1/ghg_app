import request from 'supertest';
import Stripe from 'stripe';
import { PrismaClient, TransactionStatus, VerificationSource, DeliveryType, CharityStatus } from '@prisma/client';
import { CheckoutService } from '../src/services/checkout.service';
import { computeCharityAllocations, getOrComputeDefaultCharityAllocations } from '../src/services/charity-allocation.service';
import { createApp } from '../src/app';
import { runReconciliation } from '../src/jobs/reconcile.job';
import { seed } from '../prisma/seed';

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

describe('Milestone 5b: Multi-Charity Allocation & Settlement Tests', () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Allocation service math with remainder assignment discipline & active charity filtering
  test('1. Allocation service produces exact sum matching charityGiftCents with remainder assigned to last item, filtering active charities', async () => {
    // 1a. Pure arithmetic test: 1000 cents across 3 charities at 3333, 3333, 3334 bps
    const charities = [
      { id: 'c1', bps: 3333 },
      { id: 'c2', bps: 3333 },
      { id: 'c3', bps: 3334 },
    ];

    const results = computeCharityAllocations(1000, charities);
    expect(results.length).toBe(3);
    expect(results[0].amountCents).toBe(333);
    expect(results[1].amountCents).toBe(333);
    expect(results[2].amountCents).toBe(334); // Absorbs 1 cent rounding remainder

    const sum = results.reduce((acc, r) => acc + r.amountCents, 0);
    expect(sum).toBe(1000);

    // 1b. getOrComputeDefaultCharityAllocations only considers active charities
    const activeAllocations = await getOrComputeDefaultCharityAllocations(prisma, 1000);
    expect(activeAllocations.length).toBe(3); // 3 active charities in seed

    // Confirm legacy inactive charity is excluded
    const inactiveCharity = await prisma.charity.findUnique({ where: { id: 'charity_legacy_inactive' } });
    expect(inactiveCharity?.status).toBe(CharityStatus.INACTIVE);
    const hasInactive = activeAllocations.some((a) => a.charityId === 'charity_legacy_inactive');
    expect(hasInactive).toBe(false);

    const dbSum = activeAllocations.reduce((acc, a) => acc + a.amountCents, 0);
    expect(dbSum).toBe(1000);
  });

  // Test 2: DB trigger rejects raw SQL CharityAllocation insert exceeding charityGiftCents
  test('2. DB trigger rejects raw SQL CharityAllocation insert whose running sum exceeds charityGiftCents', async () => {
    const runId = Date.now();
    // Create raw FinancialSplit with charityGiftCents = 1000
    const rawTx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        grossAmountCents: 5000,
        financialSplit: {
          create: {
            licensorRoyaltyCents: 4000,
            charityGiftCents: 1000,
            allocationsFinalized: false,
          },
        },
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
            deliveryType: DeliveryType.DIGITAL,
          },
        },
      },
      include: { financialSplit: true },
    });

    const splitId = rawTx.financialSplit!.id;

    // Insert allocation of 700 cents (valid <= 1000)
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CharityAllocation" ("id", "financialSplitId", "charityId", "amountCents", "createdAt")
      VALUES ('alloc_raw_${runId}_1', '${splitId}', 'charity_green_earth', 700, NOW());
    `);

    // Attempt to insert another allocation of 400 cents (700 + 400 = 1100 > 1000)
    const badSql = `
      INSERT INTO "CharityAllocation" ("id", "financialSplitId", "charityId", "amountCents", "createdAt")
      VALUES ('alloc_raw_${runId}_2', '${splitId}', 'charity_ocean_clean', 400, NOW());
    `;

    await expect(prisma.$executeRawUnsafe(badSql)).rejects.toThrow(
      /check_charity_allocation_sum_bound_trigger|CharityAllocation sum/
    );
  });

  // Test 3: allocationsFinalized cannot be set true if allocation sum != charityGiftCents
  test('3. allocationsFinalized cannot be set true if current allocation sum does not equal charityGiftCents', async () => {
    const runId = Date.now();
    const rawTx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        grossAmountCents: 5000,
        financialSplit: {
          create: {
            licensorRoyaltyCents: 4000,
            charityGiftCents: 1000,
            allocationsFinalized: false,
          },
        },
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
            deliveryType: DeliveryType.DIGITAL,
          },
        },
      },
      include: { financialSplit: true },
    });

    const splitId = rawTx.financialSplit!.id;

    // Insert allocation of 700 cents only (incomplete, 700 != 1000)
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CharityAllocation" ("id", "financialSplitId", "charityId", "amountCents", "createdAt")
      VALUES ('alloc_raw_unfin_${runId}', '${splitId}', 'charity_green_earth', 700, NOW());
    `);

    // Attempt to set allocationsFinalized = true via SQL
    const updateSql = `
      UPDATE "FinancialSplit" SET "allocationsFinalized" = true WHERE "id" = '${splitId}';
    `;

    await expect(prisma.$executeRawUnsafe(updateSql)).rejects.toThrow(
      /check_financial_split_allocations_finalized_trigger|Cannot finalize allocations/
    );
  });

  // Test 4: Full checkout flow + Webhook per-charity transfer fan-out
  test('4. Full checkout flow: PaymentIntent has no transfer_data; webhook payment_intent.succeeded fans out per-charity transfers', async () => {
    const runId = Date.now();
    const { stripe, mockPaymentIntentsCreate, mockTransfersCreate, mockConstructEvent } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);
    const customApp = createApp(stripe);

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: `pi_multi_${runId}`,
      client_secret: `pi_multi_secret_${runId}`,
    });

    // 1. Initiate checkout
    const checkoutRes = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      checkoutReferenceId: `ref_m5b_checkout_${runId}`,
      grossAmountCents: 10000, // £100.00
      triggerEvent: {
        verificationSource: VerificationSource.CONSUMER_OPT_IN,
        deliveryType: DeliveryType.DIGITAL,
      },
    });

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
    const piCallArgs = mockPaymentIntentsCreate.mock.calls[0][0];
    expect(piCallArgs.amount).toBe(10000);
    // Confirm PaymentIntent has NO transfer_data targeting a single charity
    expect(piCallArgs.transfer_data).toBeUndefined();

    // 2. Mock Webhook payment_intent.succeeded
    mockConstructEvent.mockReturnValueOnce({
      id: `evt_pi_succeeded_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_multi_${runId}`,
          metadata: { transactionId: checkoutRes.transactionId },
        },
      },
    } as any);

    mockTransfersCreate.mockImplementation((params, options) => {
      return Promise.resolve({
        id: `tr_mock_${options.idempotencyKey}`,
      });
    });

    const webhookRes = await request(customApp)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .send({});

    expect(webhookRes.status).toBe(200);

    // Confirm 3 per-charity transfers were created (one for each active charity allocation)
    expect(mockTransfersCreate).toHaveBeenCalledTimes(3);

    // Verify each call used CharityAllocation.id as idempotencyKey
    const allocRows = await prisma.charityAllocation.findMany({
      where: { financialSplit: { transactionId: checkoutRes.transactionId } },
    });

    expect(allocRows.length).toBe(3);
    for (const alloc of allocRows) {
      expect(alloc.stripeTransferId).toBe(`tr_mock_${alloc.id}`);
      expect(alloc.transferFailed).toBe(false);
    }
  });

  // Test 5: Partial transfer failure (1 failure out of 3) leaves parent transaction SETTLED and is retried by reconciliation
  test('5. Partial charity transfer failure leaves parent Transaction SETTLED, non-failing allocations succeed, and reconciliation retries failed allocation', async () => {
    const runId = Date.now();
    const { stripe, mockPaymentIntentsCreate, mockTransfersCreate, mockConstructEvent } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);
    const customApp = createApp(stripe);

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: `pi_partial_${runId}`,
      client_secret: `pi_partial_secret_${runId}`,
    });

    const checkoutRes = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      checkoutReferenceId: `ref_m5b_partial_fail_${runId}`,
      grossAmountCents: 12000,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
        deliveryType: DeliveryType.DIGITAL,
      },
    });

    const allocs = await prisma.charityAllocation.findMany({
      where: { financialSplit: { transactionId: checkoutRes.transactionId } },
      orderBy: { id: 'asc' },
    });
    expect(allocs.length).toBe(3);
    const failingAllocId = allocs[1].id; // Make middle allocation fail

    mockConstructEvent.mockReturnValueOnce({
      id: `evt_pi_partial_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_partial_${runId}`,
          metadata: { transactionId: checkoutRes.transactionId },
        },
      },
    } as any);

    mockTransfersCreate.mockImplementation((params, options) => {
      if (options.idempotencyKey === failingAllocId) {
        return Promise.reject(new Error('Stripe balance temporarily insufficient'));
      }
      return Promise.resolve({
        id: `tr_mock_${options.idempotencyKey}`,
      });
    });

    const webhookRes = await request(customApp)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .send({});

    expect(webhookRes.status).toBe(200);

    // Parent transaction remains SETTLED
    const parentTx = await prisma.transaction.findUnique({
      where: { id: checkoutRes.transactionId },
    });
    expect(parentTx?.status).toBe(TransactionStatus.SETTLED);

    // Check allocations: 2 succeeded, 1 failed
    const checkAllocs = await prisma.charityAllocation.findMany({
      where: { financialSplit: { transactionId: checkoutRes.transactionId } },
      orderBy: { id: 'asc' },
    });

    expect(checkAllocs[0].stripeTransferId).toBe(`tr_mock_${checkAllocs[0].id}`);
    expect(checkAllocs[0].transferFailed).toBe(false);

    expect(checkAllocs[1].stripeTransferId).toBeNull();
    expect(checkAllocs[1].transferFailed).toBe(true); // Failing allocation flagged

    expect(checkAllocs[2].stripeTransferId).toBe(`tr_mock_${checkAllocs[2].id}`);
    expect(checkAllocs[2].transferFailed).toBe(false);

    // Test Reconciliation Retry on the failed allocation
    mockTransfersCreate.mockImplementationOnce((params, options) => {
      expect(options.idempotencyKey).toBe(failingAllocId);
      return Promise.resolve({
        id: `tr_healed_${failingAllocId}`,
      });
    });

    const reconcileRes = await runReconciliation(prisma, stripe, 0); // 0 threshold for instant check
    expect(reconcileRes.unsettledAllocationsCount).toBeGreaterThanOrEqual(1);

    const healedAlloc = await prisma.charityAllocation.findUnique({
      where: { id: failingAllocId },
    });
    expect(healedAlloc?.stripeTransferId).toBe(`tr_healed_${failingAllocId}`);
    expect(healedAlloc?.transferFailed).toBe(false);
    expect(healedAlloc?.retryCount).toBeGreaterThanOrEqual(1);
  });

  // Test 6: Webhook idempotency for already-settled transactions skips duplicate transfers
  test('6. Webhook redelivery for an already-settled transaction skips duplicate transfers for settled allocations', async () => {
    const runId = Date.now();
    const { stripe, mockPaymentIntentsCreate, mockTransfersCreate, mockConstructEvent } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);
    const customApp = createApp(stripe);

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: `pi_idempotent_${runId}`,
      client_secret: `pi_idempotent_secret_${runId}`,
    });

    const checkoutRes = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      checkoutReferenceId: `ref_m5b_idempotent_${runId}`,
      grossAmountCents: 9000,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
        deliveryType: DeliveryType.DIGITAL,
      },
    });

    mockConstructEvent.mockReturnValue({
      id: `evt_pi_idempotent_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_idempotent_${runId}`,
          metadata: { transactionId: checkoutRes.transactionId },
        },
      },
    } as any);

    mockTransfersCreate.mockImplementation((params, options) => {
      return Promise.resolve({
        id: `tr_idempotent_${options.idempotencyKey}`,
      });
    });

    // First webhook delivery
    await request(customApp).post('/webhooks/stripe').set('stripe-signature', 'valid_sig').send({});
    expect(mockTransfersCreate).toHaveBeenCalledTimes(3);

    mockTransfersCreate.mockClear();

    // Redelivered webhook
    const res2 = await request(customApp).post('/webhooks/stripe').set('stripe-signature', 'valid_sig').send({});
    expect(res2.status).toBe(200);
    // Zero transfers created on redelivery because all allocations already have stripeTransferId set
    expect(mockTransfersCreate).toHaveBeenCalledTimes(0);
  });
});
