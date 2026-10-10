import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { collectFingerprints, createBatch } from '../services/anchor/anchor-batch.service';

/** Daily at 02:30: fingerprints new records and puts them into a batch. */
export function scheduleAnchorJob(prisma: PrismaClient) {
  return cron.schedule('30 2 * * *', async () => {
    try {
      const added = await collectFingerprints(prisma);
      const batch = await createBatch(prisma);
      const total = Object.values(added).reduce((a, b) => a + b, 0);
      console.log(`[CRON] Anchoring: ${total} new fingerprint(s), batch ${batch ? `${batch.id} root ${batch.merkleRoot}` : 'none'}.`);
    } catch (err) {
      console.error('[CRON ERROR] Anchoring run failed:', err);
    }
  });
}
