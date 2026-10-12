import {
  FleetMaintenanceEventSource,
  FleetMaintenanceEventType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { FleetValidationError } from './fleet-asset.service';
import { FleetImportFileError, parseDate, parseDecimal, parseEnum, parseFile } from './fleet-import.service';

type Db = PrismaClient | Prisma.TransactionClient;

/** Shown beside the consent switch and stored with each grant. */
export const MODEL_TRAINING_CONSENT_TEXT =
  'We agree that NFTYLOGS may use our machine telemetry and maintenance records, with our company and machine identities removed, ' +
  'to train the shared predictive maintenance model. We can withdraw at any time; withdrawal excludes our data from later training runs.';

/** Breakdowns and unplanned repairs are the failures the model learns to anticipate. */
export const FAILURE_EVENT_TYPES: FleetMaintenanceEventType[] = [FleetMaintenanceEventType.BREAKDOWN, FleetMaintenanceEventType.UNPLANNED_REPAIR];
/** Services and inspections restart the service interval. */
export const SERVICE_EVENT_TYPES: FleetMaintenanceEventType[] = [FleetMaintenanceEventType.SCHEDULED_SERVICE, FleetMaintenanceEventType.INSPECTION];

export const MAINTENANCE_CSV_COLUMNS = ['asset_tag', 'date', 'type', 'operating_hours', 'downtime_hours', 'component', 'description'] as const;
const REQUIRED_CSV_COLUMNS = ['asset_tag', 'date', 'type'] as const;

const MAX_COMPONENT = 100;
const MAX_DESCRIPTION = 1000;
const MAX_SOURCE = 300;

function text(value: unknown, field: string, max: number, required = false): string | null {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    if (required) throw new FleetValidationError(`${field} is required.`);
    return null;
  }
  if (typeof value !== 'string') throw new FleetValidationError(`${field} must be text.`);
  const v = value.trim();
  if (v.length > max) throw new FleetValidationError(`${field} must be ${max} characters or fewer.`);
  return v;
}

function hours(value: unknown, field: string): Prisma.Decimal | null {
  if (value === undefined || value === null || value === '') return null;
  const raw = typeof value === 'number' ? String(value) : value;
  if (typeof raw !== 'string' || !/^\d{1,10}(\.\d{1,2})?$/.test(raw)) {
    throw new FleetValidationError(`${field} must be a non-negative number of hours with at most 2 decimal places.`);
  }
  return new Prisma.Decimal(raw);
}

async function requireAsset(db: Db, licenseeId: string, assetId: unknown) {
  if (typeof assetId !== 'string' || !assetId) throw new FleetValidationError('assetId is required.');
  const asset = await db.fleetAsset.findFirst({ where: { id: assetId, licenseeId }, select: { id: true } });
  if (!asset) throw new FleetValidationError('Machine not found.', 404);
  return asset;
}

/** Sets or replaces a machine's service interval. */
export async function setMaintenancePlan(db: Db, licenseeId: string, body: Record<string, unknown>, userId: string) {
  const asset = await requireAsset(db, licenseeId, body.assetId);
  const interval = hours(body.serviceIntervalHours, 'serviceIntervalHours');
  if (!interval || interval.lte(0)) throw new FleetValidationError('serviceIntervalHours must be more than zero.');
  const intervalSource = text(body.intervalSource, 'intervalSource', MAX_SOURCE, true) as string;
  return db.fleetMaintenancePlan.upsert({
    where: { assetId: asset.id },
    update: { serviceIntervalHours: interval, intervalSource, updatedByUserId: userId },
    create: { licenseeId, assetId: asset.id, serviceIntervalHours: interval, intervalSource, updatedByUserId: userId },
  });
}

/** Records one maintenance event logged in the portal. */
export async function recordMaintenanceEvent(db: Db, licenseeId: string, body: Record<string, unknown>, userId: string) {
  const asset = await requireAsset(db, licenseeId, body.assetId);
  const type = body.type;
  if (typeof type !== 'string' || !(Object.values(FleetMaintenanceEventType) as string[]).includes(type)) {
    throw new FleetValidationError(`type must be one of: ${Object.values(FleetMaintenanceEventType).join(', ')}.`);
  }
  if (typeof body.occurredAt !== 'string' || Number.isNaN(Date.parse(body.occurredAt))) {
    throw new FleetValidationError('occurredAt must be a date and time.');
  }
  const occurredAt = new Date(body.occurredAt);
  if (occurredAt.getTime() > Date.now()) throw new FleetValidationError('occurredAt cannot be in the future.');
  try {
    return await db.fleetMaintenanceEvent.create({
      data: {
        licenseeId,
        assetId: asset.id,
        type: type as FleetMaintenanceEventType,
        occurredAt,
        operatingHours: hours(body.operatingHours, 'operatingHours'),
        downtimeHours: hours(body.downtimeHours, 'downtimeHours'),
        component: text(body.component, 'component', MAX_COMPONENT),
        description: text(body.description, 'description', MAX_DESCRIPTION),
        source: FleetMaintenanceEventSource.PORTAL,
        createdByUserId: userId,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new FleetValidationError('This event is already recorded for that machine and time.', 409);
    }
    throw err;
  }
}

/** Plans for every machine and the most recent events, for the maintenance screen. */
export async function listMaintenance(db: Db, licenseeId: string) {
  const [plans, events] = await Promise.all([
    db.fleetMaintenancePlan.findMany({ where: { licenseeId } }),
    db.fleetMaintenanceEvent.findMany({
      where: { licenseeId },
      orderBy: { occurredAt: 'desc' },
      take: 200,
      include: { asset: { select: { assetTag: true, name: true } } },
    }),
  ]);
  return { plans, events };
}

export interface MaintenanceImportResult {
  rowsReceived: number;
  rowsAccepted: number;
  duplicates: number;
  rejections: { line: number; reason: string }[];
}

/**
 * Imports past maintenance history. The whole file is rejected when any row is invalid, so a
 * history is never half loaded; rows already recorded (same machine, type and date) are skipped.
 */
export async function importMaintenanceHistory(db: Db, licenseeId: string, csvText: string, userId: string): Promise<MaintenanceImportResult> {
  const table = parseFile(csvText, REQUIRED_CSV_COLUMNS);
  const assets = await db.fleetAsset.findMany({ where: { licenseeId }, select: { id: true, assetTag: true } });
  const byTag = new Map(assets.map((a) => [a.assetTag.toLowerCase(), a.id]));
  const rejections: MaintenanceImportResult['rejections'] = [];
  const rows: Prisma.FleetMaintenanceEventCreateManyInput[] = [];
  const today = Date.now();

  for (const { line, values } of table.rows) {
    try {
      const assetId = byTag.get((values.asset_tag ?? '').trim().toLowerCase());
      if (!assetId) throw new Error(`asset_tag "${values.asset_tag ?? ''}" is not one of your registered machines.`);
      const occurredAt = parseDate((values.date ?? '').trim(), 'date');
      if (occurredAt.getTime() > today) throw new Error('date cannot be in the future.');
      const type = parseEnum((values.type ?? '').trim(), 'type', FleetMaintenanceEventType);
      const component = (values.component ?? '').trim();
      const description = (values.description ?? '').trim();
      if (component.length > MAX_COMPONENT) throw new Error(`component must be ${MAX_COMPONENT} characters or fewer.`);
      if (description.length > MAX_DESCRIPTION) throw new Error(`description must be ${MAX_DESCRIPTION} characters or fewer.`);
      rows.push({
        licenseeId,
        assetId,
        type,
        occurredAt,
        operatingHours: parseDecimal((values.operating_hours ?? '').trim(), 'operating_hours', false),
        downtimeHours: parseDecimal((values.downtime_hours ?? '').trim(), 'downtime_hours', false),
        component: component || null,
        description: description || null,
        source: FleetMaintenanceEventSource.CSV_IMPORT,
        createdByUserId: userId,
      });
    } catch (err) {
      rejections.push({ line, reason: (err as Error).message });
    }
  }

  if (table.rows.length === 0) throw new FleetImportFileError('The file has no rows.');
  if (rejections.length > 0) {
    return { rowsReceived: table.rows.length, rowsAccepted: 0, duplicates: 0, rejections };
  }
  const created = await db.fleetMaintenanceEvent.createMany({ data: rows, skipDuplicates: true });
  return { rowsReceived: table.rows.length, rowsAccepted: created.count, duplicates: rows.length - created.count, rejections: [] };
}

/** The client's current consent, or null if never given. */
export async function getTrainingConsent(db: Db, licenseeId: string) {
  return db.modelTrainingConsent.findUnique({ where: { licenseeId } });
}

/** Grants or withdraws consent. Granting again after withdrawal records the new grant. */
export async function setTrainingConsent(db: Db, licenseeId: string, granted: unknown, userId: string) {
  if (typeof granted !== 'boolean') throw new FleetValidationError('granted must be true or false.');
  const now = new Date();
  if (granted) {
    return db.modelTrainingConsent.upsert({
      where: { licenseeId },
      update: { consentText: MODEL_TRAINING_CONSENT_TEXT, grantedAt: now, grantedByUserId: userId, withdrawnAt: null, withdrawnByUserId: null },
      create: { licenseeId, consentText: MODEL_TRAINING_CONSENT_TEXT, grantedAt: now, grantedByUserId: userId },
    });
  }
  const existing = await db.modelTrainingConsent.findUnique({ where: { licenseeId } });
  if (!existing || existing.withdrawnAt) return existing;
  return db.modelTrainingConsent.update({ where: { licenseeId }, data: { withdrawnAt: now, withdrawnByUserId: userId } });
}
