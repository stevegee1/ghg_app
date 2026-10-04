import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import {
  FleetConnectionError,
  createSetupRequest,
  getConnectionOverview,
  listSetupRequestsForAdmin,
  setAssetConnections,
  updateSetupRequest,
} from '../services/fleet/fleet-connection.service';

/** Per-asset connection (Branch A, Branch B or manual) and tracking-device set-up calls. */
export function createFleetConnectionRouter(prisma: PrismaClient): Router {
  const router = Router();

  const requireLicensee = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.licenseeId) return res.status(403).json({ error: 'A client account is required for Fleet.' });
    next();
  };

  const fail = (res: Response, err: unknown, tag: string) => {
    if (err instanceof FleetConnectionError) return res.status(err.status).json({ error: err.message });
    console.error(tag, err);
    return res.status(500).json({ error: 'The request could not be completed.' });
  };

  /** GET /api/fleet/connections: counts by branch, the onboarding hint and set-up requests. */
  router.get('/api/fleet/connections', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      return res.status(200).json(await runWithRls(prisma, user, (tx) => getConnectionOverview(tx, user.licenseeId!)));
    } catch (err) {
      return fail(res, err, '[FLEET CONNECTIONS ERROR]');
    }
  });

  /** POST /api/fleet/assets/connection { assetIds, branch }: the client confirms how assets connect. */
  router.post('/api/fleet/assets/connection', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const result = await runWithRls(prisma, user, (tx) => setAssetConnections(tx, user.licenseeId!, user.userId, req.body ?? {}));
      return res.status(200).json(result);
    } catch (err) {
      return fail(res, err, '[FLEET SET CONNECTION ERROR]');
    }
  });

  /** POST /api/fleet/setup-requests: request a call to set up tracking devices on Branch B assets. */
  router.post('/api/fleet/setup-requests', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const request = await runWithRls(prisma, user, (tx) => createSetupRequest(tx, user.licenseeId!, user.userId, req.body ?? {}));
      return res.status(201).json({ request });
    } catch (err) {
      return fail(res, err, '[FLEET SETUP REQUEST ERROR]');
    }
  });

  router.get('/api/admin/fleet/setup-requests', requireAdmin, async (req: Request, res: Response) => {
    try {
      const requests = await runWithRls(prisma, req.user!, (tx) => listSetupRequestsForAdmin(tx));
      return res.status(200).json({ requests });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET SETUP REQUESTS ERROR]');
    }
  });

  router.patch('/api/admin/fleet/setup-requests/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const request = await runWithRls(prisma, req.user!, (tx) => updateSetupRequest(tx, req.params.id, req.body ?? {}));
      return res.status(200).json({ request });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET SETUP REQUEST UPDATE ERROR]');
    }
  });

  return router;
}
