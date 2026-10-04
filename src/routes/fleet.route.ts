import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import Stripe from 'stripe';
import { EntitlementStatus, FleetFuelType, Prisma, PrismaClient, ServiceLine } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import {
  ASSET_CSV_COLUMNS,
  READING_CSV_COLUMNS,
  FUEL_CARD_CSV_COLUMNS,
  FleetImportFileError,
  importFleetAssets,
  importFleetReadings,
  importFuelCardTransactions,
} from '../services/fleet/fleet-import.service';
import {
  FleetValidationError,
  createFleetAsset,
  updateFleetAsset,
  createEmissionFactor,
  retireEmissionFactor,
} from '../services/fleet/fleet-asset.service';
import { getFleetSummary, buildFleetReportPdf, estimateFuelEmissions } from '../services/fleet/fleet-reporting.service';
import { EmissionFactorMissingError } from '../services/fleet/emission-factor.service';
import {
  FleetBillingError,
  createFleetSubscriptionCheckout,
  createFleetBillingPortal,
  getFleetPricing,
  syncFleetQuantity,
} from '../services/fleet/fleet-billing.service';

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const okName = file.originalname.toLowerCase().endsWith('.csv');
    const okType = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'].includes(file.mimetype);
    if (okName && okType) cb(null, true);
    else cb(new Error('Upload a .csv file.'));
  },
});

const TEMPLATES: Record<string, readonly string[]> = {
  assets: ASSET_CSV_COLUMNS,
  readings: READING_CSV_COLUMNS,
  'fuel-card': FUEL_CARD_CSV_COLUMNS,
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 3 * 366;

function parseRange(req: Request): { from: Date; to: Date } | null {
  const { from, to } = req.query;
  if (typeof from !== 'string' || typeof to !== 'string' || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) return null;
  const start = new Date(`${from}T00:00:00.000Z`);
  const endExclusive = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(endExclusive.getTime()) || endExclusive <= start) return null;
  if ((endExclusive.getTime() - start.getTime()) / DAY_MS > MAX_RANGE_DAYS) return null;
  return { from: start, to: endExclusive };
}

function sendError(res: Response, err: unknown, logTag: string) {
  if (err instanceof FleetValidationError || err instanceof FleetBillingError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof FleetImportFileError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof EmissionFactorMissingError) {
    return res.status(409).json({ error: err.message });
  }
  console.error(logTag, err);
  return res.status(500).json({ error: 'The request could not be completed.' });
}

export function createFleetRouter(prisma: PrismaClient, stripe: Stripe): Router {
  const router = Router();

  const requireLicensee = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.licenseeId) {
      return res.status(403).json({ error: 'A client account is required for Fleet.' });
    }
    next();
  };

  const requireFleetEntitlement = async (req: Request, res: Response, next: NextFunction) => {
    const entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId: req.user!.licenseeId!, serviceLine: ServiceLine.FLEET } },
    });
    if (entitlement?.status !== EntitlementStatus.ACTIVE) {
      return res.status(402).json({ error: 'An active Fleet subscription is required.', code: 'FLEET_SUBSCRIPTION_REQUIRED' });
    }
    next();
  };

  const handleUpload = (req: Request, res: Response, next: NextFunction) => {
    csvUpload.single('file')(req, res, (err: unknown) => {
      if (err) return res.status(400).json({ error: (err as Error).message });
      if (!req.file) return res.status(400).json({ error: 'Attach the CSV file in the "file" field.' });
      next();
    });
  };

  /** Keeps the subscription quantity in step with active assets; billing failures never block saving data. */
  const syncQuantity = async (licenseeId: string): Promise<boolean> => {
    try {
      await syncFleetQuantity(prisma, stripe, licenseeId);
      return true;
    } catch (err) {
      console.error('[FLEET BILLING SYNC ERROR]', err);
      return false;
    }
  };

  // ── Public ──────────────────────────────────────────────────────────────

  router.get('/api/fleet/calculator/fuel-types', async (_req: Request, res: Response) => {
    try {
      const factors = await prisma.emissionFactor.findMany({
        where: { retiredAt: null, publicationYear: { lte: new Date().getUTCFullYear() } },
        select: { fuelType: true },
        distinct: ['fuelType'],
      });
      return res.status(200).json({ fuelTypes: factors.map((f) => f.fuelType) });
    } catch (err) {
      return sendError(res, err, '[FLEET CALCULATOR FUEL TYPES ERROR]');
    }
  });

  router.post('/api/fleet/calculator', async (req: Request, res: Response) => {
    const { fuelType, litres } = req.body || {};
    if (typeof fuelType !== 'string' || !(Object.values(FleetFuelType) as string[]).includes(fuelType)) {
      return res.status(400).json({ error: 'Choose a fuel type.' });
    }
    const litresText = typeof litres === 'number' ? String(litres) : litres;
    if (typeof litresText !== 'string' || !/^\d{1,9}(\.\d{1,3})?$/.test(litresText)) {
      return res.status(400).json({ error: 'Enter litres as a positive number.' });
    }
    try {
      const estimate = await estimateFuelEmissions(prisma, fuelType as FleetFuelType, new Prisma.Decimal(litresText));
      return res.status(200).json(estimate);
    } catch (err) {
      return sendError(res, err, '[FLEET CALCULATOR ERROR]');
    }
  });

  // ── Client ──────────────────────────────────────────────────────────────

  router.get('/api/fleet/templates/:kind', authenticateToken, (req: Request, res: Response) => {
    const columns = TEMPLATES[req.params.kind];
    if (!columns) return res.status(404).json({ error: 'Unknown template.' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fleet-${req.params.kind}-template.csv"`);
    return res.status(200).send(`${columns.join(',')}\r\n`);
  });

  router.get('/api/fleet/overview', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const overview = await runWithRls(prisma, user, async (tx) => {
        const [activeAssets, totalAssets, subscription, lastImport] = await Promise.all([
          tx.fleetAsset.count({ where: { licenseeId: user.licenseeId!, active: true } }),
          tx.fleetAsset.count({ where: { licenseeId: user.licenseeId! } }),
          tx.fleetSubscription.findUnique({ where: { licenseeId: user.licenseeId! } }),
          tx.fleetImportBatch.findFirst({ where: { licenseeId: user.licenseeId! }, orderBy: { createdAt: 'desc' } }),
        ]);
        return { activeAssets, totalAssets, subscription, lastImport };
      });
      const entitlement = await prisma.serviceEntitlement.findUnique({
        where: { licenseeId_serviceLine: { licenseeId: user.licenseeId!, serviceLine: ServiceLine.FLEET } },
      });
      return res.status(200).json({
        activeAssets: overview.activeAssets,
        totalAssets: overview.totalAssets,
        entitlementStatus: entitlement?.status ?? null,
        subscription: overview.subscription
          ? {
              status: overview.subscription.status,
              quantity: overview.subscription.quantity,
              currentPeriodEnd: overview.subscription.currentPeriodEnd,
            }
          : null,
        lastImportAt: overview.lastImport?.createdAt ?? null,
      });
    } catch (err) {
      return sendError(res, err, '[FLEET OVERVIEW ERROR]');
    }
  });

  router.get('/api/fleet/assets', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const assets = await runWithRls(prisma, user, (tx) =>
        tx.fleetAsset.findMany({
          where: { licenseeId: user.licenseeId! },
          orderBy: [{ active: 'desc' }, { assetTag: 'asc' }],
          include: { _count: { select: { readings: true } } },
        })
      );
      return res.status(200).json({ assets });
    } catch (err) {
      return sendError(res, err, '[FLEET ASSETS LIST ERROR]');
    }
  });

  router.post('/api/fleet/assets', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const asset = await runWithRls(prisma, user, (tx) => createFleetAsset(tx, user.licenseeId!, req.body || {}));
      const billingSynced = await syncQuantity(user.licenseeId!);
      return res.status(201).json({ asset, billingSynced });
    } catch (err) {
      return sendError(res, err, '[FLEET ASSET CREATE ERROR]');
    }
  });

  router.patch('/api/fleet/assets/:id', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const asset = await runWithRls(prisma, user, (tx) => updateFleetAsset(tx, user.licenseeId!, req.params.id, req.body || {}));
      const billingSynced = await syncQuantity(user.licenseeId!);
      return res.status(200).json({ asset, billingSynced });
    } catch (err) {
      return sendError(res, err, '[FLEET ASSET UPDATE ERROR]');
    }
  });

  router.post('/api/fleet/assets/import', authenticateToken, requireLicensee, handleUpload, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const result = await runWithRls(prisma, user, (tx) =>
        importFleetAssets(tx, { userId: user.userId, licenseeId: user.licenseeId! }, req.file!.buffer.toString('utf8'))
      );
      const billingSynced = result.created > 0 ? await syncQuantity(user.licenseeId!) : true;
      return res.status(result.created > 0 ? 201 : 422).json({ ...result, billingSynced });
    } catch (err) {
      return sendError(res, err, '[FLEET ASSET IMPORT ERROR]');
    }
  });

  router.post(
    '/api/fleet/readings/import',
    authenticateToken,
    requireLicensee,
    requireFleetEntitlement,
    handleUpload,
    async (req: Request, res: Response) => {
      const user = req.user!;
      const format = req.body?.format;
      if (format !== 'readings' && format !== 'fuel-card') {
        return res.status(400).json({ error: 'format must be "readings" or "fuel-card".' });
      }
      try {
        const actor = { userId: user.userId, licenseeId: user.licenseeId! };
        const text = req.file!.buffer.toString('utf8');
        const name = req.file!.originalname;
        const result = await runWithRls(prisma, user, (tx) =>
          format === 'readings' ? importFleetReadings(tx, actor, name, text) : importFuelCardTransactions(tx, actor, name, text)
        );
        return res.status(result.rowsAccepted > 0 ? 201 : 422).json(result);
      } catch (err) {
        return sendError(res, err, '[FLEET READINGS IMPORT ERROR]');
      }
    }
  );

  router.get('/api/fleet/imports', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const batches = await runWithRls(prisma, user, (tx) =>
        tx.fleetImportBatch.findMany({
          where: { licenseeId: user.licenseeId! },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            source: true,
            fileName: true,
            rowsReceived: true,
            rowsAccepted: true,
            rowsRejected: true,
            rejections: true,
            createdAt: true,
          },
        })
      );
      return res.status(200).json({ batches });
    } catch (err) {
      return sendError(res, err, '[FLEET IMPORTS LIST ERROR]');
    }
  });

  router.get('/api/fleet/summary', authenticateToken, requireLicensee, requireFleetEntitlement, async (req: Request, res: Response) => {
    const user = req.user!;
    const range = parseRange(req);
    if (!range) return res.status(400).json({ error: 'from and to must be dates (YYYY-MM-DD), to on or after from, within 3 years.' });
    try {
      const summary = await runWithRls(prisma, user, (tx) => getFleetSummary(tx, user.licenseeId!, range.from, range.to));
      return res.status(200).json(summary);
    } catch (err) {
      return sendError(res, err, '[FLEET SUMMARY ERROR]');
    }
  });

  router.get('/api/fleet/report.pdf', authenticateToken, requireLicensee, requireFleetEntitlement, async (req: Request, res: Response) => {
    const user = req.user!;
    const range = parseRange(req);
    if (!range) return res.status(400).json({ error: 'from and to must be dates (YYYY-MM-DD), to on or after from, within 3 years.' });
    try {
      const { summary, organisationName } = await runWithRls(prisma, user, async (tx) => ({
        summary: await getFleetSummary(tx, user.licenseeId!, range.from, range.to),
        organisationName: (await tx.licensee.findUnique({ where: { id: user.licenseeId! }, select: { name: true } }))?.name ?? '',
      }));
      const pdf = await buildFleetReportPdf(summary, organisationName);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="fleet-emissions-${summary.period.from}-to-${summary.period.to}.pdf"`);
      return res.status(200).send(pdf);
    } catch (err) {
      return sendError(res, err, '[FLEET REPORT ERROR]');
    }
  });

  router.get('/api/fleet/pricing', async (_req: Request, res: Response) => {
    try {
      return res.status(200).json(await getFleetPricing(stripe));
    } catch (err) {
      return sendError(res, err, '[FLEET PRICING ERROR]');
    }
  });

  router.post('/api/fleet/subscription/checkout', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    try {
      const account = await prisma.portalUser.findUnique({ where: { id: user.userId }, select: { email: true } });
      if (!account) return res.status(403).json({ error: 'Account not found.' });
      const result = await createFleetSubscriptionCheckout(prisma, stripe, {
        licenseeId: user.licenseeId!,
        customerEmail: account.email,
        successUrl: `${baseUrl}/portal?view=fleet&subscription=success`,
        cancelUrl: `${baseUrl}/portal?view=fleet&subscription=cancelled`,
      });
      return res.status(200).json(result);
    } catch (err) {
      return sendError(res, err, '[FLEET SUBSCRIPTION CHECKOUT ERROR]');
    }
  });

  router.post('/api/fleet/subscription/portal', authenticateToken, requireLicensee, async (req: Request, res: Response) => {
    const user = req.user!;
    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    try {
      const url = await createFleetBillingPortal(prisma, stripe, user.licenseeId!, `${baseUrl}/portal?view=fleet`);
      return res.status(200).json({ url });
    } catch (err) {
      return sendError(res, err, '[FLEET BILLING PORTAL ERROR]');
    }
  });

  // ── Admin ───────────────────────────────────────────────────────────────

  router.get('/api/admin/emission-factors', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const factors = await prisma.emissionFactor.findMany({
        orderBy: [{ fuelType: 'asc' }, { publicationYear: 'desc' }],
        include: { createdBy: { select: { email: true } } },
      });
      return res.status(200).json({ factors });
    } catch (err) {
      return sendError(res, err, '[EMISSION FACTORS LIST ERROR]');
    }
  });

  router.post('/api/admin/emission-factors', requireAdmin, async (req: Request, res: Response) => {
    try {
      const factor = await createEmissionFactor(prisma, req.body || {}, req.user!.userId);
      return res.status(201).json({ factor });
    } catch (err) {
      return sendError(res, err, '[EMISSION FACTOR CREATE ERROR]');
    }
  });

  router.post('/api/admin/emission-factors/:id/retire', requireAdmin, async (req: Request, res: Response) => {
    try {
      const factor = await retireEmissionFactor(prisma, req.params.id);
      return res.status(200).json({ factor });
    } catch (err) {
      return sendError(res, err, '[EMISSION FACTOR RETIRE ERROR]');
    }
  });

  router.get('/api/admin/fleet/subscriptions', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const subscriptions = await prisma.fleetSubscription.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { licensee: { select: { id: true, name: true } } },
      });
      return res.status(200).json({ subscriptions });
    } catch (err) {
      return sendError(res, err, '[FLEET SUBSCRIPTIONS LIST ERROR]');
    }
  });

  return router;
}
