import { Router, Request, Response } from 'express';
import { PrismaClient, PortalRole, CharityStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { resolveActiveSplitConfig } from '../services/split-config.service';
import { runWithRls } from '../db/rls';

export function createAdminSplitConfigRouter(prisma: PrismaClient): Router {
  const router = Router();

  // All admin split config routes require authentication
  router.use('/api/admin/split-config', authenticateToken);

  // Middleware ensuring caller has ADMIN role
  const requireAdmin = (req: Request, res: Response, next: () => void) => {
    if (!req.user || req.user.role !== PortalRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  };

  /**
   * GET /api/admin/split-config
   * Returns the currently active resolved split config for a licensee (or platform default if omitted/null).
   */
  router.get('/api/admin/split-config', requireAdmin, async (req: Request, res: Response) => {
    const licenseeId = req.query.licenseeId as string | undefined;

    try {
      const config = await runWithRls(prisma, req.user!, async (tx) => {
        return resolveActiveSplitConfig(tx as any, licenseeId);
      });
      return res.status(200).json(config);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/split-config
   * Deactivates the prior active config for the scope (licensee or platform-default)
   * and creates a new SplitConfigHistory row with previousConfigId chaining.
   * Body: { licenseeId?, royaltyBps, charityAllocationBps: [{ charityId, bps }] }
   */
  router.post('/api/admin/split-config', requireAdmin, async (req: Request, res: Response) => {
    const { licenseeId, royaltyBps, charityAllocationBps } = req.body || {};

    const targetLicenseeId = licenseeId && typeof licenseeId === 'string' && licenseeId.trim() ? licenseeId.trim() : null;

    if (typeof royaltyBps !== 'number' || !Number.isInteger(royaltyBps) || royaltyBps < 0 || royaltyBps > 10000) {
      return res.status(400).json({ error: 'Invalid input: royaltyBps must be an integer between 0 and 10000.' });
    }

    if (!Array.isArray(charityAllocationBps) || charityAllocationBps.length === 0) {
      return res.status(400).json({ error: 'Invalid input: charityAllocationBps must be a non-empty array.' });
    }

    let bpsSum = 0;
    const charityIds: string[] = [];

    for (const alloc of charityAllocationBps) {
      if (!alloc.charityId || typeof alloc.charityId !== 'string' || typeof alloc.bps !== 'number' || !Number.isInteger(alloc.bps) || alloc.bps <= 0) {
        return res.status(400).json({ error: 'Invalid input: each charityAllocationBps entry must have a valid charityId and positive integer bps.' });
      }
      bpsSum += alloc.bps;
      charityIds.push(alloc.charityId);
    }

    if (bpsSum !== 10000) {
      return res.status(400).json({ error: 'Invalid input: charityAllocationBps must sum to 10000 (100.00%).' });
    }

    // Verify all charityIds exist in DB
    const charities = await prisma.charity.findMany({
      where: { id: { in: charityIds } },
    });

    if (charities.length !== charityIds.length) {
      return res.status(400).json({ error: 'Invalid input: one or more specified charityIds do not exist in the database.' });
    }

    try {
      const newConfig = await runWithRls(prisma, req.user!, async (tx) => {
        // Find existing active config for scope
        const activeConfig = await tx.splitConfigHistory.findFirst({
          where: {
            licenseeId: targetLicenseeId,
            isActive: true,
          },
          orderBy: { changedAt: 'desc' },
        });

        if (activeConfig) {
          await tx.splitConfigHistory.update({
            where: { id: activeConfig.id },
            data: { isActive: false },
          });
        }

        return tx.splitConfigHistory.create({
          data: {
            licenseeId: targetLicenseeId,
            royaltyBps,
            charityAllocationBps,
            isActive: true,
            changedByUserId: req.user!.userId,
            previousConfigId: activeConfig?.id ?? null,
          },
          include: {
            changedByUser: { select: { id: true, email: true, role: true } },
          },
        });
      });

      return res.status(201).json(newConfig);
    } catch (err: any) {
      console.error('[ADMIN SPLIT CONFIG POST ERROR]', err);
      return res.status(500).json({ error: 'Failed to update split configuration' });
    }
  });

  /**
   * GET /api/admin/split-config/history
   * Returns audit trail history for scope ordered by changedAt desc.
   */
  router.get('/api/admin/split-config/history', requireAdmin, async (req: Request, res: Response) => {
    const licenseeId = req.query.licenseeId as string | undefined;
    const targetLicenseeId = licenseeId && typeof licenseeId === 'string' && licenseeId.trim() ? licenseeId.trim() : null;

    try {
      // Authenticated admin scope directly from req.user
      const history = await runWithRls(prisma, req.user!, async (tx) => {
        return tx.splitConfigHistory.findMany({
          where: {
            licenseeId: targetLicenseeId,
          },
          orderBy: { changedAt: 'desc' },
          include: {
            changedByUser: { select: { id: true, email: true, role: true } },
          },
        });
      });

      return res.status(200).json(history);
    } catch (err: any) {
      console.error('[ADMIN SPLIT CONFIG HISTORY ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch split config history' });
    }
  });

  /**
   * GET /api/admin/split-config/licensees
   * Returns list of registered licensees for dynamic split override targeting.
   */
  router.get('/api/admin/split-config/licensees', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const licensees = await prisma.licensee.findMany({
        select: {
          id: true,
          name: true,
          vertical: true,
        },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, licensees });
    } catch (err: any) {
      console.error('[ADMIN GET LICENSEES ERROR]', err);
      return res.status(500).json({ error: 'Failed to load licensees' });
    }
  });

  return router;
}
