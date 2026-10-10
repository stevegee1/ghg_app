import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import {
  MarketIndexError,
  addManualValue,
  createManualIndex,
  deleteManualValue,
  fuelFeedUrl,
  importWeeklyFuelPrices,
  listIndices,
} from '../services/market-index.service';

/** Administrator management of market inputs (fuel, carbon and material prices). */
export function createMarketIndexRouter(prisma: PrismaClient): Router {
  const router = Router();
  router.use('/api/admin/market-indices', authenticateToken, requireAdmin);

  const fail = (res: Response, err: unknown, label: string) => {
    if (err instanceof MarketIndexError) return res.status(err.status).json({ error: err.message });
    console.error(`[${label}]`, err);
    return res.status(500).json({ error: 'The request could not be completed.' });
  };

  router.get('/api/admin/market-indices', async (_req: Request, res: Response) => {
    try {
      return res.status(200).json({ indices: await listIndices(prisma), fuelFeedConfigured: fuelFeedUrl() !== null });
    } catch (err) {
      return fail(res, err, 'MARKET INDICES LIST');
    }
  });

  router.post('/api/admin/market-indices', async (req: Request, res: Response) => {
    try {
      return res.status(201).json({ index: await createManualIndex(prisma, (req.body || {}) as Record<string, unknown>) });
    } catch (err) {
      return fail(res, err, 'MARKET INDEX CREATE');
    }
  });

  router.get('/api/admin/market-indices/:id/values', async (req: Request, res: Response) => {
    try {
      const values = await prisma.marketIndexValue.findMany({
        where: { indexId: req.params.id },
        orderBy: { effectiveDate: 'desc' },
        take: 52,
      });
      return res.status(200).json({
        values: values.map((v) => ({ ...v, effectiveDate: v.effectiveDate.toISOString().slice(0, 10), value: v.value.toString() })),
      });
    } catch (err) {
      return fail(res, err, 'MARKET INDEX VALUES');
    }
  });

  router.post('/api/admin/market-indices/:id/values', async (req: Request, res: Response) => {
    try {
      const value = await addManualValue(prisma, { indexId: req.params.id, ...(req.body || {}), userId: req.user!.userId });
      return res.status(201).json({ value: { ...value, effectiveDate: value.effectiveDate.toISOString().slice(0, 10), value: value.value.toString() } });
    } catch (err) {
      return fail(res, err, 'MARKET INDEX VALUE ADD');
    }
  });

  router.delete('/api/admin/market-indices/:id/values/:valueId', async (req: Request, res: Response) => {
    try {
      await deleteManualValue(prisma, req.params.id, req.params.valueId);
      return res.status(204).send();
    } catch (err) {
      return fail(res, err, 'MARKET INDEX VALUE DELETE');
    }
  });

  router.post('/api/admin/market-indices/import-fuel', async (_req: Request, res: Response) => {
    try {
      return res.status(200).json(await importWeeklyFuelPrices(prisma));
    } catch (err) {
      return fail(res, err, 'MARKET INDEX FUEL IMPORT');
    }
  });

  return router;
}
