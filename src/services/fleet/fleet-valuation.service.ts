import { MarketIndexCategory, Prisma, PrismaClient } from '@prisma/client';
import { FleetValidationError } from './fleet-asset.service';
import { valueOn } from '../market-index.service';
import { recordHash } from '../canonical-hash.service';

type Db = PrismaClient | Prisma.TransactionClient;
const D = Prisma.Decimal;
type Dec = Prisma.Decimal;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * VALUE_TCO_2026.1 (an estimate, not an appraisal)
 * - Depreciable value = purchase cost - residual value.
 * - Base wear share = operating hours / expected life hours when a life in hours is set and hours are
 *   reported, otherwise age in years / expected life in years.
 * - Weather wear share = sum of hours worked in each harsh condition x that condition's coefficient
 *   (percent of depreciable value per hour) for the machine's equipment type, from the active set.
 * - Estimated value = purchase cost - depreciable value x min(1, base + weather share); never below residual.
 * - Total cost of ownership to date = value lost + fuel and carbon priced from dated market values.
 *   Maintenance, insurance and finance costs are not included.
 */
export const VALUE_TCO_METHOD = 'VALUE_TCO_2026.1';

const toPence = (pounds: Dec) => pounds.mul(100).toDecimalPlaces(0).toNumber();

export async function calculateValuation(db: Db, licenseeId: string, assetId: string, body: Record<string, unknown>, userId: string) {
  const asset = await db.fleetAsset.findFirst({ where: { id: assetId, licenseeId }, include: { finance: true } });
  if (!asset) throw new FleetValidationError('Machine not found.', 404);
  const f = asset.finance;
  if (!f) throw new FleetValidationError('Record the purchase cost, life and residual value first.', 409);

  const todayMs = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  let asOfMs = todayMs;
  if (body.asOf !== undefined) {
    if (typeof body.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.asOf)) throw new FleetValidationError('asOf must be a date in the form YYYY-MM-DD.');
    asOfMs = Date.parse(`${body.asOf}T00:00:00Z`);
    if (Number.isNaN(asOfMs) || asOfMs > todayMs) throw new FleetValidationError('asOf must be a real date, not in the future.');
  }
  if (asOfMs < f.acquisitionDate.getTime()) throw new FleetValidationError('asOf cannot be before the purchase date.');
  const asOf = new Date(asOfMs);
  const endExclusive = new Date(asOfMs + DAY_MS);
  const warnings = new Set<string>();

  const cost = new D(f.acquisitionCostPence.toString()).div(100);
  const residual = new D(f.residualValuePence.toString()).div(100);
  const depreciable = cost.sub(residual);

  // Use since purchase.
  const readings = await db.fleetReading.findMany({
    where: { licenseeId, assetId, periodStart: { gte: f.acquisitionDate, lt: endExclusive } },
    orderBy: { periodStart: 'asc' },
  });
  const operatingHours = readings.reduce((s, r) => s.add(r.engineHours ?? 0), new D(0));
  const ageYears = new D(asOfMs - f.acquisitionDate.getTime()).div(DAY_MS).div('365.25');
  const usesHours = Boolean(f.expectedLifeHours) && operatingHours.gt(0);
  const baseShare = usesHours ? operatingHours.div(f.expectedLifeHours!) : ageYears.div(f.expectedLifeYears);
  if (f.expectedLifeHours && !operatingHours.gt(0)) warnings.add('No operating hours are reported, so base wear follows age.');

  // Weather wear.
  const exposures = await db.fleetWeatherExposure.findMany({
    where: { licenseeId, assetId, date: { gte: f.acquisitionDate, lt: endExclusive } },
    include: { thresholdSet: { select: { version: true } } },
  });
  const set = await db.wearCoefficientSet.findFirst({ where: { active: true }, include: { coefficients: { where: { category: asset.category } } } });
  const coefficient = set?.coefficients[0] ?? null;
  const harsh = exposures.reduce(
    (t, e) => ({ heat: t.heat.add(e.heatHours), frost: t.frost.add(e.frostHours), rain: t.rain.add(e.heavyRainHours), wind: t.wind.add(e.highWindHours) }),
    { heat: new D(0), frost: new D(0), rain: new D(0), wind: new D(0) }
  );
  let weatherShare = new D(0);
  if (!set) warnings.add('No wear coefficients are published, so weather wear is not included.');
  else if (!coefficient) warnings.add(`The active wear coefficients have no row for ${asset.category}, so weather wear is not included.`);
  else {
    weatherShare = harsh.heat
      .mul(coefficient.heatPctPerHour)
      .add(harsh.frost.mul(coefficient.frostPctPerHour))
      .add(harsh.rain.mul(coefficient.rainPctPerHour))
      .add(harsh.wind.mul(coefficient.windPctPerHour))
      .div(100);
  }
  if (exposures.length === 0) warnings.add('No weather exposure is recorded for this machine.');

  const totalShare = D.min(1, baseShare.add(weatherShare));
  const baseApplied = D.min(1, baseShare);
  const weatherApplied = totalShare.sub(baseApplied);
  const valueLost = depreciable.mul(totalShare);
  const estimatedValue = cost.sub(valueLost);

  // Fuel and carbon at their dated market values.
  const fuelIndex = await db.marketIndex.findFirst({ where: { category: MarketIndexCategory.FUEL, active: true, fuelTypes: { has: asset.fuelType } } });
  const carbonIndices = await db.marketIndex.findMany({ where: { category: MarketIndexCategory.CARBON, active: true } });
  if (carbonIndices.length > 1) throw new FleetValidationError('More than one carbon price is active. An administrator must keep only one active.', 409);
  const carbonIndex = carbonIndices[0] ?? null;
  const used = new Map<string, { id: string; indexCode: string; effectiveDate: string; value: string }>();
  const priceOn = async (index: { id: string; code: string; currency: string } | null, date: Date) => {
    if (!index) return null;
    if (index.currency !== f.currency) {
      warnings.add(`${index.code} is in ${index.currency}, not ${f.currency}; it is not used.`);
      return null;
    }
    const v = await valueOn(db, index.id, date);
    if (!v) {
      warnings.add(`${index.code} has no value on or before ${date.toISOString().slice(0, 10)}.`);
      return null;
    }
    used.set(v.id, { id: v.id, indexCode: index.code, effectiveDate: v.effectiveDate.toISOString().slice(0, 10), value: v.value.toString() });
    return v.value;
  };
  if (!fuelIndex) warnings.add(`No active fuel price covers ${asset.fuelType}.`);
  if (!carbonIndex) warnings.add('No carbon price is active.');

  let fuelCost = new D(0);
  let carbonCost = new D(0);
  let unpricedLitres = new D(0);
  let litres = new D(0);
  let kg = new D(0);
  for (const r of readings) {
    const mid = new Date(Math.floor((r.periodStart.getTime() + (r.periodEnd.getTime() - r.periodStart.getTime()) / 2) / DAY_MS) * DAY_MS);
    litres = litres.add(r.fuelQuantity);
    kg = kg.add(r.kgCo2e);
    const fp = await priceOn(fuelIndex, mid);
    if (fp) fuelCost = fuelCost.add(r.fuelQuantity.mul(fp));
    else unpricedLitres = unpricedLitres.add(r.fuelQuantity);
    const cp = await priceOn(carbonIndex, mid);
    if (cp) carbonCost = carbonCost.add(r.kgCo2e.div(1000).mul(cp));
  }

  const tco = valueLost.add(fuelCost).add(carbonCost);
  const results = {
    currency: f.currency,
    estimatedValuePence: toPence(estimatedValue),
    valueLostPence: toPence(valueLost),
    baseWearPence: toPence(depreciable.mul(baseApplied)),
    weatherWearPence: toPence(depreciable.mul(weatherApplied)),
    baseWearBasis: usesHours ? 'OPERATING_HOURS' : 'AGE',
    operatingHours: operatingHours.toDecimalPlaces(2).toString(),
    ageYears: ageYears.toDecimalPlaces(2).toString(),
    harshHours: { heat: harsh.heat.toString(), frost: harsh.frost.toString(), heavyRain: harsh.rain.toString(), highWind: harsh.wind.toString() },
    fuel: { litres: litres.toDecimalPlaces(3).toString(), costPence: toPence(fuelCost), unpricedLitres: unpricedLitres.toDecimalPlaces(3).toString() },
    carbon: { tonnesCo2e: kg.div(1000).toDecimalPlaces(4).toString(), costPence: toPence(carbonCost) },
    totalCostOfOwnershipPence: toPence(tco),
    tcoPerOperatingHourPence: operatingHours.gt(0) ? toPence(tco.div(operatingHours)) : null,
    notIncluded: ['maintenance', 'insurance', 'finance costs'],
    warnings: [...warnings],
  };
  const marketValues = [...used.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const inputs = {
    asset: { assetTag: asset.assetTag, category: asset.category, fuelType: asset.fuelType },
    finance: {
      currency: f.currency,
      acquisitionCostPence: Number(f.acquisitionCostPence),
      acquisitionDate: f.acquisitionDate.toISOString().slice(0, 10),
      expectedLifeYears: f.expectedLifeYears.toString(),
      expectedLifeHours: f.expectedLifeHours ? f.expectedLifeHours.toString() : null,
      residualValuePence: Number(f.residualValuePence),
    },
    wearCoefficients: set && coefficient
      ? {
          version: set.version,
          source: set.source,
          heatPctPerHour: coefficient.heatPctPerHour.toString(),
          frostPctPerHour: coefficient.frostPctPerHour.toString(),
          rainPctPerHour: coefficient.rainPctPerHour.toString(),
          windPctPerHour: coefficient.windPctPerHour.toString(),
        }
      : null,
    weatherThresholdVersions: [...new Set(exposures.map((e) => e.thresholdSet.version))].sort(),
    readingIds: readings.map((r) => r.id).sort(),
    exposureIds: exposures.map((e) => e.id).sort(),
    marketValueIds: marketValues.map((v) => v.id),
    marketValues,
  };
  const asOfIso = asOf.toISOString().slice(0, 10);
  const recordSha256 = recordHash({ assetId, asOf: asOfIso, methodVersion: VALUE_TCO_METHOD, inputs, results });
  const row = await db.fleetAssetValuation.create({
    data: {
      licenseeId,
      assetId,
      asOf,
      methodVersion: VALUE_TCO_METHOD,
      inputs: inputs as Prisma.InputJsonValue,
      results: results as Prisma.InputJsonValue,
      recordSha256,
      createdById: userId,
    },
  });
  return { ...row, asOf: asOfIso };
}

/** The latest valuation of each machine. */
export async function latestValuations(db: Db, licenseeId: string) {
  const rows = await db.fleetAssetValuation.findMany({ where: { licenseeId }, orderBy: { createdAt: 'desc' } });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.assetId)) latest.set(r.assetId, r);
  return [...latest.values()].map((r) => ({ ...r, asOf: r.asOf.toISOString().slice(0, 10) }));
}

/** Publishes a new coefficient set (one row per equipment type) and makes it active. */
export async function publishWearCoefficients(prisma: PrismaClient, body: Record<string, unknown>, userId: string) {
  if (typeof body.version !== 'string' || !/^[A-Za-z0-9._-]{1,30}$/.test(body.version)) throw new FleetValidationError('version must be 1 to 30 letters, digits, dots, dashes or underscores.');
  if (typeof body.source !== 'string' || body.source.trim().length < 3 || body.source.length > 500) throw new FleetValidationError('source must say where these coefficients come from.');
  if (!Array.isArray(body.coefficients) || body.coefficients.length === 0) throw new FleetValidationError('coefficients must list at least one equipment type.');
  const pct = (v: unknown, field: string) => {
    if (typeof v !== 'string' || !/^\d{1,3}(\.\d{1,6})?$/.test(v)) throw new FleetValidationError(`${field} must be a non-negative percentage with up to 6 decimal places, sent as text.`);
    return new D(v);
  };
  const seen = new Set<string>();
  const rows = (body.coefficients as Record<string, unknown>[]).map((c, i) => {
    if (typeof c.category !== 'string' || seen.has(c.category)) throw new FleetValidationError(`coefficients[${i}].category is missing or repeated.`);
    seen.add(c.category);
    return {
      category: c.category as Prisma.WearCoefficientCreateManyInput['category'],
      heatPctPerHour: pct(c.heatPctPerHour, `coefficients[${i}].heatPctPerHour`),
      frostPctPerHour: pct(c.frostPctPerHour, `coefficients[${i}].frostPctPerHour`),
      rainPctPerHour: pct(c.rainPctPerHour, `coefficients[${i}].rainPctPerHour`),
      windPctPerHour: pct(c.windPctPerHour, `coefficients[${i}].windPctPerHour`),
    };
  });
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.wearCoefficientSet.updateMany({ where: { active: true }, data: { active: false } });
      return tx.wearCoefficientSet.create({
        data: { version: body.version as string, source: (body.source as string).trim(), active: true, createdByUserId: userId, coefficients: { create: rows } },
        include: { coefficients: true },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new FleetValidationError('That version already exists.', 409);
    if (err instanceof Prisma.PrismaClientValidationError) throw new FleetValidationError('Each category must be a known equipment type.');
    throw err;
  }
}
