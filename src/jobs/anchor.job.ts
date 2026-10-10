import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { collectFingerprints, createBatch } from '../services/anchor/anchor-batch.service';
import { publishAndConfirm } from '../services/anchor/anchor-publish.service';
import { getAnchorPublisher } from '../services/anchor/anchor-runtime';

/** Every 10 minutes: publishes waiting batch roots and confirms submitted ones, when anchoring is configured. */
export function scheduleAnchorPublishJob(prisma: PrismaClient) {
  return cron.schedule('*/10 * * * *', async () => {
    const publisher = getAnchorPublisher();
    if (!publisher) return;
    try {
      const r = await publishAndConfirm(prisma, publisher);
      if (r.published || r.confirmed || r.failed) {
        console.log(`[CRON] Anchoring on ${publisher.network}: ${r.published} published, ${r.confirmed} confirmed, ${r.failed} failed.`);
      }
    } catch (err) {
      console.error('[CRON ERROR] Anchor publishing failed:', err);
    }
  });
}

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
