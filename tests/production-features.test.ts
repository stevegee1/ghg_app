import request from 'supertest';
import { PrismaClient, SouvenirOrderStatus, SouvenirEventCategory, CharityStatus } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { seed } from '../prisma/seed';

const prisma = new PrismaClient();

describe('Production Features: Souvenir Orders, Capacity-Gated Charities & Goal Frenzy', () => {
  let app: any;

  beforeAll(async () => {
    await seed();
    app = createApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Souvenir Order Tracking & PDF Invoice', () => {
    let testOrderNumber: string;

    beforeAll(async () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      testOrderNumber = `GHG-TEST-${timestamp}`;

      await prisma.souvenirOrder.create({
        data: {
          orderNumber: testOrderNumber,
          customerName: 'Sarah Connor',
          customerEmail: 'sarah@example.com',
          eventCategory: SouvenirEventCategory.SPORTS,
          eventName: 'Highland Marathon 2026',
          shippingAddress: {
            street: '42 Skyfall Way',
            city: 'London',
            country: 'UK',
            postalCode: 'EC1A 1BB',
          },
          logoDropCount: 50,
          grossAmountCents: 10000,
          charityCents: 1500, // 15%
          licensorCents: 8500, // 85%
          status: SouvenirOrderStatus.ORDER_PLACED,
          courierName: 'DHL Express',
          trackingNumber: 'DHL-12345678',
        },
      });
    });

    it('successfully retrieves public tracking info by orderNumber (case-insensitive)', async () => {
      const res = await request(app)
        .get(`/api/orders/track/${testOrderNumber.toLowerCase()}`)
        .expect(200);

      expect(res.body).toHaveProperty('orderNumber', testOrderNumber);
      expect(res.body).toHaveProperty('status', 'ORDER_PLACED');
      expect(res.body).toHaveProperty('eventCategory', 'SPORTS');
      expect(res.body).toHaveProperty('logoDropCount', 50);
      expect(res.body.grossAmountCents).toBe(10000);
      expect(res.body.charityCents).toBe(1500);
      expect(res.body.licensorCents).toBe(8500);
      expect(res.body.courierName).toBe('DHL Express');
      expect(res.body.trackingNumber).toBe('DHL-12345678');
    });

    it('returns 404 for a non-existent order number', async () => {
      const res = await request(app)
        .get('/api/orders/track/GHG-NONEXISTENT-999')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('No order found with reference: GHG-NONEXISTENT-999');
    });

    it('generates and streams a valid PDF invoice with correct Content-Type', async () => {
      const res = await request(app)
        .get(`/api/orders/${testOrderNumber}/invoice-pdf`)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain(testOrderNumber);
      expect(res.body.length).toBeGreaterThan(500); // PDF binary data
    });
  });

  describe('2. Active Charities & Capacity-Gated Registration', () => {
    it('GET /api/charities/active returns at most 3 charities with their recorded partnership dates', async () => {
      const res = await request(app)
        .get('/api/charities/active')
        .expect(200);

      expect(res.body).toHaveProperty('charities');
      expect(Array.isArray(res.body.charities)).toBe(true);
      expect(res.body.charities.length).toBeLessThanOrEqual(3);
      expect(res.body).toHaveProperty('maxCapacity', 3);
      expect(res.body).toHaveProperty('registrationOpen');

      if (res.body.charities.length > 0) {
        const first = res.body.charities[0];
        expect(first).toHaveProperty('name');
        const stored = await prisma.charity.findUnique({ where: { id: first.id } });
        expect(first.partnershipStart).toBe(stored!.contractStartDate ? stored!.contractStartDate.toISOString() : null);
        expect(first.partnershipEnd).toBe(stored!.contractEndDate ? stored!.contractEndDate.toISOString() : null);
        expect(typeof first.totalDisbursedCents).toBe('number');
      }
    });

    it('POST /api/charities/register blocks application with HTTP 423 LOCKED when 3 charities exist', async () => {
      // Ensure there are at least 3 active charities in DB
      const currentCount = await prisma.charity.count({ where: { status: CharityStatus.ACTIVE } });
      if (currentCount < 3) {
        const needed = 3 - currentCount;
        for (let i = 0; i < needed; i++) {
          await prisma.charity.create({
            data: {
              name: `Active Charity Test ${Date.now()}-${i}`,
              stripeConnectedAccountId: `acct_test_${i}`,
              status: CharityStatus.ACTIVE,
            },
          });
        }
      }

      const res = await request(app)
        .post('/api/charities/register')
        .send({
          legalEntityName: 'Global Ocean Keepers',
          registrationNumber: 'GB-99887711',
          registrationJurisdiction: 'United Kingdom',
          headquartersAddress: '10 Marine Parade, Brighton',
          focusPillar: 'OCEAN_AND_WATER',
          primaryContactName: 'Dr. Jane Ocean',
          primaryContactEmail: 'jane@ocean.org',
          impactMetricDescription: 'Restores 100 hectares of marine kelp forests annually',
          authorizedSignatoryName: 'Dr. Jane Ocean',
          authorizedSignatoryTitle: 'CEO & Founder',
          agreedToTerms: true,
        });

      // Capacity gate triggers HTTP 423 Locked
      expect(res.status).toBe(423);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('maximum of 3 statutory charity positions are filled');
      expect(res.body).toHaveProperty('registrationOpen', false);
      expect(res.body).toHaveProperty('nextIntakeDate');
    });

    it('POST /api/charities/register validates required legal fields when capacity is available', async () => {
      // Temporarily mark charities as INACTIVE to open registration
      await prisma.charity.updateMany({
        data: { status: CharityStatus.INACTIVE },
      });

      const res = await request(app)
        .post('/api/charities/register')
        .send({
          legalEntityName: '',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Missing required field');

      // Restore active charities
      await prisma.charity.updateMany({
        data: { status: CharityStatus.ACTIVE },
      });
    });
  });

  describe('3. Goal Frenzy & Custom Keepsake Specs', () => {
    it('POST /api/custom-merch/preview computes accurate ISO 14067 LCA and 15% ESG split', async () => {
      const res = await request(app)
        .post('/api/custom-merch/preview')
        .send({
          garmentModel: 'HEAVYWEIGHT_HOODIE',
          inscribedText: 'Arsenal vs Tottenham 89 - Absolute limbs!',
          threadColor: 'GOLD_METALLIC',
          placement: 'LEFT_CHEST',
          quantity: 2,
          unitPriceCents: 8500,
        })
        .expect(200);

      expect(res.body).toHaveProperty('preview');
      const { financialSummary, dualImpactMetrics } = res.body.preview;
      expect(financialSummary.grossAmountCents).toBe(17000);
      expect(financialSummary.charityGiftCents).toBe(2550); // 15% of 17000
      expect(financialSummary.licensorRoyaltyCents).toBe(14450); // 85% of 17000
      expect(dualImpactMetrics.estimatedLcaCarbonGrams).toBe(1040); // 520g * 2
      expect(dualImpactMetrics.artisanLaborHours).toBe(4.0); // 2.0 hrs * 2
    });

    it('POST /api/custom-merch/checkout rejects Goal Frenzy order if frenzyClub is missing', async () => {
      const res = await request(app)
        .post('/api/custom-merch/checkout')
        .send({
          licenseeId: 'lic_ghg_official',
          garmentModel: 'HEAVYWEIGHT_HOODIE',
          inscribedText: 'Unbelievable winner!',
          isGoalFrenzy: true,
          // frenzyClub omitted
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('frenzyClub');
    });
  });

  describe('4. Preparation Services Pricing, Survivors Donation Keepsake & ISO 19011:2026 Protocol', () => {
    it('GET /api/preparation/pricing returns 3 statutory tiers with ISO 19011:2026 Annex A verification stamp', async () => {
      const res = await request(app)
        .get('/api/preparation/pricing')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.trademark).toContain('NFTYLOGS');
      expect(res.body.remoteProtocol).toContain('80% Remote Digital Data Protocol');
      expect(res.body.verificationStamp).toBe(
        'Evidence verified via Remote ICT Review in strict compliance with ISO 19011:2026 Annex A'
      );
      expect(Array.isArray(res.body.tiers)).toBe(true);
      expect(res.body.tiers.length).toBe(3);

      const [tier1, tier2, tier3] = res.body.tiers;
      expect(tier1.priceGbp).toBe(1250);
      expect(tier2.priceGbp).toBe(3500);
      expect(tier3.priceGbp).toBe(8500);
      expect(tier2.isRecommended).toBe(true);
    });

    it('GET /api/custom-merch/products returns 6 product categories with strict 85/15 supplier vs charity split', async () => {
      const res = await request(app)
        .get('/api/custom-merch/products')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.studioName).toBe('Survivors Donation Keepsake');
      expect(res.body.trademark).toContain('NFTYLOGS');
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBe(6);

      const productIds = res.body.products.map((p: any) => p.id);
      expect(productIds).toEqual(
        expect.arrayContaining(['T_SHIRT', 'PUFF_JACKET', 'HOODIE', 'BACKPACK', 'SCHOOL_BAG', 'SOCKS'])
      );

      // Verify each product has strict 85% supplier / 15% charity split
      for (const p of res.body.products) {
        expect(p.supplierSharePct).toBe(85);
        expect(p.charitySharePct).toBe(15);
        expect(p.baseSupplierCostCents + p.charityGiftCents).toBe(p.retailPriceCents);
      }
    });

    it('POST /api/custom-merch/preview dynamically calculates unit price and LCA for PUFF_JACKET and SOCKS', async () => {
      const resPuffer = await request(app)
        .post('/api/custom-merch/preview')
        .send({
          garmentModel: 'PUFF_JACKET',
          inscribedText: 'Disaster Relief Expedition Keepsake',
          threadColor: 'GOLD_METALLIC',
          placement: 'LEFT_CHEST',
          quantity: 1,
        })
        .expect(200);

      expect(resPuffer.body.preview.garmentModel).toBe('PUFF_JACKET');
      expect(resPuffer.body.preview.financialSummary.charityGiftCents).toBe(
        Math.round(resPuffer.body.preview.financialSummary.grossAmountCents * 0.15)
      );
      expect(resPuffer.body.preview.dualImpactMetrics.estimatedLcaCarbonGrams).toBe(780);

      const resSocks = await request(app)
        .post('/api/custom-merch/preview')
        .send({
          garmentModel: 'SOCKS',
          inscribedText: 'Peak District 2026 Trail Run',
          threadColor: 'PURE_WHITE',
          placement: 'LEFT_CHEST',
          quantity: 3,
        })
        .expect(200);

      expect(resSocks.body.preview.garmentModel).toBe('SOCKS');
      expect(resSocks.body.preview.dualImpactMetrics.estimatedLcaCarbonGrams).toBe(360); // 120 * 3
    });
  });
});
