import request from 'supertest';
import Stripe from 'stripe';
import { PrismaClient, TransactionStatus, VerificationSource, Vertical } from '@prisma/client';
import { CheckoutService } from '../src/services/checkout.service';
import { createApp } from '../src/app';
import { runReconciliation } from '../src/jobs/reconcile.job';
import * as complianceService from '../src/services/compliance.service';
import { seed } from '../prisma/seed';

const prisma = new PrismaClient();

function createMockStripe(): {
  stripe: Stripe;
  mockPaymentIntentsCreate: jest.Mock;
  mockPaymentIntentsRetrieve: jest.Mock;
  mockConstructEvent: jest.Mock;
} {
  const mockPaymentIntentsCreate = jest.fn();
  const mockPaymentIntentsRetrieve = jest.fn();
  const mockConstructEvent = jest.fn();

  const mockStripe = {
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      retrieve: mockPaymentIntentsRetrieve,
    },
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  } as unknown as Stripe;

  return {
    stripe: mockStripe,
    mockPaymentIntentsCreate,
    mockPaymentIntentsRetrieve,
    mockConstructEvent,
  };
}

describe('Milestone 2 Payment Split Pipeline Tests', () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: initiateCheckout() computes a split that always sums exactly to grossAmountCents, including edge case
  test('1. initiateCheckout() computes exact-sum split for rounding edge case (e.g. grossAmountCents: 9999, royaltyBps: 1500)', async () => {
    const { stripe, mockPaymentIntentsCreate } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_test_edge_case',
      client_secret: 'pi_test_edge_case_secret',
    });

    const licensee = await prisma.licensee.create({
      data: {
        name: 'Rounding Edge Case Partner',
        vertical: Vertical.B2B_CLEAN_TECH,
        stripeConnectedAccountId: 'acct_edge_case_123',
        royaltyBps: 1500,
      },
    });

    const result = await checkoutService.initiateCheckout({
      licenseeId: licensee.id,
      grossAmountCents: 9999,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
        eventType: 'EDGE_CASE_TEST',
      },
    });

    expect(result.clientSecret).toBe('pi_test_edge_case_secret');

    const tx = await prisma.transaction.findUnique({
      where: { id: result.transactionId },
      include: { financialSplit: true },
    });

    expect(tx).toBeDefined();
    expect(tx?.grossAmountCents).toBe(9999);
    expect(tx?.financialSplit).toBeDefined();

    const charityGift = tx!.financialSplit!.charityGiftCents;
    const licensorRoyalty = tx!.financialSplit!.licensorRoyaltyCents;

    // Math.round(9999 * 1500 / 10000) = Math.round(1499.85) = 1500
    expect(charityGift).toBe(1500);
    expect(licensorRoyalty).toBe(8499);
    expect(charityGift + licensorRoyalty).toBe(9999);
  });

  // Test 2: initiateCheckout() throws if Licensee has no stripeConnectedAccountId
  test('2. initiateCheckout() throws if Licensee has no stripeConnectedAccountId', async () => {
    const { stripe } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    const licenseeNoAccount = await prisma.licensee.create({
      data: {
        name: 'Unonboarded Licensee',
        vertical: Vertical.B2C_LIFESTYLE_EVENTS,
        stripeConnectedAccountId: null,
      },
    });

    await expect(
      checkoutService.initiateCheckout({
        licenseeId: licenseeNoAccount.id,
        grossAmountCents: 5000,
        triggerEvent: {
          verificationSource: VerificationSource.CONSUMER_OPT_IN,
        },
      })
    ).rejects.toThrow('Licensee is not fully onboarded for payments');
  });

  // Test 3: initiateCheckout() passes transactionId as Stripe idempotency key
  test('3. initiateCheckout() passes internal transactionId as Stripe idempotencyKey option', async () => {
    const { stripe, mockPaymentIntentsCreate } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_idempotency_test',
      client_secret: 'pi_idempotency_secret',
    });

    const result = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      grossAmountCents: 10000,
      triggerEvent: {
        verificationSource: VerificationSource.MANUAL_ATTESTATION,
      },
    });

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
    const [createArgs, createOptions] = mockPaymentIntentsCreate.mock.calls[0];

    expect(createArgs.metadata.transactionId).toBe(result.transactionId);
    expect(createOptions).toEqual({ idempotencyKey: result.transactionId });
  });

  // Test 4: Webhook handler rejects request with invalid/missing signature (400 Bad Request, no DB writes)
  test('4. Webhook handler rejects invalid/missing signature with 400 Bad Request', async () => {
    const { stripe, mockConstructEvent } = createMockStripe();
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const app = createApp(stripe);

    const countBefore = await prisma.transaction.count();

    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'bad_sig_header')
      .send(JSON.stringify({ id: 'evt_invalid' }));

    expect(res.status).toBe(400);
    expect(res.text).toContain('Webhook Error: Invalid signature');

    const countAfter = await prisma.transaction.count();
    expect(countAfter).toBe(countBefore);
  });

  // Test 5: Webhook handler idempotency
  test('5. Webhook handler is idempotent — duplicate payment_intent.succeeded produces single settlement', async () => {
    const { stripe, mockConstructEvent } = createMockStripe();

    const tx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        grossAmountCents: 8000,
        status: TransactionStatus.PENDING,
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 6800,
            charityGiftCents: 1200,
          },
        },
      },
    });

    const succeededEvent: Stripe.Event = {
      id: 'evt_pi_succeeded_test',
      object: 'event',
      api_version: '2024-04-10',
      created: 123456789,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_succeeded_123',
          object: 'payment_intent',
          amount: 8000,
          currency: 'gbp',
          status: 'succeeded',
          transfer: 'tr_test_123',
          metadata: {
            transactionId: tx.id,
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
    };

    mockConstructEvent.mockReturnValue(succeededEvent);

    const app = createApp(stripe);

    const res1 = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(succeededEvent));

    expect(res1.status).toBe(200);

    const settledTx1 = await prisma.transaction.findUnique({
      where: { id: tx.id },
      include: { financialSplit: true },
    });
    expect(settledTx1?.status).toBe(TransactionStatus.SETTLED);
    expect(settledTx1?.financialSplit?.settledAt).toBeDefined();

    const res2 = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(succeededEvent));

    expect(res2.status).toBe(200);
    expect(res2.body.alreadySettled).toBe(true);

    const settledTx2 = await prisma.transaction.findUnique({
      where: { id: tx.id },
    });
    expect(settledTx2?.status).toBe(TransactionStatus.SETTLED);
  });

  // Test 6: Webhook handler on transfer.reversed sets REVERSED status and calls alertComplianceOfficer()
  test('6. Webhook handler on transfer.reversed sets REVERSED status and calls alertComplianceOfficer()', async () => {
    const alertSpy = jest.spyOn(complianceService, 'alertComplianceOfficer');

    const { stripe, mockConstructEvent } = createMockStripe();

    const tx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_jcb_test',
        grossAmountCents: 15000,
        status: TransactionStatus.SETTLED,
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 12750,
            charityGiftCents: 2250,
            stripeTransferId: 'tr_reversible_999',
            settledAt: new Date(),
          },
        },
      },
    });

    const transferReversedEvent: Stripe.Event = {
      id: 'evt_tr_reversed_test',
      object: 'event',
      api_version: '2024-04-10',
      created: 123456789,
      type: 'transfer.reversed',
      data: {
        object: {
          id: 'tr_reversible_999',
          object: 'transfer',
          amount: 2250,
          currency: 'gbp',
          metadata: {
            transactionId: tx.id,
          },
        } as any,
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
    };

    mockConstructEvent.mockReturnValue(transferReversedEvent);

    const app = createApp(stripe);

    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(transferReversedEvent));

    expect(res.status).toBe(200);

    const reversedTx = await prisma.transaction.findUnique({
      where: { id: tx.id },
    });
    expect(reversedTx?.status).toBe(TransactionStatus.REVERSED);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: tx.id,
        reason: 'transfer.reversed',
      })
    );

    alertSpy.mockRestore();
  });

  // Test 7: runReconciliation() correctly flags a Transaction whose Stripe status doesn't match ours
  test('7. runReconciliation() flags transaction with status drift and alerts compliance officer', async () => {
    const alertSpy = jest.spyOn(complianceService, 'alertComplianceOfficer');

    const { stripe, mockPaymentIntentsRetrieve } = createMockStripe();

    const oldDate = new Date(Date.now() - 120 * 60 * 1000);

    const pendingTx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        grossAmountCents: 6000,
        status: TransactionStatus.PENDING,
        stripePaymentIntentId: 'pi_drifted_status_001',
        createdAt: oldDate,
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 5100,
            charityGiftCents: 900,
          },
        },
      },
    });

    mockPaymentIntentsRetrieve.mockImplementation(async (piId: string) => {
      return {
        id: piId,
        status: 'succeeded',
      };
    });

    const reconciliationResult = await runReconciliation(prisma, stripe, 60);

    expect(reconciliationResult.checkedCount).toBeGreaterThanOrEqual(1);
    expect(reconciliationResult.mismatchesCount).toBeGreaterThanOrEqual(1);

    const driftedMatch = reconciliationResult.mismatches.find((m) => m.transactionId === pendingTx.id);
    expect(driftedMatch).toBeDefined();
    expect(driftedMatch?.dbStatus).toBe(TransactionStatus.PENDING);
    expect(driftedMatch?.stripeStatus).toBe('succeeded');

    expect(alertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: pendingTx.id,
        reason: 'RECONCILIATION_STATUS_DRIFT',
      })
    );

    alertSpy.mockRestore();
  });

  // Test 8: initiateCheckout() with same checkoutReferenceId reuses existing PENDING transaction and produces exactly one DB row
  test('8. initiateCheckout() with same checkoutReferenceId reuses existing PENDING transaction and produces exactly 1 DB row', async () => {
    const { stripe, mockPaymentIntentsCreate, mockPaymentIntentsRetrieve } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_reuse_ref_123',
      client_secret: 'pi_reuse_ref_secret_123',
    });

    mockPaymentIntentsRetrieve.mockImplementation(async (id: string) => {
      return {
        id,
        client_secret: 'pi_reuse_ref_secret_123',
        status: 'requires_payment_method',
      };
    });

    const checkoutReferenceId = `cart_ref_reuse_${Date.now()}_${Math.random()}`;

    const result1 = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      checkoutReferenceId,
      grossAmountCents: 12000,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
        eventType: 'REOPENED_CHECKOUT_TEST',
      },
    });

    expect(result1.clientSecret).toBe('pi_reuse_ref_secret_123');

    const countAfterFirst = await prisma.transaction.count({
      where: { checkoutReferenceId },
    });
    expect(countAfterFirst).toBe(1);

    const result2 = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      checkoutReferenceId,
      grossAmountCents: 12000,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
        eventType: 'REOPENED_CHECKOUT_TEST',
      },
    });

    expect(result2.clientSecret).toBe('pi_reuse_ref_secret_123');
    expect(result2.transactionId).toBe(result1.transactionId);

    const countAfterSecond = await prisma.transaction.count({
      where: { checkoutReferenceId },
    });
    expect(countAfterSecond).toBe(1);
  });

  // Test 9: PENDING transaction with checkoutReferenceId set but stripePaymentIntentId null reuses row and attaches PaymentIntent
  test('9. initiateCheckout() reuses PENDING transaction with null stripePaymentIntentId and attaches new PaymentIntent without crashing', async () => {
    const { stripe, mockPaymentIntentsCreate } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    const refId = `cart_ref_null_pi_${Date.now()}_${Math.random()}`;

    const existingTx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        checkoutReferenceId: refId,
        grossAmountCents: 15000,
        status: TransactionStatus.PENDING,
        stripePaymentIntentId: null,
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 12750,
            charityGiftCents: 2250,
          },
        },
      },
    });

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_attached_after_null',
      client_secret: 'pi_attached_after_null_secret',
    });

    const result = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      checkoutReferenceId: refId,
      grossAmountCents: 15000,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
      },
    });

    expect(result.transactionId).toBe(existingTx.id);
    expect(result.clientSecret).toBe('pi_attached_after_null_secret');

    const updatedTx = await prisma.transaction.findUnique({
      where: { id: existingTx.id },
    });
    expect(updatedTx?.stripePaymentIntentId).toBe('pi_attached_after_null');

    const totalCount = await prisma.transaction.count({
      where: { checkoutReferenceId: refId },
    });
    expect(totalCount).toBe(1);
  });

  // Test 10: retrieve() throwing or returning canceled status creates fresh PaymentIntent on same transaction row
  test('10. initiateCheckout() creates fresh PaymentIntent on same transaction when retrieve() throws or returns canceled', async () => {
    const { stripe, mockPaymentIntentsCreate, mockPaymentIntentsRetrieve } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    const refId = `cart_ref_canceled_${Date.now()}_${Math.random()}`;

    const existingTx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        checkoutReferenceId: refId,
        grossAmountCents: 20000,
        status: TransactionStatus.PENDING,
        stripePaymentIntentId: 'pi_dead_or_canceled',
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 17000,
            charityGiftCents: 3000,
          },
        },
      },
    });

    mockPaymentIntentsRetrieve.mockRejectedValueOnce(new Error('No such payment_intent: pi_dead_or_canceled'));

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_fresh_after_error',
      client_secret: 'pi_fresh_after_error_secret',
    });

    const result = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      checkoutReferenceId: refId,
      grossAmountCents: 20000,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
      },
    });

    expect(result.transactionId).toBe(existingTx.id);
    expect(result.clientSecret).toBe('pi_fresh_after_error_secret');

    const updatedTx = await prisma.transaction.findUnique({
      where: { id: existingTx.id },
    });
    expect(updatedTx?.stripePaymentIntentId).toBe('pi_fresh_after_error');

    const totalCount = await prisma.transaction.count({
      where: { checkoutReferenceId: refId },
    });
    expect(totalCount).toBe(1);
  });

  // Test 11: retrieve() returns succeeded — updates local status to SETTLED and throws error
  test('11. initiateCheckout() updates local status to SETTLED and throws error when retrieve() returns succeeded', async () => {
    const { stripe, mockPaymentIntentsRetrieve } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    const refId = `cart_ref_succeeded_${Date.now()}_${Math.random()}`;

    const tx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        checkoutReferenceId: refId,
        grossAmountCents: 10000,
        status: TransactionStatus.PENDING,
        stripePaymentIntentId: 'pi_already_succeeded_on_stripe',
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 8500,
            charityGiftCents: 1500,
          },
        },
      },
    });

    mockPaymentIntentsRetrieve.mockResolvedValueOnce({
      id: 'pi_already_succeeded_on_stripe',
      status: 'succeeded',
      transfer: 'tr_succeeded_99',
    });

    await expect(
      checkoutService.initiateCheckout({
        licenseeId: 'lic_itm_power',
        checkoutReferenceId: refId,
        grossAmountCents: 10000,
        triggerEvent: {
          verificationSource: VerificationSource.THIRD_PARTY_API,
        },
      })
    ).rejects.toThrow('Checkout already completed for this reference');

    const updatedTx = await prisma.transaction.findUnique({
      where: { id: tx.id },
      include: { financialSplit: true },
    });
    expect(updatedTx?.status).toBe(TransactionStatus.SETTLED);
    expect(updatedTx?.financialSplit?.settledAt).toBeDefined();
  });

  // Test 12: P2002 race condition recovery
  test('12. initiateCheckout() catches P2002 unique constraint race condition on createTransactionWithTrigger and reuses existing row', async () => {
    const { stripe, mockPaymentIntentsCreate } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    const refId = `cart_ref_race_${Date.now()}_${Math.random()}`;

    const existingTx = await prisma.transaction.create({
      data: {
        licenseeId: 'lic_itm_power',
        checkoutReferenceId: refId,
        grossAmountCents: 14000,
        status: TransactionStatus.PENDING,
        stripePaymentIntentId: null,
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 11900,
            charityGiftCents: 2100,
          },
        },
      },
    });

    const p2002Error: any = new Error('Unique constraint failed on the fields: (checkoutReferenceId)');
    p2002Error.code = 'P2002';
    jest.spyOn((checkoutService as any).transactionService, 'createTransactionWithTrigger').mockRejectedValueOnce(p2002Error);

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_race_recovered_123',
      client_secret: 'pi_race_recovered_secret',
    });

    const result = await checkoutService.initiateCheckout({
      licenseeId: 'lic_itm_power',
      checkoutReferenceId: refId,
      grossAmountCents: 14000,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
      },
    });

    expect(result.transactionId).toBe(existingTx.id);
    expect(result.clientSecret).toBe('pi_race_recovered_secret');

    const finalTx = await prisma.transaction.findUnique({
      where: { id: existingTx.id },
    });
    expect(finalTx?.stripePaymentIntentId).toBe('pi_race_recovered_123');
  });

  // Test 13: Reusing existing transaction pulls stored FinancialSplit, even if licensee.royaltyBps changed
  test('13. initiateCheckout() uses stored FinancialSplit amounts when reusing existing transaction even if licensee.royaltyBps changed', async () => {
    const { stripe, mockPaymentIntentsCreate } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);

    const refId = `cart_ref_royalty_change_${Date.now()}_${Math.random()}`;

    const licensee = await prisma.licensee.create({
      data: {
        name: 'Changing Royalty Licensee',
        vertical: Vertical.B2B_CLEAN_TECH,
        stripeConnectedAccountId: 'acct_changing_royalty_123',
        royaltyBps: 1500,
      },
    });

    const existingTx = await prisma.transaction.create({
      data: {
        licenseeId: licensee.id,
        checkoutReferenceId: refId,
        grossAmountCents: 10000,
        status: TransactionStatus.PENDING,
        stripePaymentIntentId: null,
        triggerEvent: {
          create: {
            verificationSource: VerificationSource.THIRD_PARTY_API,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: 8500,
            charityGiftCents: 1500,
          },
        },
      },
    });

    await prisma.licensee.update({
      where: { id: licensee.id },
      data: { royaltyBps: 3000 },
    });

    mockPaymentIntentsCreate.mockResolvedValueOnce({
      id: 'pi_stored_split_test',
      client_secret: 'pi_stored_split_secret',
    });

    await checkoutService.initiateCheckout({
      licenseeId: licensee.id,
      checkoutReferenceId: refId,
      grossAmountCents: 10000,
      triggerEvent: {
        verificationSource: VerificationSource.THIRD_PARTY_API,
      },
    });

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);

    // Verify the stored FinancialSplit amounts are preserved from the original transaction
    // (charityGiftCents should still be 1500 based on the original 15% royaltyBps,
    //  not 3000 based on the updated 30% royaltyBps — proving stored split is reused)
    const split = await prisma.financialSplit.findUnique({
      where: { transactionId: existingTx.id },
    });
    expect(split?.charityGiftCents).toBe(1500);
    expect(split?.licensorRoyaltyCents).toBe(8500);
  });
});
