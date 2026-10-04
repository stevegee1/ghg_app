import { PrismaClient } from '@prisma/client';
import { runWithRls } from '../../db/rls';

/** Machine locations can be personal data. History is kept this long; the latest position per asset is kept. */
export const LOCATION_RETENTION_DAYS = 90;

/**
 * Clears latitude, longitude and altitude on snapshots older than the retention period, except
 * each asset's most recent located snapshot. Returns the number of snapshots cleared.
 */
export async function purgeExpiredLocations(prisma: PrismaClient, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - LOCATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  // Runs as the system across all licensees; tenant row-level security would otherwise hide the rows.
  return runWithRls(prisma, { role: 'ADMIN', licenseeId: null }, (tx) => tx.$executeRaw`
    UPDATE "FleetTelemetrySnapshot" s
    SET "latitude" = NULL, "longitude" = NULL, "altitudeM" = NULL
    WHERE s."observedAt" < ${cutoff}
      AND s."latitude" IS NOT NULL
      AND s."id" <> (
        SELECT l."id" FROM "FleetTelemetrySnapshot" l
        WHERE l."assetId" = s."assetId" AND l."latitude" IS NOT NULL
        ORDER BY l."observedAt" DESC
        LIMIT 1
      )`);
}
