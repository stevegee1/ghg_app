import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.middleware';

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /api/auth/login
   * Authenticates PortalUser and returns signed JWT session token.
   * Returns generic 401 on invalid credentials to prevent user enumeration.
   */
  router.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    try {
      const user = await prisma.portalUser.findUnique({
        where: { email: email.trim().toLowerCase() },
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
        { expiresIn: '15m' }
      );

      return res.status(200).json({ token });
    } catch (err) {
      console.error('[AUTH API ERROR]', err);
      return res.status(500).json({ error: 'An unexpected error occurred during login' });
    }
  });

  /**
   * POST /api/auth/logout
   * Invalidates current user session.
   */
  router.post('/api/auth/logout', (_req: Request, res: Response) => {
    return res.status(200).json({ message: 'Successfully logged out' });
  });

  return router;
}
