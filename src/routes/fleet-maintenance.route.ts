import { Router, Request, Response, NextFunction } from 'express';
import { EntitlementStatus, PrismaClient, ServiceLine } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { csvUpload, sendError } from './fleet.route';
import {
  MODEL_TRAINING_CONSENT_TEXT,
  getTrainingConsent,
  importMaintenanceHistory,
  listMaintenance,
  recordMaintenanceEvent,
  setMaintenancePlan,
  setTrainingConsent,
} from '../services/fleet/fleet-maintenance.service';

/** Service intervals, maintenance events and training consent for Fleet clients. Pattern: fleet-project.route.ts. */
export function createFleetMaintenanceRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.use('/api/fleet/maintenance', authenticateToken);
  router.use('/api/fleet/model-consent', authenticateToken);

  const requireFleet = async (req: Request, res: Response, next: NextFunction) => {
    const licenseeId = req.user?.licenseeId;
    if (!licenseeId) return res.status(403).json({ error: 'A client account is required for Fleet.' });
    const entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId, serviceLine: ServiceLine.FLEET } },
    });
    if (entitlement?.status !== EntitlementStatus.ACTIVE) {
      return res.status(402).json({ error: 'An active Fleet service is required.', code: 'FLEET_SUBSCRIPTION_REQUIRED' });
    }
    next();
  };

  router.get('/api/fleet/maintenance', requireFleet, async (req: Request, res: Response) => {
    try {
      return res.json(await runWithRls(prisma, req.user!, (tx) => listMaintenance(tx, req.user!.licenseeId!)));
    } catch (err) {
      return sendError(res, err, '[FLEET MAINTENANCE LIST]');
    }
  });

  router.put('/api/fleet/maintenance/plans', requireFleet, async (req: Request, res: Response) => {
    try {
      const plan = await runWithRls(prisma, req.user!, (tx) => setMaintenancePlan(tx, req.user!.licenseeId!, req.body || {}, req.user!.userId));
      return res.json({ plan });
    } catch (err) {
      return sendError(res, err, '[FLEET MAINTENANCE PLAN]');
    }
  });

  router.post('/api/fleet/maintenance/events', requireFleet, async (req: Request, res: Response) => {
    try {
      const event = await runWithRls(prisma, req.user!, (tx) => recordMaintenanceEvent(tx, req.user!.licenseeId!, req.body || {}, req.user!.userId));
      return res.status(201).json({ event });
    } catch (err) {
      return sendError(res, err, '[FLEET MAINTENANCE EVENT]');
    }
  });

  router.post(
    '/api/fleet/maintenance/import',
    requireFleet,
    (req: Request, res: Response, next: NextFunction) =>
      csvUpload.single('file')(req, res, (err: unknown) => {
        if (err) return res.status(400).json({ error: (err as Error).message });
        if (!req.file) return res.status(400).json({ error: 'Attach the CSV file in the "file" field.' });
        next();
      }),
    async (req: Request, res: Response) => {
      try {
        const result = await runWithRls(prisma, req.user!, (tx) =>
          importMaintenanceHistory(tx, req.user!.licenseeId!, req.file!.buffer.toString('utf8'), req.user!.userId)
        );
        return res.status(result.rejections.length > 0 ? 422 : 201).json(result);
      } catch (err) {
        return sendError(res, err, '[FLEET MAINTENANCE IMPORT]');
      }
    }
  );

  router.get('/api/fleet/model-consent', requireFleet, async (req: Request, res: Response) => {
    try {
      const consent = await runWithRls(prisma, req.user!, (tx) => getTrainingConsent(tx, req.user!.licenseeId!));
      return res.json({ text: MODEL_TRAINING_CONSENT_TEXT, granted: Boolean(consent && !consent.withdrawnAt), consent });
    } catch (err) {
      return sendError(res, err, '[MODEL CONSENT GET]');
    }
  });

  router.put('/api/fleet/model-consent', requireFleet, async (req: Request, res: Response) => {
    try {
      const consent = await runWithRls(prisma, req.user!, (tx) => setTrainingConsent(tx, req.user!.licenseeId!, req.body?.granted, req.user!.userId));
      return res.json({ text: MODEL_TRAINING_CONSENT_TEXT, granted: Boolean(consent && !consent.withdrawnAt), consent });
    } catch (err) {
      return sendError(res, err, '[MODEL CONSENT SET]');
    }
  });

  return router;
}
