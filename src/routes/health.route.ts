import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateFileStorage } from '../services/file-storage.service';

/**
 * GET /healthz: whether this instance can serve requests. Checks the database answers and file
 * storage is present and writable. Reports pass or fail per check only; detail goes to the logs.
 */
export function createHealthRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/healthz', async (_req: Request, res: Response) => {
    const checks = { database: false, fileStorage: false };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (err) {
      console.error('[HEALTH] Database check failed:', (err as Error).message);
    }
    try {
      validateFileStorage();
      checks.fileStorage = true;
    } catch (err) {
      console.error('[HEALTH] File storage check failed:', (err as Error).message);
    }
    const ok = checks.database && checks.fileStorage;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'unavailable', checks });
  });

  return router;
}
