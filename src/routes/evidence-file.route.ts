import fs from 'fs';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { checkStoredFile } from '../services/file-storage.service';

/**
 * GET /api/evidence/:id/file
 * Streams a stored evidence file to its owner or an administrator. Row-level security decides
 * visibility, so another licensee's file is reported as not found. The file's fingerprint is
 * checked first: a file that changed since upload is refused, never served as the original.
 */
export function createEvidenceFileRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/api/evidence/:id/file', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const doc = await runWithRls(prisma, user, (tx) =>
        tx.auditEvidenceDocument.findUnique({
          where: { id: req.params.id },
          select: { fileName: true, mimeType: true, storageKey: true, sha256Hash: true },
        })
      );
      if (!doc) return res.status(404).json({ error: 'Evidence not found.' });
      if (!doc.storageKey) {
        return res.status(404).json({ error: 'This record was created before files were stored; no file is available.' });
      }

      const { integrity, absolute } = await checkStoredFile(doc.storageKey, doc.sha256Hash);
      if (integrity === 'missing') {
        console.error('[EVIDENCE FILE MISSING]', req.params.id);
        return res.status(404).json({ error: 'The evidence file could not be found in storage.' });
      }
      if (integrity === 'changed') {
        console.error('[EVIDENCE INTEGRITY MISMATCH]', req.params.id);
        return res.status(409).json({
          error: 'This file no longer matches the fingerprint recorded when it was uploaded, so it is not shown. Ask for it to be uploaded again.',
          code: 'INTEGRITY_MISMATCH',
        });
      }

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName.replace(/["\\\r\n]/g, '_')}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Evidence-Integrity', 'verified');
      return fs.createReadStream(absolute).pipe(res);
    } catch (err: unknown) {
      console.error('[EVIDENCE FILE ERROR]', err);
      return res.status(500).json({ error: 'Failed to download the evidence file.' });
    }
  });

  return router;
}
