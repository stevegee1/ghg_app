import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set in production.');
}

export const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? '' : 'dev_jwt_secret_key_change_in_prod');

export interface AuthenticatedUser {
  userId: string;
  role: string;
  licenseeId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      licenseeId: decoded.licenseeId ?? null,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export const requireAuth = authenticateToken;

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Administrative privileges required' });
    }
    next();
  });
}
