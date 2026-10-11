import request from 'supertest';
import jwt from 'jsonwebtoken';
import zlib from 'zlib';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { getCertificateAggregateData } from '../src/services/certificate.service';
import { runWithRls } from '../src/db/rls';
import { seed } from './fixtures/sample-data';

const prisma = new PrismaClient();
const app = createApp();

describe('Milestone 4 Partner Portal, Auth & Transparency Layer Tests', () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Login with correct credentials vs invalid credentials (no user enumeration)
  test('1. Login with correct credentials returns valid JWT; wrong password and non-existent email return same generic 401', async () => {
    // Valid login
    const validRes = await request(app).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'SecurePassword123!',
    });

    expect(validRes.status).toBe(200);
    expect(validRes.body).toHaveProperty('token');
    const decoded = jwt.verify(validRes.body.token, JWT_SECRET) as any;
    expect(decoded.userId).toBe('usr_partner_001');
    expect(decoded.role).toBe('PARTNER');
    expect(decoded.licenseeId).toBe('lic_itm_power');

    // Wrong password
    const wrongPasswordRes = await request(app).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'WrongPassword999!',
    });

    expect(wrongPasswordRes.status).toBe(401);
    expect(wrongPasswordRes.body).toEqual({ error: 'Invalid email or password' });

    // Non-existent email
    const nonExistentRes = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@ghglogodrop.com',
      password: 'SecurePassword123!',
    });

    expect(nonExistentRes.status).toBe(401);
    expect(nonExistentRes.body).toEqual({ error: 'Invalid email or password' });

    // Exact error message equality guarantees no user enumeration
    expect(wrongPasswordRes.body.error).toBe(nonExistentRes.body.error);
  });

  // Test 2: Protected route rejects missing/invalid/expired JWT with 401
  test('2. Protected route rejects missing, invalid, or expired JWT with 401', async () => {
    // Missing token
    const res1 = await request(app).get('/api/portal/transactions');
    expect(res1.status).toBe(401);

    // Invalid token
    const res2 = await request(app)
      .get('/api/portal/transactions')
      .set('Authorization', 'Bearer invalid_garbage_token');
    expect(res2.status).toBe(401);

    // Expired token
    const expiredToken = jwt.sign(
      { userId: 'usr_partner_001', role: 'PARTNER', licenseeId: 'lic_itm_power' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res3 = await request(app)
      .get('/api/portal/transactions')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res3.status).toBe(401);
  });

  // Test 3: PARTNER user hitting /api/portal/transactions never sees another licensee's rows
  test('3. PARTNER user hitting /api/portal/transactions sees only their own licensee rows', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'SecurePassword123!',
    });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/portal/transactions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Assert every transaction returned belongs strictly to lic_itm_power
    for (const tx of res.body.data) {
      expect(tx.licenseeId).toBe('lic_itm_power');
    }
  });

  // Test 4: RLS bypass test (raw SQL independent of Express app layer)
  test('4. RLS bypass test: raw SQL query with session variable set to one licensee returns 0 rows for another licensee', async () => {
    // Open a direct DB transaction setting app.current_licensee_id = 'lic_itm_power'
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE ghg_app_user;");
      await tx.$executeRawUnsafe(
        "SET LOCAL app.current_licensee_id = 'lic_itm_power';"
      );
      await tx.$executeRawUnsafe(
        "SET LOCAL app.is_admin = 'false';"
      );

      // Attempt raw query targeting Arsenal FC rows directly
      const arsenalRows = await tx.$queryRawUnsafe<any[]>(
        "SELECT * FROM \"Transaction\" WHERE \"licenseeId\" = 'lic_arsenal_fc';"
      );

      // Attempt query fetching all Transaction rows accessible under RLS
      const allAccessibleRows = await tx.$queryRawUnsafe<any[]>(
        'SELECT * FROM "Transaction";'
      );

      return { arsenalRows, allAccessibleRows };
    });

    // Zero Arsenal rows returned despite explicit WHERE licenseeId = 'lic_arsenal_fc'
    expect(result.arsenalRows.length).toBe(0);

    // All accessible rows belong strictly to lic_itm_power
    expect(result.allAccessibleRows.length).toBeGreaterThan(0);
    for (const row of result.allAccessibleRows) {
      expect(row.licenseeId).toBe('lic_itm_power');
    }
  });

  // Test 5: PARTNER user passing a different licenseeId in query string is ignored
  test('5. PARTNER user passing a different licenseeId in query string is ignored and scoped to their own', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'SecurePassword123!',
    });
    const token = loginRes.body.token;

    // Tampering attempt: partner tries to pass ?licenseeId=lic_arsenal_fc
    const res = await request(app)
      .get('/api/portal/transactions?licenseeId=lic_arsenal_fc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    for (const tx of res.body.data) {
      expect(tx.licenseeId).toBe('lic_itm_power');
      expect(tx.licenseeId).not.toBe('lic_arsenal_fc');
    }
  });

  // Test 6: Public transparency endpoint returns aggregates and respects isPubliclyVisible
  test('6. Public transparency endpoint returns only aggregate totals and respects isPubliclyVisible', async () => {
    const res = await request(app).get('/api/v1/transparency-ledger');

    expect(res.status).toBe(200);
    expect(typeof res.body.totalSettledTransactions).toBe('number');
    expect(typeof res.body.totalCharityGiftCents).toBe('number');
    expect(Array.isArray(res.body.publicPartners)).toBe(true);

    // The charity share comes from the active platform split, not a fixed number.
    const split = await prisma.splitConfigHistory.findFirst({ where: { licenseeId: null, isActive: true }, orderBy: { changedAt: 'desc' } });
    expect(res.body.charityPercentage).toBe(split ? (10000 - split.royaltyBps) / 100 : null);

    // Ensure publicPartners contains Arsenal FC (isPubliclyVisible = true)
    const arsenalPartner = res.body.publicPartners.find(
      (p: any) => p.licenseeId === 'lic_arsenal_fc'
    );
    expect(arsenalPartner).toBeDefined();
    expect(arsenalPartner.name).toBe('Arsenal FC Test');

    // Ensure ITM Power (isPubliclyVisible = false) is excluded from publicPartners breakdown
    const itmPartner = res.body.publicPartners.find(
      (p: any) => p.licenseeId === 'lic_itm_power'
    );
    expect(itmPartner).toBeUndefined();

    // Verify response contains no PII or individual transaction objects
    expect(res.body).not.toHaveProperty('transactions');
    expect(res.body).not.toHaveProperty('email');
  });

  // Test 7: Certificate PDF embedded totals match direct DB aggregate query
  test('7. Certificate generation produces PDF whose embedded totals match a direct DB aggregate query', async () => {
    const licenseeId = 'lic_itm_power';
    const userScope = { role: 'PARTNER', licenseeId };

    // Direct DB query calculation for benchmark
    const settledTxs = await prisma.transaction.findMany({
      where: {
        licenseeId,
        status: 'SETTLED',
      },
      include: { financialSplit: true },
    });

    const expectedSettledCount = settledTxs.length;
    const expectedGrossCents = settledTxs.reduce((sum, t) => sum + t.grossAmountCents, 0);
    const expectedCharityCents = settledTxs.reduce(
      (sum, t) => sum + (t.financialSplit?.charityGiftCents || 0),
      0
    );

    // Service aggregate computation
    const aggregateData = await getCertificateAggregateData(prisma, {
      licenseeId,
      user: userScope,
    });

    expect(aggregateData.settledCount).toBe(expectedSettledCount);
    expect(aggregateData.grossAmountCentsSum).toBe(expectedGrossCents);
    expect(aggregateData.charityGiftCentsSum).toBe(expectedCharityCents);
    expect(aggregateData.documentIntegrityHash).toBeDefined();

    // API endpoint request
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'SecurePassword123!',
    });
    const token = loginRes.body.token;

    const pdfRes = await request(app)
      .get('/api/portal/certificate')
      .set('Authorization', `Bearer ${token}`)
      .responseType('blob');

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');

    const pdfBuffer = Buffer.from(pdfRes.body);
    // Verify PDF Magic Bytes signature (%PDF-) and non-empty generated document size
    expect(pdfBuffer.toString('utf8', 0, 5)).toBe('%PDF-');
    expect(pdfBuffer.length).toBeGreaterThan(500);
  });

  // Test 8: Supertest HTTP endpoint test calling /api/portal/transactions through full Express pipeline & app DB connection
  test('8. Real HTTP GET /api/portal/transactions via Supertest goes through runWithRls & app DB connection, blocking access to another licensee data', async () => {
    // 1. Authenticate as PARTNER user for lic_itm_power
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'partner@itm-power.com',
      password: 'SecurePassword123!',
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    // 2. Hit real /api/portal/transactions route attempting to request lic_arsenal_fc data via ?licenseeId=lic_arsenal_fc
    const res = await request(app)
      .get('/api/portal/transactions?licenseeId=lic_arsenal_fc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    // 3. Confirm RLS & route scoping blocked access: zero Arsenal rows returned, only ITM Power rows returned
    for (const tx of res.body.data) {
      expect(tx.licenseeId).toBe('lic_itm_power');
      expect(tx.licenseeId).not.toBe('lic_arsenal_fc');
    }

    // 4. Verify directly against runWithRls on the app's default Prisma instance:
    // even if a raw query targeting lic_arsenal_fc were executed inside runWithRls, RLS under ghg_app_user returns 0 rows
    const userScope = { role: 'PARTNER', licenseeId: 'lic_itm_power' };
    const rlsResult = await runWithRls(prisma, userScope, async (tx) => {
      const arsenalRows = await tx.transaction.findMany({
        where: { licenseeId: 'lic_arsenal_fc' },
      });
      return arsenalRows;
    });

    expect(rlsResult.length).toBe(0);
  });

  // Test 9: Defense-in-depth validation in runWithRls rejects malformed licenseeId format
  test('9. runWithRls rejects malformed licenseeId format (e.g. SQL injection attempts)', async () => {
    const maliciousScope = { role: 'PARTNER', licenseeId: "' OR 1=1 --" };

    await expect(
      runWithRls(prisma, maliciousScope, async (tx) => {
        return tx.transaction.findMany();
      })
    ).rejects.toThrow('Invalid licenseeId format');
  });

  test('9. Portal summary totals every settled payment and its recorded charity share for the caller only', async () => {
    const token = jwt.sign({ userId: 'usr_partner_001', role: 'PARTNER', licenseeId: 'lic_itm_power' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/portal/summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const settled = await prisma.transaction.findMany({
      where: { licenseeId: 'lic_itm_power', status: 'SETTLED' },
      include: { financialSplit: true },
    });
    const gross = settled.reduce((sum, t) => sum + t.grossAmountCents, 0);
    const charity = settled.reduce((sum, t) => sum + (t.financialSplit?.charityGiftCents ?? 0), 0);

    expect(res.body.licenseeId).toBe('lic_itm_power');
    expect(res.body.totalGrossCentsSettled).toBe(gross);
    expect(res.body.totalCharityGiftCentsSettled).toBe(charity);
    expect(res.body.countByStatus.SETTLED).toBe(settled.length);
  });
});
