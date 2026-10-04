import crypto from 'crypto';
import {
  FleetAssetCategory,
  FleetFuelType,
  FleetOwnership,
  FleetReadingSource,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { parseCsv, CsvParseError } from '../../utils/csv';
import { FLEET_FUEL_UNIT, calculateKgCo2e, resolveEmissionFactor, EmissionFactorMissingError } from './emission-factor.service';

type Db = PrismaClient | Prisma.TransactionClient;

export const FLEET_IMPORT_MAX_ROWS = 20000;

export const ASSET_CSV_COLUMNS = [
  'asset_tag',
  'name',
  'category',
  'make',
  'model',
  'serial_number',
  'fuel_type',
  'ownership',
  'operational_control',
  'site_name',
] as const;

/** Period dates are inclusive calendar days (UTC). */
export const READING_CSV_COLUMNS = [
  'asset_tag',
  'period_start',
  'period_end',
  'fuel_litres',
  'engine_hours',
  'idle_hours',
  'distance_km',
] as const;

export const FUEL_CARD_CSV_COLUMNS = ['asset_tag', 'transaction_date', 'litres'] as const;

export interface RowRejection {
  line: number;
  reason: string;
}

export interface ImportActor {
  userId: string;
  licenseeId: string;
}

export interface ImportResult {
  batchId: string | null;
  rowsReceived: number;
  rowsAccepted: number;
  rowsRejected: number;
  rejections: RowRejection[];
  totalKgCo2e: string;
}

export class FleetImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FleetImportFileError';
  }
}

const DECIMAL_PATTERN = /^\d{1,11}(\.\d{1,3})?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function requireColumns(headers: string[], required: readonly string[]): void {
  const missing = required.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    throw new FleetImportFileError(`Missing required column(s): ${missing.join(', ')}.`);
  }
}

function parseDecimal(raw: string, field: string, required: boolean): Prisma.Decimal | null {
  if (raw === '') {
    if (required) throw new Error(`${field} is required.`);
    return null;
  }
  if (!DECIMAL_PATTERN.test(raw)) {
    throw new Error(`${field} must be a non-negative number with at most 3 decimal places, without thousands separators.`);
  }
  return new Prisma.Decimal(raw);
}

function parseDate(raw: string, field: string): Date {
  const m = DATE_PATTERN.exec(raw);
  if (!m) throw new Error(`${field} must be a date in YYYY-MM-DD format.`);
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (date.getUTCFullYear() !== Number(m[1]) || date.getUTCMonth() !== Number(m[2]) - 1 || date.getUTCDate() !== Number(m[3])) {
    throw new Error(`${field} is not a real calendar date.`);
  }
  return date;
}

function parseEnum<T extends string>(raw: string, field: string, allowed: Record<string, T>): T {
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const value = (Object.values(allowed) as string[]).find((v) => v === key);
  if (!value) {
    throw new Error(`${field} must be one of: ${Object.values(allowed).join(', ')}.`);
  }
  return value as T;
}

function parseYesNo(raw: string, field: string): boolean {
  const v = raw.trim().toLowerCase();
  if (['yes', 'true', 'y', '1'].includes(v)) return true;
  if (['no', 'false', 'n', '0'].includes(v)) return false;
  throw new Error(`${field} must be yes or no.`);
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function parseFile(text: string, required: readonly string[]) {
  try {
    const table = parseCsv(text, { maxRows: FLEET_IMPORT_MAX_ROWS });
    requireColumns(table.headers, required);
    return table;
  } catch (err) {
    if (err instanceof CsvParseError) throw new FleetImportFileError(err.message);
    throw err;
  }
}

const MAX_TEXT = 120;

function optionalText(raw: string | undefined, field: string): string | null {
  const v = (raw ?? '').trim();
  if (v.length > MAX_TEXT) throw new Error(`${field} must be ${MAX_TEXT} characters or fewer.`);
  return v || null;
}

/**
 * Validates one asset's fields, keyed by the CSV column names. Shared by CSV import and the
 * single-asset API so both apply the same boundary rules.
 */
export function parseAssetFields(values: Record<string, string | undefined>): Omit<Prisma.FleetAssetCreateManyInput, 'licenseeId'> {
  const assetTag = (values.asset_tag ?? '').trim();
  if (!assetTag) throw new Error('asset_tag is required.');
  if (assetTag.length > 64) throw new Error('asset_tag must be 64 characters or fewer.');
  const name = optionalText(values.name, 'name');
  if (!name) throw new Error('name is required.');

  const ownership = parseEnum(values.ownership ?? '', 'ownership', FleetOwnership);
  const operationalControl = parseYesNo(values.operational_control ?? '', 'operational_control');
  if (ownership === FleetOwnership.RENTED_OUT && operationalControl) {
    throw new Error('An asset rented out to another party cannot be under your operational control.');
  }

  return {
    assetTag,
    name,
    category: parseEnum(values.category ?? '', 'category', FleetAssetCategory),
    fuelType: parseEnum(values.fuel_type ?? '', 'fuel_type', FleetFuelType),
    ownership,
    operationalControl,
    make: optionalText(values.make, 'make'),
    model: optionalText(values.model, 'model'),
    serialNumber: optionalText(values.serial_number, 'serial_number'),
    siteName: optionalText(values.site_name, 'site_name'),
  };
}

/**
 * Registers fleet assets from CSV. Every asset declares its fuel type, ownership and operational
 * control so the Scope 1 boundary is explicit. All rows are validated before any is saved.
 */
export async function importFleetAssets(
  db: Db,
  actor: ImportActor,
  csvText: string
): Promise<{ rowsReceived: number; created: number; rejections: RowRejection[] }> {
  const table = parseFile(csvText, ['asset_tag', 'name', 'category', 'fuel_type', 'ownership', 'operational_control']);
  const rejections: RowRejection[] = [];
  const seen = new Set<string>();
  const data: Prisma.FleetAssetCreateManyInput[] = [];

  const existing = await db.fleetAsset.findMany({
    where: { licenseeId: actor.licenseeId, assetTag: { in: table.rows.map((r) => r.values.asset_tag) } },
    select: { assetTag: true },
  });
  const existingTags = new Set(existing.map((a) => a.assetTag));

  for (const { line, values } of table.rows) {
    try {
      const assetTag = values.asset_tag;
      if (seen.has(assetTag)) throw new Error(`asset_tag ${assetTag} appears more than once in this file.`);
      if (existingTags.has(assetTag)) throw new Error(`asset_tag ${assetTag} is already registered.`);
      seen.add(assetTag);

      data.push({ licenseeId: actor.licenseeId, ...parseAssetFields(values) });
    } catch (err) {
      rejections.push({ line, reason: (err as Error).message });
    }
  }

  if (rejections.length > 0) {
    return { rowsReceived: table.rows.length, created: 0, rejections };
  }

  const result = await db.fleetAsset.createMany({ data });
  return { rowsReceived: table.rows.length, created: result.count, rejections: [] };
}

interface PendingReading {
  line: number;
  assetId: string;
  fuelType: FleetFuelType;
  periodStart: Date;
  periodEnd: Date;
  fuelQuantity: Prisma.Decimal;
  engineHours: Prisma.Decimal | null;
  idleHours: Prisma.Decimal | null;
  distanceKm: Prisma.Decimal | null;
}

async function persistReadings(
  db: Db,
  actor: ImportActor,
  source: FleetReadingSource,
  fileName: string,
  csvText: string,
  rowsReceived: number,
  pending: PendingReading[],
  rejections: RowRejection[]
): Promise<ImportResult> {
  // Reject periods already imported for the same asset and source.
  if (rejections.length === 0 && pending.length > 0) {
    const existing = await db.fleetReading.findMany({
      where: {
        source,
        OR: pending.map((p) => ({ assetId: p.assetId, periodStart: p.periodStart, periodEnd: p.periodEnd })),
      },
      select: { assetId: true, periodStart: true, periodEnd: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.assetId}|${e.periodStart.getTime()}|${e.periodEnd.getTime()}`));
    for (const p of pending) {
      if (existingKeys.has(`${p.assetId}|${p.periodStart.getTime()}|${p.periodEnd.getTime()}`)) {
        rejections.push({ line: p.line, reason: 'This asset already has data imported for this period.' });
      }
    }
  }

  // Resolve one factor per fuel and year; a missing factor rejects the affected rows.
  const factorCache = new Map<string, Awaited<ReturnType<typeof resolveEmissionFactor>>>();
  const data: Prisma.FleetReadingCreateManyInput[] = [];
  let total = new Prisma.Decimal(0);

  if (rejections.length === 0) {
    for (const p of pending) {
      const year = p.periodStart.getUTCFullYear();
      const key = `${p.fuelType}|${year}`;
      try {
        let factor = factorCache.get(key);
        if (!factor) {
          factor = await resolveEmissionFactor(db, p.fuelType, year);
          factorCache.set(key, factor);
        }
        const kgCo2e = calculateKgCo2e(p.fuelQuantity, factor);
        total = total.add(kgCo2e);
        data.push({
          licenseeId: actor.licenseeId,
          assetId: p.assetId,
          source,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          fuelQuantity: p.fuelQuantity,
          fuelUnit: FLEET_FUEL_UNIT,
          engineHours: p.engineHours,
          idleHours: p.idleHours,
          distanceKm: p.distanceKm,
          emissionFactorId: factor.id,
          kgCo2e,
        });
      } catch (err) {
        if (err instanceof EmissionFactorMissingError) {
          rejections.push({ line: p.line, reason: err.message });
        } else {
          throw err;
        }
      }
    }
  }

  // A file is imported whole or not at all, so either every source row is accepted or none is.
  const accepted = rejections.length === 0 ? rowsReceived : 0;
  const batch = await db.fleetImportBatch.create({
    data: {
      licenseeId: actor.licenseeId,
      source,
      fileName: fileName.slice(0, 255),
      fileSha256: sha256(csvText),
      rowsReceived,
      rowsAccepted: accepted,
      rowsRejected: rowsReceived - accepted,
      rejections: rejections.sort((a, b) => a.line - b.line) as unknown as Prisma.InputJsonValue,
      uploadedById: actor.userId,
    },
  });

  if (accepted > 0 && data.length > 0) {
    await db.fleetReading.createMany({ data: data.map((d) => ({ ...d, importBatchId: batch.id })) });
  }

  return {
    batchId: batch.id,
    rowsReceived,
    rowsAccepted: accepted,
    rowsRejected: rowsReceived - accepted,
    rejections,
    totalKgCo2e: accepted > 0 ? total.toFixed(3) : '0.000',
  };
}

async function loadAssets(db: Db, licenseeId: string, tags: string[]) {
  const assets = await db.fleetAsset.findMany({
    where: { licenseeId, assetTag: { in: tags } },
    select: { id: true, assetTag: true, fuelType: true, active: true },
  });
  return new Map(assets.map((a) => [a.assetTag, a]));
}

/**
 * Imports periodic readings (fuel, hours, distance) per asset. The whole file is rejected if
 * any row is invalid; the attempt is still recorded with the reasons.
 */
export async function importFleetReadings(
  db: Db,
  actor: ImportActor,
  fileName: string,
  csvText: string
): Promise<ImportResult> {
  const table = parseFile(csvText, ['asset_tag', 'period_start', 'period_end', 'fuel_litres']);
  const assets = await loadAssets(db, actor.licenseeId, table.rows.map((r) => r.values.asset_tag));
  const now = Date.now();
  const rejections: RowRejection[] = [];
  const pending: PendingReading[] = [];
  const seen = new Set<string>();

  for (const { line, values } of table.rows) {
    try {
      const asset = assets.get(values.asset_tag);
      if (!asset) throw new Error(`asset_tag ${values.asset_tag || '(blank)'} is not registered.`);
      if (!asset.active) throw new Error(`asset_tag ${values.asset_tag} is deactivated.`);

      const periodStart = parseDate(values.period_start, 'period_start');
      const lastDay = parseDate(values.period_end, 'period_end');
      if (lastDay < periodStart) throw new Error('period_end must not be before period_start.');
      const periodEnd = new Date(lastDay.getTime() + DAY_MS);
      if (periodEnd.getTime() > now + DAY_MS) throw new Error('period_end must not be in the future.');

      const engineHours = parseDecimal(values.engine_hours ?? '', 'engine_hours', false);
      const idleHours = parseDecimal(values.idle_hours ?? '', 'idle_hours', false);
      if (engineHours && idleHours && idleHours.gt(engineHours)) {
        throw new Error('idle_hours cannot exceed engine_hours.');
      }

      const key = `${asset.id}|${periodStart.getTime()}|${periodEnd.getTime()}`;
      if (seen.has(key)) throw new Error('This asset and period appear more than once in this file.');
      seen.add(key);

      pending.push({
        line,
        assetId: asset.id,
        fuelType: asset.fuelType,
        periodStart,
        periodEnd,
        fuelQuantity: parseDecimal(values.fuel_litres, 'fuel_litres', true) as Prisma.Decimal,
        engineHours,
        idleHours,
        distanceKm: parseDecimal(values.distance_km ?? '', 'distance_km', false),
      });
    } catch (err) {
      rejections.push({ line, reason: (err as Error).message });
    }
  }

  return persistReadings(db, actor, FleetReadingSource.CSV_UPLOAD, fileName, csvText, table.rows.length, pending, rejections);
}

/**
 * Imports fuel card transactions. Fill-ups for the same asset on the same day are summed into
 * one daily reading. The asset tag is the identifier used on the fuel card, such as the registration.
 */
export async function importFuelCardTransactions(
  db: Db,
  actor: ImportActor,
  fileName: string,
  csvText: string
): Promise<ImportResult> {
  const table = parseFile(csvText, FUEL_CARD_CSV_COLUMNS);
  const assets = await loadAssets(db, actor.licenseeId, table.rows.map((r) => r.values.asset_tag));
  const now = Date.now();
  const rejections: RowRejection[] = [];
  const daily = new Map<string, PendingReading>();

  for (const { line, values } of table.rows) {
    try {
      const asset = assets.get(values.asset_tag);
      if (!asset) throw new Error(`asset_tag ${values.asset_tag || '(blank)'} is not registered.`);
      if (!asset.active) throw new Error(`asset_tag ${values.asset_tag} is deactivated.`);

      const day = parseDate(values.transaction_date, 'transaction_date');
      if (day.getTime() > now) throw new Error('transaction_date must not be in the future.');
      const litres = parseDecimal(values.litres, 'litres', true) as Prisma.Decimal;

      const key = `${asset.id}|${day.getTime()}`;
      const existing = daily.get(key);
      if (existing) {
        existing.fuelQuantity = existing.fuelQuantity.add(litres);
      } else {
        daily.set(key, {
          line,
          assetId: asset.id,
          fuelType: asset.fuelType,
          periodStart: day,
          periodEnd: new Date(day.getTime() + DAY_MS),
          fuelQuantity: litres,
          engineHours: null,
          idleHours: null,
          distanceKm: null,
        });
      }
    } catch (err) {
      rejections.push({ line, reason: (err as Error).message });
    }
  }

  return persistReadings(
    db,
    actor,
    FleetReadingSource.FUEL_CARD,
    fileName,
    csvText,
    table.rows.length,
    [...daily.values()],
    rejections
  );
}
