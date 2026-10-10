import { Router, Request, Response } from 'express';
import { DeliveryType, PrismaClient, VerificationSource } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { CheckoutService, DEFAULT_CHECKOUT_CURRENCY } from '../services/checkout.service';
import { resolveActiveSplitConfig } from '../services/split-config.service';

/** Largest number of logo drops in one portal order. */
const MAX_DROPS = 100000;

/**
 * Logo drops ordered from the client portal. The signed-in client's own licensee price
 * (Licensee.pricePerDropCents) and the active split are used; the browser never sends a price.
 * Server-to-server orders keep using POST /api/b2b/trigger with the licensee's API key.
 */
export function createLogoDropRouter(checkoutService: CheckoutService, prisma: PrismaClient): Router {
  const router = Router();

  router.use('/api/portal/logo-drop', authenticateToken);

  /** GET /api/portal/logo-drop/pricing: the signed-in client's price per drop and current split. */
  router.get('/api/portal/logo-drop/pricing', async (req: Request, res: Response) => {
    const licenseeId = req.user?.licenseeId;
    if (!licenseeId) return res.status(403).json({ error: 'A client account is required.' });
    try {
      const licensee = await prisma.licensee.findUnique({ where: { id: licenseeId }, select: { pricePerDropCents: true } });
      if (!licensee) return res.status(404).json({ error: 'Account not found.' });
      const split = await resolveActiveSplitConfig(prisma, licenseeId);
      return res.status(200).json({
        pricePerDropPence: licensee.pricePerDropCents,
        royaltyBps: split.royaltyBps,
        currency: DEFAULT_CHECKOUT_CURRENCY,
      });
    } catch (err) {
      console.error('[LOGO DROP PRICING ERROR]', err);
      return res.status(500).json({ error: 'Pricing is unavailable right now.' });
    }
  });

  /** POST /api/portal/logo-drop: Stripe Checkout for logo drops at the signed-in client's configured price. */
  router.post('/api/portal/logo-drop', async (req: Request, res: Response) => {
    const licenseeId = req.user?.licenseeId;
    if (!licenseeId) return res.status(403).json({ error: 'A client account is required.' });
    const { quantity, deliveryType, attestationNote } = req.body || {};

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_DROPS) {
      return res.status(400).json({ error: `quantity must be a whole number from 1 to ${MAX_DROPS}.` });
    }
    if (deliveryType !== DeliveryType.DIGITAL && deliveryType !== DeliveryType.PHYSICAL) {
      return res.status(400).json({ error: "deliveryType must be 'DIGITAL' or 'PHYSICAL'." });
    }

    try {
      const licensee = await prisma.licensee.findUnique({ where: { id: licenseeId }, select: { pricePerDropCents: true } });
      if (!licensee) return res.status(404).json({ error: 'Account not found.' });
      if (licensee.pricePerDropCents === null) {
        return res.status(409).json({ error: 'Logo drop pricing has not been set up for your account. Please contact us.' });
      }

      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const session = await checkoutService.createCheckoutSession({
        licenseeId,
        itemTitle: `Logo drop licence x ${quantity}`,
        grossAmountCents: licensee.pricePerDropCents * quantity,
        deliveryType,
        verificationSource: VerificationSource.MANUAL_ATTESTATION,
        attestationNote: typeof attestationNote === 'string' ? attestationNote : undefined,
        successUrl: `${baseUrl}/partner/drop?payment=success`,
        cancelUrl: `${baseUrl}/partner/drop`,
      });
      return res.status(200).json(session);
    } catch (err: any) {
      if (err.message?.includes('attestationNote')) return res.status(400).json({ error: err.message });
      console.error('[PORTAL LOGO DROP ERROR]', err);
      return res.status(500).json({ error: 'The order could not be placed. Please try again.' });
    }
  });

  /** GET /api/admin/logo-drop/prices: every client and their price per logo drop (null when not offered). */
  router.get('/api/admin/logo-drop/prices', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
    try {
      const licensees = await prisma.licensee.findMany({
        select: { id: true, name: true, pricePerDropCents: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ currency: DEFAULT_CHECKOUT_CURRENCY, licensees });
    } catch (err) {
      console.error('[ADMIN LOGO DROP PRICES ERROR]', err);
      return res.status(500).json({ error: 'Failed to load prices.' });
    }
  });

  /** PATCH /api/admin/logo-drop/prices/:licenseeId: sets a client's price per drop in pence, or null to stop offering it. */
  router.patch('/api/admin/logo-drop/prices/:licenseeId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const price = req.body?.pricePerDropPence;
    if (price !== null && (typeof price !== 'number' || !Number.isInteger(price) || price <= 0)) {
      return res.status(400).json({ error: 'pricePerDropPence must be a positive whole number of pence, or null.' });
    }
    try {
      const updated = await prisma.licensee.update({
        where: { id: req.params.licenseeId },
        data: { pricePerDropCents: price },
        select: { id: true, name: true, pricePerDropCents: true },
      });
      return res.status(200).json({ licensee: updated });
    } catch (err: any) {
      if (err?.code === 'P2025') return res.status(404).json({ error: 'Client not found.' });
      console.error('[ADMIN LOGO DROP PRICE UPDATE ERROR]', err);
      return res.status(500).json({ error: 'Failed to update the price.' });
    }
  });

  return router;
}
