import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import {
  FleetProviderError,
  createBinding,
  createProvider,
  deactivateBinding,
  listBindings,
  listProviders,
  listTrackingDeviceAssets,
  testMapping,
  updateProvider,
} from '../services/fleet/fleet-provider.service';
import { DeviceIngestError, findDeviceProvider, ingestDeviceMessages, verifyDeviceRequest } from '../services/fleet/fleet-device-ingest.service';

/**
 * Administrator configuration of data providers and device bindings, and the endpoint tracking
 * devices send their readings to.
 */
export function createFleetProviderRouter(prisma: PrismaClient): Router {
  const router = Router();

  const fail = (res: Response, err: unknown, tag: string) => {
    if (err instanceof FleetProviderError || err instanceof DeviceIngestError) return res.status(err.status).json({ error: err.message });
    console.error(tag, err);
    return res.status(500).json({ error: 'The request could not be completed.' });
  };
  const asAdmin = <T>(req: Request, fn: Parameters<typeof runWithRls<T>>[2]) => runWithRls(prisma, req.user!, fn);

  // ── Device ingestion (authenticated by the provider's own method) ───────

  /**
   * POST /api/fleet/ingest/devices/:providerId
   * The raw body is kept for signature checks. Unknown providers and failed checks get the same 401.
   */
  router.post('/api/fleet/ingest/devices/:providerId', async (req: Request, res: Response) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    try {
      const provider = await findDeviceProvider(prisma, req.params.providerId);
      if (!provider || !verifyDeviceRequest(provider, req.headers, raw)) {
        return res.status(401).json({ error: 'The device request could not be authenticated.' });
      }
      let body: unknown;
      try {
        body = JSON.parse(raw.toString('utf8'));
      } catch {
        return res.status(400).json({ error: 'The body must be JSON.' });
      }
      const result = await ingestDeviceMessages(prisma, provider, body);
      const status = result.accepted > 0 ? 201 : result.duplicates > 0 ? 200 : 422;
      return res.status(status).json(result);
    } catch (err) {
      return fail(res, err, '[FLEET DEVICE INGEST ERROR]');
    }
  });

  // ── Administrator configuration ─────────────────────────────────────────

  router.get('/api/admin/fleet/providers', requireAdmin, async (req: Request, res: Response) => {
    try {
      return res.status(200).json({ providers: await asAdmin(req, (tx) => listProviders(tx)) });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET PROVIDERS ERROR]');
    }
  });

  router.post('/api/admin/fleet/providers', requireAdmin, async (req: Request, res: Response) => {
    try {
      const provider = await asAdmin(req, (tx) => createProvider(tx, req.user!.userId, req.body ?? {}));
      return res.status(201).json({ provider });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET PROVIDER CREATE ERROR]');
    }
  });

  router.patch('/api/admin/fleet/providers/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const provider = await asAdmin(req, (tx) => updateProvider(tx, req.params.id, req.body ?? {}));
      return res.status(200).json({ provider });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET PROVIDER UPDATE ERROR]');
    }
  });

  /** POST /api/admin/fleet/providers/test-mapping { fieldMapping, sample }: dry run, stores nothing. */
  router.post('/api/admin/fleet/providers/test-mapping', requireAdmin, (req: Request, res: Response) => {
    try {
      return res.status(200).json({ results: testMapping(req.body?.fieldMapping, req.body?.sample) });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET MAPPING TEST ERROR]');
    }
  });

  router.get('/api/admin/fleet/device-bindings', requireAdmin, async (req: Request, res: Response) => {
    try {
      const [bindings, assets] = await asAdmin(req, (tx) => Promise.all([listBindings(tx), listTrackingDeviceAssets(tx)]));
      return res.status(200).json({ bindings, trackingDeviceAssets: assets });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET BINDINGS ERROR]');
    }
  });

  router.post('/api/admin/fleet/device-bindings', requireAdmin, async (req: Request, res: Response) => {
    try {
      const binding = await asAdmin(req, (tx) => createBinding(tx, req.user!.userId, req.body ?? {}));
      return res.status(201).json({ binding });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET BINDING CREATE ERROR]');
    }
  });

  router.post('/api/admin/fleet/device-bindings/:id/deactivate', requireAdmin, async (req: Request, res: Response) => {
    try {
      const binding = await asAdmin(req, (tx) => deactivateBinding(tx, req.params.id));
      return res.status(200).json({ binding });
    } catch (err) {
      return fail(res, err, '[ADMIN FLEET BINDING DEACTIVATE ERROR]');
    }
  });

  return router;
}
