import { Router, Request, Response, NextFunction } from 'express';
import { EntitlementStatus, FleetReadingSource, PrismaClient, ServiceLine } from '@prisma/client';
import { clientInsights } from '../services/fleet/maintenance-training.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireFleetApiKey } from '../middleware/fleet-api-key.middleware';
import { runWithRls } from '../db/rls';
import { parseRange } from './fleet.route';
import { getFleetSummary } from '../services/fleet/fleet-reporting.service';
import { FLEET_SCHEMA_FIELDS, FLEET_SCHEMA_STANDARD, FLEET_SCHEMA_VERSION_ID } from '../services/fleet/fleet-schema';
import { TelemetryRequestError, ingestTelemetry, latestTelemetryByAsset } from '../services/fleet/fleet-telemetry.service';
import { FleetApiKeyError, createFleetApiKey, listFleetApiKeys, revokeFleetApiKey } from '../services/fleet/fleet-api-key.service';

/**
 * The client-facing Fleet API (authenticated by Fleet API key) and the portal endpoints clients
 * use to manage their keys (authenticated by login).
 */
export function createFleetApiRouter(prisma: PrismaClient): Router {
  const router = Router();

  const asClient = (licenseeId: string) => ({ role: 'PARTNER', licenseeId });

  const requireApiEntitlement = async (req: Request, res: Response, next: NextFunction) => {
    const entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId: req.fleetApiClient!.licenseeId, serviceLine: ServiceLine.FLEET } },
    });
    if (entitlement?.status !== EntitlementStatus.ACTIVE) {
      return res.status(402).json({ error: 'An active Fleet subscription is required.', code: 'FLEET_SUBSCRIPTION_REQUIRED' });
    }
    next();
  };

  const requireLicensee = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.licenseeId) return res.status(403).json({ error: 'A client account is required for Fleet.' });
    next();
  };

  // ── Fleet API v1 ────────────────────────────────────────────────────────

  /** GET /api/fleet/v1/schema: the standard data schema version and its fields. Public. */
  router.get('/api/fleet/v1/schema', (_req: Request, res: Response) => {
    res.status(200).json({ id: FLEET_SCHEMA_VERSION_ID, standard: FLEET_SCHEMA_STANDARD, fields: FLEET_SCHEMA_FIELDS });
  });

  /**
   * POST /api/fleet/v1/telemetry  { "snapshots": [ ... ] }
   * Stores ISO 15143-3 snapshots and calculates fuel and CO2e between consecutive snapshots.
   */
  router.post(
    '/api/fleet/v1/telemetry',
    requireFleetApiKey(prisma, 'telemetry:write'),
    requireApiEntitlement,
    async (req: Request, res: Response) => {
      const snapshots = req.body?.snapshots;
      if (!Array.isArray(snapshots)) {
        return res.status(400).json({ error: 'Send a JSON body of the form { "snapshots": [ ... ] }.' });
      }
      const { licenseeId } = req.fleetApiClient!;
      try {
        const result = await runWithRls(prisma, asClient(licenseeId), (tx) =>
          ingestTelemetry(tx, licenseeId, FleetReadingSource.CLIENT_API, snapshots)
        );
        const status = result.accepted > 0 ? 201 : result.duplicates > 0 ? 200 : 422;
        return res.status(status).json(result);
      } catch (err) {
        if (err instanceof TelemetryRequestError) return res.status(400).json({ error: err.message });
        console.error('[FLEET API TELEMETRY ERROR]', err);
        return res.status(500).json({ error: 'The request could not be completed.' });
      }
    }
  );

  /** GET /api/fleet/v1/assets: the client's assets with their latest telemetry. */
  router.get('/api/fleet/v1/assets', requireFleetApiKey(prisma, 'fleet:read'), async (req: Request, res: Response) => {
    const { licenseeId } = req.fleetApiClient!;
    try {
      const { assets, latest } = await runWithRls(prisma, asClient(licenseeId), async (tx) => ({
        assets: await tx.fleetAsset.findMany({
          where: { licenseeId },
          orderBy: { assetTag: 'asc' },
          select: {
            assetTag: true,
            name: true,
            category: true,
            make: true,
            model: true,
            serialNumber: true,
            fuelType: true,
            ownership: true,
            operationalControl: true,
            siteName: true,
            active: true,
            id: true,
          },
        }),
        latest: await latestTelemetryByAsset(tx, licenseeId),
      }));
      return res.status(200).json({
        schemaVersion: FLEET_SCHEMA_VERSION_ID,
        assets: assets.map(({ id, ...a }) => {
          const t = latest.get(id);
          return {
            ...a,
            latestTelemetry: t
              ? {
                  source: t.source,
                  observedAt: t.observedAt,
                  cumulativeOperatingHours: t.cumulativeOperatingHours,
                  cumulativeIdleHours: t.cumulativeIdleHours,
                  cumulativeFuelUsedLitres: t.cumulativeFuelUsedLitres,
                  fuelRemainingPercent: t.fuelRemainingPercent,
                  odometerKm: t.odometerKm,
                  engineRunning: t.engineRunning,
                  location: t.latitude !== null ? { latitude: t.latitude, longitude: t.longitude } : null,
                  faultCodes: t.faults,
                }
              : null,
          };
        }),
      });
    } catch (err) {
      console.error('[FLEET API ASSETS ERROR]', err);
      return res.status(500).json({ error: 'The request could not be completed.' });
    }
  });

  /** GET /api/fleet/v1/summary?from=YYYY-MM-DD&to=YYYY-MM-DD: fuel and CO2e by scope, asset, site and month. */
  router.get(
    '/api/fleet/v1/summary',
    requireFleetApiKey(prisma, 'fleet:read'),
    requireApiEntitlement,
    async (req: Request, res: Response) => {
      const range = parseRange(req);
      if (!range) return res.status(400).json({ error: 'from and to must be dates (YYYY-MM-DD), to on or after from, within 3 years.' });
      const { licenseeId } = req.fleetApiClient!;
      try {
        const summary = await runWithRls(prisma, asClient(licenseeId), (tx) => getFleetSummary(tx, licenseeId, range.from, range.to));
        return res.status(200).json(summary);
      } catch (err) {
        console.error('[FLEET API SUMMARY ERROR]', err);
        return res.status(500).json({ error: 'The request could not be completed.' });
      }
    }
  );

  /** GET /api/fleet/v1/maintenance: each machine's condition, next service and, when published, the model's prediction. */
  router.get('/api/fleet/v1/maintenance', requireFleetApiKey(prisma, 'fleet:read'), requireApiEntitlement, async (req: Request, res: Response) => {
    const { licenseeId } = req.fleetApiClient!;
    try {
      return res.status(200).json(await runWithRls(prisma, asClient(licenseeId), (tx) => clientInsights(tx, licenseeId)));
    } catch (err) {
      console.error('[FLEET API MAINTENANCE ERROR]', err);
      return res.status(500).json({ error: 'The request could not be completed.' });
    }
  });

  // ── API key management (portal login) ───────────────────────────────────

  const keyError = (res: Response, err: unknown, tag: string) => {
    if (err instanceof FleetApiKeyError) return res.status(err.status).json({ error: err.message });
    console.error(tag, err);
    return res.status(500).json({ error: 'The request could not be completed.' });
  };

  router.get('/api/fleet/api-keys', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const keys = await runWithRls(prisma, user, (tx) => listFleetApiKeys(tx, user.licenseeId!));
      return res.status(200).json({ keys });
    } catch (err) {
      return keyError(res, err, '[FLEET API KEYS LIST ERROR]');
    }
  });

  router.post('/api/fleet/api-keys', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const key = await runWithRls(prisma, user, (tx) => createFleetApiKey(tx, user.licenseeId!, user.userId, req.body ?? {}));
      return res.status(201).json({ key });
    } catch (err) {
      return keyError(res, err, '[FLEET API KEY CREATE ERROR]');
    }
  });

  router.post('/api/fleet/api-keys/:id/revoke', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const key = await runWithRls(prisma, user, (tx) => revokeFleetApiKey(tx, user.licenseeId!, req.params.id));
      return res.status(200).json({ key });
    } catch (err) {
      return keyError(res, err, '[FLEET API KEY REVOKE ERROR]');
    }
  });

  return router;
}
