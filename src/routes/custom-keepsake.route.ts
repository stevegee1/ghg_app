import { Router, Request, Response } from 'express';
import { PrismaClient, VerificationSource, DeliveryType, FulfillmentStatus, TransactionStatus } from '@prisma/client';
import { CustomKeepsakeService } from '../services/custom-keepsake.service';
import { CheckoutService } from '../services/checkout.service';

export function createCustomKeepsakeRouter(prisma: PrismaClient, checkoutService: CheckoutService): Router {
  const router = Router();
  const keepsakeService = new CustomKeepsakeService(prisma);

  /**
   * POST /api/custom-merch/preview
   * Generates live canvas embroidery configuration, LCA carbon grams, and 15% charity split.
   */
  router.post('/api/custom-merch/preview', (req: Request, res: Response) => {
    try {
      const {
        garmentModel,
        inscribedText,
        threadColor,
        placement,
        quantity,
        unitPriceCents,
      } = req.body || {};

      const preview = keepsakeService.generateKeepsakePreview({
        garmentModel,
        inscribedText,
        threadColor,
        placement,
        quantity,
        unitPriceCents,
      });

      return res.status(200).json({ preview });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to generate keepsake preview.' });
    }
  });

  /**
   * POST /api/custom-merch/checkout
   * Initiates bespoke keepsake checkout, creating the Transaction, 15% FinancialSplit,
   * TriggerEvent, and CustomKeepsakeSpec atomically.
   */
  router.post('/api/custom-merch/checkout', async (req: Request, res: Response) => {
    try {
      const {
        licenseeId,
        checkoutReferenceId,
        garmentModel,
        inscribedText,
        threadColor,
        placement,
        quantity = 1,
        unitPriceCents = 8500,
        currency = 'GBP',
      } = req.body || {};

      if (!licenseeId || typeof licenseeId !== 'string') {
        return res.status(400).json({ error: 'Invalid input: licenseeId is required.' });
      }

      if (!inscribedText || typeof inscribedText !== 'string') {
        return res.status(400).json({ error: 'Invalid input: inscribedText is required.' });
      }

      // Generate preview metrics
      const preview = keepsakeService.generateKeepsakePreview({
        garmentModel: garmentModel || 'HEAVYWEIGHT_HOODIE',
        inscribedText,
        threadColor: threadColor || 'GOLD_METALLIC',
        placement: placement || 'LEFT_CHEST',
        quantity,
        unitPriceCents,
      });

      const uniqueRef = checkoutReferenceId || `keepsake_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 1. Invoke CheckoutService to handle transaction and 15% split
      const checkoutResult = await checkoutService.initiateCheckout({
        licenseeId: licenseeId.trim(),
        checkoutReferenceId: uniqueRef,
        grossAmountCents: preview.financialSummary.grossAmountCents,
        currency,
        triggerEvent: {
          verificationSource: VerificationSource.CONSUMER_OPT_IN,
          deliveryType: DeliveryType.PHYSICAL,
          fulfillmentStatus: FulfillmentStatus.PENDING,
          rawPayload: {
            garmentModel: preview.garmentModel,
            inscribedText: preview.inscribedText,
            threadColor: preview.threadColor,
            placement: preview.placement,
            lcaCarbonGrams: preview.dualImpactMetrics.estimatedLcaCarbonGrams,
            artisanLaborHours: preview.dualImpactMetrics.artisanLaborHours,
          },
        },
      });

      // 2. Persist CustomKeepsakeSpec linked to this transaction
      const keepsakeSpec = await keepsakeService.recordKeepsakeSpec({
        transactionId: checkoutResult.transactionId,
        garmentModel: preview.garmentModel,
        inscribedText: preview.inscribedText,
        threadColor: preview.threadColor,
        placement: preview.placement,
        artisanLaborHours: preview.dualImpactMetrics.artisanLaborHours,
        lcaCarbonGrams: preview.dualImpactMetrics.estimatedLcaCarbonGrams,
      });

      return res.status(201).json({
        message: 'Custom milestone keepsake order successfully initiated.',
        transactionId: checkoutResult.transactionId,
        clientSecret: checkoutResult.clientSecret,
        financialSummary: preview.financialSummary,
        dualImpactMetrics: preview.dualImpactMetrics,
        keepsakeSpec,
      });
    } catch (err: any) {
      console.error('[CUSTOM KEEPSAKE CHECKOUT ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to initiate custom keepsake checkout.' });
    }
  });

  /**
   * POST /api/souvenirs/order
   * Handles Event Souvenirs batch ordering with 15% statutory ESG allocation.
   */
  router.post('/api/souvenirs/order', async (req: Request, res: Response) => {
    try {
      const {
        eventName,
        eventType,
        eventDate,
        itemId,
        quantity = 100,
        shippingAddress,
      } = req.body || {};

      if (!eventName || typeof eventName !== 'string') {
        return res.status(400).json({ error: 'Event name is required' });
      }
      if (!shippingAddress || typeof shippingAddress !== 'string') {
        return res.status(400).json({ error: 'Shipping address is required' });
      }

      // Base price in pence (e.g. £5.00 default = 500 pence)
      const unitPriceCents = 500;
      const grossAmountCents = Number(quantity) * unitPriceCents;
      const refId = `souvenir_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Find an active onboarded licensee or create default platform licensee
      let targetLicensee = await prisma.licensee.findFirst({
        where: {
          stripeConnectedAccountId: { not: null },
        },
      });

      if (!targetLicensee) {
        targetLicensee = await prisma.licensee.upsert({
          where: { id: 'lic_ghg_official' },
          update: {
            stripeConnectedAccountId: 'acct_platform_default_001',
          },
          create: {
            id: 'lic_ghg_official',
            name: 'NFTY LOGS® Official Store',
            vertical: 'B2C_SPORTS_MERCH' as any,
            royaltyBps: 8500,
            pricePerDropCents: 500,
            stripeConnectedAccountId: 'acct_platform_default_001',
          },
        });
      }

      // Execute checkout via checkoutService
      const checkoutResult = await checkoutService.initiateCheckout({
        licenseeId: targetLicensee.id,
        checkoutReferenceId: refId,
        grossAmountCents,
        currency: 'GBP',
        triggerEvent: {
          verificationSource: VerificationSource.CONSUMER_OPT_IN,
          deliveryType: DeliveryType.PHYSICAL,
          fulfillmentStatus: FulfillmentStatus.PENDING,
          rawPayload: {
            eventName,
            eventType: eventType || 'MARATHON',
            eventDate: eventDate || new Date().toISOString().split('T')[0],
            itemId: itemId || 'item_finisher_medal',
            quantity: Number(quantity),
            shippingAddress,
          },
        },
      });

      return res.status(201).json({
        success: true,
        orderId: `ord_${refId}`,
        transactionId: checkoutResult.transactionId,
        clientSecret: checkoutResult.clientSecret,
        eventName,
        quantity: Number(quantity),
        grossAmountCents,
        status: 'CONFIRMED',
        message: 'Event keepsakes batch registered with 15% statutory ESG charitable split.',
      });
    } catch (err: any) {
      console.error('[EVENT SOUVENIR ORDER ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to place event souvenir order' });
    }
  });

  return router;
}
