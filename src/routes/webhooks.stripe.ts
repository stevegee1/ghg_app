import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { alertComplianceOfficer } from '../services/compliance.service';

export function createStripeWebhookRouter(prisma: PrismaClient, stripe: Stripe): Router {
  const router = Router();

  router.post('/webhooks/stripe', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

    if (!sig) {
      return res.status(400).send('Webhook Error: Missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const transactionId = paymentIntent.metadata?.transactionId;

          if (!transactionId) {
            console.error(`[WEBHOOK ERROR] Event ${event.id} missing metadata.transactionId`);
            return res.status(200).json({ received: true, warning: 'Missing transactionId metadata' });
          }

          const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { financialSplit: true },
          });

          if (!transaction) {
            console.error(`[WEBHOOK ERROR] Transaction ${transactionId} not found in database for event ${event.id}`);
            return res.status(200).json({ received: true, warning: 'Transaction not found' });
          }

          if (!transaction.financialSplit) {
            alertComplianceOfficer({
              transactionId,
              reason: 'WEBHOOK_MISSING_FINANCIAL_SPLIT',
              eventId: event.id,
            });
            return res.status(200).json({ received: true, error: 'Missing FinancialSplit' });
          }

          // Idempotency check
          if (transaction.status === TransactionStatus.SETTLED) {
            return res.status(200).json({ received: true, alreadySettled: true });
          }

          const rawPaymentIntent = paymentIntent as any;
          const stripeTransferId = typeof rawPaymentIntent.transfer === 'string' ? rawPaymentIntent.transfer : null;

          await prisma.$transaction([
            prisma.transaction.update({
              where: { id: transactionId },
              data: { status: TransactionStatus.SETTLED },
            }),
            prisma.financialSplit.update({
              where: { transactionId },
              data: {
                settledAt: new Date(),
                stripeTransferId: stripeTransferId ?? transaction.financialSplit.stripeTransferId,
              },
            }),
          ]);

          break;
        }

        case 'transfer.reversed': {
          const transfer = event.data.object as Stripe.Transfer;
          const transactionId = transfer.metadata?.transactionId;

          let targetTransactionId = transactionId;

          if (!targetTransactionId) {
            const split = await prisma.financialSplit.findFirst({
              where: { stripeTransferId: transfer.id },
            });
            if (split) {
              targetTransactionId = split.transactionId;
            }
          }

          if (targetTransactionId) {
            const transaction = await prisma.transaction.findUnique({
              where: { id: targetTransactionId },
            });

            if (transaction && transaction.status !== TransactionStatus.REVERSED) {
              await prisma.transaction.update({
                where: { id: targetTransactionId },
                data: { status: TransactionStatus.REVERSED },
              });
            }

            alertComplianceOfficer({
              transactionId: targetTransactionId,
              reason: 'transfer.reversed',
              eventId: event.id,
              extra: { transferId: transfer.id },
            });
          } else {
            console.error(`[WEBHOOK ERROR] transfer.reversed event ${event.id} could not find matching transaction`);
            alertComplianceOfficer({
              reason: 'UNMATCHED_TRANSFER_REVERSED',
              eventId: event.id,
              extra: { transferId: transfer.id },
            });
          }
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          const transactionId = charge.metadata?.transactionId;
          const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;

          let targetTxId = transactionId;

          if (!targetTxId && paymentIntentId) {
            const tx = await prisma.transaction.findFirst({
              where: { stripePaymentIntentId: paymentIntentId },
            });
            if (tx) {
              targetTxId = tx.id;
            }
          }

          if (targetTxId) {
            const transaction = await prisma.transaction.findUnique({
              where: { id: targetTxId },
            });
            if (transaction && transaction.status !== TransactionStatus.REFUNDED) {
              await prisma.transaction.update({
                where: { id: targetTxId },
                data: { status: TransactionStatus.REFUNDED },
              });
            }
          } else {
            console.error(`[WEBHOOK ERROR] charge.refunded event ${event.id} could not find matching transaction`);
          }
          break;
        }

        default:
          console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
          break;
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error(`[WEBHOOK PROCESSING ERROR]`, err);
      return res.status(500).json({ error: 'Internal webhook processing error' });
    }
  });

  return router;
}
