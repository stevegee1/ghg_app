import { FleetMaintenanceEventType } from '@prisma/client';

/**
 * Condition features for one machine at one moment, computed only from data recorded before that
 * moment. The rule-based check and the predictive model both use these, so a model is trained on
 * exactly what the dashboard shows. Pure functions: no database access here.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface FeatureWindows {
  lookbackDays: number;
  baselineDays: number;
  highSeverityLabels: string[];
}

/** A period of use from an upload or from telemetry. Fuel in litres (or the asset's unit). */
export interface UsagePeriod {
  periodStart: Date;
  periodEnd: Date;
  fuel: number;
  engineHours: number | null;
  idleHours: number | null;
}

export interface FaultRecord {
  observedAt: Date;
  code: string;
  severity: string | null;
}

export interface MaintenanceRecord {
  type: FleetMaintenanceEventType;
  occurredAt: Date;
  operatingHours: number | null;
}

export interface MeterReading {
  observedAt: Date;
  receivedAt: Date;
  cumulativeOperatingHours: number | null;
}

export interface WeatherDay {
  date: Date;
  harshHours: number;
}

export interface MachineHistory {
  serviceIntervalHours: number | null;
  usage: UsagePeriod[];
  faults: FaultRecord[];
  maintenance: MaintenanceRecord[];
  meters: MeterReading[];
  weather: WeatherDay[];
}

export interface ConditionFeatures {
  /** Engine hours in the lookback window */
  operatingHours: number;
  avgDailyHours: number;
  idleRatioPct: number | null;
  fuelPerHour: number | null;
  baselineFuelPerHour: number | null;
  fuelDriftPct: number | null;
  faultCount: number;
  highSeverityFaults: number;
  maxFaultRecurrence: number;
  mostRecurrentFaultCode: string | null;
  hoursSinceService: number | null;
  serviceIntervalHours: number | null;
  /** Share of the service interval used, 1 = due now */
  serviceIntervalUsed: number | null;
  harshWeatherHours: number;
  hoursSinceData: number | null;
  priorFailures365: number;
}

const FAILURES: FleetMaintenanceEventType[] = [FleetMaintenanceEventType.BREAKDOWN, FleetMaintenanceEventType.UNPLANNED_REPAIR];
const SERVICES: FleetMaintenanceEventType[] = [FleetMaintenanceEventType.SCHEDULED_SERVICE, FleetMaintenanceEventType.INSPECTION];

/** Share of a usage period that falls inside [from, to). */
function overlap(p: UsagePeriod, from: number, to: number): number {
  const start = p.periodStart.getTime();
  const end = p.periodEnd.getTime();
  const span = end - start;
  if (span <= 0) return start >= from && start < to ? 1 : 0;
  const inside = Math.min(end, to) - Math.max(start, from);
  return inside > 0 ? inside / span : 0;
}

function sumUsage(usage: UsagePeriod[], from: number, to: number) {
  let fuel = 0;
  let fuelHours = 0;
  let hours = 0;
  let idle = 0;
  let idleBase = 0;
  for (const p of usage) {
    const share = overlap(p, from, to);
    if (share === 0) continue;
    if (p.engineHours !== null) {
      hours += p.engineHours * share;
      if (p.engineHours > 0) {
        fuel += p.fuel * share;
        fuelHours += p.engineHours * share;
      }
      if (p.idleHours !== null) {
        idle += p.idleHours * share;
        idleBase += p.engineHours * share;
      }
    }
  }
  return { hours, fuelPerHour: fuelHours > 0 ? fuel / fuelHours : null, idleRatioPct: idleBase > 0 ? (idle / idleBase) * 100 : null };
}

/** The engine hours meter at time t, from the last reading at or before t. */
function meterAt(meters: MeterReading[], t: number): number | null {
  let best: MeterReading | null = null;
  for (const m of meters) {
    if (m.cumulativeOperatingHours === null || m.observedAt.getTime() > t) continue;
    if (!best || m.observedAt > best.observedAt) best = m;
  }
  return best?.cumulativeOperatingHours ?? null;
}

const round = (n: number, dp = 3) => Math.round(n * 10 ** dp) / 10 ** dp;

export function computeFeatures(history: MachineHistory, at: Date, windows: FeatureWindows): ConditionFeatures {
  const t = at.getTime();
  const lookFrom = t - windows.lookbackDays * DAY_MS;
  const baseFrom = lookFrom - windows.baselineDays * DAY_MS;

  const recent = sumUsage(history.usage, lookFrom, t);
  const baseline = sumUsage(history.usage, baseFrom, lookFrom);
  const fuelDriftPct =
    recent.fuelPerHour !== null && baseline.fuelPerHour !== null && baseline.fuelPerHour > 0
      ? ((recent.fuelPerHour - baseline.fuelPerHour) / baseline.fuelPerHour) * 100
      : null;

  const severe = new Set(windows.highSeverityLabels.map((l) => l.trim().toLowerCase()));
  const recentFaults = history.faults.filter((f) => f.observedAt.getTime() > lookFrom && f.observedAt.getTime() <= t);
  const byCode = new Map<string, number>();
  for (const f of recentFaults) byCode.set(f.code, (byCode.get(f.code) ?? 0) + 1);
  let mostRecurrentFaultCode: string | null = null;
  let maxFaultRecurrence = 0;
  for (const [code, n] of byCode) {
    if (n > maxFaultRecurrence) {
      maxFaultRecurrence = n;
      mostRecurrentFaultCode = code;
    }
  }

  const past = history.maintenance.filter((m) => m.occurredAt.getTime() <= t);
  const lastService = past.filter((m) => SERVICES.includes(m.type)).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
  let hoursSinceService: number | null = null;
  if (lastService) {
    const meterNow = meterAt(history.meters, t);
    if (lastService.operatingHours !== null && meterNow !== null && meterNow >= lastService.operatingHours) {
      hoursSinceService = meterNow - lastService.operatingHours;
    } else {
      hoursSinceService = sumUsage(history.usage, lastService.occurredAt.getTime(), t).hours;
    }
  }

  const lastData = Math.max(
    ...history.meters.filter((m) => m.receivedAt.getTime() <= t).map((m) => m.receivedAt.getTime()),
    ...history.usage.filter((u) => u.periodEnd.getTime() <= t).map((u) => u.periodEnd.getTime()),
    -Infinity
  );

  return {
    operatingHours: round(recent.hours, 2),
    avgDailyHours: round(recent.hours / windows.lookbackDays, 3),
    idleRatioPct: recent.idleRatioPct === null ? null : round(recent.idleRatioPct, 2),
    fuelPerHour: recent.fuelPerHour === null ? null : round(recent.fuelPerHour),
    baselineFuelPerHour: baseline.fuelPerHour === null ? null : round(baseline.fuelPerHour),
    fuelDriftPct: fuelDriftPct === null ? null : round(fuelDriftPct, 2),
    faultCount: recentFaults.length,
    highSeverityFaults: recentFaults.filter((f) => f.severity !== null && severe.has(f.severity.trim().toLowerCase())).length,
    maxFaultRecurrence,
    mostRecurrentFaultCode,
    hoursSinceService: hoursSinceService === null ? null : round(hoursSinceService, 2),
    serviceIntervalHours: history.serviceIntervalHours,
    serviceIntervalUsed:
      hoursSinceService !== null && history.serviceIntervalHours ? round(hoursSinceService / history.serviceIntervalHours, 4) : null,
    harshWeatherHours: round(
      history.weather.filter((w) => w.date.getTime() > lookFrom && w.date.getTime() <= t).reduce((s, w) => s + w.harshHours, 0),
      2
    ),
    hoursSinceData: Number.isFinite(lastData) ? round((t - lastData) / HOUR_MS, 1) : null,
    priorFailures365: past.filter((m) => FAILURES.includes(m.type) && m.occurredAt.getTime() > t - 365 * DAY_MS).length,
  };
}
