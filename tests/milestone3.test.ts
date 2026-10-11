import request from 'supertest';
import Stripe from 'stripe';
import { PrismaClient, VerificationSource } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { CheckoutService } from '../src/services/checkout.service';
import { seed } from './fixtures/sample-data';

const prisma = new PrismaClient();

function createMockStripe(): Stripe {
  return {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  } as unknown as Stripe;
}

describe('Milestone 3 Consumer Opt-In Checkout API Route Tests', () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. POST /api/checkout with valid input calls initiateCheckout with hardcoded verificationSource: CONSUMER_OPT_IN', async () => {
    const stripe = createMockStripe();
    const app = createApp(stripe);

    const initiateSpy = jest
      .spyOn(CheckoutService.prototype, 'initiateCheckout')
      .mockResolvedValueOnce({
        clientSecret: 'pi_mock_client_secret_123',
        transactionId: 'tx_mock_123',
      });

    const refId = 'cart_ref_m3_test_01';

    const res = await request(app)
      .post('/api/checkout')
      .send({
        licenseeId: 'lic_arsenal_fc',
        checkoutReferenceId: refId,
        grossAmountCents: 2500,
        currency: 'GBP',
        verificationSource: 'MALICIOUS_CLIENT_OVERRIDE',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      clientSecret: 'pi_mock_client_secret_123',
      transactionId: 'tx_mock_123',
    });

    expect(initiateSpy).toHaveBeenCalledTimes(1);
    const serviceInput = initiateSpy.mock.calls[0][0];

    expect(serviceInput.licenseeId).toBe('lic_arsenal_fc');
    expect(serviceInput.checkoutReferenceId).toBe(refId);
    expect(serviceInput.grossAmountCents).toBe(2500);
    expect(serviceInput.triggerEvent.verificationSource).toBe(VerificationSource.CONSUMER_OPT_IN);

    initiateSpy.mockRestore();
  });

  test('2. POST /api/checkout with invalid input returns 400 Bad Request without calling service layer', async () => {
    const stripe = createMockStripe();
    const app = createApp(stripe);

    const initiateSpy = jest.spyOn(CheckoutService.prototype, 'initiateCheckout');

    // Missing licenseeId
    const res1 = await request(app)
      .post('/api/checkout')
      .send({
        checkoutReferenceId: 'ref_123',
        grossAmountCents: 2500,
      });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toContain('Invalid input');

    // Non-integer grossAmountCents
    const res2 = await request(app)
      .post('/api/checkout')
      .send({
        licenseeId: 'lic_arsenal_fc',
        checkoutReferenceId: 'ref_123',
        grossAmountCents: 25.5,
      });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toContain('Invalid input');

    // Negative grossAmountCents
    const res3 = await request(app)
      .post('/api/checkout')
      .send({
        licenseeId: 'lic_arsenal_fc',
        checkoutReferenceId: 'ref_123',
        grossAmountCents: -500,
      });
    expect(res3.status).toBe(400);

    // Missing checkoutReferenceId
    const res4 = await request(app)
      .post('/api/checkout')
      .send({
        licenseeId: 'lic_arsenal_fc',
        checkoutReferenceId: '',
        grossAmountCents: 2500,
      });
    expect(res4.status).toBe(400);

    expect(initiateSpy).not.toHaveBeenCalled();
    initiateSpy.mockRestore();
  });

  test('3. POST /api/checkout returns 409 Conflict when service throws "Checkout already completed for this reference"', async () => {
    const stripe = createMockStripe();
    const app = createApp(stripe);

    const initiateSpy = jest
      .spyOn(CheckoutService.prototype, 'initiateCheckout')
      .mockRejectedValueOnce(new Error('Checkout already completed for this reference'));

    const res = await request(app)
      .post('/api/checkout')
      .send({
        licenseeId: 'lic_arsenal_fc',
        checkoutReferenceId: 'ref_completed_123',
        grossAmountCents: 2500,
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'Checkout already completed for this reference',
    });

    initiateSpy.mockRestore();
  });

  test('4. POST /api/checkout returns 500 with generic error message when service throws unexpected error', async () => {
    const stripe = createMockStripe();
    const app = createApp(stripe);

    const internalSecretError = new Error('Stripe API Key sk_test_secret_12345 is invalid at Stripe.connect()');

    const initiateSpy = jest
      .spyOn(CheckoutService.prototype, 'initiateCheckout')
      .mockRejectedValueOnce(internalSecretError);

    const res = await request(app)
      .post('/api/checkout')
      .send({
        licenseeId: 'lic_arsenal_fc',
        checkoutReferenceId: 'ref_error_123',
        grossAmountCents: 2500,
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'An unexpected error occurred during checkout',
    });
    expect(JSON.stringify(res.body)).not.toContain('sk_test_secret_12345');
    expect(JSON.stringify(res.body)).not.toContain('Stripe API Key');

    initiateSpy.mockRestore();
  });
});
