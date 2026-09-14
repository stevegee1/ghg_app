import { Router, Request, Response } from 'express';
import { PrismaClient, VerificationSource, DeliveryType, PeriodType, ReportSource } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CheckoutService } from '../services/checkout.service';
import { validateAttestationNote } from '../services/transaction.service';
import { runWithRls } from '../db/rls';

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

  /**
   * POST /api/b2b/job-report
   * Server-to-server B2B job creation report ingestion endpoint.
   * Authenticated via bcrypt-verified per-licensee API Key.
   * licenseeId required in request body (no scanning fallbacks).
   * Body: { licenseeId, periodType, periodStart, periodEnd, jobsCreated, attestationNote? }
   */
  router.post('/api/b2b/job-report', async (req: Request, res: Response) => {
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
      periodType,
      periodStart,
      periodEnd,
      jobsCreated,
      attestationNote: customNote,
    } = req.body || {};

    // 2. Validate licenseeId presence up front (400 if missing, no scanning fallbacks)
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

    // 4. Validate periodType
    if (periodType !== PeriodType.QUARTERLY && periodType !== PeriodType.ANNUAL) {
      return res.status(400).json({ error: "Invalid input: periodType must be 'QUARTERLY' or 'ANNUAL'." });
    }

    // 5. Validate period dates
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid input: periodStart and periodEnd must be valid date strings.' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'Invalid input: periodEnd must be after periodStart.' });
    }

    // 6. Validate jobsCreated (non-negative integer, 0 is explicitly valid)
    if (typeof jobsCreated !== 'number' || !Number.isInteger(jobsCreated) || jobsCreated < 0) {
      return res.status(400).json({ error: 'Invalid input: jobsCreated must be a non-negative integer.' });
    }

    // 7. Validate custom attestationNote if provided
    let finalNote = "Submitted via partner's own system/API. Not independently verified.";
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
      const report = await runWithRls(prisma, { role: 'PARTNER', licenseeId: licensee.id }, async (tx) => {
        return tx.jobCreationReport.create({
          data: {
            licenseeId: licensee.id,
            periodType,
            periodStart: startDate,
            periodEnd: endDate,
            jobsCreated,
            reportSource: ReportSource.THIRD_PARTY_API,
            attestationNote: finalNote,
            submittedByUserId: null,
          },
        });
      });

      return res.status(201).json(report);
    } catch (err: any) {
      if (err.code === 'P2002' || err.message?.includes('JobCreationReport_licenseeId_periodType_periodStart_period')) {
        return res.status(409).json({ error: 'Duplicate report: A report for this exact period and type already exists.' });
      }
      console.error('[B2B JOB REPORT API ROUTE ERROR]', err);
      return res.status(500).json({ error: 'An unexpected error occurred during B2B job report processing.' });
    }
  });

  return router;
}
