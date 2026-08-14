import { Router, Request, Response } from 'express';
import { PrismaClient, TransactionStatus, DeliveryType, FulfillmentStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { getCertificateAggregateData, generateCertificatePdf } from '../services/certificate.service';

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
        const countByStatus: Record<string, number> = {
          PENDING: 0,
          SETTLED: 0,
          REFUNDED: 0,
          REVERSED: 0,
          FAILED: 0,
        };

        for (const transaction of transactions) {
          countByStatus[transaction.status] = (countByStatus[transaction.status] || 0) + 1;
          if (transaction.status === TransactionStatus.SETTLED && transaction.financialSplit) {
            totalCharityGiftCentsSettled += transaction.financialSplit.charityGiftCents;
          }
        }

        return {
          licenseeId: targetLicenseeId || 'ALL',
          totalLogoDrops,
          totalCharityGiftCentsSettled,
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

  return router;
}
