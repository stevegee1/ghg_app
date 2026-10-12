import { Router, Request, Response, NextFunction } from 'express';
import { EntitlementStatus, PrismaClient, ServiceLine } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
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
import { publishRuleSet } from '../services/fleet/maintenance-insight.service';
import { fleetDataSources } from '../services/fleet/fleet-data-sources.service';
import { scanUploadedFile } from '../middleware/virus-scan.middleware';
import {
  clientInsights,
  parseTrainingSettings,
  publishModel,
  retirePublishedModel,
  trainModel,
  trainingDataSummary,
} from '../services/fleet/maintenance-training.service';

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
        void scanUploadedFile(req, res, next);
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

  /** The condition of each machine under the active rule set, worst first. */
  router.get('/api/fleet/maintenance/insights', requireFleet, async (req: Request, res: Response) => {
    try {
      return res.json(await runWithRls(prisma, req.user!, (tx) => clientInsights(tx, req.user!.licenseeId!)));
    } catch (err) {
      return sendError(res, err, '[FLEET MAINTENANCE INSIGHTS]');
    }
  });

  /** Every source feeding the client's Fleet data, what it has sent and when it last did. */
  router.get('/api/fleet/maintenance/data-sources', requireFleet, async (req: Request, res: Response) => {
    try {
      return res.json(await runWithRls(prisma, req.user!, (tx) => fleetDataSources(tx, req.user!.licenseeId!)));
    } catch (err) {
      return sendError(res, err, '[FLEET DATA SOURCES]');
    }
  });

  router.use('/api/admin/maintenance', authenticateToken, requireAdmin);

  router.get('/api/admin/maintenance/rules', async (_req: Request, res: Response) => {
    const sets = await prisma.maintenanceRuleSet.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ sets });
  });

  /** Publishes a new rule set version and makes it active. Earlier versions stay for the insights that used them. */
  router.post('/api/admin/maintenance/rules', async (req: Request, res: Response) => {
    try {
      const set = await publishRuleSet(prisma, req.body || {}, req.user!.userId);
      return res.status(201).json({ set });
    } catch (err) {
      return sendError(res, err, '[MAINTENANCE RULES PUBLISH]');
    }
  });

  /** Trained models, newest first, and what a new training run would have to work with. */
  router.get('/api/admin/maintenance/models', async (_req: Request, res: Response) => {
    try {
      const [models, data] = await Promise.all([
        prisma.fleetMaintenanceModel.findMany({
          orderBy: { trainedAt: 'desc' },
          take: 50,
          select: {
            id: true, version: true, featureSetId: true, horizonDays: true, settings: true, trainMetrics: true, testMetrics: true,
            clientCount: true, machineCount: true, sampleCount: true, positiveCount: true, datasetSha256: true,
            passedGate: true, gateNotes: true, status: true, trainedAt: true, publishedAt: true, ruleSet: { select: { version: true } },
          },
        }),
        trainingDataSummary(prisma),
      ]);
      return res.json({ models, data });
    } catch (err) {
      return sendError(res, err, '[MAINTENANCE MODELS LIST]');
    }
  });

  router.post('/api/admin/maintenance/models/train', async (req: Request, res: Response) => {
    try {
      const model = await trainModel(prisma, parseTrainingSettings(req.body || {}), req.user!.userId);
      return res.status(201).json({ model: { id: model.id, version: model.version, passedGate: model.passedGate, gateNotes: model.gateNotes, testMetrics: model.testMetrics, trainMetrics: model.trainMetrics } });
    } catch (err) {
      return sendError(res, err, '[MAINTENANCE MODEL TRAIN]');
    }
  });

  router.post('/api/admin/maintenance/models/:id/publish', async (req: Request, res: Response) => {
    try {
      const model = await publishModel(prisma, req.params.id, req.user!.userId);
      return res.json({ model: { id: model.id, version: model.version, status: model.status } });
    } catch (err) {
      return sendError(res, err, '[MAINTENANCE MODEL PUBLISH]');
    }
  });

  router.post('/api/admin/maintenance/models/retire', async (_req: Request, res: Response) => {
    try {
      const result = await retirePublishedModel(prisma);
      return res.json({ retired: result.count });
    } catch (err) {
      return sendError(res, err, '[MAINTENANCE MODEL RETIRE]');
    }
  });

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
