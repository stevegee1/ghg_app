import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { purgeExpiredLocations } from '../services/fleet/fleet-retention.service';

/** Daily at 03:15: clears machine location history older than the retention period. */
export function scheduleFleetRetentionJob(prisma: PrismaClient) {
  return cron.schedule('15 3 * * *', async () => {
    try {
      const cleared = await purgeExpiredLocations(prisma);
      console.log(`[CRON] Fleet location retention: cleared ${cleared} snapshot location(s).`);
    } catch (err) {
      console.error('[CRON ERROR] Fleet location retention failed:', err);
    }
  });
}
