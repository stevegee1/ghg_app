import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { collectFingerprints, createBatch } from '../services/anchor/anchor-batch.service';

const serializeBatch = (b: { blockNumber: bigint | null } & Record<string, unknown>) => ({
  ...b,
  blockNumber: b.blockNumber === null ? null : b.blockNumber.toString(),
});

/** Administrator view of fingerprint batches and their on-chain status. */
export function createAnchorRouter(prisma: PrismaClient): Router {
  const router = Router();
  router.use('/api/admin/anchors', authenticateToken, requireAdmin);

  router.get('/api/admin/anchors', async (_req: Request, res: Response) => {
    try {
      const [batches, unbatched, byKind] = await Promise.all([
        prisma.anchorBatch.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
        prisma.anchorLeaf.count({ where: { batchId: null } }),
        prisma.anchorLeaf.groupBy({ by: ['kind'], _count: { _all: true } }),
      ]);
      return res.status(200).json({
        batches: batches.map(serializeBatch),
        unbatched,
        fingerprintsByKind: Object.fromEntries(byKind.map((k) => [k.kind, k._count._all])),
      });
    } catch (err) {
      console.error('[ANCHORS LIST]', err);
      return res.status(500).json({ error: 'Failed to load anchors.' });
    }
  });

  /** Collects new fingerprints and batches them now, instead of waiting for the daily run. */
  router.post('/api/admin/anchors/run', async (_req: Request, res: Response) => {
    try {
      const added = await collectFingerprints(prisma);
      const batch = await createBatch(prisma);
      return res.status(200).json({ added, batch: batch ? serializeBatch(batch) : null });
    } catch (err) {
      console.error('[ANCHORS RUN]', err);
      return res.status(500).json({ error: 'The anchoring run failed.' });
    }
  });

  return router;
}
