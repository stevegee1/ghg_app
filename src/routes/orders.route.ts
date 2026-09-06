import { Router, Request, Response } from 'express';
import { PrismaClient, SouvenirOrderStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';

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
   * Public endpoint — no auth required.
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

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="GHG-Invoice-${order.orderNumber}.pdf"`
      );

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(res);

      // Header
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('GHG Emissions Registered Trade Mark', { align: 'center' });
      doc.moveDown(0.25);
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#0f172a')
        .text('Survivors Donation Keepsake — ESG Tax & Audit Invoice', { align: 'center' });
      doc.moveDown(0.25);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('UKIPO Registered Trade Mark  |  ISO 14067 Certified  |  85/15 Statutory Charitable Routing', { align: 'center' });
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
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Order & Keepsake Specifications');
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
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Financial Summary — 85/15 Statutory Split');
      doc.moveDown(0.25);
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      const gross = (order.grossAmountCents / 100).toFixed(2);
      const licensor = (order.licensorCents / 100).toFixed(2);
      const charity = (order.charityCents / 100).toFixed(2);
      doc.text(`Gross Payment:                    £${gross}`);
      doc.text(`Supplier Production & Licensor (85%): £${licensor}`);
      doc.text(`Statutory ESG Charity Pool (15%): £${charity}`);
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
        .fontSize(8.5)
        .fillColor('#0284c7')
        .text('Evidence verified via Remote ICT Review in strict compliance with ISO 19011:2026 Annex A.', { align: 'center' });
      doc.moveDown(0.25);
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('Official statutory ESG invoice issued under GHG Emissions Registered Trade Mark.', { align: 'center' });
      doc.text('GHG App | ghgapp-production.up.railway.app', { align: 'center' });

      doc.end();
    } catch (err: any) {
      console.error('[INVOICE PDF ERROR]', err);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to generate invoice PDF.' });
      }
    }
  });

  /**
   * PATCH /api/orders/admin/:orderNumber/status
   * Admin/printing store: advance the order fulfillment status.
   * Body: { status: SouvenirOrderStatus, courierName?, trackingNumber?, trackingUrl?, estimatedDelivery? }
   */
  router.patch('/api/orders/admin/:orderNumber/status', async (req: Request, res: Response) => {
    const { orderNumber } = req.params;
    const { status, courierName, trackingNumber, trackingUrl, estimatedDelivery } = req.body || {};

    const validStatuses = Object.values(SouvenirOrderStatus);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    try {
      const updated = await prisma.souvenirOrder.update({
        where: { orderNumber: orderNumber.trim().toUpperCase() },
        data: {
          status,
          ...(courierName && { courierName }),
          ...(trackingNumber && { trackingNumber }),
          ...(trackingUrl && { trackingUrl }),
          ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
        },
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
