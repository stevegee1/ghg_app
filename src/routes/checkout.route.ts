import { Router, Request, Response } from 'express';
import { VerificationSource, DeliveryType } from '@prisma/client';
import { CheckoutService } from '../services/checkout.service';

export function createCheckoutRouter(checkoutService: CheckoutService): Router {
  const router = Router();

  router.post('/api/checkout', async (req: Request, res: Response) => {
    const { licenseeId, checkoutReferenceId, grossAmountCents, currency } = req.body || {};

    // 1. Input Validation
    if (
      typeof licenseeId !== 'string' ||
      !licenseeId.trim() ||
      typeof checkoutReferenceId !== 'string' ||
      !checkoutReferenceId.trim() ||
      typeof grossAmountCents !== 'number' ||
      !Number.isInteger(grossAmountCents) ||
      grossAmountCents <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid input: licenseeId and checkoutReferenceId must be non-empty strings, and grossAmountCents must be a positive integer.',
      });
    }

    try {
      // 2. Invoke checkoutService with server-side hardcoded verificationSource = CONSUMER_OPT_IN and deliveryType = DIGITAL
      const result = await checkoutService.initiateCheckout({
        licenseeId: licenseeId.trim(),
        checkoutReferenceId: checkoutReferenceId.trim(),
        grossAmountCents,
        currency,
        triggerEvent: {
          verificationSource: VerificationSource.CONSUMER_OPT_IN,
          deliveryType: DeliveryType.DIGITAL,
        },
      });

      return res.status(200).json(result);
    } catch (err: any) {
      if (err.message === 'Checkout already completed for this reference') {
        return res.status(409).json({ error: 'Checkout already completed for this reference' });
      }

      console.error('[CHECKOUT API ROUTE ERROR]', err);
      return res.status(500).json({ error: 'An unexpected error occurred during checkout' });
    }
  });

  return router;
}
