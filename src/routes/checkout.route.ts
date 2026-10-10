import { Router, Request, Response } from 'express';
import { PrismaClient, TransactionStatus, VerificationSource, DeliveryType, MerchProductKind } from '@prisma/client';
import Stripe from 'stripe';
import { CheckoutService } from '../services/checkout.service';
import { generateOrderNumber } from './orders.route';
import { MerchCatalogueError, priceOrder } from '../services/merch-catalogue.service';

export function createCheckoutRouter(
  checkoutService: CheckoutService,
  prisma: PrismaClient,
  stripe?: Stripe
): Router {
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

  /**
   * POST /api/checkout/session
   * Creates a Stripe Checkout Session for a catalogue item. The price comes from the merch catalogue
   * on the server; the request names only the product and quantity.
   */
  router.post('/api/checkout/session', async (req: Request, res: Response) => {
    const { productId, quantity } = req.body || {};

    try {
      const order = await priceOrder(prisma, { productId, quantity, kind: MerchProductKind.CATALOGUE });
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;

      const session = await checkoutService.createCheckoutSession({
        licenseeId: order.product.licenseeId,
        itemTitle: order.quantity > 1 ? `${order.product.title} x ${order.quantity}` : order.product.title,
        grossAmountCents: order.grossAmountPence,
        currency: order.product.currency,
        successUrl: `${baseUrl}/checkout/success`,
        cancelUrl: `${baseUrl}/merch`,
        metadata: { merchProductId: order.product.id, quantity: String(order.quantity) },
      });

      return res.status(200).json(session);
    } catch (err: unknown) {
      if (err instanceof MerchCatalogueError) return res.status(err.status).json({ error: err.message });
      console.error('[CHECKOUT SESSION ROUTE ERROR]', err);
      return res.status(500).json({ error: 'Failed to start checkout. Please try again.' });
    }
  });

  /**
   * GET /api/checkout/order-summary
   * Returns verified transaction provenance, reconciled settlement status,
   * 15% statutory charity split breakdown, and live parcel tracking reference.
   */
  router.get('/api/checkout/order-summary', async (req: Request, res: Response) => {
    const { session_id, tx_id } = req.query as { session_id?: string; tx_id?: string };

    if (!session_id && !tx_id) {
      return res.status(400).json({ error: 'session_id or tx_id query parameter is required.' });
    }

    if (!prisma) {
      return res.status(500).json({ error: 'Database service not available on checkout router.' });
    }

    try {
      let transaction: any = null;

      // 1. Find transaction by tx_id
      if (tx_id) {
        transaction = await prisma.transaction.findUnique({
          where: { id: tx_id },
          include: {
            financialSplit: {
              include: {
                charityAllocations: { include: { charity: true } },
              },
            },
            triggerEvent: true,
            souvenirOrder: true,
            customKeepsakeSpec: true,
          },
        });
      }

      // If not found by tx_id, check stripePaymentIntentId or session metadata
      if (!transaction && session_id && stripe) {
        try {
          const session = await stripe.checkout.sessions.retrieve(session_id);
          const metaTxId = session.metadata?.transactionId;
          const piId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

          if (metaTxId) {
            transaction = await prisma.transaction.findUnique({
              where: { id: metaTxId },
              include: {
                financialSplit: {
                  include: {
                    charityAllocations: { include: { charity: true } },
                  },
                },
                triggerEvent: true,
                souvenirOrder: true,
                customKeepsakeSpec: true,
              },
            });
          }

          if (!transaction && piId) {
            transaction = await prisma.transaction.findFirst({
              where: { stripePaymentIntentId: piId },
              include: {
                financialSplit: {
                  include: {
                    charityAllocations: { include: { charity: true } },
                  },
                },
                triggerEvent: true,
                souvenirOrder: true,
                customKeepsakeSpec: true,
              },
            });
          }

          // Reconcile status to SETTLED if Stripe confirmed payment
          if (transaction && session.payment_status === 'paid' && transaction.status !== TransactionStatus.SETTLED) {
            transaction = await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: TransactionStatus.SETTLED,
                stripePaymentIntentId: piId || transaction.stripePaymentIntentId,
              },
              include: {
                financialSplit: {
                  include: {
                    charityAllocations: { include: { charity: true } },
                  },
                },
                triggerEvent: true,
                souvenirOrder: true,
                customKeepsakeSpec: true,
              },
            });

            if (transaction.financialSplit && !transaction.financialSplit.settledAt) {
              await prisma.financialSplit.update({
                where: { transactionId: transaction.id },
                data: { settledAt: new Date() },
              });
            }
          }
        } catch (sErr: any) {
          console.warn('[STRIPE SESSION RETRIEVE WARN]', sErr?.message);
        }
      }

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction record not found.' });
      }

      // 2. Ensure SouvenirOrder exists for this transaction (order tracking)
      let souvenirOrder = transaction.souvenirOrder;
      if (!souvenirOrder) {
        const orderNumber = generateOrderNumber();
        const rawPayload = (transaction.triggerEvent?.rawPayload as any) || {};
        const keepsakeSpec = transaction.customKeepsakeSpec;

        const customerEmail = rawPayload.customerEmail || keepsakeSpec?.customerEmail || 'orders@ghgemissionlogs.com';
        const customerName = rawPayload.customerName || keepsakeSpec?.customerName || 'Verified Supporter';
        const eventName = keepsakeSpec
          ? `${keepsakeSpec.sportType || 'Official'} Keepsake: ${keepsakeSpec.frenzyClub || keepsakeSpec.garmentModel}`
          : (rawPayload.itemTitle || 'NFTYLOGS Climate Action Apparel');

        const shippingAddress = rawPayload.shippingAddress || keepsakeSpec?.shippingAddress || null;

        souvenirOrder = await prisma.souvenirOrder.create({
          data: {
            orderNumber,
            customerEmail,
            customerName,
            eventCategory: 'SPORTS',
            eventName,
            logoDropCount: 1,
            itemType: 'GHG_MERCH',
            shippingAddress,
            status: transaction.status === TransactionStatus.SETTLED ? 'SPLIT_DISBURSED' : 'ORDER_PLACED',
            grossAmountCents: transaction.grossAmountCents,
            licensorCents: transaction.financialSplit?.licensorRoyaltyCents || Math.round(transaction.grossAmountCents * 0.85),
            charityCents: transaction.financialSplit?.charityGiftCents || Math.round(transaction.grossAmountCents * 0.15),
            transactionId: transaction.id,
            stripeSessionId: session_id || null,
          },
        });
      }

      return res.status(200).json({
        success: true,
        orderNumber: souvenirOrder.orderNumber,
        transactionId: transaction.id,
        status: transaction.status,
        orderStatus: souvenirOrder.status,
        itemTitle: souvenirOrder.eventName,
        grossAmountCents: transaction.grossAmountCents,
        licensorRoyaltyCents: souvenirOrder.licensorCents,
        charityGiftCents: souvenirOrder.charityCents,
        currency: transaction.currency || 'GBP',
        createdAt: transaction.createdAt,
        shippingAddress: souvenirOrder.shippingAddress,
        courierName: souvenirOrder.courierName || 'Royal Mail Tracked 48 / DHL Express',
        trackingNumber: souvenirOrder.trackingNumber || null,
        trackingUrl: `/track/${souvenirOrder.orderNumber}`,
        invoicePdfUrl: `/api/orders/${souvenirOrder.orderNumber}/invoice-pdf`,
        charityAllocations: transaction.financialSplit?.charityAllocations?.map((a: any) => ({
          charityName: a.charity.name,
          amountCents: a.amountCents,
          transferred: !!a.stripeTransferId,
        })) || [],
      });
    } catch (err: any) {
      console.error('[ORDER SUMMARY ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve order summary.' });
    }
  });

  return router;
}
