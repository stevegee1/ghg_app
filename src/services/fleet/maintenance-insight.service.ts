import { MaintenanceRuleSet, Prisma, PrismaClient } from '@prisma/client';
import { FleetValidationError } from './fleet-asset.service';
import { ConditionFeatures, MachineHistory, computeFeatures } from './maintenance-features';

type Db = PrismaClient | Prisma.TransactionClient;
const DAY_MS = 24 * 60 * 60 * 1000;

export type MaintenancePriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ConditionFinding {
  code:
    | 'SERVICE_OVERDUE'
    | 'SERVICE_DUE_SOON'
    | 'NO_SERVICE_PLAN'
    | 'NO_SERVICE_RECORDED'
    | 'HIGH_SEVERITY_FAULT'
    | 'RECURRING_FAULT'
    | 'FUEL_BURN_RISING'
    | 'HIGH_IDLE'
    | 'NOT_REPORTING';
  priority: MaintenancePriority;
  message: string;
}

export interface MachineCondition {
  assetId: string;
  assetTag: string;
  name: string;
  priority: MaintenancePriority;
  findings: ConditionFinding[];
  nextService: { hoursRemaining: number; projectedDate: string | null } | null;
  features: ConditionFeatures;
}

const RANK: Record<MaintenancePriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/** The rule-based check: each finding names the reading behind it. */
export function evaluateCondition(f: ConditionFeatures, rules: MaintenanceRuleSet, at: Date) {
  const findings: ConditionFinding[] = [];
  const dueSoon = Number(rules.dueSoonHours);
  let nextService: MachineCondition['nextService'] = null;

  if (f.serviceIntervalHours === null) {
    findings.push({ code: 'NO_SERVICE_PLAN', priority: 'LOW', message: 'Set the service interval to forecast the next service.' });
  } else if (f.hoursSinceService === null) {
    findings.push({ code: 'NO_SERVICE_RECORDED', priority: 'LOW', message: 'Log the last service to start the service forecast.' });
  } else {
    const remaining = f.serviceIntervalHours - f.hoursSinceService;
    const days = f.avgDailyHours > 0 ? remaining / f.avgDailyHours : null;
    nextService = {
      hoursRemaining: Math.round(remaining * 10) / 10,
      projectedDate: days !== null && remaining > 0 ? new Date(at.getTime() + days * DAY_MS).toISOString().slice(0, 10) : null,
    };
    if (remaining <= 0) {
      findings.push({ code: 'SERVICE_OVERDUE', priority: 'HIGH', message: `Service overdue by ${Math.abs(nextService.hoursRemaining)} engine hours.` });
    } else if (remaining <= dueSoon) {
      findings.push({ code: 'SERVICE_DUE_SOON', priority: 'MEDIUM', message: `Service due in ${nextService.hoursRemaining} engine hours.` });
    }
  }

  if (f.highSeverityFaults > 0) {
    findings.push({ code: 'HIGH_SEVERITY_FAULT', priority: 'HIGH', message: `${f.highSeverityFaults} high-severity fault(s) in the last ${rules.lookbackDays} days.` });
  }
  if (f.maxFaultRecurrence >= rules.faultRecurrenceCount) {
    findings.push({
      code: 'RECURRING_FAULT',
      priority: 'MEDIUM',
      message: `Fault ${f.mostRecurrentFaultCode} reported ${f.maxFaultRecurrence} times in the last ${rules.lookbackDays} days.`,
    });
  }
  if (f.fuelDriftPct !== null && f.fuelDriftPct >= Number(rules.fuelDriftPct)) {
    findings.push({
      code: 'FUEL_BURN_RISING',
      priority: 'MEDIUM',
      message: `Fuel per engine hour up ${f.fuelDriftPct}% on this machine's previous ${rules.baselineDays} days.`,
    });
  }
  if (f.idleRatioPct !== null && f.idleRatioPct >= Number(rules.idleRatioPct)) {
    findings.push({ code: 'HIGH_IDLE', priority: 'LOW', message: `Idling ${f.idleRatioPct}% of engine hours.` });
  }
  if (f.hoursSinceData === null || f.hoursSinceData >= rules.staleDataHours) {
    findings.push({
      code: 'NOT_REPORTING',
      priority: 'MEDIUM',
      message: f.hoursSinceData === null ? 'No data received from this machine yet.' : `No new data for ${Math.round(f.hoursSinceData)} hours.`,
    });
  }

  const priority = findings.reduce<MaintenancePriority>((p, x) => (RANK[x.priority] > RANK[p] ? x.priority : p), 'LOW');
  return { priority, findings, nextService };
}

/**
 * Loads what the features need for a set of machines, from `since` up to `until`. One query per
 * table for all machines, so the dashboard and training runs stay cheap.
 */
export async function loadHistories(db: Db, assetIds: string[], since: Date, until: Date): Promise<Map<string, MachineHistory>> {
  const where = { assetId: { in: assetIds } };
  const [plans, readings, faults, events, meters, weather] = await Promise.all([
    db.fleetMaintenancePlan.findMany({ where, select: { assetId: true, serviceIntervalHours: true } }),
    db.fleetReading.findMany({
      where: { ...where, periodEnd: { gt: since }, periodStart: { lte: until } },
      select: { assetId: true, periodStart: true, periodEnd: true, fuelQuantity: true, engineHours: true, idleHours: true },
    }),
    db.fleetFaultCode.findMany({ where: { ...where, observedAt: { gt: since, lte: until } }, select: { assetId: true, observedAt: true, code: true, severity: true } }),
    // Services can be older than the window: the last one sets the hours since service.
    db.fleetMaintenanceEvent.findMany({ where: { ...where, occurredAt: { lte: until } }, select: { assetId: true, type: true, occurredAt: true, operatingHours: true } }),
    db.fleetTelemetrySnapshot.findMany({
      where: { ...where, observedAt: { gt: since, lte: until }, cumulativeOperatingHours: { not: null } },
      select: { assetId: true, observedAt: true, receivedAt: true, cumulativeOperatingHours: true },
    }),
    db.fleetWeatherExposure.findMany({
      where: { ...where, date: { gt: since, lte: until } },
      select: { assetId: true, date: true, heatHours: true, frostHours: true, heavyRainHours: true, highWindHours: true },
    }),
  ]);

  const out = new Map<string, MachineHistory>();
  for (const id of assetIds) out.set(id, { serviceIntervalHours: null, usage: [], faults: [], maintenance: [], meters: [], weather: [] });
  for (const p of plans) out.get(p.assetId)!.serviceIntervalHours = Number(p.serviceIntervalHours);
  for (const r of readings) {
    out.get(r.assetId)!.usage.push({
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      fuel: Number(r.fuelQuantity),
      engineHours: r.engineHours === null ? null : Number(r.engineHours),
      idleHours: r.idleHours === null ? null : Number(r.idleHours),
    });
  }
  for (const f of faults) out.get(f.assetId)!.faults.push({ observedAt: f.observedAt, code: f.code, severity: f.severity });
  for (const e of events) {
    out.get(e.assetId)!.maintenance.push({ type: e.type, occurredAt: e.occurredAt, operatingHours: e.operatingHours === null ? null : Number(e.operatingHours) });
  }
  for (const m of meters) {
    out.get(m.assetId)!.meters.push({ observedAt: m.observedAt, receivedAt: m.receivedAt, cumulativeOperatingHours: Number(m.cumulativeOperatingHours) });
  }
  for (const w of weather) {
    out.get(w.assetId)!.weather.push({ date: w.date, harshHours: Number(w.heatHours) + Number(w.frostHours) + Number(w.heavyRainHours) + Number(w.highWindHours) });
  }
  return out;
}

/** The longest history any feature reads before `at`. */
export function historyStart(rules: Pick<MaintenanceRuleSet, 'lookbackDays' | 'baselineDays'>, at: Date): Date {
  return new Date(at.getTime() - Math.max(rules.lookbackDays + rules.baselineDays, 365) * DAY_MS);
}

export async function getActiveRuleSet(db: Db) {
  return db.maintenanceRuleSet.findFirst({ where: { active: true } });
}

/** The condition of every active machine a client has, worst first. Null when no rule set is published. */
export async function clientConditions(db: Db, licenseeId: string, at = new Date()) {
  const rules = await getActiveRuleSet(db);
  if (!rules) return null;
  const assets = await db.fleetAsset.findMany({ where: { licenseeId, active: true }, select: { id: true, assetTag: true, name: true }, orderBy: { assetTag: 'asc' } });
  const histories = await loadHistories(db, assets.map((a) => a.id), historyStart(rules, at), at);
  const conditions: MachineCondition[] = assets.map((a) => {
    const features = computeFeatures(histories.get(a.id)!, at, rules);
    return { assetId: a.id, assetTag: a.assetTag, name: a.name, features, ...evaluateCondition(features, rules, at) };
  });
  conditions.sort((x, y) => RANK[y.priority] - RANK[x.priority] || x.assetTag.localeCompare(y.assetTag));
  return { ruleSet: { id: rules.id, version: rules.version, source: rules.source }, evaluatedAt: at.toISOString(), conditions };
}

const int = (v: unknown, field: string, min: number, max: number) => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new FleetValidationError(`${field} must be a whole number from ${min} to ${max}.`);
  return v;
};
const dec = (v: unknown, field: string, min: number, max: number) => {
  if (typeof v !== 'string' || !/^\d{1,6}(\.\d{1,2})?$/.test(v) || Number(v) < min || Number(v) > max) {
    throw new FleetValidationError(`${field} must be a number from ${min} to ${max} with up to 2 decimal places, sent as text.`);
  }
  return new Prisma.Decimal(v);
};

/** Publishes a new rule set version and makes it the active one. */
export async function publishRuleSet(prisma: PrismaClient, body: Record<string, unknown>, userId: string) {
  if (typeof body.version !== 'string' || !/^[A-Za-z0-9._-]{1,30}$/.test(body.version)) {
    throw new FleetValidationError('version must be 1 to 30 letters, digits, dots, dashes or underscores.');
  }
  if (typeof body.source !== 'string' || body.source.trim().length < 3 || body.source.length > 500) {
    throw new FleetValidationError('source must say where these thresholds come from.');
  }
  const labels = body.highSeverityLabels;
  if (!Array.isArray(labels) || labels.length === 0 || labels.some((l) => typeof l !== 'string' || !l.trim() || l.length > 40)) {
    throw new FleetValidationError('highSeverityLabels must list the severity labels your machines report for serious faults.');
  }
  const data = {
    version: body.version,
    source: body.source.trim(),
    lookbackDays: int(body.lookbackDays, 'lookbackDays', 1, 365),
    baselineDays: int(body.baselineDays, 'baselineDays', 1, 730),
    dueSoonHours: dec(body.dueSoonHours, 'dueSoonHours', 0, 100000),
    fuelDriftPct: dec(body.fuelDriftPct, 'fuelDriftPct', 0.01, 1000),
    idleRatioPct: dec(body.idleRatioPct, 'idleRatioPct', 0.01, 100),
    faultRecurrenceCount: int(body.faultRecurrenceCount, 'faultRecurrenceCount', 2, 1000),
    staleDataHours: int(body.staleDataHours, 'staleDataHours', 1, 8760),
    highSeverityLabels: (labels as string[]).map((l) => l.trim()),
  };
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.maintenanceRuleSet.updateMany({ where: { active: true }, data: { active: false } });
      return tx.maintenanceRuleSet.create({ data: { ...data, active: true, createdByUserId: userId } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new FleetValidationError('That version already exists.', 409);
    throw err;
  }
}
