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

  return router;
}
