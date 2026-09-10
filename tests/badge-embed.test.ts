/**
 * badge-embed.test.ts
 *
 * Integration tests for Badge Embed and Live Trust Seal endpoints:
 *  - GET  /embed/seal.js          — JavaScript delivery & caching headers
 *  - GET  /api/v1/badges/status   — Real-time status resolver & CORS origin check
 *  - POST /api/v1/badges/origins  — Origin whitelisting updates with authentication
 */

import request from 'supertest';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { PrismaClient, CredentialStatus } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();

let testApp: any;
let testLicenseeId: string;
let testAuthToken: string;

beforeAll(async () => {
  const mockStripe = {
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    webhooks: { constructEvent: jest.fn() },
  } as unknown as Stripe;
  testApp = createApp(mockStripe);

  const licensee = await prisma.licensee.create({
    data: {
      name: 'Embed Seal Corp Ltd',
      vertical: 'B2B_CLEAN_TECH',
      royaltyBps: 8500,
    },
  });
  testLicenseeId = licensee.id;

  testAuthToken = jwt.sign(
    { userId: 'test-user-embed', licenseeId: testLicenseeId, role: 'PARTNER' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const sub = await prisma.isoReadinessSubmission.create({
    data: {
      licenseeId: testLicenseeId,
      answers: [],
      status: 'APPROVED',
      paidAt: new Date(),
    },
  });

  await prisma.auditWarrantyCredential.create({
    data: {
      licenseeId: testLicenseeId,
      submissionId: sub.id,
      clientMessage: 'Verified Embedded Trust Seal',
      clientLogoUrl: '/test-logo.png',
      compositeBadgeUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
      warrantyExpiresAt: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      status: CredentialStatus.MINTED,
      allowedOrigins: ['https://corp.example.com', 'https://app.corp.example.com'],
    },
  });
});

afterAll(async () => {
  if (testLicenseeId) {
    await prisma.auditWarrantyCredential.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.isoReadinessSubmission.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.licensee.deleteMany({ where: { id: testLicenseeId } });
  }
  await prisma.$disconnect();
});

describe('Badge Embed & Live Trust Seal Endpoints', () => {
  describe('GET /embed/seal.js', () => {
    it('serves lightweight embed JavaScript with correct content-type and cache headers', async () => {
      const res = await request(testApp).get('/embed/seal.js');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/javascript/);
      expect(res.headers['cache-control']).toMatch(/public, max-age=3600/);
      expect(res.text).toContain('data-licensee-id');
      expect(res.text).toContain('/api/v1/badges/status');
    });
  });

  describe('GET /api/v1/badges/status', () => {
    it('returns 400 when licenseeId is omitted', async () => {
      const res = await request(testApp).get('/api/v1/badges/status');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('licenseeId query parameter is required');
    });

    it('returns 404 when licensee does not exist', async () => {
      const res = await request(testApp).get('/api/v1/badges/status?licenseeId=nonexistent_licensee_id_123');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('rejects with 403 when origin domain is unauthorized', async () => {
      const res = await request(testApp)
        .get(`/api/v1/badges/status?licenseeId=${testLicenseeId}`)
        .set('Origin', 'https://malicious-spoof.com');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Origin domain not authorized');
      expect(res.body.code).toBe('ORIGIN_UNAUTHORIZED');
    });

    it('allows whitelisted origin domain and returns real-time warranty health', async () => {
      const res = await request(testApp)
        .get(`/api/v1/badges/status?licenseeId=${testLicenseeId}`)
        .set('Origin', 'https://corp.example.com');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.licenseeId).toBe(testLicenseeId);
      expect(res.body.badgeStatus).toBeDefined();
      expect(res.body.statutoryEpochExpiresAt).toBeDefined();
    });
  });

  describe('POST /api/v1/badges/origins', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(testApp)
        .post('/api/v1/badges/origins')
        .send({ allowedOrigins: ['https://newsite.com'] });

      expect(res.status).toBe(401);
    });

    it('updates allowed origins with authentication', async () => {
      const res = await request(testApp)
        .post('/api/v1/badges/origins')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send({ allowedOrigins: ['https://custom-domain.com', 'https://investors.custom-domain.com'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.allowedOrigins).toEqual(['https://custom-domain.com', 'https://investors.custom-domain.com']);
    });
  });
});
