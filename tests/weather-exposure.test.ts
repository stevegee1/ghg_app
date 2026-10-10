import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Prisma, PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import {
  computeExposureForDate,
  exposureForDay,
  operatingIntervals,
  readWeatherConfig,
  WEATHER_ENV,
  type HourlyWeather,
} from '../src/services/fleet/weather-exposure.service';

const prisma = new PrismaClient();
const app = createApp();
const D = Prisma.Decimal;
const s = Date.now().toString(36);
const DAY = Date.UTC(2026, 0, 15);
const H = 60 * 60 * 1000;

const snap = (hoursFromDayStart: number, cumulative: number, located = true) => ({
  observedAt: new Date(DAY + hoursFromDayStart * H),
  cumulativeOperatingHours: new D(cumulative),
  latitude: located ? new D('52.30') : null,
  longitude: located ? new D('-0.10') : null,
  counterReset: false,
});

/** 24 hours: frost before 06:00, mild after; heavy rain 10:00-11:00; high wind 14:00-15:00. */
const dayWeather = (): HourlyWeather[] =>
  Array.from({ length: 24 }, (_, h) => ({
    hourStart: DAY + h * H,
    tempC: h < 6 ? -4 : 12,
    precipMm: h === 10 ? 6 : 0,
    windKmh: h === 14 ? 70 : 15,
  }));

const thresholds = { heatAboveC: new D(30), frostBelowC: new D(0), heavyRainMmPerHour: new D(4), highWindKmh: new D(50) };

describe('Weather exposure calculation', () => {
  it('spreads operating hours evenly between readings and clips them to the day', () => {
    const iv = operatingIntervals([snap(-2, 100), snap(2, 104), snap(4, 104), snap(8, 108, false), snap(12, 112)], DAY);
    // -2h..2h ran 4 hours, half inside the day; 2h..4h idle; 8h..12h starts unlocated, so the end's location is used.
    expect(iv.map((i) => [i.start - DAY, i.end - DAY, i.hours.toString()])).toEqual([
      [0, 2 * H, '2'],
      [4 * H, 8 * H, '4'],
      [8 * H, 12 * H, '4'],
    ]);
  });

  it('counts each operating hour against the weather in that hour', async () => {
    // Runs 04:00-12:00 for 8 hours, then 13:00-15:00 for 2 hours.
    const iv = operatingIntervals([snap(4, 0), snap(12, 8), snap(13, 8), snap(15, 10)], DAY);
    const r = await exposureForDay(iv, thresholds, async () => dayWeather());
    expect(r.operatingHours.toString()).toBe('10');
    expect(r.frostHours.toString()).toBe('2'); // 04:00-06:00
    expect(r.heavyRainHours.toString()).toBe('1'); // 10:00-11:00
    expect(r.highWindHours.toString()).toBe('1'); // 14:00-15:00
    expect(r.heatHours.toString()).toBe('0');
  });
});

describe('Weather configuration', () => {
  const saved = { a: process.env[WEATHER_ENV.archiveUrl], k: process.env[WEATHER_ENV.apiKey] };
  afterAll(() => {
    for (const [env, v] of [[WEATHER_ENV.archiveUrl, saved.a], [WEATHER_ENV.apiKey, saved.k]] as const) {
      if (v === undefined) delete process.env[env];
      else process.env[env] = v;
    }
  });
  it('is off when unset and refuses half or insecure configuration', () => {
    delete process.env[WEATHER_ENV.archiveUrl];
    delete process.env[WEATHER_ENV.apiKey];
    expect(readWeatherConfig()).toBeNull();
    process.env[WEATHER_ENV.archiveUrl] = 'https://customer-archive-api.open-meteo.example/v1/archive';
    expect(() => readWeatherConfig()).toThrow(/both/);
    process.env[WEATHER_ENV.apiKey] = 'key';
    expect(readWeatherConfig()).toEqual({ archiveUrl: 'https://customer-archive-api.open-meteo.example/v1/archive', apiKey: 'key' });
    process.env[WEATHER_ENV.archiveUrl] = 'http://insecure.example/v1/archive';
    expect(() => readWeatherConfig()).toThrow(/https/);
  });
});

describe('Stored exposure, thresholds and the client view', () => {
  let licenseeId: string;
  let assetId: string;
  let token: string;
  const admin = jwt.sign({ userId: 'admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
  const requested: string[] = [];
  const fetcher = async (url: string) => {
    requested.push(url);
    const weather = dayWeather();
    return {
      ok: true,
      status: 200,
      json: async () => ({
        hourly: {
          time: weather.map((w) => new Date(w.hourStart).toISOString().slice(0, 16)),
          temperature_2m: weather.map((w) => w.tempC),
          precipitation: weather.map((w) => w.precipMm),
          wind_speed_10m: weather.map((w) => w.windKmh),
        },
      }),
    };
  };

  beforeAll(async () => {
    licenseeId = (await prisma.licensee.create({ data: { name: `Weather ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
    await prisma.serviceEntitlement.create({ data: { licenseeId, serviceLine: 'FLEET', status: 'ACTIVE' } });
    token = jwt.sign({ userId: `u_${s}`, role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
    assetId = (
      await prisma.fleetAsset.create({
        data: { licenseeId, assetTag: 'EX-W', name: 'Excavator', category: 'EXCAVATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true },
      })
    ).id;
    const schema = await prisma.fleetSchemaVersion.findFirstOrThrow();
    const rows = [snap(4, 500), snap(12, 508), snap(13, 508), snap(15, 510)];
    for (const [i, r] of rows.entries()) {
      await prisma.fleetTelemetrySnapshot.create({
        data: { ...r, licenseeId, assetId, schemaVersionId: schema.id, source: 'CLIENT_API', payloadSha256: `${'a'.repeat(63)}${i}` },
      });
    }
  });

  afterAll(async () => {
    await prisma.fleetWeatherExposure.deleteMany({ where: { licenseeId } });
    await prisma.fleetTelemetrySnapshot.deleteMany({ where: { licenseeId } });
    await prisma.fleetAsset.deleteMany({ where: { licenseeId } });
    await prisma.serviceEntitlement.deleteMany({ where: { licenseeId } });
    await prisma.licensee.delete({ where: { id: licenseeId } });
    await prisma.$disconnect();
  });

  it('measures nothing until an administrator publishes thresholds', async () => {
    await prisma.weatherThresholdSet.updateMany({ where: { active: true }, data: { active: false } });
    const r = await computeExposureForDate(prisma, new Date(DAY), { archiveUrl: 'https://weather.example/archive', apiKey: 'k' }, fetcher);
    expect(r.skipped).toMatch(/No active/);
  });

  it('publishes versioned thresholds that cannot be edited afterwards', async () => {
    const post = (body: object) => request(app).post('/api/admin/weather/thresholds').set('Authorization', `Bearer ${admin}`).send(body);
    const body = { version: `test-${s}`, heatAboveC: '30', frostBelowC: '0', heavyRainMmPerHour: '4', highWindKmh: '50', source: 'Test thresholds' };
    await post({ ...body, frostBelowC: '40' }).expect(400);
    const created = await post(body).expect(201);
    expect(created.body.set.active).toBe(true);
    await post(body).expect(409);
    await expect(prisma.weatherThresholdSet.update({ where: { id: created.body.set.id }, data: { heatAboveC: 25 } })).rejects.toThrow();
  });

  it('stores daily exposure per machine and shows it to the client only', async () => {
    const r = await computeExposureForDate(prisma, new Date(DAY), { archiveUrl: 'https://weather.example/archive', apiKey: 'k' }, fetcher);
    expect(r.skipped).toBeNull();
    expect(requested[0]).toContain('latitude=52.30');
    expect(requested[0]).toContain('apikey=k');

    const stored = await prisma.fleetWeatherExposure.findUniqueOrThrow({ where: { assetId_date: { assetId, date: new Date(DAY) } } });
    expect(stored.operatingHours.toString()).toBe('10');
    expect(stored.frostHours.toString()).toBe('2');

    const res = await request(app).get('/api/fleet/weather?from=2026-01-01&to=2026-01-31').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.assets).toEqual([
      expect.objectContaining({ assetTag: 'EX-W', operatingHours: '10', frostHours: '2', heavyRainHours: '1', highWindHours: '1', daysMeasured: 1 }),
    ]);
    expect(res.body.thresholdVersions).toEqual([`test-${s}`]);

    const other = jwt.sign({ userId: 'u', role: 'PARTNER', licenseeId: 'lic_itm_power' }, JWT_SECRET, { expiresIn: '1h' });
    await request(app).get('/api/fleet/weather?from=2026-01-01&to=2026-01-31').set('Authorization', `Bearer ${other}`).expect((r2) => {
      if (r2.status === 200) expect(r2.body.assets.some((a: { assetTag: string }) => a.assetTag === 'EX-W')).toBe(false);
    });
  });
});
