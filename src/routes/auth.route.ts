import { Router, Request, Response } from 'express';
import { IndustrySector, PrimaryRole, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';
import { validateWorkEmail } from '../utils/emailValidation';
import { getPlatformStripeAccountId } from '../services/platform-account.service';

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /api/auth/register
   * Production-grade self-service account registration.
   * Creates a Licensee tenant boundary and a PortalUser, issuing a signed JWT session.
   */
  const handleRegister = async (req: Request, res: Response) => {
    const {
      firstName,
      lastName,
      email,
      password,
      companyName,
      jobTitle,
      primaryRole,
      organisationCountry,
      industrySector,
      websiteUrl,
      companyRegistrationNo,
    } = req.body || {};

    // 1. Validation
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ error: 'First name is required' });
    }
    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({ error: 'Last name is required' });
    }
    const normalizedEmail = (email || '').trim().toLowerCase();
    const emailValidation = validateWorkEmail(normalizedEmail);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.error || 'Valid work email address is required' });
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
          stripeConnectedAccountId: getPlatformStripeAccountId(),
          organisationCountry: (organisationCountry?.trim() || 'GB').toUpperCase().slice(0, 2),
          industrySector: industrySector || null,
          websiteUrl: websiteUrl?.trim() || null,
          companyRegistrationNo: companyRegistrationNo?.trim() || null,
          hasCompletedAssessment: false,
        },
      });

      // 5. Generate secure email verification token & hash
      const rawVerificationToken = crypto.randomBytes(32).toString('hex');
      const hashedVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
      const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // 6. Hash Password & Create User
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await prisma.portalUser.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          licenseeId,
          role: 'PARTNER',
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          jobTitle: jobTitle?.trim() || null,
          primaryRole: primaryRole || 'OTHER',
          isOnboardingComplete: false,
          emailVerified: false,
          emailVerificationToken: hashedVerificationToken,
          emailVerificationExpiresAt: verificationExpiresAt,
        },
      });

      // 7. Dispatch Email Verification
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'}://${req.get('host')}`;
      const verificationUrl = `${baseUrl}/verify-email?token=${rawVerificationToken}`;

      emailService.sendVerificationEmail({
        toEmail: normalizedEmail,
        verificationUrl,
        appName: 'NFTYLOGS Assurance Suite',
        expiresInHours: 24,
      }).catch((emailErr) => console.error('[EMAIL VERIFICATION DISPATCH WARN]', emailErr));

      // 8. Sign JWT Session Token
      const token = jwt.sign(
        {
          userId: newUser.id,
          role: newUser.role,
          licenseeId: newUser.licenseeId,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Account successfully registered. A verification link has been sent to your work email.',
        token,
        verificationSent: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          licenseeId: newUser.licenseeId,
          emailVerified: false,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          jobTitle: newUser.jobTitle,
          primaryRole: newUser.primaryRole,
          isOnboardingComplete: false,
          hasCompletedAssessment: false,
          companyName: companyName.trim(),
          organisationCountry: organisationCountry || 'GB',
          industrySector: industrySector || null,
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

    const cleanEmail = email.trim().toLowerCase();
    const emailValidation = validateWorkEmail(cleanEmail);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: emailValidation.error || 'Please provide an official corporate or organizational work email address (personal providers like Gmail, Yahoo, and Outlook are not permitted).',
      });
    }

    try {
      const user = await prisma.portalUser.findUnique({
        where: { email: cleanEmail },
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
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          licenseeId: user.licenseeId,
          emailVerified: user.emailVerified,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          primaryRole: user.primaryRole,
          isOnboardingComplete: user.isOnboardingComplete,
          hasCompletedAssessment: user.licensee?.hasCompletedAssessment ?? false,
          companyName: user.licensee?.name || 'Authorized Entity',
          organisationCountry: user.licensee?.organisationCountry || 'GB',
          industrySector: user.licensee?.industrySector || null,
          logoUrl: user.licensee?.logoUrl || null,
          websiteUrl: user.licensee?.websiteUrl || null,
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
    const emailValidation = validateWorkEmail(normalizedEmail);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: emailValidation.error || 'Valid work email address is required',
      });
    }

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
   * GET /api/auth/me
   * Resolves currently authenticated user with org name, entitlements, and service line access.
   */
  const handleMe = async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await prisma.portalUser.findUnique({
        where: { id: decoded.userId },
        include: {
          licensee: {
            include: {
              entitlements: {
                where: { status: 'ACTIVE' },
                select: { serviceLine: true, status: true, grantedAt: true },
              },
            },
          },
        },
      });
      if (!user) {
        return res.status(401).json({ error: 'User no longer exists' });
      }
      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          licenseeId: user.licenseeId,
          emailVerified: user.emailVerified,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          primaryRole: user.primaryRole,
          isOnboardingComplete: user.isOnboardingComplete,
          hasCompletedAssessment: user.licensee?.hasCompletedAssessment ?? false,
          // Active service entitlements, used for pipeline access gating
          serviceEntitlements: user.licensee?.entitlements ?? [],
          companyName: user.licensee?.name || (user.role === 'ADMIN' ? 'GHG Platform Administration' : 'Authorized Entity'),
          organisationCountry: user.licensee?.organisationCountry || 'GB',
          industrySector: user.licensee?.industrySector || null,
          logoUrl: user.licensee?.logoUrl || null,
          websiteUrl: user.licensee?.websiteUrl || null,
        },
      });
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  router.get('/api/auth/me', handleMe);
  router.get('/api/v1/auth/me', handleMe);

  /**
   * PATCH /api/auth/profile
   * Updates user and licensee onboarding and profile settings.
   */
  const handleUpdateProfile = async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const {
        firstName,
        lastName,
        jobTitle,
        primaryRole,
        companyName,
        organisationCountry,
        industrySector,
        websiteUrl,
        companyRegistrationNo,
      } = req.body || {};

      if (primaryRole !== undefined && !(Object.values(PrimaryRole) as string[]).includes(primaryRole)) {
        return res.status(400).json({ error: 'Choose a role from the list.' });
      }
      if (industrySector !== undefined && industrySector !== null && !(Object.values(IndustrySector) as string[]).includes(industrySector)) {
        return res.status(400).json({ error: 'Choose an industry from the list.' });
      }

      const user = await prisma.portalUser.findUnique({
        where: { id: decoded.userId },
        include: { licensee: true },
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await prisma.portalUser.update({
        where: { id: user.id },
        data: {
          firstName: firstName !== undefined ? firstName?.trim() : user.firstName,
          lastName: lastName !== undefined ? lastName?.trim() : user.lastName,
          jobTitle: jobTitle !== undefined ? jobTitle?.trim() : user.jobTitle,
          primaryRole: primaryRole !== undefined ? primaryRole : user.primaryRole,
        },
      });

      if (user.licenseeId) {
        await prisma.licensee.update({
          where: { id: user.licenseeId },
          data: {
            name: companyName !== undefined ? companyName?.trim() : user.licensee?.name,
            organisationCountry:
              organisationCountry !== undefined
                ? organisationCountry?.trim().toUpperCase().slice(0, 2)
                : user.licensee?.organisationCountry,
            industrySector: industrySector !== undefined ? industrySector : user.licensee?.industrySector,
            websiteUrl: websiteUrl !== undefined ? websiteUrl?.trim() : user.licensee?.websiteUrl,
            companyRegistrationNo:
              companyRegistrationNo !== undefined
                ? companyRegistrationNo?.trim()
                : user.licensee?.companyRegistrationNo,
          },
        });
      }

      const updatedUser = await prisma.portalUser.findUnique({
        where: { id: user.id },
        include: { licensee: true },
      });

      return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser!.id,
          email: updatedUser!.email,
          role: updatedUser!.role,
          licenseeId: updatedUser!.licenseeId,
          emailVerified: updatedUser!.emailVerified,
          firstName: updatedUser!.firstName,
          lastName: updatedUser!.lastName,
          jobTitle: updatedUser!.jobTitle,
          primaryRole: updatedUser!.primaryRole,
          isOnboardingComplete: updatedUser!.isOnboardingComplete,
          hasCompletedAssessment: updatedUser!.licensee?.hasCompletedAssessment ?? false,
          companyName: updatedUser!.licensee?.name || 'Authorized Entity',
          organisationCountry: updatedUser!.licensee?.organisationCountry || 'GB',
          industrySector: updatedUser!.licensee?.industrySector || null,
          websiteUrl: updatedUser!.licensee?.websiteUrl || null,
        },
      });
    } catch (err: any) {
      if (err instanceof jwt.JsonWebTokenError) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
      console.error('[PROFILE UPDATE ERROR]', err);
      return res.status(500).json({ error: 'Your profile could not be saved. Please try again.' });
    }
  };

  router.patch('/api/auth/profile', handleUpdateProfile);
  router.patch('/api/v1/auth/profile', handleUpdateProfile);

  /**
   * GET /api/auth/verify-email
   * Validates email verification token and marks user as emailVerified = true.
   */
  const handleVerifyEmail = async (req: Request, res: Response) => {
    const rawToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!rawToken) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    try {
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      const user = await prisma.portalUser.findFirst({
        where: {
          emailVerificationToken: hashedToken,
          emailVerificationExpiresAt: { gt: new Date() },
        },
        include: { licensee: true },
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired verification token. If your link has expired, please request a new verification email.',
        });
      }

      // Mark verified and clear tokens
      const updatedUser = await prisma.portalUser.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
        include: { licensee: true },
      });

      // Issue refreshed JWT token
      const token = jwt.sign(
        {
          userId: updatedUser.id,
          role: updatedUser.role,
          licenseeId: updatedUser.licenseeId,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Your corporate work email address has been successfully verified.',
        token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          licenseeId: updatedUser.licenseeId,
          emailVerified: true,
          companyName: updatedUser.licensee?.name || 'Authorized Entity',
        },
      });
    } catch (err) {
      console.error('[VERIFY EMAIL ERROR]', err);
      return res.status(500).json({ error: 'Failed to verify email address. Please try again.' });
    }
  };

  router.get('/api/auth/verify-email', handleVerifyEmail);
  router.get('/api/v1/auth/verify-email', handleVerifyEmail);

  /**
   * POST /api/auth/resend-verification
   * Dispatches a fresh email verification link with anti-enumeration protection.
   */
  const handleResendVerification = async (req: Request, res: Response) => {
    let emailToVerify: string | null = null;

    // Check Authorization header first if logged in
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
        const loggedUser = await prisma.portalUser.findUnique({ where: { id: decoded.userId } });
        if (loggedUser) {
          emailToVerify = loggedUser.email;
        }
      } catch {
        // Fall back to body email
      }
    }

    if (!emailToVerify) {
      const bodyEmail = req.body?.email;
      if (typeof bodyEmail === 'string' && bodyEmail.trim()) {
        emailToVerify = bodyEmail.trim().toLowerCase();
      }
    }

    if (!emailToVerify) {
      return res.status(400).json({ error: 'Work email address is required' });
    }

    const emailValidation = validateWorkEmail(emailToVerify);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.error || 'A valid corporate work email is required' });
    }

    try {
      const user = await prisma.portalUser.findUnique({
        where: { email: emailToVerify },
      });

      if (user && !user.emailVerified) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.portalUser.update({
          where: { id: user.id },
          data: {
            emailVerificationToken: hashedToken,
            emailVerificationExpiresAt: expiresAt,
          },
        });

        const baseUrl = process.env.APP_BASE_URL || `${req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'}://${req.get('host')}`;
        const verificationUrl = `${baseUrl}/verify-email?token=${rawToken}`;

        await emailService.sendVerificationEmail({
          toEmail: user.email,
          verificationUrl,
          appName: 'NFTYLOGS Assurance Suite',
          expiresInHours: 24,
        });
      }

      // Anti-enumeration: Always return 200
      return res.status(200).json({
        success: true,
        message: 'If an unverified account exists for this corporate work email, a fresh verification link has been dispatched.',
      });
    } catch (err) {
      console.error('[RESEND VERIFICATION ERROR]', err);
      return res.status(500).json({ error: 'Failed to dispatch verification email.' });
    }
  };

  router.post('/api/auth/resend-verification', handleResendVerification);
  router.post('/api/v1/auth/resend-verification', handleResendVerification);

  /**
   * POST /api/auth/logout
   */
  router.post('/api/auth/logout', (_req: Request, res: Response) => {
    return res.status(200).json({ message: 'Successfully logged out' });
  });

  return router;
}
