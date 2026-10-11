import { Router, Request, Response } from 'express';
import { EntitlementStatus, Prisma, PrismaClient, ServiceLine } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { parseRange } from './fleet.route';
import { LOCATION_RETENTION_DAYS } from '../services/fleet/fleet-retention.service';
import { computeExposureForDate, exposureSummary, readWeatherConfig } from '../services/fleet/weather-exposure.service';
import { publishWearCoefficients } from '../services/fleet/fleet-valuation.service';
import { FleetValidationError } from '../services/fleet/fleet-asset.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const ADMIN_SCOPE = { role: 'ADMIN', licenseeId: null };

const serializeSet = (s: Prisma.WeatherThresholdSetGetPayload<object>) => ({
  ...s,
  heatAboveC: s.heatAboveC.toString(),
  frostBelowC: s.frostBelowC.toString(),
  heavyRainMmPerHour: s.heavyRainMmPerHour.toString(),
  highWindKmh: s.highWindKmh.toString(),
});

/** Weather exposure for clients, and threshold management and recalculation for administrators. */
export function createWeatherRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/api/fleet/weather', authenticateToken, async (req: Request, res: Response) => {
    const licenseeId = req.user?.licenseeId;
    if (!licenseeId) return res.status(403).json({ error: 'A client account is required for Fleet.' });
    const entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId, serviceLine: ServiceLine.FLEET } },
    });
    if (entitlement?.status !== EntitlementStatus.ACTIVE) {
      return res.status(402).json({ error: 'An active Fleet subscription is required.', code: 'FLEET_SUBSCRIPTION_REQUIRED' });
    }
    const range = parseRange(req);
    if (!range) return res.status(400).json({ error: 'from and to must be dates (YYYY-MM-DD), at most 3 years apart.' });
    try {
      const [summary, active] = await Promise.all([
        runWithRls(prisma, req.user!, (tx) => exposureSummary(tx, licenseeId, range.from, range.to)),
        prisma.weatherThresholdSet.findFirst({ where: { active: true } }),
      ]);
      return res.json({ configured: readWeatherConfig() !== null, activeThresholds: active ? serializeSet(active) : null, ...summary });
    } catch (err) {
      console.error('[FLEET WEATHER]', err);
      return res.status(500).json({ error: 'Weather exposure is unavailable right now.' });
    }
  });

  router.use('/api/admin/weather', authenticateToken, requireAdmin);

  router.get('/api/admin/weather/thresholds', async (_req: Request, res: Response) => {
    const sets = await prisma.weatherThresholdSet.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ configured: readWeatherConfig() !== null, sets: sets.map(serializeSet) });
  });

  /** Publishes a new threshold version and makes it the active one. Old versions stay for the figures that used them. */
  router.post('/api/admin/weather/thresholds', async (req: Request, res: Response) => {
    const b = (req.body || {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === 'string' && /^-?\d{1,3}(\.\d{1,2})?$/.test(v) ? new Prisma.Decimal(v) : null);
    const heat = num(b.heatAboveC);
    const frost = num(b.frostBelowC);
    const rain = num(b.heavyRainMmPerHour);
    const wind = num(b.highWindKmh);
    if (!heat || !frost || !rain || !wind) return res.status(400).json({ error: 'Each threshold must be a number with up to 2 decimal places, sent as text.' });
    if (!frost.lt(heat) || !rain.gt(0) || !wind.gt(0)) return res.status(400).json({ error: 'Frost must be below heat, and rain and wind thresholds above zero.' });
    if (typeof b.version !== 'string' || !/^[A-Za-z0-9._-]{1,30}$/.test(b.version)) return res.status(400).json({ error: 'version must be 1 to 30 letters, digits, dots, dashes or underscores.' });
    if (typeof b.source !== 'string' || b.source.trim().length < 3 || b.source.length > 500) return res.status(400).json({ error: 'source must say where these thresholds come from.' });
    try {
      const set = await prisma.$transaction(async (tx) => {
        await tx.weatherThresholdSet.updateMany({ where: { active: true }, data: { active: false } });
        return tx.weatherThresholdSet.create({
          data: { version: b.version as string, heatAboveC: heat, frostBelowC: frost, heavyRainMmPerHour: rain, highWindKmh: wind, source: (b.source as string).trim(), active: true, createdByUserId: req.user!.userId },
        });
      });
      return res.status(201).json({ set: serializeSet(set) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return res.status(409).json({ error: 'That version already exists.' });
      console.error('[WEATHER THRESHOLDS CREATE]', err);
      return res.status(500).json({ error: 'Failed to save thresholds.' });
    }
  });

  router.get('/api/admin/wear-coefficients', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
    const sets = await prisma.wearCoefficientSet.findMany({ orderBy: { createdAt: 'desc' }, include: { coefficients: { orderBy: { category: 'asc' } } } });
    return res.json({
      sets: sets.map((s) => ({
        ...s,
        coefficients: s.coefficients.map((c) => ({
          category: c.category,
          heatPctPerHour: c.heatPctPerHour.toString(),
          frostPctPerHour: c.frostPctPerHour.toString(),
          rainPctPerHour: c.rainPctPerHour.toString(),
          windPctPerHour: c.windPctPerHour.toString(),
        })),
      })),
    });
  });

  router.post('/api/admin/wear-coefficients', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const set = await publishWearCoefficients(prisma, (req.body || {}) as Record<string, unknown>, req.user!.userId);
      return res.status(201).json({ set: { id: set.id, version: set.version, active: set.active, count: set.coefficients.length } });
    } catch (err) {
      if (err instanceof FleetValidationError) return res.status(err.status).json({ error: err.message });
      console.error('[WEAR COEFFICIENTS CREATE]', err);
      return res.status(500).json({ error: 'Failed to publish coefficients.' });
    }
  });

  /** Recalculates exposure for a range of days within the location retention period. */
  router.post('/api/admin/weather/recompute', async (req: Request, res: Response) => {
    const config = readWeatherConfig();
    if (!config) return res.status(409).json({ error: 'Weather is off. Set OPEN_METEO_ARCHIVE_URL and OPEN_METEO_API_KEY.' });
    const { from, to } = (req.body || {}) as { from?: unknown; to?: unknown };
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof from !== 'string' || typeof to !== 'string' || !re.test(from) || !re.test(to) || to < from) {
      return res.status(400).json({ error: 'from and to must be dates (YYYY-MM-DD), to on or after from.' });
    }
    const earliest = Date.now() - LOCATION_RETENTION_DAYS * DAY_MS;
    const start = Date.parse(`${from}T00:00:00Z`);
    const end = Date.parse(`${to}T00:00:00Z`);
    if (start < earliest) return res.status(400).json({ error: `Locations are kept for ${LOCATION_RETENTION_DAYS} days, so only that period can be recalculated.` });
    if (end >= Date.now() - DAY_MS + 1) return res.status(400).json({ error: 'Only complete past days can be calculated.' });
    try {
      let assets = 0;
      let skipped: string | null = null;
      for (let t = start; t <= end; t += DAY_MS) {
        const r = await runWithRls(prisma, ADMIN_SCOPE, (tx) => computeExposureForDate(tx, new Date(t), config));
        assets += r.assets;
        skipped = r.skipped;
        if (skipped) break;
      }
      return res.json({ machineDays: assets, skipped });
    } catch (err) {
      console.error('[WEATHER RECOMPUTE]', err);
      return res.status(502).json({ error: 'The weather provider could not be reached. Try again later.' });
    }
  });

  return router;
}
