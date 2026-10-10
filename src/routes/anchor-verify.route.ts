import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyHash } from '../services/anchor/anchor-verify.service';
import { getAnchorPublisher } from '../services/anchor/anchor-runtime';

/** Public: check a record's fingerprint against its batch root and the on-chain transaction. */
export function createAnchorVerifyRouter(prisma: PrismaClient): Router {
  const router = Router();
  router.get('/api/public/verify/:hash', async (req: Request, res: Response) => {
    const hash = req.params.hash.toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return res.status(400).json({ error: 'Enter a SHA-256 hash: 64 hexadecimal characters.' });
    try {
      return res.status(200).json(await verifyHash(prisma, hash, getAnchorPublisher()));
    } catch (err) {
      console.error('[PUBLIC VERIFY ERROR]', err);
      return res.status(500).json({ error: 'Verification is unavailable right now.' });
    }
  });
  return router;
}
