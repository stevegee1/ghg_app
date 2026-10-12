import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient, PortalRole } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  CharityReserveError,
  assignCharityReserve,
  getCharityReserve,
  listReserveAssignments,
  parseReserveAssignment,
} from '../services/charity-reserve.service';

/** The charity share held while no charity was set, and its assignment to charities. Pattern: admin-charities.route.ts. */
export function createAdminCharityReserveRouter(prisma: PrismaClient, stripe: Stripe): Router {
  const router = Router();

  router.use('/api/admin/charity-reserve', authenticateToken);

  const requireAdmin = (req: Request, res: Response, next: () => void) => {
    if (!req.user || req.user.role !== PortalRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  };

  /** GET /api/admin/charity-reserve: the held balance in each currency and past assignments. */
  router.get('/api/admin/charity-reserve', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const [balances, assignments] = await Promise.all([getCharityReserve(prisma), listReserveAssignments(prisma)]);
      return res.status(200).json({
        balances,
        assignments: assignments.map((a) => ({
          id: a.id,
          currency: a.currency,
          totalCents: a.totalCents,
          paymentCount: a.splitCount,
          charityAllocationBps: a.charityAllocationBps,
          assignedBy: a.assignedByUser.email,
          createdAt: a.createdAt,
        })),
      });
    } catch (err) {
      console.error('[CHARITY RESERVE LOAD ERROR]', err);
      return res.status(500).json({ error: 'The charity reserve could not be loaded.' });
    }
  });

  /**
   * POST /api/admin/charity-reserve/assign  { currency, charityAllocationBps: [{ charityId, bps }] }
   * Assigns the whole held balance in that currency and pays each charity.
   */
  router.post('/api/admin/charity-reserve/assign', requireAdmin, async (req: Request, res: Response) => {
    const parsed = parseReserveAssignment(req.body || {});
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    try {
      const result = await assignCharityReserve(prisma, stripe, parsed.value, req.user!.userId);
      return res.status(201).json(result);
    } catch (err) {
      if (err instanceof CharityReserveError) return res.status(err.status).json({ error: err.message });
      console.error('[CHARITY RESERVE ASSIGN ERROR]', err);
      return res.status(500).json({ error: 'The charity reserve could not be assigned.' });
    }
  });

  return router;
}
