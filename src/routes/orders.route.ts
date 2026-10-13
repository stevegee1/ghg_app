import { Router, Request, Response } from 'express';
import { PrismaClient, SouvenirOrderStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';

/**
 * Generates a human-readable order number: GHG-ORD-YYYY-XXXXX
 */
function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GHG-ORD-${year}-${suffix}`;
}

const STATUS_SEQUENCE: SouvenirOrderStatus[] = [
  'ORDER_PLACED',
  'SPLIT_DISBURSED',
  'QUEUED_FOR_PRINT',
  'IN_PRODUCTION',
  'QUALITY_INSPECTED',
  'DISPATCHED',
  'DELIVERED',
];

export function createOrdersRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * GET /api/orders/track/:orderNumber
   * Public endpoint: no auth required.
   * Returns sanitized order status for live tracking UI.
   */
  router.get('/api/orders/track/:orderNumber', async (req: Request, res: Response) => {
    const { orderNumber } = req.params;

    if (!orderNumber || typeof orderNumber !== 'string') {
      return res.status(400).json({ error: 'Order number is required.' });
    }

    try {
      const order = await prisma.souvenirOrder.findUnique({
        where: { orderNumber: orderNumber.trim().toUpperCase() },
        include: {
          transaction: {
            include: {
              financialSplit: {
                include: {
                  charityAllocations: {
                    include: { charity: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          error: `No order found with reference: ${orderNumber}. Please check your order number and try again.`,
        });
      }

      const currentIndex = STATUS_SEQUENCE.indexOf(order.status);

      return res.status(200).json({
        orderNumber: order.orderNumber,
        status: order.status,
        statusIndex: currentIndex,
        statusSequence: STATUS_SEQUENCE,
        eventCategory: order.eventCategory,
        eventName: order.eventName,
        logoDropCount: order.logoDropCount,
        itemType: order.itemType,
        shippingAddress: order.shippingAddress,
        courierName: order.courierName,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        estimatedDelivery: order.estimatedDelivery,
        grossAmountCents: order.grossAmountCents,
        licensorCents: order.licensorCents,
        charityCents: order.charityCents,
        charityAllocations: order.transaction?.financialSplit?.charityAllocations?.map((a) => ({
          charityName: a.charity.name,
          amountCents: a.amountCents,
          transferred: !!a.stripeTransferId,
        })) ?? [],
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });
    } catch (err: any) {
      console.error('[ORDERS TRACK ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve order tracking data.' });
    }
  });

  /**
   * GET /api/orders/:orderNumber/invoice-pdf
   * Streams a PDF ESG Tax Invoice for the given order.
   */
  router.get('/api/orders/:orderNumber/invoice-pdf', async (req: Request, res: Response) => {
    const { orderNumber } = req.params;

    try {
      const order = await prisma.souvenirOrder.findUnique({
        where: { orderNumber: orderNumber.trim().toUpperCase() },
        include: {
          transaction: {
            include: {
              financialSplit: {
                include: {
                  charityAllocations: { include: { charity: true } },
                },
              },
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const filename = `GHG-Invoice-${order.orderNumber}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      // Header
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('NFTYLOGS', { align: 'center' });
      doc.moveDown(0.25);
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text('NFTYLOGS Merch Order Invoice', { align: 'center' });
      doc.moveDown(0.25);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('NFTYLOGS Limited  |  Registered in England and Wales, company no. 15230476', { align: 'center' });
      doc.moveDown(1.5);

      // Order Reference
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Order Reference:  ${order.orderNumber}`);
      doc.font('Helvetica').fontSize(10).fillColor('#475569')
        .text(`Status: ${order.status}  |  Date: ${new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`);
      doc.moveDown(1);

      // Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.75);

      // Event Details
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Order details');
      doc.moveDown(0.25);
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      doc.text(`Category:       ${order.eventCategory.replace(/_/g, ' ')}`);
      doc.text(`Event Name:     ${order.eventName}`);
      doc.text(`Logo Drop Count:  ${order.logoDropCount} units`);
      if (order.shippingAddress) {
        const addr = order.shippingAddress as any;
        doc.text(`Shipping:       ${addr.street ?? ''}, ${addr.city ?? ''}, ${addr.country ?? ''} ${addr.postalCode ?? ''}`);
      }
      doc.moveDown(1);

      // Financial Summary
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.75);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Financial Summary');
      doc.moveDown(0.25);
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      const gross = (order.grossAmountCents / 100).toFixed(2);
      const licensor = (order.licensorCents / 100).toFixed(2);
      const charity = (order.charityCents / 100).toFixed(2);
      // Shares come from this order's recorded split, never a fixed percentage.
      const share = (cents: number) => (order.grossAmountCents > 0 ? `${Math.round((cents / order.grossAmountCents) * 1000) / 10}%` : '0%');
      doc.text(`Gross payment: £${gross}`);
      doc.text(`Production and licensor (${share(order.licensorCents)}): £${licensor}`);
      doc.text(`Charity partners (${share(order.charityCents)}): £${charity}`);
      doc.moveDown(0.75);

      if (order.transaction?.financialSplit?.charityAllocations?.length) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Charity Disbursements:');
        order.transaction.financialSplit.charityAllocations.forEach((a) => {
          const transferred = a.stripeTransferId ? '(Transferred)' : '(Pending Transfer)';
          doc
            .font('Helvetica')
            .fillColor('#334155')
            .text(`  - ${a.charity.name}: £${(a.amountCents / 100).toFixed(2)} ${transferred}`);
        });
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.75);
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('Invoice issued by NFTYLOGS Limited. Registered in England and Wales, company no. 15230476.', { align: 'center' });
      if (process.env.APP_BASE_URL) doc.text(process.env.APP_BASE_URL.replace(/^https?:\/\//, ''), { align: 'center' });

      doc.end();
    } catch (err: any) {
      console.error('[INVOICE PDF ERROR]', err);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to generate invoice PDF.' });
      }
    }
  });

  /**
   * GET /api/orders/admin
   * Lists all standard souvenir/merch orders with search and status filtering.
   * Authenticated via JWT, strictly restricted to ADMIN role.
   */
  router.get('/api/orders/admin', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    const { status, search } = req.query as { status?: string; search?: string };

    try {
      const whereClause: any = {};
      if (status && status !== 'ALL') {
        whereClause.status = status;
      }
      if (search && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { orderNumber: { contains: query, mode: 'insensitive' } },
          { customerEmail: { contains: query, mode: 'insensitive' } },
          { customerName: { contains: query, mode: 'insensitive' } },
          { eventName: { contains: query, mode: 'insensitive' } },
          { trackingNumber: { contains: query, mode: 'insensitive' } },
        ];
      }

      const orders = await prisma.souvenirOrder.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: {
            include: {
              financialSplit: {
                include: {
                  charityAllocations: {
                    include: { charity: true },
                  },
                },
              },
            },
          },
        },
      });

      return res.status(200).json({ success: true, count: orders.length, orders });
    } catch (err: any) {
      console.error('[ADMIN GET ORDERS ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch orders.' });
    }
  });

  /**
   * PATCH /api/orders/admin/:orderNumber/status
   * Admin/printing store: advance the order fulfillment status.
   * Authenticated via JWT, strictly restricted to ADMIN role.
   * Body: { status: SouvenirOrderStatus, courierName?, trackingNumber?, trackingUrl?, estimatedDelivery? }
   */
  router.patch('/api/orders/admin/:orderNumber/status', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    const { orderNumber } = req.params;
    const { status, courierName, trackingNumber, trackingUrl, estimatedDelivery } = req.body || {};

    const validStatuses = Object.values(SouvenirOrderStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    try {
      const updated = await runWithRls(prisma, user, async (tx) => {
        return tx.souvenirOrder.update({
          where: { orderNumber: orderNumber.trim().toUpperCase() },
          data: {
            status,
            ...(courierName && { courierName }),
            ...(trackingNumber && { trackingNumber }),
            ...(trackingUrl && { trackingUrl }),
            ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
          },
        });
      });

      return res.status(200).json({
        message: `Order ${orderNumber} status updated to ${status}.`,
        orderNumber: updated.orderNumber,
        status: updated.status,
        updatedAt: updated.updatedAt,
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: `Order ${orderNumber} not found.` });
      }
      console.error('[ADMIN STATUS UPDATE ERROR]', err);
      return res.status(500).json({ error: 'Failed to update order status.' });
    }
  });

  return router;
}

export { generateOrderNumber };
