import request from 'supertest';
import Stripe from 'stripe';
import { PrismaClient, VerificationSource, DeliveryType } from '@prisma/client';
import { CheckoutService } from '../src/services/checkout.service';
import { TransactionService } from '../src/services/transaction.service';
import { generateCertificatePdf, getCertificateAggregateData } from '../src/services/certificate.service';
import { createApp } from '../src/expressApp';
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

function extractPdfText(pdfBuffer: Buffer): string {
  const raw = pdfBuffer.toString('latin1');
  const decoded = raw.replace(/<([0-9a-fA-F]+)>/g, (_, hex) => {
    try {
      return Buffer.from(hex, 'hex').toString('utf8');
    } catch {
      return '';
    }
  });
  return decoded.replace(/\[|\]|TJ|-?\d+/g, '').replace(/\s+/g, '');
}

describe('Milestone 5d: Verification Honesty Tests', () => {
  beforeAll(async () => {
    await seed();
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Creating a TriggerEvent via each of the three verification-source paths produces the correct default attestationNote
  test('1. Creating TriggerEvents via B2B API, Consumer Checkout, and Manual Attestation produces correct default attestationNote', async () => {
    const runId = Date.now();
    const { stripe, mockPaymentIntentsCreate } = createMockStripe();
    const checkoutService = new CheckoutService(prisma, stripe);
    const transactionService = new TransactionService(prisma);
    const app = createApp(stripe);

    mockPaymentIntentsCreate.mockResolvedValue({
      id: `pi_m5d_1_${runId}`,
      client_secret: `pi_m5d_1_secret_${runId}`,
    });

    // Path A: B2B API Trigger (THIRD_PARTY_API)
    const b2bRes = await request(app)
      .post('/api/b2b/trigger')
      .set('X-API-Key', 'b2b_key_itm_secret')
      .send({
        licenseeId: 'lic_itm_power',
        quantity: 5,
        deliveryType: DeliveryType.DIGITAL,
        externalReferenceId: `ext_m5d_b2b_${runId}`,
      });
    expect(b2bRes.status).toBe(200);

    const b2bTx = await prisma.transaction.findUnique({
      where: { id: b2bRes.body.transactionId },
      include: { triggerEvent: true },
    });
    expect(b2bTx?.triggerEvent?.verificationSource).toBe(VerificationSource.THIRD_PARTY_API);
    expect(b2bTx?.triggerEvent?.attestationNote).toBe(
      "Data submitted via partner's own API/telemetry system. Not independently audited."
    );

    // Path B: Consumer Opt-In Checkout (CONSUMER_OPT_IN)
    const b2cRes = await request(app)
      .post('/api/checkout')
      .send({
        licenseeId: 'lic_arsenal_fc',
        grossAmountCents: 5000,
        checkoutReferenceId: `ref_m5d_b2c_${runId}`,
      });
    expect(b2cRes.status).toBe(200);

    const b2cTx = await prisma.transaction.findUnique({
      where: { id: b2cRes.body.transactionId },
      include: { triggerEvent: true },
    });
    expect(b2cTx?.triggerEvent?.verificationSource).toBe(VerificationSource.CONSUMER_OPT_IN);
    expect(b2cTx?.triggerEvent?.attestationNote).toBe(
      'Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type.'
    );

    // Path C: Manual Attestation (MANUAL_ATTESTATION)
    const manualTx = await transactionService.createTransactionWithTrigger({
      licenseeId: 'lic_jcb_test',
      checkoutReferenceId: `ref_m5d_manual_${runId}`,
      grossAmountCents: 7500,
      triggerEvent: {
        verificationSource: VerificationSource.MANUAL_ATTESTATION,
        deliveryType: DeliveryType.PHYSICAL,
      },
      financialSplit: {
        licensorRoyaltyCents: 6375,
        charityGiftCents: 1125,
      },
    });

    const fetchedManualTx = await prisma.transaction.findUnique({
      where: { id: manualTx.id },
      include: { triggerEvent: true },
    });
    expect(fetchedManualTx?.triggerEvent?.verificationSource).toBe(VerificationSource.MANUAL_ATTESTATION);
    expect(fetchedManualTx?.triggerEvent?.attestationNote).toBe(
      'Manually attested by an authorized user. Not independently audited.'
    );
  });

  // Test 2: A caller-supplied attestationNote containing a disallowed phrase is rejected with 400
  test('2. Caller-supplied attestationNote claiming independent verification is rejected with 400 Bad Request', async () => {
    const runId = Date.now();
    const app = createApp();

    const res = await request(app)
      .post('/api/b2b/trigger')
      .set('X-API-Key', 'b2b_key_itm_secret')
      .send({
        licenseeId: 'lic_itm_power',
        quantity: 2,
        deliveryType: DeliveryType.DIGITAL,
        externalReferenceId: `ext_disallowed_${runId}`,
        attestationNote: 'Emissions data was independently verified and certified by AccreditedAuditor Corp',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Custom attestationNote cannot claim independent verification or certification.');
  });

  // Test 3: Generated certificate PDF text includes standing verification disclaimer
  test('3. Generated certificate PDF includes standing verification disclaimer text', async () => {
    const adminUserScope = {
      userId: 'usr_admin_001',
      role: 'ADMIN',
      licenseeId: null,
    };

    const aggregateData = await getCertificateAggregateData(prisma, {
      licenseeId: 'lic_itm_power',
      user: adminUserScope,
    });

    const pdfBuffer = await generateCertificatePdf(aggregateData);
    const pdfText = extractPdfText(pdfBuffer);

    expect(pdfText).toContain('VerificationDisclaimer');
    expect(pdfText).toContain('doesnotindependently');
    expect(pdfText).toContain('environmentalorcarbonclaims');
    expect(pdfText).toContain('documentintegritycheck');
  });

  // Test 4: /api/v1/transparency-ledger response always includes the dataDisclaimer field
  test('4. GET /api/v1/transparency-ledger response always includes dataDisclaimer field', async () => {
    const app = createApp();

    const res = await request(app).get('/api/v1/transparency-ledger');
    expect(res.status).toBe(200);
    expect(res.body.dataDisclaimer).toBe(
      'Figures reflect settled licensing transactions and charitable routing only. Partner environmental claims are not independently verified by this platform.'
    );
    expect(res.body).toHaveProperty('totalSettledTransactions');
    expect(res.body).toHaveProperty('totalCharityGiftCents');
    expect(res.body).toHaveProperty('publicPartners');
  });

  // Test 5: Backfill migration correctly populates attestationNote on pre-existing rows without nulls
  test('5. Backfill migration populates attestationNote on all TriggerEvent rows without leaving any nulls', async () => {
    // Run backfill SQL (identical to migration 20260811150000_add_attestation_note_and_backfill)
    await prisma.$executeRawUnsafe(`
      UPDATE "TriggerEvent"
      SET "attestationNote" = CASE "verificationSource"::text
        WHEN 'THIRD_PARTY_API' THEN 'Data submitted via partner''s own API/telemetry system. Not independently audited.'
        WHEN 'MANUAL_ATTESTATION' THEN 'Manually attested by an authorized user. Not independently audited.'
        WHEN 'CONSUMER_OPT_IN' THEN 'Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type.'
        ELSE 'Data submitted via partner system. Not independently audited.'
      END
      WHERE "attestationNote" IS NULL;
    `);

    const unpopulatedEvents = await prisma.triggerEvent.findMany({
      where: { attestationNote: null },
    });

    expect(unpopulatedEvents.length).toBe(0);

    const allEvents = await prisma.triggerEvent.findMany();
    expect(allEvents.length).toBeGreaterThan(0);

    for (const evt of allEvents) {
      expect(evt.attestationNote).toBeTruthy();
      expect(typeof evt.attestationNote).toBe('string');
      expect(evt.attestationNote!.length).toBeGreaterThan(10);
    }
  });
});
