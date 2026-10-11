import { Prisma, PrismaClient } from '@prisma/client';
import { FleetValidationError } from './fleet-asset.service';

type Db = PrismaClient | Prisma.TransactionClient;
const D = Prisma.Decimal;

export function serializeFinance(f: Prisma.FleetAssetFinanceGetPayload<object>) {
  return {
    assetId: f.assetId,
    currency: f.currency,
    acquisitionCostPence: Number(f.acquisitionCostPence),
    acquisitionDate: f.acquisitionDate.toISOString().slice(0, 10),
    expectedLifeYears: f.expectedLifeYears.toString(),
    expectedLifeHours: f.expectedLifeHours ? f.expectedLifeHours.toString() : null,
    residualValuePence: Number(f.residualValuePence),
    updatedAt: f.updatedAt,
  };
}

/** Machines with their finance details (null where none are recorded). */
export async function listAssetFinance(db: Db, licenseeId: string) {
  const assets = await db.fleetAsset.findMany({
    where: { licenseeId },
    orderBy: { assetTag: 'asc' },
    select: { id: true, assetTag: true, name: true, category: true, active: true, finance: true },
  });
  return assets.map((a) => ({ assetId: a.id, assetTag: a.assetTag, name: a.name, category: a.category, active: a.active, finance: a.finance ? serializeFinance(a.finance) : null }));
}

/** Records or replaces a machine's purchase cost, date, expected life and residual value. */
export async function setAssetFinance(db: Db, licenseeId: string, assetId: string, body: Record<string, unknown>) {
  const asset = await db.fleetAsset.findFirst({ where: { id: assetId, licenseeId } });
  if (!asset) throw new FleetValidationError('Machine not found.', 404);

  const pence = (v: unknown, field: string, allowZero: boolean) => {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0 || (!allowZero && v === 0)) {
      throw new FleetValidationError(`${field} must be a ${allowZero ? 'non-negative' : 'positive'} whole number of pence.`);
    }
    return BigInt(v);
  };
  const cost = pence(body.acquisitionCostPence, 'acquisitionCostPence', false);
  const residual = pence(body.residualValuePence, 'residualValuePence', true);
  if (residual >= cost) throw new FleetValidationError('The residual value must be less than the purchase cost.');
  if (typeof body.currency !== 'string' || !/^[A-Z]{3}$/.test(body.currency)) throw new FleetValidationError('currency must be a 3-letter ISO code.');
  if (typeof body.acquisitionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.acquisitionDate)) {
    throw new FleetValidationError('acquisitionDate must be a date in the form YYYY-MM-DD.');
  }
  const acquisitionDate = new Date(`${body.acquisitionDate}T00:00:00Z`);
  if (Number.isNaN(acquisitionDate.getTime()) || acquisitionDate.getTime() > Date.now()) throw new FleetValidationError('acquisitionDate must be a real date, not in the future.');
  const years = typeof body.expectedLifeYears === 'string' && /^\d{1,3}(\.\d{1,2})?$/.test(body.expectedLifeYears) ? new D(body.expectedLifeYears) : null;
  if (!years || years.lte(0)) throw new FleetValidationError('expectedLifeYears must be a positive number, sent as text.');
  let hours: Prisma.Decimal | null = null;
  if (body.expectedLifeHours !== undefined && body.expectedLifeHours !== null && body.expectedLifeHours !== '') {
    hours = typeof body.expectedLifeHours === 'string' && /^\d{1,9}(\.\d)?$/.test(body.expectedLifeHours) ? new D(body.expectedLifeHours) : null;
    if (!hours || hours.lte(0)) throw new FleetValidationError('expectedLifeHours must be a positive number, sent as text, or left empty.');
  }

  const data = { currency: body.currency, acquisitionCostPence: cost, acquisitionDate, expectedLifeYears: years, expectedLifeHours: hours, residualValuePence: residual };
  const saved = await db.fleetAssetFinance.upsert({
    where: { assetId },
    create: { licenseeId, assetId, ...data },
    update: data,
  });
  return serializeFinance(saved);
}
