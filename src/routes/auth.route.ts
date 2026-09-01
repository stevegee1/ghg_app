import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /api/auth/register
   * Production-grade self-service account registration.
   * Creates a Licensee tenant boundary and a PortalUser, issuing a signed JWT session.
   */
  const handleRegister = async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, companyName } = req.body || {};

    // 1. Validation
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ error: 'First name is required' });
    }
    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({ error: 'Last name is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Valid work email address is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({ error: 'Company or organization name is required' });
    }

    try {
      // 2. Check for duplicate email
      const existingUser = await prisma.portalUser.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email address is already registered' });
      }

      // 3. Generate clean scoped Licensee ID
      const sanitizedCompany = companyName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 32);
      const licenseeId = `lic_${sanitizedCompany || 'enterprise'}_${Date.now().toString(36)}`;

      // 4. Provision Licensee Record
      await prisma.licensee.create({
        data: {
          id: licenseeId,
          name: companyName.trim(),
          vertical: 'B2B_CLEAN_TECH',
          royaltyBps: 1500, // 15% statutory ESG split
          isPubliclyVisible: true,
        },
      });

      // 5. Hash Password & Create User
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await prisma.portalUser.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          licenseeId,
          role: 'PARTNER',
        },
      });

      // 6. Sign JWT Session Token
      const token = jwt.sign(
        {
          userId: newUser.id,
          role: newUser.role,
          licenseeId: newUser.licenseeId,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        message: 'Account successfully registered',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          licenseeId: newUser.licenseeId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyName: companyName.trim(),
        },
      });
    } catch (err) {
      console.error('[REGISTRATION ERROR]', err);
      return res.status(500).json({ error: 'An unexpected error occurred while creating your account' });
    }
  };

  router.post('/api/auth/register', handleRegister);
  router.post('/api/v1/auth/register', handleRegister);

  /**
   * POST /api/auth/login
   * Authenticates PortalUser and returns signed JWT session token.
   */
  const handleLogin = async (req: Request, res: Response) => {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    try {
      const user = await prisma.portalUser.findUnique({
        where: { email: email.trim().toLowerCase() },
        include: { licensee: true },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role,
          licenseeId: user.licenseeId,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          licenseeId: user.licenseeId,
          companyName: user.licensee?.name || 'Authorized Entity',
        },
      });
    } catch (err) {
      console.error('[AUTH API ERROR]', err);
      return res.status(500).json({ error: 'An unexpected error occurred during login' });
    }
  };

  router.post('/api/auth/login', handleLogin);
  router.post('/api/v1/auth/login', handleLogin);

  /**
   * POST /api/auth/forgot-password
   * Enterprise Anti-Enumeration Password Reset Request
   */
  const handleForgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Valid work email address is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const user = await prisma.portalUser.findUnique({
        where: { email: normalizedEmail },
      });

      if (user) {
        // Generate secure 32-byte cryptographic token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1-hour expiration

        await prisma.portalUser.update({
          where: { id: user.id },
          data: {
            passwordResetToken: hashedToken,
            passwordResetExpiresAt: expiresAt,
          },
        });

        // Dispatch via production EmailService (Resend / SendGrid / local fallback)
        const host = req.get('host') || 'localhost:8080';
        const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        const resetUrl = `${protocol}://${host}/portal/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

        await emailService.sendPasswordResetEmail({
          toEmail: normalizedEmail,
          resetUrl,
          expiresInHours: 1,
        });
      }

      // Always return 200 OK to prevent email enumeration
      return res.status(200).json({
        message: 'If an account exists with this email address, password reset instructions have been dispatched.',
      });
    } catch (err) {
      console.error('[FORGOT PASSWORD ERROR]', err);
      return res.status(500).json({ error: 'An unexpected error occurred while processing your request' });
    }
  };

  router.post('/api/auth/forgot-password', handleForgotPassword);
  router.post('/api/v1/auth/forgot-password', handleForgotPassword);

  /**
   * POST /api/auth/reset-password
   * Validates SHA-256 hashed reset token and updates password
   */
  const handleResetPassword = async (req: Request, res: Response) => {
    const { token, email, password } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing password reset token' });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    try {
      const user = await prisma.portalUser.findUnique({
        where: { email: normalizedEmail },
      });

      if (
        !user ||
        !user.passwordResetToken ||
        user.passwordResetToken !== hashedToken ||
        !user.passwordResetExpiresAt ||
        new Date(user.passwordResetExpiresAt) < new Date()
      ) {
        return res.status(400).json({ error: 'The password reset token is invalid or has expired. Please request a new link.' });
      }

      // Hash new password & clear reset token
      const newPasswordHash = await bcrypt.hash(password, 10);
      await prisma.portalUser.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      });

      return res.status(200).json({
        message: 'Your password has been successfully reset. You may now sign in with your new credentials.',
      });
    } catch (err) {
      console.error('[RESET PASSWORD ERROR]', err);
      return res.status(500).json({ error: 'An unexpected error occurred while resetting your password' });
    }
  };

  router.post('/api/auth/reset-password', handleResetPassword);
  router.post('/api/v1/auth/reset-password', handleResetPassword);

  /**
   * POST /api/auth/logout
   */
  router.post('/api/auth/logout', (_req: Request, res: Response) => {
    return res.status(200).json({ message: 'Successfully logged out' });
  });

  return router;
}
