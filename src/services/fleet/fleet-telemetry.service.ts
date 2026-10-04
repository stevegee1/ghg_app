import crypto from 'crypto';
import { EmissionFactor, FleetReadingSource, Prisma, PrismaClient } from '@prisma/client';
import { FLEET_FUEL_UNIT, EmissionFactorMissingError, calculateKgCo2e, resolveEmissionFactor } from './emission-factor.service';
import { FLEET_SCHEMA_VERSION_ID } from './fleet-schema';

type Db = PrismaClient | Prisma.TransactionClient;

export const TELEMETRY_MAX_SNAPSHOTS = 500;
/** Clock skew tolerated on observedAt before a snapshot counts as "in the future". */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/** A snapshot normalised to the standard schema (see fleet-schema.ts). */
export interface NormalisedSnapshot {
  assetTag: string;
  observedAt: Date;
  cumulativeOperatingHours: Prisma.Decimal | null;
  cumulativeIdleHours: Prisma.Decimal | null;
  cumulativeFuelUsedLitres: Prisma.Decimal | null;
  fuelRemainingPercent: Prisma.Decimal | null;
  odometerKm: Prisma.Decimal | null;
  engineRunning: boolean | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  altitudeM: Prisma.Decimal | null;
  faultCodes: { code: string; severity: string | null; description: string | null }[];
  payloadSha256: string;
}

export interface TelemetryIngestResult {
  received: number;
  accepted: number;
  duplicates: number;
  rejected: { index: number; reason: string }[];
  /** Snapshots stored without a calculated period, with the reason */
  notCalculated: { index: number; reason: string }[];
  readingsCreated: number;
  totalKgCo2e: string;
  schemaVersion: string;
}

export class TelemetryRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelemetryRequestError';
  }
}

function decimal(value: unknown, field: string, places: number, min: number, max: number): Prisma.Decimal | null {
  if (value === undefined || value === null || value === '') return null;
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : null;
  if (text === null || !/^-?\d+(\.\d+)?$/.test(text)) throw new Error(`${field} must be a number.`);
  const d = new Prisma.Decimal(text);
  if (d.decimalPlaces() > places) throw new Error(`${field} allows at most ${places} decimal places.`);
  if (d.lt(min) || d.gt(max)) throw new Error(`${field} must be between ${min} and ${max}.`);
  return d;
}

function text(value: unknown, field: string, max: number, required: boolean): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${field} is required.`);
    return null;
  }
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  const t = value.trim();
  if (required && !t) throw new Error(`${field} is required.`);
  if (t.length > max) throw new Error(`${field} must be at most ${max} characters.`);
  return t || null;
}

/** Validates one snapshot against the standard schema. Throws with a reason the sender can act on. */
export function normaliseSnapshot(raw: unknown, now: Date = new Date()): NormalisedSnapshot {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Each snapshot must be an object.');
  const r = raw as Record<string, unknown>;

  const assetTag = text(r.assetTag, 'assetTag', 64, true)!;
  const observedRaw = text(r.observedAt, 'observedAt', 40, true)!;
  const observedAt = new Date(observedRaw);
  if (Number.isNaN(observedAt.getTime()) || !/[zZ]|[+-]\d{2}:?\d{2}$/.test(observedRaw)) {
    throw new Error('observedAt must be an ISO 8601 date-time with a time zone, e.g. 2026-10-01T08:00:00Z.');
  }
  if (observedAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) throw new Error('observedAt must not be in the future.');

  const location = r.location === undefined || r.location === null ? null : r.location;
  if (location !== null && (typeof location !== 'object' || Array.isArray(location))) throw new Error('location must be an object.');
  const loc = (location ?? {}) as Record<string, unknown>;
  const latitude = decimal(loc.latitude, 'location.latitude', 6, -90, 90);
  const longitude = decimal(loc.longitude, 'location.longitude', 6, -180, 180);
  if ((latitude === null) !== (longitude === null)) throw new Error('location needs both latitude and longitude.');

  if (r.engineRunning !== undefined && r.engineRunning !== null && typeof r.engineRunning !== 'boolean') {
    throw new Error('engineRunning must be true or false.');
  }

  const faultsRaw = r.faultCodes ?? [];
  if (!Array.isArray(faultsRaw) || faultsRaw.length > 50) throw new Error('faultCodes must be a list of at most 50 codes.');
  const faultCodes = faultsRaw.map((f, i) => {
    if (typeof f !== 'object' || f === null) throw new Error(`faultCodes[${i}] must be an object.`);
    const fc = f as Record<string, unknown>;
    return {
      code: text(fc.code, `faultCodes[${i}].code`, 64, true)!,
      severity: text(fc.severity, `faultCodes[${i}].severity`, 32, false),
      description: text(fc.description, `faultCodes[${i}].description`, 500, false),
    };
  });

  const snapshot: NormalisedSnapshot = {
    assetTag,
    observedAt,
    cumulativeOperatingHours: decimal(r.cumulativeOperatingHours, 'cumulativeOperatingHours', 2, 0, 9_999_999_999),
    cumulativeIdleHours: decimal(r.cumulativeIdleHours, 'cumulativeIdleHours', 2, 0, 9_999_999_999),
    cumulativeFuelUsedLitres: decimal(r.cumulativeFuelUsedLitres, 'cumulativeFuelUsedLitres', 3, 0, 99_999_999_999),
    fuelRemainingPercent: decimal(r.fuelRemainingPercent, 'fuelRemainingPercent', 2, 0, 100),
    odometerKm: decimal(r.odometerKm, 'odometerKm', 2, 0, 999_999_999_999),
    engineRunning: typeof r.engineRunning === 'boolean' ? r.engineRunning : null,
    latitude,
    longitude,
    altitudeM: decimal(loc.altitudeM, 'location.altitudeM', 2, -1000, 10000),
    faultCodes,
    payloadSha256: crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex'),
  };
  if (snapshot.cumulativeIdleHours && snapshot.cumulativeOperatingHours && snapshot.cumulativeIdleHours.gt(snapshot.cumulativeOperatingHours)) {
    throw new Error('cumulativeIdleHours cannot exceed cumulativeOperatingHours.');
  }
  return snapshot;
}

type Meters = Pick<NormalisedSnapshot, 'cumulativeOperatingHours' | 'cumulativeIdleHours' | 'cumulativeFuelUsedLitres' | 'odometerKm'>;

/** True when any meter reported by both snapshots went backwards, e.g. after a device was replaced. */
function meterWentBackwards(previous: Meters, next: Meters): boolean {
  const keys: (keyof Meters)[] = ['cumulativeOperatingHours', 'cumulativeIdleHours', 'cumulativeFuelUsedLitres', 'odometerKm'];
  return keys.some((k) => previous[k] !== null && next[k] !== null && next[k]!.lt(previous[k]!));
}

function delta(previous: Prisma.Decimal | null, next: Prisma.Decimal | null): Prisma.Decimal | null {
  return previous !== null && next !== null ? next.sub(previous) : null;
}

/**
 * Stores telemetry snapshots and calculates fuel and CO2e for the period since the previous
 * snapshot from the same source. Each snapshot is accepted or rejected on its own; resending one
 * already stored is reported as a duplicate. A period is never calculated across a meter that
 * went backwards, or over fuel already recorded for that asset from another source.
 */
export async function ingestTelemetry(
  db: Db,
  licenseeId: string,
  source: FleetReadingSource,
  payload: unknown[],
  now: Date = new Date()
): Promise<TelemetryIngestResult> {
  if (payload.length === 0) throw new TelemetryRequestError('Send at least one snapshot.');
  if (payload.length > TELEMETRY_MAX_SNAPSHOTS) throw new TelemetryRequestError(`Send at most ${TELEMETRY_MAX_SNAPSHOTS} snapshots per request.`);

  const result: TelemetryIngestResult = {
    received: payload.length,
    accepted: 0,
    duplicates: 0,
    rejected: [],
    notCalculated: [],
    readingsCreated: 0,
    totalKgCo2e: '0.000',
    schemaVersion: FLEET_SCHEMA_VERSION_ID,
  };

  const parsed: { index: number; snapshot: NormalisedSnapshot }[] = [];
  payload.forEach((raw, index) => {
    try {
      parsed.push({ index, snapshot: normaliseSnapshot(raw, now) });
    } catch (err) {
      result.rejected.push({ index, reason: (err as Error).message });
    }
  });

  const tags = [...new Set(parsed.map((p) => p.snapshot.assetTag))];
  const assets = new Map(
    (
      await db.fleetAsset.findMany({
        where: { licenseeId, assetTag: { in: tags } },
        select: { id: true, assetTag: true, fuelType: true, active: true },
      })
    ).map((a) => [a.assetTag, a])
  );

  // Oldest first, so each snapshot is compared with the one before it.
  parsed.sort((a, b) => a.snapshot.observedAt.getTime() - b.snapshot.observedAt.getTime() || a.index - b.index);

  const factorCache = new Map<string, EmissionFactor>();
  let total = new Prisma.Decimal(0);

  for (const { index, snapshot } of parsed) {
    const asset = assets.get(snapshot.assetTag);
    if (!asset) {
      result.rejected.push({ index, reason: `assetTag ${snapshot.assetTag} is not registered.` });
      continue;
    }
    if (!asset.active) {
      result.rejected.push({ index, reason: `assetTag ${snapshot.assetTag} is deactivated.` });
      continue;
    }

    const existing = await db.fleetTelemetrySnapshot.findUnique({
      where: { assetId_source_observedAt: { assetId: asset.id, source, observedAt: snapshot.observedAt } },
      select: { id: true },
    });
    if (existing) {
      result.duplicates += 1;
      continue;
    }

    const latest = await db.fleetTelemetrySnapshot.findFirst({
      where: { assetId: asset.id, source },
      orderBy: { observedAt: 'desc' },
    });
    if (latest && latest.observedAt > snapshot.observedAt) {
      result.rejected.push({ index, reason: 'This snapshot is older than one already received for the asset; send snapshots in time order.' });
      continue;
    }

    const counterReset = latest ? meterWentBackwards(latest, snapshot) : false;

    // Work out the period since the previous snapshot before storing anything, so a snapshot whose
    // period cannot be priced (no emission factor yet) is rejected and the next one covers the gap.
    let period: { fuel: Prisma.Decimal; engineHours: Prisma.Decimal | null; factor: EmissionFactor } | null = null;
    let notCalculated: string | null = null;
    if (latest && counterReset) {
      notCalculated = 'A meter went backwards since the previous snapshot (for example a replaced device); no period was calculated across it.';
    } else if (latest) {
      const fuel = delta(latest.cumulativeFuelUsedLitres, snapshot.cumulativeFuelUsedLitres);
      const engineHours = delta(latest.cumulativeOperatingHours, snapshot.cumulativeOperatingHours);
      if (fuel === null) {
        notCalculated = 'cumulativeFuelUsedLitres is missing on this or the previous snapshot.';
      } else if (!fuel.isZero() || (engineHours !== null && !engineHours.isZero())) {
        const overlapping = await db.fleetReading.findFirst({
          where: { assetId: asset.id, source: { not: source }, periodStart: { lt: snapshot.observedAt }, periodEnd: { gt: latest.observedAt } },
          select: { source: true },
        });
        if (overlapping) {
          notCalculated = `Fuel for this asset and period is already recorded from ${overlapping.source}; it was not counted twice.`;
        } else {
          const year = latest.observedAt.getUTCFullYear();
          const key = `${asset.fuelType}|${year}`;
          let factor = factorCache.get(key);
          if (!factor) {
            try {
              factor = await resolveEmissionFactor(db, asset.fuelType, year);
              factorCache.set(key, factor);
            } catch (err) {
              if (!(err instanceof EmissionFactorMissingError)) throw err;
              result.rejected.push({ index, reason: `${err.message} The snapshot was not stored; resend it once the factor exists.` });
              continue;
            }
          }
          period = { fuel, engineHours, factor };
        }
      }
    }

    const { faultCodes, assetTag: _tag, ...fields } = snapshot;
    const stored = await db.fleetTelemetrySnapshot.create({
      data: { ...fields, licenseeId, assetId: asset.id, source, schemaVersionId: FLEET_SCHEMA_VERSION_ID, counterReset },
    });
    if (faultCodes.length > 0) {
      await db.fleetFaultCode.createMany({
        data: faultCodes.map((f) => ({ ...f, licenseeId, assetId: asset.id, snapshotId: stored.id, source, observedAt: snapshot.observedAt })),
        skipDuplicates: true,
      });
    }
    result.accepted += 1;
    if (notCalculated) result.notCalculated.push({ index, reason: notCalculated });
    if (!latest || !period) continue;

    const kgCo2e = calculateKgCo2e(period.fuel, period.factor);
    await db.fleetReading.create({
      data: {
        licenseeId,
        assetId: asset.id,
        source,
        periodStart: latest.observedAt,
        periodEnd: snapshot.observedAt,
        fuelQuantity: period.fuel,
        fuelUnit: FLEET_FUEL_UNIT,
        engineHours: period.engineHours,
        idleHours: delta(latest.cumulativeIdleHours, snapshot.cumulativeIdleHours),
        distanceKm: delta(latest.odometerKm, snapshot.odometerKm),
        emissionFactorId: period.factor.id,
        kgCo2e,
        schemaVersionId: FLEET_SCHEMA_VERSION_ID,
        startSnapshotId: latest.id,
        endSnapshotId: stored.id,
      },
    });
    total = total.add(kgCo2e);
    result.readingsCreated += 1;
  }

  result.rejected.sort((a, b) => a.index - b.index);
  result.notCalculated.sort((a, b) => a.index - b.index);
  result.totalKgCo2e = total.toFixed(3);
  return result;
}

/** The latest snapshot and open fault codes for each of a licensee's assets. */
export async function latestTelemetryByAsset(db: Db, licenseeId: string) {
  const snapshots = await db.fleetTelemetrySnapshot.findMany({
    where: { licenseeId },
    orderBy: { observedAt: 'desc' },
    distinct: ['assetId'],
    select: {
      assetId: true,
      source: true,
      observedAt: true,
      cumulativeOperatingHours: true,
      cumulativeIdleHours: true,
      cumulativeFuelUsedLitres: true,
      fuelRemainingPercent: true,
      odometerKm: true,
      engineRunning: true,
      latitude: true,
      longitude: true,
      faults: { select: { code: true, severity: true, description: true } },
    },
  });
  return new Map(snapshots.map((s) => [s.assetId, s]));
}
