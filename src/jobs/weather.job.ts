import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { runWithRls } from '../db/rls';
import { computeExposureForDate, readWeatherConfig } from '../services/fleet/weather-exposure.service';

/** Daily at 04:00 UTC: weather exposure for the previous day, when weather is configured. */
export function scheduleWeatherJob(prisma: PrismaClient) {
  return cron.schedule(
    '0 4 * * *',
    async () => {
      const config = readWeatherConfig();
      if (!config) return;
      try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const r = await runWithRls(prisma, { role: 'ADMIN', licenseeId: null }, (tx) => computeExposureForDate(tx, yesterday, config));
        console.log(`[CRON] Weather exposure: ${r.assets} machine(s)${r.skipped ? `, skipped: ${r.skipped}` : ''}.`);
      } catch (err) {
        console.error('[CRON ERROR] Weather exposure failed:', err);
      }
    },
    { timezone: 'UTC' }
  );
}
