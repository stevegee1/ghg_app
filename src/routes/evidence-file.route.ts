import fs from 'fs';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { resolveStorageKey } from '../services/file-storage.service';

/**
 * GET /api/evidence/:id/file
 * Streams a stored evidence file to its owner or an administrator. Row-level security decides
 * visibility, so another licensee's file is reported as not found.
 */
export function createEvidenceFileRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/api/evidence/:id/file', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const doc = await runWithRls(prisma, user, (tx) =>
        tx.auditEvidenceDocument.findUnique({
          where: { id: req.params.id },
          select: { fileName: true, mimeType: true, storageKey: true },
        })
      );
      if (!doc) return res.status(404).json({ error: 'Evidence not found.' });
      if (!doc.storageKey) {
        return res.status(404).json({ error: 'This record was created before files were stored; no file is available.' });
      }

      const absolute = resolveStorageKey(doc.storageKey);
      if (!fs.existsSync(absolute)) {
        console.error('[EVIDENCE FILE MISSING]', req.params.id);
        return res.status(404).json({ error: 'The evidence file could not be found in storage.' });
      }

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName.replace(/["\\\r\n]/g, '_')}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      return fs.createReadStream(absolute).pipe(res);
    } catch (err: unknown) {
      console.error('[EVIDENCE FILE ERROR]', err);
      return res.status(500).json({ error: 'Failed to download the evidence file.' });
    }
  });

  return router;
}
