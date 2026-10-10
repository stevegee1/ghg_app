import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;
const D = Prisma.Decimal;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const WEATHER_ENV = { archiveUrl: 'OPEN_METEO_ARCHIVE_URL', apiKey: 'OPEN_METEO_API_KEY' } as const;
export const WEATHER_SOURCE = 'Open-Meteo historical weather (temperature_2m, precipitation, wind_speed_10m)';

export interface WeatherConfig {
  archiveUrl: string;
  apiKey: string;
}

/** Null when weather is off (neither variable set); throws when only one is set or the URL is not https. */
export function readWeatherConfig(): WeatherConfig | null {
  const archiveUrl = process.env[WEATHER_ENV.archiveUrl]?.trim() ?? '';
  const apiKey = process.env[WEATHER_ENV.apiKey]?.trim() ?? '';
  if (!archiveUrl && !apiKey) return null;
  if (!archiveUrl || !apiKey) throw new Error(`Set both ${WEATHER_ENV.archiveUrl} and ${WEATHER_ENV.apiKey}, or neither.`);
  if (!/^https:\/\//.test(archiveUrl)) throw new Error(`${WEATHER_ENV.archiveUrl} must be an https URL.`);
  return { archiveUrl, apiKey };
}

export function validateWeatherConfig(): void {
  readWeatherConfig();
}

export interface HourlyWeather {
  /** Start of the hour, UTC milliseconds */
  hourStart: number;
  tempC: number | null;
  precipMm: number | null;
  windKmh: number | null;
}

type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Hourly weather for one place and UTC day. */
export async function fetchHourlyWeather(config: WeatherConfig, lat: number, lon: number, day: string, fetcher: Fetcher = fetch): Promise<HourlyWeather[]> {
  const url = new URL(config.archiveUrl);
  url.searchParams.set('latitude', lat.toFixed(2));
  url.searchParams.set('longitude', lon.toFixed(2));
  url.searchParams.set('start_date', day);
  url.searchParams.set('end_date', day);
  url.searchParams.set('hourly', 'temperature_2m,precipitation,wind_speed_10m');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('apikey', config.apiKey);
  const res = await fetcher(url.toString());
  if (!res.ok) throw new Error(`Weather provider returned HTTP ${res.status}`);
  const body = (await res.json()) as { hourly?: { time?: string[]; temperature_2m?: (number | null)[]; precipitation?: (number | null)[]; wind_speed_10m?: (number | null)[] } };
  const h = body.hourly;
  if (!h?.time) throw new Error('Weather provider response has no hourly data');
  return h.time.map((t, i) => ({
    hourStart: Date.parse(`${t}:00Z`),
    tempC: h.temperature_2m?.[i] ?? null,
    precipMm: h.precipitation?.[i] ?? null,
    windKmh: h.wind_speed_10m?.[i] ?? null,
  }));
}

interface Snapshot {
  observedAt: Date;
  cumulativeOperatingHours: Prisma.Decimal | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  counterReset: boolean;
}

/** Operating intervals for a day: the hours run between consecutive snapshots, where the place is known. */
export function operatingIntervals(snapshots: Snapshot[], dayStart: number) {
  const dayEnd = dayStart + DAY_MS;
  const out: { start: number; end: number; hours: Prisma.Decimal; lat: number; lon: number }[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const a = snapshots[i - 1];
    const b = snapshots[i];
    if (b.counterReset || !a.cumulativeOperatingHours || !b.cumulativeOperatingHours) continue;
    const delta = b.cumulativeOperatingHours.sub(a.cumulativeOperatingHours);
    const start = a.observedAt.getTime();
    const end = b.observedAt.getTime();
    if (delta.lte(0) || end <= start) continue;
    const lat = a.latitude ?? b.latitude;
    const lon = a.longitude ?? b.longitude;
    if (!lat || !lon) continue;
    const clipStart = Math.max(start, dayStart);
    const clipEnd = Math.min(end, dayEnd);
    if (clipEnd <= clipStart) continue;
    // Hours run are spread evenly over the time between the two readings.
    out.push({ start: clipStart, end: clipEnd, hours: delta.mul(clipEnd - clipStart).div(end - start), lat: Number(lat), lon: Number(lon) });
  }
  return out;
}

export interface Thresholds {
  heatAboveC: Prisma.Decimal;
  frostBelowC: Prisma.Decimal;
  heavyRainMmPerHour: Prisma.Decimal;
  highWindKmh: Prisma.Decimal;
}

/** Splits each interval's hours across the weather hours it covers and totals the harsh-condition hours. */
export async function exposureForDay(
  intervals: ReturnType<typeof operatingIntervals>,
  thresholds: Thresholds,
  weatherAt: (lat: number, lon: number) => Promise<HourlyWeather[]>
) {
  const totals = { operating: new D(0), heat: new D(0), frost: new D(0), rain: new D(0), wind: new D(0) };
  for (const iv of intervals) {
    const hours = await weatherAt(iv.lat, iv.lon);
    const duration = iv.end - iv.start;
    for (const w of hours) {
      const overlap = Math.min(iv.end, w.hourStart + HOUR_MS) - Math.max(iv.start, w.hourStart);
      if (overlap <= 0) continue;
      const share = iv.hours.mul(overlap).div(duration);
      totals.operating = totals.operating.add(share);
      if (w.tempC !== null && thresholds.heatAboveC.lt(w.tempC)) totals.heat = totals.heat.add(share);
      if (w.tempC !== null && thresholds.frostBelowC.gt(w.tempC)) totals.frost = totals.frost.add(share);
      if (w.precipMm !== null && thresholds.heavyRainMmPerHour.lte(w.precipMm)) totals.rain = totals.rain.add(share);
      if (w.windKmh !== null && thresholds.highWindKmh.lte(w.windKmh)) totals.wind = totals.wind.add(share);
    }
  }
  const r = (d: Prisma.Decimal) => d.toDecimalPlaces(3);
  return { operatingHours: r(totals.operating), heatHours: r(totals.heat), frostHours: r(totals.frost), heavyRainHours: r(totals.rain), highWindHours: r(totals.wind) };
}

/**
 * Computes and stores weather exposure for every machine with located telemetry on a UTC day.
 * Runs as a platform job (admin RLS scope). Replaces any earlier figures for that day.
 */
export async function computeExposureForDate(
  db: Db,
  day: Date,
  config: WeatherConfig,
  fetcher: Fetcher = fetch
): Promise<{ assets: number; skipped: string | null }> {
  const thresholdSet = await db.weatherThresholdSet.findFirst({ where: { active: true } });
  if (!thresholdSet) return { assets: 0, skipped: 'No active weather threshold set.' };
  const dayStart = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const dayEnd = dayStart + DAY_MS;
  const dayIso = new Date(dayStart).toISOString().slice(0, 10);

  const assetIds = (
    await db.fleetTelemetrySnapshot.findMany({
      where: { observedAt: { gte: new Date(dayStart), lt: new Date(dayEnd) }, latitude: { not: null } },
      distinct: ['assetId'],
      select: { assetId: true },
    })
  ).map((a) => a.assetId);

  const cache = new Map<string, Promise<HourlyWeather[]>>();
  const weatherAt = (lat: number, lon: number) => {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    if (!cache.has(key)) cache.set(key, fetchHourlyWeather(config, lat, lon, dayIso, fetcher));
    return cache.get(key)!;
  };

  let stored = 0;
  for (const assetId of assetIds) {
    const asset = await db.fleetAsset.findUnique({ where: { id: assetId }, select: { licenseeId: true } });
    if (!asset) continue;
    const select = { observedAt: true, cumulativeOperatingHours: true, latitude: true, longitude: true, counterReset: true };
    const [before, during, after] = await Promise.all([
      db.fleetTelemetrySnapshot.findFirst({ where: { assetId, observedAt: { lt: new Date(dayStart) } }, orderBy: { observedAt: 'desc' }, select }),
      db.fleetTelemetrySnapshot.findMany({ where: { assetId, observedAt: { gte: new Date(dayStart), lt: new Date(dayEnd) } }, orderBy: { observedAt: 'asc' }, select }),
      db.fleetTelemetrySnapshot.findFirst({ where: { assetId, observedAt: { gte: new Date(dayEnd) } }, orderBy: { observedAt: 'asc' }, select }),
    ]);
    const snapshots = [...(before ? [before] : []), ...during, ...(after ? [after] : [])];
    const totals = await exposureForDay(operatingIntervals(snapshots, dayStart), thresholdSet, weatherAt);
    await db.fleetWeatherExposure.upsert({
      where: { assetId_date: { assetId, date: new Date(dayStart) } },
      create: { licenseeId: asset.licenseeId, assetId, date: new Date(dayStart), ...totals, thresholdSetId: thresholdSet.id, source: WEATHER_SOURCE },
      update: { ...totals, thresholdSetId: thresholdSet.id, source: WEATHER_SOURCE, computedAt: new Date() },
    });
    stored++;
  }
  return { assets: stored, skipped: null };
}

/** Client view: per machine totals and the share of operating hours in each harsh condition. */
export async function exposureSummary(db: Db, licenseeId: string, from: Date, toExclusive: Date) {
  const rows = await db.fleetWeatherExposure.findMany({
    where: { licenseeId, date: { gte: from, lt: toExclusive } },
    include: { asset: { select: { assetTag: true, name: true, category: true } }, thresholdSet: true },
    orderBy: { date: 'asc' },
  });
  const byAsset = new Map<string, { assetTag: string; name: string; category: string; operating: Prisma.Decimal; heat: Prisma.Decimal; frost: Prisma.Decimal; rain: Prisma.Decimal; wind: Prisma.Decimal; days: number }>();
  const versions = new Set<string>();
  for (const r of rows) {
    versions.add(r.thresholdSet.version);
    const a = byAsset.get(r.assetId) ?? { assetTag: r.asset.assetTag, name: r.asset.name, category: r.asset.category, operating: new D(0), heat: new D(0), frost: new D(0), rain: new D(0), wind: new D(0), days: 0 };
    a.operating = a.operating.add(r.operatingHours);
    a.heat = a.heat.add(r.heatHours);
    a.frost = a.frost.add(r.frostHours);
    a.rain = a.rain.add(r.heavyRainHours);
    a.wind = a.wind.add(r.highWindHours);
    a.days++;
    byAsset.set(r.assetId, a);
  }
  const s = (d: Prisma.Decimal) => d.toDecimalPlaces(2).toString();
  return {
    thresholdVersions: [...versions].sort(),
    source: WEATHER_SOURCE,
    assets: [...byAsset.entries()].map(([assetId, a]) => ({
      assetId,
      assetTag: a.assetTag,
      name: a.name,
      category: a.category,
      daysMeasured: a.days,
      operatingHours: s(a.operating),
      heatHours: s(a.heat),
      frostHours: s(a.frost),
      heavyRainHours: s(a.rain),
      highWindHours: s(a.wind),
    })),
  };
}
