import { Router, Request, Response } from 'express';
import { PrismaClient, VerificationSource, DeliveryType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CheckoutService } from '../services/checkout.service';

export function createB2bTriggerRouter(checkoutService: CheckoutService, prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /api/b2b/trigger
   * Server-to-server B2B trigger ingestion endpoint.
   * Authenticated via bcrypt-hashed per-licensee API Keys.
   * Computes grossAmountCents = licensee.pricePerDropCents * quantity.
   * Reuses initiateCheckout() for retry safety & split computation.
   */
  router.post('/api/b2b/trigger', async (req: Request, res: Response) => {
    // 1. Extract API key from headers (X-API-Key or Authorization Bearer)
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    const authHeader = req.headers.authorization;
    let rawApiKey: string | undefined = apiKeyHeader;

    if (!rawApiKey && authHeader && authHeader.startsWith('Bearer ')) {
      rawApiKey = authHeader.substring(7).trim();
    }

    if (!rawApiKey) {
      return res.status(401).json({ error: 'Unauthorized: B2B API key required in X-API-Key or Authorization header.' });
    }

    const {
      licenseeId,
      quantity,
      deliveryType,
      externalReferenceId,
      attestationNote,
      weatherCondition,
      eventType,
      policyMilestoneRef,
      rawPayload,
    } = req.body || {};

    // 2. Validate licenseeId presence up front (400 if missing, preventing unnecessary DB queries and bcrypt scans)
    if (typeof licenseeId !== 'string' || !licenseeId.trim()) {
      return res.status(400).json({ error: 'Invalid input: licenseeId must be a non-empty string.' });
    }

    // 3. Authenticate licensee via bcrypt.compare on b2bApiKeyHash
    const licensee = await prisma.licensee.findUnique({ where: { id: licenseeId.trim() } });
    if (!licensee || !licensee.b2bApiKeyHash) {
      return res.status(401).json({ error: 'Unauthorized: Invalid B2B API Key or licensee mismatch.' });
    }

    const isKeyValid = await bcrypt.compare(rawApiKey, licensee.b2bApiKeyHash);
    if (!isKeyValid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid B2B API Key or licensee mismatch.' });
    }

    const authenticatedLicensee = licensee;

    // 3. Input Validation
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid input: quantity must be a positive integer.' });
    }

    if (deliveryType !== DeliveryType.DIGITAL && deliveryType !== DeliveryType.PHYSICAL) {
      return res.status(400).json({ error: "Invalid input: deliveryType must be 'DIGITAL' or 'PHYSICAL'." });
    }

    if (typeof externalReferenceId !== 'string' || !externalReferenceId.trim()) {
      return res.status(400).json({ error: 'Invalid input: externalReferenceId must be a non-empty string for B2B retry safety.' });
    }

    // 4. Quantity-based Pricing Lookup
    if (authenticatedLicensee.pricePerDropCents == null) {
      return res.status(400).json({
        error: `Licensee '${authenticatedLicensee.id}' does not have quantity-based pricing configured (pricePerDropCents is null).`,
      });
    }

    const grossAmountCents = authenticatedLicensee.pricePerDropCents * quantity;
    const checkoutReferenceId = `b2b_${authenticatedLicensee.id}_${externalReferenceId.trim()}`;

    try {
      // 5. Invoke initiateCheckout with THIRD_PARTY_API verificationSource
      const result = await checkoutService.initiateCheckout({
        licenseeId: authenticatedLicensee.id,
        checkoutReferenceId,
        grossAmountCents,
        triggerEvent: {
          verificationSource: VerificationSource.THIRD_PARTY_API,
          attestationNote,
          deliveryType,
          weatherCondition,
          eventType,
          policyMilestoneRef,
          rawPayload,
        },
      });

      return res.status(200).json(result);
    } catch (err: any) {
      if (err.message === 'Checkout already completed for this reference') {
        return res.status(409).json({ error: 'Checkout already completed for this reference' });
      }

      if (err.message?.includes('attestationNote')) {
        return res.status(400).json({ error: err.message });
      }

      console.error('[B2B TRIGGER API ROUTE ERROR]', err);
      return res.status(500).json({ error: 'An unexpected error occurred during B2B trigger processing' });
    }
  });

  return router;
}
