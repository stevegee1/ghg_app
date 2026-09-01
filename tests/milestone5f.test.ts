import request from 'supertest';
import { PrismaClient, PeriodType, ReportSource } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from '../src/expressApp';
import { seed } from '../prisma/seed';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();

function generateAuthToken(payload: { userId: string; role: string; licenseeId?: string | null }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Milestone 5f: Job Creation Reporting & Licensing Tests', () => {
  let app: any;
  let partnerUser: any;
  let partnerToken: string;
  let partner2User: any;
  let partner2Token: string;
  let publicLicensee: any;
  let privateLicensee: any;
  const rawApiKey = 'test_b2b_secret_key_m5f';

  beforeAll(async () => {
    await seed();
    app = createApp();

    // Fetch seeded licensees
    const licensees = await prisma.licensee.findMany();
    publicLicensee = licensees[0];
    privateLicensee = licensees[1];

    const keyHash = await bcrypt.hash(rawApiKey, 10);
    await prisma.licensee.update({
      where: { id: publicLicensee.id },
      data: { isPubliclyVisible: true, b2bApiKeyHash: keyHash },
    });
    await prisma.licensee.update({
      where: { id: privateLicensee.id },
      data: { isPubliclyVisible: false },
    });

    // Create test portal users
    partnerUser = await prisma.portalUser.create({
      data: {
        email: `m5f_partner_${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        licenseeId: publicLicensee.id,
        role: 'PARTNER',
      },
    });

    partnerToken = generateAuthToken({
      userId: partnerUser.id,
      role: partnerUser.role,
      licenseeId: partnerUser.licenseeId,
    });

    partner2User = await prisma.portalUser.create({
      data: {
        email: `m5f_partner2_${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
        licenseeId: privateLicensee.id,
        role: 'PARTNER',
      },
    });

    partner2Token = generateAuthToken({
      userId: partner2User.id,
      role: partner2User.role,
      licenseeId: partner2User.licenseeId,
    });
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Self-report submission via portal endpoint
  test('1. Self-report submission via portal endpoint creates row with correct reportSource, attestationNote, and submittedByUserId', async () => {
    const periodStart = '2026-01-01T00:00:00.000Z';
    const periodEnd = '2026-03-31T23:59:59.000Z';
    const jobsCreated = 45;

    const res = await request(app)
      .post('/api/portal/job-reports')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        periodType: 'QUARTERLY',
        periodStart,
        periodEnd,
        jobsCreated,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.licenseeId).toBe(publicLicensee.id);
    expect(res.body.periodType).toBe('QUARTERLY');
    expect(res.body.jobsCreated).toBe(45);
    expect(res.body.reportSource).toBe('MANUAL_ATTESTATION');
    expect(res.body.attestationNote).toBe('Self-reported by partner via portal. Not independently verified.');
    expect(res.body.submittedByUserId).toBe(partnerUser.id);
  });

  // Test 2: API ingestion via /api/b2b/job-report
  test('2. API ingestion via /api/b2b/job-report creates row with THIRD_PARTY_API, null submittedByUserId, and requires API key auth', async () => {
    // 2a. Reject unauthenticated requests
    const unauthRes = await request(app)
      .post('/api/b2b/job-report')
      .send({
        licenseeId: publicLicensee.id,
        periodType: 'ANNUAL',
        periodStart: '2026-01-01T00:00:00.000Z',
        periodEnd: '2026-12-31T23:59:59.000Z',
        jobsCreated: 120,
      });

    expect(unauthRes.status).toBe(401);

    // 2b. Authenticated ingestion with valid API key
    const authRes = await request(app)
      .post('/api/b2b/job-report')
      .set('X-API-Key', rawApiKey)
      .send({
        licenseeId: publicLicensee.id,
        periodType: 'ANNUAL',
        periodStart: '2026-01-01T00:00:00.000Z',
        periodEnd: '2026-12-31T23:59:59.000Z',
        jobsCreated: 120,
      });

    expect(authRes.status).toBe(201);
    expect(authRes.body.id).toBeDefined();
    expect(authRes.body.licenseeId).toBe(publicLicensee.id);
    expect(authRes.body.periodType).toBe('ANNUAL');
    expect(authRes.body.jobsCreated).toBe(120);
    expect(authRes.body.reportSource).toBe('THIRD_PARTY_API');
    expect(authRes.body.attestationNote).toBe("Submitted via partner's own system/API. Not independently verified.");
    expect(authRes.body.submittedByUserId).toBeNull();
  });

  // Test 3: Duplicate exact-period submission rejected at DB level
  test('3. Duplicate exact-period submission for the same licensee is rejected at the DB level', async () => {
    const periodStart = new Date('2025-01-01T00:00:00.000Z');
    const periodEnd = new Date('2025-12-31T23:59:59.000Z');

    // First DB insert
    await prisma.jobCreationReport.create({
      data: {
        licenseeId: privateLicensee.id,
        periodType: PeriodType.ANNUAL,
        periodStart,
        periodEnd,
        jobsCreated: 50,
        reportSource: ReportSource.MANUAL_ATTESTATION,
        attestationNote: 'Self-reported by partner via portal. Not independently verified.',
      },
    });

    // Second DB insert for exact same licensee, periodType, periodStart, periodEnd bypassing app code
    await expect(
      prisma.jobCreationReport.create({
        data: {
          licenseeId: privateLicensee.id,
          periodType: PeriodType.ANNUAL,
          periodStart,
          periodEnd,
          jobsCreated: 75,
          reportSource: ReportSource.THIRD_PARTY_API,
          attestationNote: "Submitted via partner's own system/API. Not independently verified.",
        },
      })
    ).rejects.toThrow();
  });

  // Test 4: jobsCreated: 0 is accepted and displayable
  test('4. jobsCreated: 0 is accepted and displayable without threshold rejection', async () => {
    const res = await request(app)
      .post('/api/portal/job-reports')
      .set('Authorization', `Bearer ${partner2Token}`)
      .send({
        periodType: 'QUARTERLY',
        periodStart: '2026-04-01T00:00:00.000Z',
        periodEnd: '2026-06-30T23:59:59.000Z',
        jobsCreated: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.jobsCreated).toBe(0);
    expect(res.body.id).toBeDefined();
  });

  // Test 5: Caller-supplied attestationNote claiming "independently verified" is rejected
  test('5. Caller-supplied attestationNote claiming "independently verified" is rejected via M5d validator', async () => {
    const res = await request(app)
      .post('/api/portal/job-reports')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        periodType: 'QUARTERLY',
        periodStart: '2026-07-01T00:00:00.000Z',
        periodEnd: '2026-09-30T23:59:59.000Z',
        jobsCreated: 80,
        attestationNote: 'This report has been independently verified by an accredited auditor.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('cannot claim independent verification');
  });

  // Test 6: PARTNER submitting/retrieving another licensee's job reports is blocked
  test('6. PARTNER submitting/retrieving another licensee\'s job reports is blocked', async () => {
    // 6a. Attempt to submit with body specifying another licenseeId (partnerToken belongs to publicLicensee)
    const submitRes = await request(app)
      .post('/api/portal/job-reports')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        licenseeId: privateLicensee.id, // Attempted body override
        periodType: 'QUARTERLY',
        periodStart: '2026-10-01T00:00:00.000Z',
        periodEnd: '2026-12-31T23:59:59.000Z',
        jobsCreated: 99,
      });

    expect(submitRes.status).toBe(201);
    // Crucial check: The report MUST belong to partnerToken's own licenseeId (publicLicensee), NOT the body override (privateLicensee)
    expect(submitRes.body.licenseeId).toBe(publicLicensee.id);
    expect(submitRes.body.licenseeId).not.toBe(privateLicensee.id);

    // 6b. Attempt to retrieve job reports for privateLicensee using partnerToken
    const getRes = await request(app)
      .get(`/api/portal/job-reports?licenseeId=${privateLicensee.id}`)
      .set('Authorization', `Bearer ${partnerToken}`);

    expect(getRes.status).toBe(200);
    // Crucial check: All returned reports must belong strictly to partnerToken's own licenseeId (publicLicensee)
    getRes.body.data.forEach((report: any) => {
      expect(report.licenseeId).toBe(publicLicensee.id);
      expect(report.licenseeId).not.toBe(privateLicensee.id);
    });
  });

  // Test 7: Transparency ledger includes job figures ONLY for isPubliclyVisible: true licensees
  test('7. Transparency ledger includes job-creation figures ONLY for isPubliclyVisible: true licensees, omits non-public ones', async () => {
    const res = await request(app).get('/api/v1/transparency-ledger');

    expect(res.status).toBe(200);
    expect(res.body.publicPartners).toBeDefined();

    // Find entry for publicLicensee
    const publicPartnerEntry = res.body.publicPartners.find((p: any) => p.licenseeId === publicLicensee.id);
    expect(publicPartnerEntry).toBeDefined();
    expect(publicPartnerEntry.jobsCreated).toBeDefined();
    expect(publicPartnerEntry.jobsCreated).not.toBeNull();
    expect(publicPartnerEntry.attestationNote).toBeDefined();

    // Verify privateLicensee is NOT in publicPartners
    const privatePartnerEntry = res.body.publicPartners.find((p: any) => p.licenseeId === privateLicensee.id);
    expect(privatePartnerEntry).toBeUndefined();
  });
});
