import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.middleware';

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
   * POST /api/auth/logout
   */
  router.post('/api/auth/logout', (_req: Request, res: Response) => {
    return res.status(200).json({ message: 'Successfully logged out' });
  });

  return router;
}
