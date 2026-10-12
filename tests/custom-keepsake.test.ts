import crypto from 'crypto';
import request from 'supertest';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { resolveActiveSplitConfig } from '../src/services/split-config.service';
import { seed } from './fixtures/sample-data';

/** Custom keepsake studio: server-side pricing, one transaction per order, and honest Stripe failures. */
const prisma = new PrismaClient();
const stripe = {
  paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
} as unknown as Stripe;
const app = createApp(stripe);

// jest resetMocks clears implementations before each test, so the session double is armed here.
beforeEach(() => {
  (stripe.checkout.sessions.create as jest.Mock).mockImplementation(async () => ({
    id: `cs_keepsake_${crypto.randomUUID()}`,
    url: 'https://checkout.stripe.com/c/pay/cs_iso3',
  }));
});

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Custom keepsake studio', () => {
  it('should generate live keepsake preview priced from the catalogue with ISO 14067 LCA carbon grams', async () => {
    const res = await request(app)
      .post('/api/custom-merch/preview')
      .send({
        garmentModel: 'HEAVYWEIGHT_HOODIE',
        inscribedText: "Bukayo Saka 89' Top-Corner Winner",
        threadColor: 'GOLD_METALLIC',
        placement: 'LEFT_CHEST',
        quantity: 2,
        unitPriceCents: 9000, // £90.00
      });

    expect(res.status).toBe(200);
    const preview = res.body.preview;
    const garment = await prisma.merchProduct.findUniqueOrThrow({ where: { id: 'HEAVYWEIGHT_HOODIE' } });
    const split = await resolveActiveSplitConfig(prisma, garment.licenseeId);
    // The client's £90.00 is ignored; the catalogue price applies.
    expect(preview.financialSummary.grossAmountCents).toBe(garment.pricePence! * 2);
    expect(preview.financialSummary.charityPercentage).toBe((10000 - split.royaltyBps) / 100);
    expect(preview.dualImpactMetrics.estimatedLcaCarbonGrams).toBe(garment.lcaGrams! * 2);
    expect(preview.dualImpactMetrics.artisanLaborHours).toBe(garment.laborHours! * 2);
    expect(preview.canvasRenderSpec.threadHex).toBe('#D4AF37');
  });

  it('should complete bespoke keepsake checkout and persist CustomKeepsakeSpec', async () => {
    const res = await request(app)
      .post('/api/custom-merch/checkout')
      .send({
        garmentModel: 'HEAVYWEIGHT_HOODIE',
        inscribedText: 'Sarah & Alex Wedding — 28 August 2026',
        threadColor: 'STERLING_SILVER',
        placement: 'LEFT_CHEST',
        quantity: 1,
        unitPriceCents: 8500,
        currency: 'GBP',
      });

    expect(res.status).toBe(201);
    expect(res.body.transactionId).toBeDefined();
    expect(res.body.sessionUrl).toBe('https://checkout.stripe.com/c/pay/cs_iso3');
    // One transaction per order: the Checkout Session's, carrying the keepsake.
    const session = (stripe.checkout.sessions.create as jest.Mock).mock.calls.at(-1)[0];
    expect(session.metadata.transactionId).toBe(res.body.transactionId);
    const garment = await prisma.merchProduct.findUniqueOrThrow({ where: { id: 'HEAVYWEIGHT_HOODIE' } });
    expect(res.body.financialSummary.grossAmountCents).toBe(garment.pricePence);
    const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: res.body.transactionId } });
    expect(tx.grossAmountCents).toBe(garment.pricePence);
    expect(tx.licenseeId).toBe(garment.licenseeId);
    expect(res.body.keepsakeSpec.inscribedText).toBe('Sarah & Alex Wedding — 28 August 2026');

    // Verify in DB that CustomKeepsakeSpec exists
    const savedSpec = await prisma.customKeepsakeSpec.findUnique({
      where: { transactionId: res.body.transactionId },
    });
    expect(savedSpec).not.toBeNull();
    expect(savedSpec?.garmentModel).toBe('HEAVYWEIGHT_HOODIE');
  });
});

describe('Custom keepsake checkout when Stripe is unavailable', () => {
  it('reports the failure and records no keepsake order, instead of showing a placed order', async () => {
    (stripe.checkout.sessions.create as jest.Mock).mockRejectedValueOnce(new Error('Stripe unavailable'));
    const before = await prisma.customKeepsakeSpec.count();
    const res = await request(app).post('/api/custom-merch/checkout').send({
      garmentModel: 'HEAVYWEIGHT_HOODIE',
      inscribedText: 'Stripe outage test',
      threadColor: 'STERLING_SILVER',
      placement: 'LEFT_CHEST',
    });
    expect(res.status).toBe(502);
    expect(res.body.sessionUrl).toBeUndefined();
    expect(await prisma.customKeepsakeSpec.count()).toBe(before);
  });
});
