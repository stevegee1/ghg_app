/**
 * credential-verification.test.ts
 *
 * Public credential records, which stay verifiable after the ISO readiness pipeline was retired:
 *  5. GET  /api/credentials/:id/verify           — Public verification record
 *  6. GET  /api/credentials/:id/badge.svg        — SVG content-type & dual-logo rendering
 */

import request from 'supertest';
import Stripe from 'stripe';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, IsoReadinessStatus, CredentialStatus, WorkflowType } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { grantPipelineAccess } from './helpers/pipelineAccess';
import { ensurePlatformSplitConfig } from './helpers/platformSplit';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();

// ── Mock Stripe ───────────────────────────────────────────────────────────────
function createMockStripe() {
  const mockPaymentIntentsCreate = jest.fn().mockResolvedValue({
    id: 'pi_mock_iso_test',
    client_secret: 'pi_mock_iso_test_secret',
    status: 'requires_payment_method',
  });
  const mockCheckoutSessionsCreate = jest.fn().mockResolvedValue({
    id: 'cs_mock_iso_test_session',
    url: 'https://checkout.stripe.com/pay/cs_mock_iso_test_session',
  });
  const mockConstructEvent = jest.fn();

  const mockStripe = {
    paymentIntents: { create: mockPaymentIntentsCreate, retrieve: jest.fn() },
    transfers: { create: jest.fn().mockResolvedValue({ id: 'tr_mock_001' }) },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  } as unknown as Stripe;

  return { stripe: mockStripe, mockPaymentIntentsCreate, mockCheckoutSessionsCreate, mockConstructEvent };
}

// ── Test Data Setup ───────────────────────────────────────────────────────────
let testApp: any;
let testLicenseeId: string;
let testPortalUserId: string;
let testAuthToken: string;
let adminAuthToken: string;
let testSubmissionId: string;
let testCredentialId: string;

const TEST_EMAIL = `iso_test_${Date.now()}@ghgtest.example`;
const TEST_PASSWORD = 'TestPass123!';

beforeAll(async () => {
  const { stripe } = createMockStripe();
  testApp = createApp(stripe);

  // Create a test licensee
  const licensee = await prisma.licensee.create({
    data: {
      name: 'ISO Test Co. Ltd',
      vertical: 'B2B_CLEAN_TECH',
      royaltyBps: 8500,
      stripeConnectedAccountId: 'acct_test_iso_001',
    },
  });
  testLicenseeId = licensee.id;

  // Create portal user directly
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const portalUser = await prisma.portalUser.create({
    data: {
      email: TEST_EMAIL,
      passwordHash,
      licenseeId: testLicenseeId,
      role: 'PARTNER',
    },
  });
  testPortalUserId = portalUser.id;

  // Sign JWT token
  testAuthToken = jwt.sign(
    {
      userId: portalUser.id,
      role: portalUser.role,
      licenseeId: portalUser.licenseeId,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  adminAuthToken = jwt.sign(
    { userId: 'iso-test-admin', role: 'ADMIN', licenseeId: '' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  await grantPipelineAccess(prisma, testLicenseeId, WorkflowType.GHG, 'ISO 14064-1');
  await ensurePlatformSplitConfig(prisma);
});

afterAll(async () => {
  // Clean up test data in dependency order
  if (testLicenseeId) {
    const txs = await prisma.transaction.findMany({ where: { licenseeId: testLicenseeId }, select: { id: true } });
    const txIds = txs.map(t => t.id);
    if (txIds.length > 0) {
      await prisma.charityAllocation.deleteMany({ where: { financialSplit: { transactionId: { in: txIds } } } });
      await prisma.financialSplit.deleteMany({ where: { transactionId: { in: txIds } } });
      await prisma.triggerEvent.deleteMany({ where: { transactionId: { in: txIds } } });
      await prisma.telemetryLog.deleteMany({ where: { transactionId: { in: txIds } } });
      await prisma.customKeepsakeSpec.deleteMany({ where: { transactionId: { in: txIds } } });
      await prisma.souvenirOrder.deleteMany({ where: { transactionId: { in: txIds } } });
      await prisma.transaction.deleteMany({ where: { id: { in: txIds } } });
    }
    await prisma.auditWarrantyCredential.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.isoReadinessSubmission.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.portalUser.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.licensee.deleteMany({ where: { id: testLicenseeId } });
  }
  await prisma.$disconnect();
});

describe('5. GET /api/credentials/:id/verify (public verification record)', () => {
  beforeAll(async () => {
    let submission = testSubmissionId
      ? await prisma.isoReadinessSubmission.findUnique({ where: { id: testSubmissionId } })
      : null;

    if (!submission) {
      submission = await prisma.isoReadinessSubmission.create({
        data: {
          licenseeId: testLicenseeId,
          answers: [],
          paidAt: new Date(),
          status: IsoReadinessStatus.UNDER_REVIEW,
        },
      });
      testSubmissionId = submission.id;
    }

    const cred = await prisma.auditWarrantyCredential.create({
      data: {
        licenseeId: testLicenseeId,
        submissionId: submission.id,
        clientMessage: 'ISO 14001 compliant, carbon reduction 2030 target',
        clientLogoUrl: '/uploads/client-logos/test.png',
        compositeBadgeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
        selectedFrameworks: ['ISO 14001:2015'],
        warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        verificationSeal: 'a'.repeat(64),
        status: CredentialStatus.ISSUED,
      },
    });
    testCredentialId = cred.id;
  });

  it('returns a valid verification record for an issued credential', async () => {
    const res = await request(testApp).get(`/api/credentials/${testCredentialId}/verify`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.credentialId).toBe(testCredentialId);
    expect(res.body.status).toBe(CredentialStatus.ISSUED);
    expect(res.body.valid).toBe(true);
    expect(res.body.verificationSeal).toBe('a'.repeat(64));
    expect(res.body.selectedFrameworks).toEqual(['ISO 14001:2015']);
    expect(res.body.scopeStatement).toMatch(/not a third-party verification/i);
  });

  it('reports an expired credential as not valid', async () => {
    await prisma.auditWarrantyCredential.update({
      where: { id: testCredentialId },
      data: { warrantyExpiresAt: new Date(Date.now() - 1000) },
    });
    const res = await request(testApp).get(`/api/credentials/${testCredentialId}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    await prisma.auditWarrantyCredential.update({
      where: { id: testCredentialId },
      data: { warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    });
  });

  it('returns 404 for unknown credential ID', async () => {
    const res = await request(testApp).get('/api/credentials/nonexistent_cred_id_000/verify');
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: GET /api/credentials/:id/badge.svg
// ─────────────────────────────────────────────────────────────────────────────
describe('6. GET /api/credentials/:id/badge.svg (SVG badge)', () => {
  it('returns image/svg+xml content-type', async () => {
    const res = await request(testApp).get(`/api/credentials/${testCredentialId}/badge.svg`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
  });

  it('SVG contains the credential heading', async () => {
    const res = await request(testApp).get(`/api/credentials/${testCredentialId}/badge.svg`);
    const svgText = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf8') : '');
    expect(svgText).toContain('NFTYLOGS AUDIT-READINESS CREDENTIAL');
  });

  it('SVG contains the recorded framework', async () => {
    const res = await request(testApp).get(`/api/credentials/${testCredentialId}/badge.svg`);
    const svgText = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf8') : '');
    expect(svgText).toContain('ISO 14001:2015');
  });

  it('SVG contains client attestation message', async () => {
    const res = await request(testApp).get(`/api/credentials/${testCredentialId}/badge.svg`);
    const svgText = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf8') : '');
    expect(svgText).toContain('ISO 14001 compliant');
  });

  it('SVG links to the public verification record', async () => {
    const res = await request(testApp).get(`/api/credentials/${testCredentialId}/badge.svg`);
    const svgText = res.text || (Buffer.isBuffer(res.body) ? res.body.toString('utf8') : '');
    expect(svgText).toContain(`/api/credentials/${testCredentialId}/verify`);
  });
});
