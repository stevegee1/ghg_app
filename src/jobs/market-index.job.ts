import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { fuelFeedUrl, importWeeklyFuelPrices } from '../services/market-index.service';

/** Daily at 06:30: imports new UK weekly road fuel prices when the feed is configured. */
export function scheduleMarketIndexJob(prisma: PrismaClient) {
  return cron.schedule('30 6 * * *', async () => {
    if (!fuelFeedUrl()) return;
    try {
      const result = await importWeeklyFuelPrices(prisma);
      console.log(`[CRON] Fuel prices: ${result.inserted} new value(s), latest ${result.latestDate ?? 'none'}.`);
    } catch (err) {
      console.error('[CRON ERROR] Fuel price import failed:', err);
    }
  });
}
