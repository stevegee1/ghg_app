import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { seed } from '../prisma/seed';

const prisma = new PrismaClient();
const app = createApp();

describe('Enterprise Self-Service Password Reset Flow Tests', () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Test 1: Anti-enumeration for forgot-password
  test('1. POST /api/auth/forgot-password returns 200 OK for both existing and non-existing email (Anti-Enumeration)', async () => {
    // Existing user
    const existingRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'partner@itm-power.com' });

    expect(existingRes.status).toBe(200);
    expect(existingRes.body.message).toContain('If an account exists');

    // Verify token was generated in DB
    const user = await prisma.portalUser.findUnique({
      where: { email: 'partner@itm-power.com' },
    });
    expect(user?.passwordResetToken).toBeTruthy();
    expect(user?.passwordResetExpiresAt).toBeTruthy();
    expect(new Date(user!.passwordResetExpiresAt!).getTime()).toBeGreaterThan(Date.now());

    // Non-existing user
    const nonExistingRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent_user_999@randomcompany.com' });

    expect(nonExistingRes.status).toBe(200);
    expect(nonExistingRes.body.message).toContain('If an account exists');
  });

  // Test 2: Validation rejection on empty / invalid email
  test('2. POST /api/auth/forgot-password returns 400 on missing email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Valid work email address is required');
  });

  // Test 3: Reset password with valid token
  test('3. POST /api/auth/reset-password successfully updates password and clears reset token', async () => {
    const email = 'partner@itm-power.com';
    const rawToken = 'test_raw_reset_token_secret_12345';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Set valid reset token on user
    await prisma.portalUser.update({
      where: { email },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    // Reset password
    const newPassword = 'BrandNewSecurePassword2026!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email,
        token: rawToken,
        password: newPassword,
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toContain('successfully reset');

    // Verify DB state
    const updatedUser = await prisma.portalUser.findUnique({ where: { email } });
    expect(updatedUser?.passwordResetToken).toBeNull();
    expect(updatedUser?.passwordResetExpiresAt).toBeNull();

    // Verify password is changed and user can log in with new credentials
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: newPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
  });

  // Test 4: Rejects expired reset token
  test('4. POST /api/auth/reset-password rejects expired reset token', async () => {
    const email = 'partner@itm-power.com';
    const rawToken = 'expired_token_123';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Set expired token (1 hour in the past)
    await prisma.portalUser.update({
      where: { email },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: new Date(Date.now() - 3600 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email,
        token: rawToken,
        password: 'AnotherPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('invalid or has expired');
  });

  // Test 5: Rejects short password (< 8 chars)
  test('5. POST /api/auth/reset-password rejects passwords under 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: 'partner@itm-power.com',
        token: 'any_token',
        password: 'short',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('at least 8 characters');
  });
});
