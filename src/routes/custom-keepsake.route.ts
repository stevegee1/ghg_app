import { Router, Request, Response } from 'express';
import { PrismaClient, VerificationSource, DeliveryType, FulfillmentStatus, TransactionStatus } from '@prisma/client';
import { CustomKeepsakeService } from '../services/custom-keepsake.service';
import { CheckoutService } from '../services/checkout.service';

export function createCustomKeepsakeRouter(prisma: PrismaClient, checkoutService: CheckoutService): Router {
  const router = Router();
  const keepsakeService = new CustomKeepsakeService(prisma);

  /**
   * GET /api/preparation/pricing
   * Returns official SaaS preparation services pricing schedule under ISO 14001/50001
   * and ISO 19011:2026 Remote Auditing guidelines.
   */
  router.get('/api/preparation/pricing', (_req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      trademark: 'GHG Emissions Registered Trade Mark (Nice Class 35)',
      remoteProtocol: '80% Remote Digital Data Protocol (ISO 19011:2026)',
      verificationStamp: 'Evidence verified via Remote ICT Review in strict compliance with ISO 19011:2026 Annex A',
      tiers: [
        {
          id: 'TIER_1_READINESS',
          name: 'Single-Site Remote Readiness',
          priceGbp: 1250,
          billingPeriod: 'per assessment',
          isoAlignment: ['ISO 14001', 'ISO 50001', 'ISO 19011:2026 Annex A'],
          turnaroundHours: 72,
        },
        {
          id: 'TIER_2_CONTINUOUS',
          name: 'Continuous Assurance Protocol',
          priceGbp: 3500,
          billingPeriod: 'per quarter',
          isoAlignment: ['ISO 17025', 'ISO 50001', 'ISO 19011:2026', 'UK SECR', 'UAE SCA'],
          isRecommended: true,
        },
        {
          id: 'TIER_3_GLOBAL',
          name: 'Enterprise Multi-Jurisdiction Dossier',
          priceGbp: 8500,
          billingPeriod: 'per year',
          isoAlignment: ['UK SECR', 'EU CSRD', 'California SB 253/261', 'UAE Net Zero 2050', 'ISO 14064'],
        },
      ],
    });
  });

  /**
   * GET /api/custom-merch/products
   * Returns available products under Nice Class 25 with base supplier production cost
   * and automated 15% charity split computation.
   */
  router.get('/api/custom-merch/products', (_req: Request, res: Response) => {
    const products = [
      {
        id: 'T_SHIRT',
        name: 'Organic Cotton T-Shirt',
        description: '100% GOTS certified organic combed cotton with bespoke embroidery.',
        baseSupplierCostCents: 2200,
        retailPriceCents: Math.round(2200 / 0.85),
        charityGiftCents: Math.round(2200 / 0.85) - 2200,
        supplierSharePct: 85,
        charitySharePct: 15,
        lcaGrams: 290,
      },
      {
        id: 'PUFF_JACKET',
        name: 'Recycled Down Puffer Jacket',
        description: 'Post-consumer recycled ripstop with 700 fill ethical down.',
        baseSupplierCostCents: 6500,
        retailPriceCents: Math.round(6500 / 0.85),
        charityGiftCents: Math.round(6500 / 0.85) - 6500,
        supplierSharePct: 85,
        charitySharePct: 15,
        lcaGrams: 780,
      },
      {
        id: 'HOODIE',
        name: 'Heavyweight Commemorative Hoodie',
        description: '450gsm cross-grain French terry fleece with high-density gold stitch.',
        baseSupplierCostCents: 4200,
        retailPriceCents: Math.round(4200 / 0.85),
        charityGiftCents: Math.round(4200 / 0.85) - 4200,
        supplierSharePct: 85,
        charitySharePct: 15,
        lcaGrams: 520,
      },
      {
        id: 'BACKPACK',
        name: 'Industrial Canvas Backpack',
        description: 'Water-resistant 16oz recycled canvas with padded laptop compartment.',
        baseSupplierCostCents: 3800,
        retailPriceCents: Math.round(3800 / 0.85),
        charityGiftCents: Math.round(3800 / 0.85) - 3800,
        supplierSharePct: 85,
        charitySharePct: 15,
        lcaGrams: 680,
      },
      {
        id: 'SCHOOL_BAG',
        name: 'Student & Youth School Bag',
        description: 'Ergonomic dual-compartment school bag with reflective safety trim.',
        baseSupplierCostCents: 2800,
        retailPriceCents: Math.round(2800 / 0.85),
        charityGiftCents: Math.round(2800 / 0.85) - 2800,
        supplierSharePct: 85,
        charitySharePct: 15,
        lcaGrams: 540,
      },
      {
        id: 'SOCKS',
        name: 'Performance Technical Socks',
        description: 'Merino wool blend anti-blister technical sports socks (pair).',
        baseSupplierCostCents: 1200,
        retailPriceCents: Math.round(1200 / 0.85),
        charityGiftCents: Math.round(1200 / 0.85) - 1200,
        supplierSharePct: 85,
        charitySharePct: 15,
        lcaGrams: 120,
      },
    ];

    return res.status(200).json({
      success: true,
      trademark: 'GHG Emissions Registered Trade Mark (Nice Class 25)',
      studioName: 'Survivors Donation Keepsake',
      splitRule: '85% Supplier Production & Fulfillment / 15% Statutory Charity Endowment',
      products,
    });
  });

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
   * Supports Goal Frenzy fields for sports moment merchandise.
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
        // Goal Frenzy fields
        isGoalFrenzy = false,
        frenzyClub,
        frenzyOpponent,
        frenzyMinute,
        frenzyMoment,
        frenzyQuote,
      } = req.body || {};

      if (!licenseeId || typeof licenseeId !== 'string') {
        return res.status(400).json({ error: 'Invalid input: licenseeId is required.' });
      }

      if (!inscribedText || typeof inscribedText !== 'string') {
        return res.status(400).json({ error: 'Invalid input: inscribedText is required.' });
      }

      if (isGoalFrenzy && !frenzyClub) {
        return res.status(400).json({ error: 'Goal Frenzy orders require frenzyClub.' });
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
            isGoalFrenzy,
            frenzyClub: frenzyClub || null,
          },
        },
      });

      // 2. Persist CustomKeepsakeSpec with Goal Frenzy fields
      const keepsakeSpec = await keepsakeService.recordKeepsakeSpec({
        transactionId: checkoutResult.transactionId,
        garmentModel: preview.garmentModel,
        inscribedText: preview.inscribedText,
        threadColor: preview.threadColor,
        placement: preview.placement,
        artisanLaborHours: preview.dualImpactMetrics.artisanLaborHours,
        lcaCarbonGrams: preview.dualImpactMetrics.estimatedLcaCarbonGrams,
        // Goal Frenzy
        ...(isGoalFrenzy && {
          isGoalFrenzy: true,
          frenzyClub: frenzyClub || null,
          frenzyOpponent: frenzyOpponent || null,
          frenzyMinute: frenzyMinute || null,
          frenzyMoment: frenzyMoment || null,
          frenzyQuote: frenzyQuote || null,
        }),
      } as any);

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
   * Handles Event Souvenir Logo Drop ordering.
   * Users select: eventCategory (SPORTS|GALA|TECH_SUMMIT|WEDDING), eventName,
   * logoDropCount (10, 25, 50, 100, 250, 500), shippingAddress, customerEmail.
   * No user artwork upload — GHG Logo Drop mark is applied by the printing store.
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
        currency = 'GBP',
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

      // --- Pricing: £5.00 per logo drop unit ---
      const unitPriceCents = 500; // £5.00
      const grossAmountCents = count * unitPriceCents;
      const licensorCents = Math.round((grossAmountCents * 8500) / 10000); // 85%
      const charityCents = grossAmountCents - licensorCents; // 15%

      // --- Find platform licensee ---
      let targetLicensee = await prisma.licensee.findFirst({
        where: { stripeConnectedAccountId: { not: null } },
      });

      if (!targetLicensee) {
        targetLicensee = await prisma.licensee.upsert({
          where: { id: 'lic_ghg_official' },
          update: {},
          create: {
            id: 'lic_ghg_official',
            name: 'NFTY LOGS® Official Store',
            vertical: 'B2C_SPORTS_MERCH' as any,
            royaltyBps: 8500,
            pricePerDropCents: 500,
            stripeConnectedAccountId: process.env.STRIPE_PLATFORM_ACCOUNT_ID || null,
          },
        });
      }

      // --- Generate order number ---
      const year = new Date().getFullYear();
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const suffix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const orderNumber = `GHG-ORD-${year}-${suffix}`;
      const refId = `souvenir_${Date.now()}_${suffix.toLowerCase()}`;

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
        const checkoutResult = await checkoutService.initiateCheckout({
          licenseeId: targetLicensee.id,
          checkoutReferenceId: refId,
          grossAmountCents,
          currency,
          triggerEvent: {
            verificationSource: VerificationSource.CONSUMER_OPT_IN,
            deliveryType: DeliveryType.PHYSICAL,
            fulfillmentStatus: FulfillmentStatus.PENDING,
            rawPayload: {
              orderNumber,
              eventCategory,
              eventName: eventName.trim(),
              logoDropCount: count,
              customerEmail,
            },
          },
        });

        transactionId = checkoutResult.transactionId;
        sessionUrl = (checkoutResult as any).sessionUrl || null;

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
        // Soft fail: order is recorded, stripe session failed — return order ref so customer can retry
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
        message: '15% statutory ESG charitable routing applied. Track your order at /track/' + orderNumber,
      });
    } catch (err: any) {
      console.error('[EVENT SOUVENIR ORDER ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to place event souvenir order' });
    }
  });

  return router;
}
