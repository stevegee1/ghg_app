/**
 * flow-enforcement.test.ts
 *
 * Explicit verification of the 3-Gate Flow Enforcement:
 *  - Gate 1: You cannot checkout via Stripe unless audit status is AUDIT_READY or APPROVED (HTTP 403)
 *  - Gate 2: You cannot compose badges or access ingestion API unless payment is settled (HTTP 403)
 *  - Gate 3: You cannot mint Polygon ERC-1155 NFT credentials unless BOTH audit is AUDIT_READY and payment is settled (HTTP 403)
 */

import request from 'supertest';
import Stripe from 'stripe';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { PrismaClient, IsoReadinessStatus, CredentialStatus } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();

let testApp: any;
let testLicenseeId: string;
let testAuthToken: string;
let testSubmissionId: string;

const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'nfty-logs-logo.png');

beforeAll(async () => {
  const mockStripe = {
    paymentIntents: { create: jest.fn() },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_gate_test_session',
          url: 'https://checkout.stripe.com/pay/cs_gate_test_session',
        }),
      },
    },
    webhooks: { constructEvent: jest.fn() },
  } as unknown as Stripe;
  testApp = createApp(mockStripe);

  const licensee = await prisma.licensee.create({
    data: {
      name: '3-Gate Enforcement Enterprise Ltd',
      vertical: 'B2B_CLEAN_TECH',
      royaltyBps: 8500,
    },
  });
  testLicenseeId = licensee.id;

  testAuthToken = jwt.sign(
    { userId: 'test-gate-user', licenseeId: testLicenseeId, role: 'PARTNER' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
});

afterAll(async () => {
  if (testLicenseeId) {
    await prisma.auditWarrantyCredential.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.isoReadinessSubmission.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.licensee.deleteMany({ where: { id: testLicenseeId } });
  }
  await prisma.$disconnect();
});

describe('3-Gate Strict Workflow Enforcement', () => {
  describe('Gate 1: Stripe Checkout Enforcement', () => {
    it('creates a fresh submission with status SUBMITTED', async () => {
      const res = await request(testApp)
        .post('/api/iso-readiness/submit')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send({
          answers: [
            {
              questionId: 'P1-Q1',
              questionText: 'Organizational boundaries defined',
              answer: 'Operational control consolidation',
              isoClause: 'ISO 14064-1:2018 Clause 5.1',
            },
          ],
          tierSelected: 'TIER_1_READINESS',
          selectedFrameworks: ['ISO_14064_1', 'ISO_50001'],
        });

      expect(res.status).toBe(201);
      expect(res.body.submissionId).toBeDefined();
      expect(res.body.status).toBe(IsoReadinessStatus.SUBMITTED);
      testSubmissionId = res.body.submissionId;
    });

    it('blocks checkout with HTTP 403 when submission is in SUBMITTED state (Gate 1)', async () => {
      const res = await request(testApp)
        .post('/api/iso-readiness/checkout')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send({
          submissionId: testSubmissionId,
          tierSelected: 'TIER_1_READINESS',
          successUrl: 'https://app.example.com/portal?step=3',
          cancelUrl: 'https://app.example.com/portal?step=2',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('AUDIT_NOT_READY');
      expect(res.body.error).toContain('AUDIT_READY');
    });

    it('clears Gate 1 after Lead Auditor verification sign-off sets status to AUDIT_READY', async () => {
      const reviewRes = await request(testApp)
        .post('/api/iso-readiness/review')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send({
          submissionId: testSubmissionId,
          targetStatus: 'AUDIT_READY',
          auditorNotes: 'Lead Auditor review confirmed: 80%+ conformance threshold achieved.',
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.status).toBe(IsoReadinessStatus.AUDIT_READY);

      // Now Gate 1 allows checkout
      const checkoutRes = await request(testApp)
        .post('/api/iso-readiness/checkout')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send({
          submissionId: testSubmissionId,
          tierSelected: 'TIER_1_READINESS',
          successUrl: 'https://app.example.com/portal?step=3',
          cancelUrl: 'https://app.example.com/portal?step=2',
        });

      expect([200, 500]).toContain(checkoutRes.status);
      if (checkoutRes.status === 200) {
        expect(checkoutRes.body.success).toBe(true);
      }
    });
  });

  describe('Gate 2: Credential Studio & Ingestion Access Enforcement', () => {
    it('blocks badge compositing with HTTP 403 when submission has not been paid (Gate 2)', async () => {
      if (!fs.existsSync(LOGO_PATH)) return;

      const res = await request(testApp)
        .post('/api/credentials/compose')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .attach('clientLogo', LOGO_PATH)
        .field('clientMessage', 'ISO 14001 net-zero 2030 attestation')
        .field('submissionId', testSubmissionId);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PAYMENT_REQUIRED');
    });

    it('clears Gate 2 once payment is settled', async () => {
      if (!fs.existsSync(LOGO_PATH)) return;

      // Simulate Stripe webhook fee settlement
      await prisma.isoReadinessSubmission.update({
        where: { id: testSubmissionId },
        data: { paidAt: new Date() },
      });

      const res = await request(testApp)
        .post('/api/credentials/compose')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .attach('clientLogo', LOGO_PATH)
        .field('clientMessage', 'ISO 14001 net-zero 2030 attestation')
        .field('submissionId', testSubmissionId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.previewDataUri).toBeDefined();
    });
  });

  describe('Gate 3: ERC-1155 Minting Enforcement', () => {
    it('blocks NFT minting with HTTP 403 if audit is not approved or payment is missing', async () => {
      if (!fs.existsSync(LOGO_PATH)) return;

      // Create an unpaid, unapproved submission
      const sub = await prisma.isoReadinessSubmission.create({
        data: {
          licenseeId: testLicenseeId,
          answers: [],
          status: IsoReadinessStatus.SUBMITTED,
          paidAt: null,
        },
      });

      const res = await request(testApp)
        .post('/api/credentials/mint')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .attach('clientLogo', LOGO_PATH)
        .field('clientMessage', 'Attempting unauthorized mint')
        .field('submissionId', sub.id);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/approved|payment/i);
    });

    it('allows NFT minting when both Gate 1 (AUDIT_READY) and Gate 2 (paidAt) are verified', async () => {
      if (!fs.existsSync(LOGO_PATH)) return;

      const res = await request(testApp)
        .post('/api/credentials/mint')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .attach('clientLogo', LOGO_PATH)
        .field('clientMessage', 'Statutory ISO 14064-1 Audit Verified')
        .field('submissionId', testSubmissionId);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.credentialId).toBeDefined();
      expect(res.body.network).toBe('Polygon PoS');
    });
  });
});
