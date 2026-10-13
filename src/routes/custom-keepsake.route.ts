import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient, DeliveryType, MerchProductKind } from '@prisma/client';
import { SplitConfigMissingError } from '../services/split-config.service';
import { CustomKeepsakeService } from '../services/custom-keepsake.service';
import { CheckoutService } from '../services/checkout.service';
import { authenticateToken as verifyJwt } from '../middleware/auth.middleware';
import { MerchCatalogueError, priceOrder } from '../services/merch-catalogue.service';
import { resolveActiveSplitConfig } from '../services/split-config.service';


export function createCustomKeepsakeRouter(prisma: PrismaClient, checkoutService: CheckoutService): Router {
  const router = Router();
  const keepsakeService = new CustomKeepsakeService(prisma);

  /** Prices a custom garment order from the merch catalogue and the active split. */
  const priceGarment = async (garmentModel: unknown, quantity: unknown) => {
    const order = await priceOrder(prisma, { productId: garmentModel, quantity, kind: MerchProductKind.CUSTOM_GARMENT });
    const split = await resolveActiveSplitConfig(prisma, order.product.licenseeId);
    return { order, royaltyBps: split.royaltyBps };
  };

  /**
   * POST /api/custom-merch/preview
   * Generates the embroidery configuration, LCA carbon grams and the price split for a catalogue garment.
   */
  router.post('/api/custom-merch/preview', async (req: Request, res: Response) => {
    try {
      const { garmentModel, inscribedText, threadColor, placement, quantity } = req.body || {};
      const { order, royaltyBps } = await priceGarment(garmentModel, quantity);
      const preview = keepsakeService.generateKeepsakePreview(
        { inscribedText, threadColor, placement, quantity: order.quantity },
        order.product,
        royaltyBps
      );
      return res.status(200).json({ preview });
    } catch (err: any) {
      if (err instanceof MerchCatalogueError) return res.status(err.status).json({ error: err.message });
      return res.status(400).json({ error: err.message || 'Failed to generate the Frenzy Studio preview.' });
    }
  });

  /**
   * POST /api/custom-merch/checkout
   * Initiates bespoke keepsake checkout, creating the Transaction, the FinancialSplit from the active split,
   * TriggerEvent, and CustomKeepsakeSpec atomically.
   * Supports Goal Frenzy fields for sports moment merchandise.
   */
  router.post('/api/custom-merch/checkout', async (req: Request, res: Response) => {
    try {
      const {
        garmentModel,
        inscribedText,
        threadColor,
        placement,
        quantity = 1,
        // Sports Custom Studio fields
        isGoalFrenzy = false,
        sportType = 'Football',
        frenzyClub,
        frenzyOpponent,
        frenzyMinute,
        frenzyMoment,
        frenzyQuote,
        garmentSize = 'M',
        // Customer & Delivery Destination
        customerName,
        customerEmail,
        shippingAddress,
      } = req.body || {};

      if (!inscribedText || typeof inscribedText !== 'string') {
        return res.status(400).json({ error: 'Invalid input: inscribedText is required.' });
      }

      if (isGoalFrenzy && (!frenzyClub || typeof frenzyClub !== 'string' || !frenzyClub.trim())) {
        return res.status(400).json({ error: 'Invalid input: frenzyClub is required for Frenzy Studio orders.' });
      }

      // Price from the catalogue; the request never sets the price or the seller.
      const { order, royaltyBps } = await priceGarment(garmentModel, quantity);
      const licenseeId = order.product.licenseeId;
      const currency = order.product.currency;
      const preview = keepsakeService.generateKeepsakePreview(
        {
          inscribedText,
          threadColor: threadColor || 'GOLD_METALLIC',
          placement: placement || 'LEFT_CHEST',
          quantity: order.quantity,
        },
        order.product,
        royaltyBps
      );

      // 1. One pending transaction and its Stripe Checkout Session. The session collects payment and
      // delivery; without it there is no order, so a Stripe failure is reported, never hidden.
      const itemDesc = frenzyClub ? `${sportType}: ${frenzyClub}` : `${sportType}`;
      const origin = req.get('origin') || `${req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'}://${req.get('host')}`;
      let session: { sessionUrl: string | null; sessionId: string | null; transactionId: string };
      try {
        session = await checkoutService.createCheckoutSession({
          licenseeId,
          itemTitle: `NFTYLOGS Frenzy Studio (${preview.garmentModel} - Size ${garmentSize}): ${itemDesc}`,
          grossAmountCents: preview.financialSummary.grossAmountCents,
          currency,
          successUrl: `${origin}/checkout/success`,
          cancelUrl: `${origin}/merch`,
          customerEmail: customerEmail || undefined,
          deliveryType: DeliveryType.PHYSICAL,
          shippingAddress: shippingAddress || undefined,
          metadata: {
            garmentModel: preview.garmentModel,
            garmentSize: garmentSize || 'M',
            inscribedText: preview.inscribedText,
            sportType: sportType || 'Football',
            frenzyClub: frenzyClub || '',
            recipientName: shippingAddress?.recipientName || customerName || '',
          },
        });
      } catch (stripeErr) {
        if (stripeErr instanceof SplitConfigMissingError) {
          return res.status(503).json({ error: 'The shop cannot take payments yet. Please try again later.' });
        }
        console.error('[CUSTOM KEEPSAKE STRIPE SESSION ERROR]', stripeErr);
        return res.status(502).json({ error: 'Checkout is unavailable right now. Please try again later.' });
      }
      if (!session.sessionUrl) {
        return res.status(502).json({ error: 'Checkout is unavailable right now. Please try again later.' });
      }

      // 2. Persist CustomKeepsakeSpec with full milestone, sizing, and shipping specs
      const keepsakeSpec = await keepsakeService.recordKeepsakeSpec({
        transactionId: session.transactionId,
        garmentModel: preview.garmentModel,
        inscribedText: preview.inscribedText,
        threadColor: preview.threadColor,
        placement: preview.placement,
        artisanLaborHours: preview.dualImpactMetrics.artisanLaborHours,
        lcaCarbonGrams: preview.dualImpactMetrics.estimatedLcaCarbonGrams,
        isGoalFrenzy: !!isGoalFrenzy,
        sportType: sportType || 'Football',
        frenzyClub: frenzyClub || null,
        frenzyOpponent: frenzyOpponent || null,
        frenzyMinute: frenzyMinute || null,
        frenzyMoment: frenzyMoment || null,
        frenzyQuote: frenzyQuote || null,
        garmentSize: garmentSize || 'M',
        shippingAddress: shippingAddress || null,
        customerEmail: customerEmail || null,
        customerName: customerName || null,
        fulfillmentStatus: 'PENDING',
      });

      return res.status(201).json({
        message: 'Frenzy Studio order started.',
        transactionId: session.transactionId,
        sessionUrl: session.sessionUrl,
        sessionId: session.sessionId,
        financialSummary: preview.financialSummary,
        dualImpactMetrics: preview.dualImpactMetrics,
        keepsakeSpec,
      });
    } catch (err: any) {
      if (err instanceof MerchCatalogueError) return res.status(err.status).json({ error: err.message });
      console.error('[CUSTOM KEEPSAKE CHECKOUT ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to start the Frenzy Studio checkout.' });
    }
  });

  /**
   * POST /api/souvenirs/order
   * Handles Event Souvenir Logo Drop ordering.
   * Users select: eventCategory (SPORTS|GALA|TECH_SUMMIT|WEDDING), eventName,
   * logoDropCount (10, 25, 50, 100, 250, 500), shippingAddress, customerEmail.
   * No user artwork upload: NFTYLOGS mark is applied by the printing store.
   * Returns a Stripe Hosted Checkout URL and tracking URL.
   */
  router.post('/api/souvenirs/order', async (req: Request, res: Response) => {
    try {
      const {
        customerEmail,
        customerName,
        eventCategory,
        eventName,
        logoDropCount,
        shippingAddress,
      } = req.body || {};

      // --- Validation ---
      if (!customerEmail || typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
        return res.status(400).json({ error: 'A valid customer email address is required.' });
      }

      const validCategories = ['SPORTS', 'GALA', 'TECH_SUMMIT', 'WEDDING'];
      if (!eventCategory || !validCategories.includes(eventCategory)) {
        return res.status(400).json({
          error: `eventCategory must be one of: ${validCategories.join(', ')}`,
        });
      }

      if (!eventName || typeof eventName !== 'string' || !eventName.trim()) {
        return res.status(400).json({ error: 'Event name is required.' });
      }

      const validCounts = [10, 25, 50, 100, 250, 500];
      const count = Number(logoDropCount);
      if (!validCounts.includes(count)) {
        return res.status(400).json({
          error: `logoDropCount must be one of: ${validCounts.join(', ')}`,
        });
      }

      if (!shippingAddress || typeof shippingAddress !== 'object') {
        return res.status(400).json({ error: 'shippingAddress object is required (street, city, country, postalCode).' });
      }

      // --- Pricing: per-unit price from the merch catalogue, split from the active configuration ---
      const product = await prisma.merchProduct.findUnique({ where: { id: 'EVENT_LOGO_DROP' } });
      if (!product || !product.active || product.kind !== MerchProductKind.EVENT_SOUVENIR || product.pricePence === null) {
        return res.status(409).json({ error: 'Event souvenir orders are not available right now.' });
      }
      const currency = product.currency;
      const grossAmountCents = count * product.pricePence;
      const split = await resolveActiveSplitConfig(prisma, product.licenseeId);
      const licensorCents = Math.round((grossAmountCents * split.royaltyBps) / 10000);
      const charityCents = grossAmountCents - licensorCents;

      // --- Generate order number ---
      const year = new Date().getFullYear();
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const suffix = Array.from({ length: 5 }, () => chars[crypto.randomInt(chars.length)]).join('');
      const orderNumber = `GHG-ORD-${year}-${suffix}`;

      // --- Create SouvenirOrder record in DB (pre-payment) ---
      const souvenirOrder = await prisma.souvenirOrder.create({
        data: {
          orderNumber,
          customerEmail: customerEmail.toLowerCase().trim(),
          customerName: customerName?.trim() || null,
          eventCategory: eventCategory as any,
          eventName: eventName.trim(),
          logoDropCount: count,
          itemType: 'GHG_LOGO_DROP',
          shippingAddress: shippingAddress as any,
          grossAmountCents,
          licensorCents,
          charityCents,
          status: 'ORDER_PLACED',
        },
      });

      // --- Create Stripe Checkout Session ---
      let sessionUrl: string | null = null;
      let transactionId: string | null = null;

      try {
        const origin = req.get('origin') || `${req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http'}://${req.get('host')}`;
        const sessionResult = await checkoutService.createCheckoutSession({
          licenseeId: product.licenseeId,
          itemTitle: `NFTYLOGS Event Souvenir Logo Drop (${count} units) - ${eventName.trim()}`,
          grossAmountCents,
          currency,
          successUrl: `${origin}/track/${orderNumber}`,
          cancelUrl: `${origin}/souvenirs`,
        });

        transactionId = sessionResult.transactionId;
        sessionUrl = sessionResult.sessionUrl;

        // Link transaction to the souvenir order
        if (transactionId) {
          await prisma.souvenirOrder.update({
            where: { orderNumber },
            data: {
              transactionId,
              status: 'ORDER_PLACED',
            },
          });
        }
      } catch (stripeErr: any) {
        console.error('[SOUVENIR STRIPE ERROR]', stripeErr);
        // Soft fail: order is recorded, stripe session failed, return order ref so customer can retry
      }

      const trackUrl = `/track/${orderNumber}`;

      return res.status(201).json({
        success: true,
        orderNumber,
        trackUrl,
        sessionUrl,
        transactionId,
        eventCategory,
        eventName: eventName.trim(),
        logoDropCount: count,
        grossAmountCents,
        licensorCents,
        charityCents,
        status: souvenirOrder.status,
        message: 'Order recorded. Track it at /track/' + orderNumber,
      });
    } catch (err: any) {
      console.error('[EVENT SOUVENIR ORDER ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to place event souvenir order' });
    }
  });

  /**
   * GET /api/admin/keepsake-orders
   * Retrieves all sports custom keepsake orders with shipping addresses, sizing, and fulfillment info.
   */
  router.get('/api/admin/keepsake-orders', verifyJwt, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      }

      const orders = await prisma.customKeepsakeSpec.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: {
            include: {
              financialSplit: {
                include: {
                  charityAllocations: {
                    include: {
                      charity: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return res.status(200).json({ success: true, count: orders.length, orders });
    } catch (err: any) {
      console.error('[ADMIN GET KEEPSAKE ORDERS ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch Frenzy Studio orders.' });
    }
  });

  /**
   * PATCH /api/admin/keepsake-orders/:id
   * Updates fulfillment status and tracking number for physical delivery.
   */
  router.patch('/api/admin/keepsake-orders/:id', verifyJwt, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      }

      const { id } = req.params;
      const { fulfillmentStatus, trackingNumber } = req.body || {};

      const existing = await prisma.customKeepsakeSpec.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Frenzy Studio order not found.' });
      }

      const updated = await prisma.customKeepsakeSpec.update({
        where: { id },
        data: {
          ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
          ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        },
      });

      return res.status(200).json({ success: true, updated });
    } catch (err: any) {
      console.error('[ADMIN PATCH KEEPSAKE ORDER ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to update the Frenzy Studio order.' });
    }
  });

  return router;
}
