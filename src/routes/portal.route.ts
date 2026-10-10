import { Router, Request, Response } from 'express';
import { PrismaClient, TransactionStatus, DeliveryType, FulfillmentStatus, PeriodType, ReportSource } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { getCertificateAggregateData, generateCertificatePdf } from '../services/certificate.service';
import { validateAttestationNote } from '../services/transaction.service';

export function createPortalRouter(prisma: PrismaClient): Router {
  const router = Router();

  // Protect all portal routes with JWT authentication middleware
  router.use('/api/portal', authenticateToken);

  /**
   * PATCH /api/portal/transactions/:id/fulfillment
   * Updates fulfillmentStatus for physical delivery trigger events.
   * Authenticated via PARTNER portal JWT, RLS-scoped to caller's licensee.
   * Body: { status: 'CONFIRMED' | 'FAILED' }
   */
  router.patch('/api/portal/transactions/:id/fulfillment', async (req: Request, res: Response) => {
    const user = req.user!;
    const transactionId = req.params.id;
    const { status } = req.body || {};

    if (status !== FulfillmentStatus.CONFIRMED && status !== FulfillmentStatus.FAILED) {
      return res.status(400).json({ error: "Invalid input: status must be 'CONFIRMED' or 'FAILED'." });
    }

    try {
      const result = await runWithRls(prisma, user, async (tx) => {
        // Fetch transaction within RLS transaction block
        const transaction = await tx.transaction.findUnique({
          where: { id: transactionId },
          include: { triggerEvent: true },
        });

        if (!transaction || !transaction.triggerEvent) {
          return { error: 'NOT_FOUND', status: 404 };
        }

        if (transaction.triggerEvent.deliveryType !== DeliveryType.PHYSICAL) {
          return { error: 'INVALID_DELIVERY_TYPE', status: 400 };
        }

        const updatedTriggerEvent = await tx.triggerEvent.update({
          where: { id: transaction.triggerEvent.id },
          data: { fulfillmentStatus: status },
        });

        return { data: { ...transaction, triggerEvent: updatedTriggerEvent } };
      });

      if ('error' in result) {
        if (result.error === 'INVALID_DELIVERY_TYPE') {
          return res.status(400).json({ error: 'Fulfillment status can only be updated for PHYSICAL delivery transactions.' });
        }
        return res.status(404).json({ error: 'Transaction not found or access denied.' });
      }

      return res.status(200).json(result.data);
    } catch (err) {
      console.error('[PORTAL FULFILLMENT ERROR]', err);
      return res.status(500).json({ error: 'Failed to update fulfillment status' });
    }
  });

  /**
   * GET /api/portal/transactions
   * Paginated transaction ledger for authenticated licensee.
   * PARTNER role is strictly restricted to req.user.licenseeId (ignoring any query override).
   * ADMIN role can optionally supply ?licenseeId=.
   */
  router.get('/api/portal/transactions', async (req: Request, res: Response) => {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    // Defense-in-depth: PARTNER role ignores query params and enforces session scope
    const targetLicenseeId =
      user.role === 'ADMIN' ? (req.query.licenseeId as string) || undefined : user.licenseeId || undefined;

    try {
      const result = await runWithRls(prisma, user, async (tx) => {
        const whereCondition: any = {};
        if (targetLicenseeId) {
          whereCondition.licenseeId = targetLicenseeId;
        }

        const [transactions, total] = await Promise.all([
          tx.transaction.findMany({
            where: whereCondition,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              financialSplit: true,
              triggerEvent: true,
            },
          }),
          tx.transaction.count({ where: whereCondition }),
        ]);

        return { transactions, total };
      });

      return res.status(200).json({
        transactions: result.transactions,
        data: result.transactions,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      console.error('[PORTAL TRANSACTIONS ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve transactions' });
    }
  });

  /**
   * GET /api/portal/summary
   * Aggregate totals for the scoped licensee:
   * - Total logo drops (transaction count)
   * - Total charity gift cents settled
   * - Breakdown count by TransactionStatus
   */
  router.get('/api/portal/summary', async (req: Request, res: Response) => {
    const user = req.user!;
    const targetLicenseeId =
      user.role === 'ADMIN' ? (req.query.licenseeId as string) || undefined : user.licenseeId || undefined;

    try {
      const summary = await runWithRls(prisma, user, async (tx) => {
        const whereCondition: any = {};
        if (targetLicenseeId) {
          whereCondition.licenseeId = targetLicenseeId;
        }

        const transactions = await tx.transaction.findMany({
          where: whereCondition,
          include: { financialSplit: true },
        });

        const totalLogoDrops = transactions.length;

        let totalCharityGiftCentsSettled = 0;
        let totalGrossCentsSettled = 0;
        const countByStatus: Record<string, number> = {
          PENDING: 0,
          SETTLED: 0,
          REFUNDED: 0,
          REVERSED: 0,
          FAILED: 0,
        };

        for (const transaction of transactions) {
          countByStatus[transaction.status] = (countByStatus[transaction.status] || 0) + 1;
          if (transaction.status === TransactionStatus.SETTLED) {
            totalGrossCentsSettled += transaction.grossAmountCents;
            if (transaction.financialSplit) {
              totalCharityGiftCentsSettled += transaction.financialSplit.charityGiftCents;
            }
          }
        }

        return {
          licenseeId: targetLicenseeId || 'ALL',
          totalLogoDrops,
          totalCharityGiftCentsSettled,
          totalGrossCentsSettled,
          countByStatus,
        };
      });

      return res.status(200).json(summary);
    } catch (err) {
      console.error('[PORTAL SUMMARY ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve portal summary' });
    }
  });

  /**
   * GET /api/portal/certificate
   * Generates a PDF compliance certificate from real database aggregates.
   * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD (optional date range)
   * ADMIN may pass ?licenseeId=. PARTNER strictly uses req.user.licenseeId.
   */
  router.get('/api/portal/certificate', async (req: Request, res: Response) => {
    const user = req.user!;
    const targetLicenseeId =
      user.role === 'ADMIN' ? (req.query.licenseeId as string) || user.licenseeId : user.licenseeId;

    if (!targetLicenseeId) {
      return res.status(400).json({ error: 'licenseeId query parameter is required for admin' });
    }

    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    try {
      const aggregateData = await getCertificateAggregateData(prisma, {
        licenseeId: targetLicenseeId,
        user,
        from,
        to,
      });

      const pdfBuffer = await generateCertificatePdf(aggregateData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="compliance-certificate-${targetLicenseeId}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('[PORTAL CERTIFICATE ERROR]', err);
      return res.status(500).json({ error: 'Failed to generate compliance certificate' });
    }
  });

  /**
   * POST /api/portal/job-reports
   * Self-report submission endpoint for authenticated portal users.
   * PARTNER role is strictly restricted to caller's req.user.licenseeId (ignoring any body override).
   * Body: { periodType, periodStart, periodEnd, jobsCreated, attestationNote? }
   */
  router.post('/api/portal/job-reports', async (req: Request, res: Response) => {
    const user = req.user!;
    const targetLicenseeId =
      user.role === 'ADMIN' ? (req.body.licenseeId as string) || user.licenseeId : user.licenseeId;

    if (!targetLicenseeId) {
      return res.status(403).json({ error: 'Access denied: Partner account has no associated licenseeId.' });
    }

    const { periodType, periodStart, periodEnd, jobsCreated, attestationNote: customNote } = req.body || {};

    // 1. Validate periodType
    if (periodType !== PeriodType.QUARTERLY && periodType !== PeriodType.ANNUAL) {
      return res.status(400).json({ error: "Invalid input: periodType must be 'QUARTERLY' or 'ANNUAL'." });
    }

    // 2. Validate period dates
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid input: periodStart and periodEnd must be valid date strings.' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'Invalid input: periodEnd must be after periodStart.' });
    }

    // 3. Validate jobsCreated (non-negative integer, 0 is explicitly valid)
    if (typeof jobsCreated !== 'number' || !Number.isInteger(jobsCreated) || jobsCreated < 0) {
      return res.status(400).json({ error: 'Invalid input: jobsCreated must be a non-negative integer.' });
    }

    // 4. Validate custom attestationNote if provided
    let finalNote = "Self-reported by partner via portal. Not independently verified.";
    if (customNote && typeof customNote === 'string' && customNote.trim().length > 0) {
      try {
        const validated = validateAttestationNote(customNote);
        if (validated) {
          finalNote = validated;
        }
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    }

    try {
      const report = await runWithRls(prisma, user, async (tx) => {
        return tx.jobCreationReport.create({
          data: {
            licenseeId: targetLicenseeId,
            periodType,
            periodStart: startDate,
            periodEnd: endDate,
            jobsCreated,
            reportSource: ReportSource.MANUAL_ATTESTATION,
            attestationNote: finalNote,
            submittedByUserId: user.userId,
          },
        });
      });

      return res.status(201).json(report);
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('JobCreationReport_licenseeId_periodType_periodStart_period')) {
        return res.status(409).json({ error: 'Duplicate report: A report for this exact period and type already exists.' });
      }
      console.error('[PORTAL JOB REPORT SUBMISSION ERROR]', err);
      return res.status(500).json({ error: 'Failed to submit job creation report.' });
    }
  });

  /**
   * GET /api/portal/job-reports
   * Retrieves list of submitted job creation reports for authenticated licensee.
   * PARTNER role strictly restricted to req.user.licenseeId (RLS-backed).
   * ADMIN may pass ?licenseeId=.
   */
  router.get('/api/portal/job-reports', async (req: Request, res: Response) => {
    const user = req.user!;
    const targetLicenseeId =
      user.role === 'ADMIN' ? (req.query.licenseeId as string) || user.licenseeId : user.licenseeId;

    if (!targetLicenseeId) {
      return res.status(403).json({ error: 'Access denied: Partner account has no associated licenseeId.' });
    }

    try {
      const reports = await runWithRls(prisma, user, async (tx) => {
        return tx.jobCreationReport.findMany({
          where: { licenseeId: targetLicenseeId },
          orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
        });
      });

      return res.status(200).json({ data: reports });
    } catch (err) {
      console.error('[PORTAL GET JOB REPORTS ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve job creation reports.' });
    }
  });

  /**
   * GET /api/portal/dashboard
   * Part B.5 Standard Client Profile Dashboard endpoint:
   * Returns unified profile, multi-role chips, top audit cards, reverse-chronological activity feed
   * (including drafts/in-progress items), credentials panel, and telemetry API access.
   * Scoped via RLS to authenticated user. Admins can inspect any client with ?licenseeId= or ?userId=.
   */
  router.get('/api/portal/dashboard', async (req: Request, res: Response) => {
    const user = req.user!;
    const targetLicenseeId =
      user.role === 'ADMIN' ? (req.query.licenseeId as string) || user.licenseeId : user.licenseeId;
    const targetUserId =
      user.role === 'ADMIN' ? (req.query.userId as string) || user.userId : user.userId;

    try {
      const { DashboardService } = await import('../services/dashboard.service');
      const dashboardService = new DashboardService(prisma);

      const data = await runWithRls(prisma, user, async () => {
        return dashboardService.getDashboardData(targetUserId, targetLicenseeId);
      });

      return res.status(200).json({ success: true, dashboard: data });
    } catch (err: any) {
      console.error('[PORTAL DASHBOARD ERROR]', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve client profile dashboard data.' });
    }
  });

  return router;
}

