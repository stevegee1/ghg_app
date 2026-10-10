import { MarketIndexCategory, Prisma, PrismaClient } from '@prisma/client';
import { FleetValidationError } from './fleet-asset.service';
import { toIsoDate } from './fleet-project.service';
import { valueOn } from '../market-index.service';
import { recordHash } from '../canonical-hash.service';

type Db = PrismaClient | Prisma.TransactionClient;
const D = Prisma.Decimal;
type Dec = Prisma.Decimal;

/**
 * CONTRACT_COST_2026.1
 * - Each reading is attributed to a project for the share of its period the machine was on it.
 * - Fuel cost: litres x the fuel index value (excluding VAT) in force on the middle day of that share.
 * - Carbon cost: tCO2e x the carbon index value in force on the same day.
 * - Idle fuel cost: fuel cost x idle hours / engine hours, where both are reported.
 * - Material exposure: (index value in force on the last day - budgeted unit price) x quantity.
 * - Anything without a value in the project currency is reported as unpriced, never assumed.
 */
export const CONTRACT_COST_METHOD = 'CONTRACT_COST_2026.1';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const toPence = (pounds: Dec) => pounds.mul(100).toDecimalPlaces(0).toNumber();
const dayOf = (ms: number) => new Date(Math.floor(ms / DAY_MS) * DAY_MS);

function parseOptionalDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !DATE_RE.test(value)) throw new FleetValidationError(`${field} must be a date in the form YYYY-MM-DD.`);
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new FleetValidationError(`${field} is not a real date.`);
  return d;
}

type UsedValue = {
  id: string;
  indexCode: string;
  effectiveDate: string;
  value: string;
};

export async function calculateProjectCost(
  db: Db,
  licenseeId: string,
  projectId: string,
  body: Record<string, unknown>,
  userId: string
) {
  const project = await db.fleetProject.findFirst({
    where: { id: projectId, licenseeId },
    include: {
      assignments: { include: { asset: { select: { id: true, assetTag: true, name: true, fuelType: true } } } },
      materials: { include: { index: true } },
    },
  });
  if (!project) throw new FleetValidationError('Project not found.', 404);

  const today = dayOf(Date.now());
  const from = parseOptionalDate(body.from, 'from') ?? project.startDate;
  const lastDefault = project.endDate && project.endDate < today ? project.endDate : today;
  const to = parseOptionalDate(body.to, 'to') ?? lastDefault;
  if (to < from) throw new FleetValidationError('to must be on or after from.');
  if (from < project.startDate || (project.endDate && to > project.endDate)) {
    throw new FleetValidationError('The period must fall within the project dates.');
  }
  if (to > today) throw new FleetValidationError('The period cannot end in the future.');
  const periodStartMs = from.getTime();
  const periodEndMs = to.getTime() + DAY_MS;

  const fuelIndices = await db.marketIndex.findMany({ where: { category: MarketIndexCategory.FUEL, active: true } });
  const carbonIndices = await db.marketIndex.findMany({ where: { category: MarketIndexCategory.CARBON, active: true } });
  if (carbonIndices.length > 1) {
    throw new FleetValidationError('More than one carbon price is active. An administrator must keep only one active.', 409);
  }
  const carbonIndex = carbonIndices[0] ?? null;

  const used = new Map<string, UsedValue>();
  const warnings = new Set<string>();
  const priceOn = async (index: { id: string; code: string; currency: string }, date: Date): Promise<Dec | null> => {
    if (index.currency !== project.currency) {
      warnings.add(`${index.code} is in ${index.currency}, not ${project.currency}; it is not used.`);
      return null;
    }
    const v = await valueOn(db, index.id, date);
    if (!v) {
      warnings.add(`${index.code} has no value on or before ${toIsoDate(date)}.`);
      return null;
    }
    used.set(v.id, { id: v.id, indexCode: index.code, effectiveDate: toIsoDate(v.effectiveDate)!, value: v.value.toString() });
    return v.value;
  };

  let litres = new D(0);
  let unpricedLitres = new D(0);
  let fuelCost = new D(0);
  let kgCo2e = new D(0);
  let unpricedKg = new D(0);
  let carbonCost = new D(0);
  let engineHours = new D(0);
  let idleHours = new D(0);
  let idleFuelCost = new D(0);
  const readingIds: string[] = [];
  const factorIds = new Set<string>();
  const byAsset = new Map<string, { assetTag: string; name: string; litres: Dec; kgCo2e: Dec; hours: Dec; costPounds: Dec }>();

  for (const a of project.assignments) {
    const startMs = Math.max(periodStartMs, a.fromDate.getTime());
    const endMs = Math.min(periodEndMs, a.toDate ? a.toDate.getTime() + DAY_MS : periodEndMs);
    if (endMs <= startMs) continue;
    const fuelIndex = fuelIndices.find((i) => i.fuelTypes.includes(a.asset.fuelType)) ?? null;
    if (!fuelIndex) warnings.add(`No active fuel price covers ${a.asset.fuelType}.`);

    const readings = await db.fleetReading.findMany({
      where: { licenseeId, assetId: a.assetId, periodStart: { lt: new Date(endMs) }, periodEnd: { gt: new Date(startMs) } },
      orderBy: { periodStart: 'asc' },
    });
    for (const r of readings) {
      const rStart = r.periodStart.getTime();
      const rEnd = r.periodEnd.getTime();
      const span = Math.max(rEnd - rStart, 1);
      const overlapStart = Math.max(rStart, startMs);
      const overlapEnd = Math.min(rEnd, endMs);
      if (overlapEnd <= overlapStart) continue;
      const share = new D(overlapEnd - overlapStart).div(span);
      const priceDay = dayOf(overlapStart + (overlapEnd - overlapStart) / 2);

      const l = r.fuelQuantity.mul(share);
      const kg = r.kgCo2e.mul(share);
      const h = r.engineHours ? r.engineHours.mul(share) : new D(0);
      const idle = r.idleHours ? r.idleHours.mul(share) : new D(0);
      readingIds.push(r.id);
      factorIds.add(r.emissionFactorId);
      litres = litres.add(l);
      kgCo2e = kgCo2e.add(kg);
      engineHours = engineHours.add(h);
      idleHours = idleHours.add(idle);

      let lineCost = new D(0);
      const fuelPrice = fuelIndex ? await priceOn(fuelIndex, priceDay) : null;
      if (fuelPrice) {
        const c = l.mul(fuelPrice);
        fuelCost = fuelCost.add(c);
        lineCost = lineCost.add(c);
        if (r.engineHours && r.idleHours && r.engineHours.gt(0)) idleFuelCost = idleFuelCost.add(c.mul(r.idleHours).div(r.engineHours));
      } else {
        unpricedLitres = unpricedLitres.add(l);
      }
      const carbonPrice = carbonIndex ? await priceOn(carbonIndex, priceDay) : null;
      if (carbonPrice) {
        const c = kg.div(1000).mul(carbonPrice);
        carbonCost = carbonCost.add(c);
        lineCost = lineCost.add(c);
      } else {
        unpricedKg = unpricedKg.add(kg);
      }

      const row = byAsset.get(a.assetId) ?? { assetTag: a.asset.assetTag, name: a.asset.name, litres: new D(0), kgCo2e: new D(0), hours: new D(0), costPounds: new D(0) };
      row.litres = row.litres.add(l);
      row.kgCo2e = row.kgCo2e.add(kg);
      row.hours = row.hours.add(h);
      row.costPounds = row.costPounds.add(lineCost);
      byAsset.set(a.assetId, row);
    }
  }
  if (!carbonIndex) warnings.add('No carbon price is active.');

  const materials = [];
  let materialExposure = new D(0);
  for (const m of project.materials) {
    const current = await priceOn(m.index, to);
    const exposure = current ? current.sub(m.budgetUnitPrice).mul(m.quantity) : null;
    if (exposure) materialExposure = materialExposure.add(exposure);
    materials.push({
      indexCode: m.index.code,
      name: m.index.name,
      unit: m.index.unit,
      quantity: m.quantity.toString(),
      budgetUnitPrice: m.budgetUnitPrice.toString(),
      currentUnitPrice: current ? current.toString() : null,
      exposurePence: exposure ? toPence(exposure) : null,
    });
  }

  const operatingCost = fuelCost.add(carbonCost);
  const budgetedMarginPence = new D(project.contractValuePence.toString()).mul(project.budgetedMarginBps).div(10000).toDecimalPlaces(0).toNumber();
  const totalExposurePence = toPence(operatingCost.add(materialExposure));

  const results = {
    currency: project.currency,
    fuel: { litres: litres.toDecimalPlaces(3).toString(), costPence: toPence(fuelCost), unpricedLitres: unpricedLitres.toDecimalPlaces(3).toString() },
    carbon: {
      tonnesCo2e: kgCo2e.div(1000).toDecimalPlaces(4).toString(),
      costPence: toPence(carbonCost),
      unpricedTonnesCo2e: unpricedKg.div(1000).toDecimalPlaces(4).toString(),
    },
    idle: { hours: idleHours.toDecimalPlaces(2).toString(), fuelCostPence: toPence(idleFuelCost) },
    operatingHours: engineHours.toDecimalPlaces(2).toString(),
    operatingCostPence: toPence(operatingCost),
    costPerOperatingHourPence: engineHours.gt(0) ? toPence(operatingCost.div(engineHours)) : null,
    materials,
    materialExposurePence: toPence(materialExposure),
    totalExposurePence,
    budgetedMarginPence,
    exposureShareOfMarginPercent: budgetedMarginPence > 0 ? new D(totalExposurePence).div(budgetedMarginPence).mul(100).toDecimalPlaces(2).toString() : null,
    marginAfterExposurePence: budgetedMarginPence - totalExposurePence,
    byAsset: [...byAsset.entries()].map(([assetId, r]) => ({
      assetId,
      assetTag: r.assetTag,
      name: r.name,
      litres: r.litres.toDecimalPlaces(3).toString(),
      tonnesCo2e: r.kgCo2e.div(1000).toDecimalPlaces(4).toString(),
      operatingHours: r.hours.toDecimalPlaces(2).toString(),
      costPence: toPence(r.costPounds),
      costPerOperatingHourPence: r.hours.gt(0) ? toPence(r.costPounds.div(r.hours)) : null,
    })),
    warnings: [...warnings],
  };

  const marketValues = [...used.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const inputs = {
    project: {
      name: project.name,
      reference: project.reference,
      contractValuePence: Number(project.contractValuePence),
      budgetedMarginBps: project.budgetedMarginBps,
      currency: project.currency,
    },
    assignments: project.assignments.map((a) => ({ assetId: a.assetId, fromDate: toIsoDate(a.fromDate), toDate: toIsoDate(a.toDate) })),
    readingIds: readingIds.sort(),
    emissionFactorIds: [...factorIds].sort(),
    marketValueIds: marketValues.map((v) => v.id),
    marketValues,
  };
  const periodFrom = toIsoDate(from)!;
  const periodTo = toIsoDate(to)!;
  const recordSha256 = recordHash({ projectId, periodFrom, periodTo, methodVersion: CONTRACT_COST_METHOD, inputs, results });

  const run = await db.fleetProjectCostRun.create({
    data: {
      licenseeId,
      projectId,
      periodFrom: from,
      periodTo: to,
      methodVersion: CONTRACT_COST_METHOD,
      inputs: inputs as Prisma.InputJsonValue,
      results: results as Prisma.InputJsonValue,
      recordSha256,
      createdById: userId,
    },
  });
  return serializeRun(run);
}

export function serializeRun(run: Prisma.FleetProjectCostRunGetPayload<object>) {
  return { ...run, periodFrom: toIsoDate(run.periodFrom), periodTo: toIsoDate(run.periodTo) };
}

export async function listCostRuns(db: Db, licenseeId: string, projectId: string) {
  const runs = await db.fleetProjectCostRun.findMany({ where: { licenseeId, projectId }, orderBy: { createdAt: 'desc' }, take: 20 });
  return runs.map(serializeRun);
}

/** Adds or replaces a contract material with its budgeted unit price. */
export async function setProjectMaterial(db: Db, licenseeId: string, projectId: string, body: Record<string, unknown>) {
  const project = await db.fleetProject.findFirst({ where: { id: projectId, licenseeId } });
  if (!project) throw new FleetValidationError('Project not found.', 404);
  const index = typeof body.indexId === 'string' ? await db.marketIndex.findUnique({ where: { id: body.indexId } }) : null;
  if (!index || !index.active || index.category !== MarketIndexCategory.MATERIAL) throw new FleetValidationError('Choose a material price.', 400);
  if (index.currency !== project.currency) throw new FleetValidationError(`That price is in ${index.currency}; this project is in ${project.currency}.`);
  const num = (v: unknown, field: string, dp: number) => {
    const re = new RegExp(`^\\d{1,10}(\\.\\d{1,${dp}})?$`);
    if (typeof v !== 'string' || !re.test(v) || Number(v) <= 0) throw new FleetValidationError(`${field} must be a positive number with up to ${dp} decimal places, sent as text.`);
    return new D(v);
  };
  const quantity = num(body.quantity, 'quantity', 3);
  const budgetUnitPrice = num(body.budgetUnitPrice, 'budgetUnitPrice', 6);
  await db.fleetProjectMaterial.upsert({
    where: { projectId_indexId: { projectId, indexId: index.id } },
    create: { licenseeId, projectId, indexId: index.id, quantity, budgetUnitPrice },
    update: { quantity, budgetUnitPrice },
  });
  return listProjectMaterials(db, licenseeId, projectId);
}

export async function removeProjectMaterial(db: Db, licenseeId: string, projectId: string, materialId: string) {
  const m = await db.fleetProjectMaterial.findFirst({ where: { id: materialId, projectId, licenseeId } });
  if (!m) throw new FleetValidationError('Material not found.', 404);
  await db.fleetProjectMaterial.delete({ where: { id: m.id } });
  return listProjectMaterials(db, licenseeId, projectId);
}

export async function listProjectMaterials(db: Db, licenseeId: string, projectId: string) {
  const rows = await db.fleetProjectMaterial.findMany({ where: { licenseeId, projectId }, include: { index: true }, orderBy: { createdAt: 'asc' } });
  return rows.map((m) => ({
    id: m.id,
    indexId: m.indexId,
    name: m.index.name,
    unit: m.index.unit,
    quantity: m.quantity.toString(),
    budgetUnitPrice: m.budgetUnitPrice.toString(),
  }));
}

/** Material prices a client can attach to a project (active MATERIAL indices). */
export async function listMaterialIndices(db: Db) {
  const rows = await db.marketIndex.findMany({ where: { category: MarketIndexCategory.MATERIAL, active: true }, orderBy: { name: 'asc' } });
  return rows.map((i) => ({ id: i.id, name: i.name, unit: i.unit, currency: i.currency }));
}
