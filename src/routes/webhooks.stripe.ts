import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient, TransactionStatus, CharityStatus } from '@prisma/client';
import { alertComplianceOfficer } from '../services/compliance.service';
import { runWithRls } from '../db/rls';

export function createStripeWebhookRouter(prisma: PrismaClient, stripe: Stripe): Router {
  const router = Router();

  router.post('/webhooks/stripe', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const isProduction = process.env.NODE_ENV === 'production';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || (isProduction ? '' : 'whsec_test_secret');

    if (!webhookSecret) {
      console.error('[STRIPE WEBHOOK FATAL] STRIPE_WEBHOOK_SECRET is not configured in production.');
      return res.status(500).send('Webhook Error: Webhook signing secret not configured');
    }

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
          let transactionId = paymentIntent.metadata?.transactionId;

          // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
          // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
          // invocation with no human user session and no user-supplied licenseeId.
          let transaction = await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
            let found = transactionId
              ? await tx.transaction.findUnique({
                  where: { id: transactionId },
                  include: {
                    financialSplit: {
                      include: {
                        charityAllocations: {
                          include: { charity: true },
                        },
                      },
                    },
                  },
                })
              : null;

            if (!found && paymentIntent.id) {
              found = await tx.transaction.findFirst({
                where: { stripePaymentIntentId: paymentIntent.id },
                include: {
                  financialSplit: {
                    include: {
                      charityAllocations: {
                        include: { charity: true },
                      },
                    },
                  },
                },
              });
              if (found) {
                transactionId = found.id;
              }
            }
            return found;
          });

          if (!transactionId || !transaction) {
            console.error(`[WEBHOOK ERROR] Event ${event.id} could not find matching transaction (metadata.transactionId: ${transactionId}, pi: ${paymentIntent.id})`);
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

          const isAlreadySettled = transaction.status === TransactionStatus.SETTLED;
          const allocations = transaction.financialSplit.charityAllocations || [];
          const hasPendingAllocations = allocations.some((a) => !a.stripeTransferId && a.charity.stripeConnectedAccountId);

          if (isAlreadySettled && !hasPendingAllocations) {
            return res.status(200).json({ received: true, alreadySettled: true });
          }

          // 1. Mark transaction as SETTLED if not already settled
          if (!isAlreadySettled) {
            // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
            // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
            // invocation with no human user session and no user-supplied licenseeId.
            await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
              await tx.transaction.update({
                where: { id: transactionId },
                data: { status: TransactionStatus.SETTLED },
              });
              await tx.financialSplit.update({
                where: { transactionId },
                data: { settledAt: new Date() },
              });
            });
          }

          // 2. Fan out per-charity Stripe transfers for untransferred allocations
          for (const alloc of allocations) {
            if (alloc.stripeTransferId) {
              // Already transferred: idempotency check
              continue;
            }

            if (!alloc.charity.stripeConnectedAccountId) {
              console.warn(`[WEBHOOK WARN] Charity ${alloc.charity.id} has no stripeConnectedAccountId, marking transferFailed.`);
              // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
              // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
              // invocation with no human user session and no user-supplied licenseeId.
              await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
                return tx.charityAllocation.update({
                  where: { id: alloc.id },
                  data: { transferFailed: true },
                });
              });
              continue;
            }

            const newRetryCount = alloc.retryCount + 1;

            try {
              const transfer = await stripe.transfers.create(
                {
                  amount: alloc.amountCents,
                  currency: (transaction.currency || 'GBP').toLowerCase(),
                  destination: alloc.charity.stripeConnectedAccountId,
                  metadata: {
                    allocationId: alloc.id,
                    transactionId: transaction.id,
                  },
                },
                {
                  idempotencyKey: alloc.id,
                }
              );

              // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
              // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
              // invocation with no human user session and no user-supplied licenseeId.
              await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
                return tx.charityAllocation.update({
                  where: { id: alloc.id },
                  data: {
                    stripeTransferId: transfer.id,
                    transferFailed: false,
                    retryCount: newRetryCount,
                  },
                });
              });
            } catch (transferErr: any) {
              console.error(`[WEBHOOK WARN] Charity transfer failed for allocation ${alloc.id}:`, transferErr);
              // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
              // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
              // invocation with no human user session and no user-supplied licenseeId.
              await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
                return tx.charityAllocation.update({
                  where: { id: alloc.id },
                  data: {
                    transferFailed: true,
                    retryCount: newRetryCount,
                  },
                });
              });
              // Do NOT mark parent transaction as failed
            }
          }

          // 3. Mark any associated SouvenirOrder as SPLIT_DISBURSED
          if (transactionId) {
            // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
            // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
            // invocation with no human user session and no user-supplied licenseeId.
            await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
              return tx.souvenirOrder.updateMany({
                where: { transactionId, status: 'ORDER_PLACED' },
                data: { status: 'SPLIT_DISBURSED' },
              });
            });
          }

          break;
        }

        case 'checkout.session.completed': {
          // Handles ISO Preparation flat-rate payment confirmation & Hosted Checkout confirmation.
          // Matches session to IsoReadinessSubmission, SouvenirOrder, and Transaction.
          const session = event.data.object as Stripe.Checkout.Session;
          const sessionId = session.id;
          const sessionTxId = session.metadata?.transactionId;
          const sessionPaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

          // 1. Match IsoReadinessSubmission
          // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
          // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
          // invocation with no human user session and no user-supplied licenseeId.
          await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
            let submission = await tx.isoReadinessSubmission.findFirst({
              where: { stripeSessionId: sessionId },
            });

            if (!submission && session.metadata?.submissionId) {
              submission = await tx.isoReadinessSubmission.findUnique({
                where: { id: session.metadata.submissionId },
              });
            }

            if (submission) {
              const nextStatus = submission.status === 'AUDIT_READY' ? 'APPROVED' : submission.status;
              await tx.isoReadinessSubmission.update({
                where: { id: submission.id },
                data: {
                  paidAt: new Date(),
                  status: nextStatus,
                  stripeSessionId: sessionId,
                },
              });
              console.info(`[WEBHOOK] ISO submission ${submission.id} marked paid with status ${nextStatus}`);
            }

            // 1b. Match WorkflowSubmission (Part B State Machine: APPROVED -> PAID)
            const wfSubmissionId = session.metadata?.workflowSubmissionId || session.metadata?.submissionId;
            let wfSubmission = await tx.workflowSubmission.findFirst({
              where: {
                OR: [
                  { stripeSessionId: sessionId },
                  ...(wfSubmissionId ? [{ id: wfSubmissionId }] : []),
                ],
              },
            });

            if (wfSubmission && wfSubmission.status === 'APPROVED') {
              await tx.workflowSubmission.update({
                where: { id: wfSubmission.id },
                data: {
                  paidAt: new Date(),
                  status: 'PAID',
                  stripeSessionId: sessionId,
                },
              });
              await tx.workflowTransitionLog.create({
                data: {
                  submissionId: wfSubmission.id,
                  previousStatus: 'APPROVED',
                  newStatus: 'PAID',
                  triggeredBy: 'STRIPE_WEBHOOK',
                  triggerReason: `Stripe checkout session completed: ${sessionId}`,
                },
              });
              console.info(`[WEBHOOK] WorkflowSubmission ${wfSubmission.id} marked PAID`);
            }
          });

          // 2. Settle associated Transaction (if not already settled)
          // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
          // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
          // invocation with no human user session and no user-supplied licenseeId.
          let targetTx = await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
            let found = sessionTxId
              ? await tx.transaction.findUnique({
                  where: { id: sessionTxId },
                  include: {
                    financialSplit: {
                      include: {
                        charityAllocations: {
                          include: { charity: true },
                        },
                      },
                    },
                  },
                })
              : null;

            if (!found && sessionPaymentIntentId) {
              found = await tx.transaction.findFirst({
                where: { stripePaymentIntentId: sessionPaymentIntentId },
                include: {
                  financialSplit: {
                    include: {
                      charityAllocations: {
                        include: { charity: true },
                      },
                    },
                  },
                },
              });
            }
            return found;
          });

          if (targetTx && targetTx.status !== TransactionStatus.SETTLED) {
            // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
            // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
            // invocation with no human user session and no user-supplied licenseeId.
            await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
              await tx.transaction.update({
                where: { id: targetTx!.id },
                data: {
                  status: TransactionStatus.SETTLED,
                  stripePaymentIntentId: sessionPaymentIntentId ?? targetTx!.stripePaymentIntentId,
                },
              });
              await tx.financialSplit.update({
                where: { transactionId: targetTx!.id },
                data: { settledAt: new Date() },
              });
            });

            // Fan out charity transfers if allocations exist
            const allocations = targetTx.financialSplit?.charityAllocations || [];
            for (const alloc of allocations) {
              if (alloc.stripeTransferId) continue;

              if (!alloc.charity.stripeConnectedAccountId) {
                console.warn(`[WEBHOOK WARN] Charity ${alloc.charity.id} has no stripeConnectedAccountId, marking transferFailed.`);
                // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
                // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
                // invocation with no human user session and no user-supplied licenseeId.
                await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
                  return tx.charityAllocation.update({
                    where: { id: alloc.id },
                    data: { transferFailed: true },
                  });
                });
                continue;
              }

              try {
                const transfer = await stripe.transfers.create(
                  {
                    amount: alloc.amountCents,
                    currency: (targetTx.currency || 'GBP').toLowerCase(),
                    destination: alloc.charity.stripeConnectedAccountId,
                    metadata: {
                      allocationId: alloc.id,
                      transactionId: targetTx.id,
                    },
                  },
                  { idempotencyKey: alloc.id }
                );

                // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
                // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
                // invocation with no human user session and no user-supplied licenseeId.
                await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
                  return tx.charityAllocation.update({
                    where: { id: alloc.id },
                    data: {
                      stripeTransferId: transfer.id,
                      transferFailed: false,
                      retryCount: alloc.retryCount + 1,
                    },
                  });
                });
              } catch (transferErr: any) {
                console.error(`[WEBHOOK WARN] Charity transfer failed for allocation ${alloc.id}:`, transferErr);
                // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
                // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
                // invocation with no human user session and no user-supplied licenseeId.
                await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
                  return tx.charityAllocation.update({
                    where: { id: alloc.id },
                    data: { transferFailed: true, retryCount: alloc.retryCount + 1 },
                  });
                });
              }
            }
          }

          // 3. Mark any associated SouvenirOrder as SPLIT_DISBURSED
          const effectiveTxId = targetTx?.id || sessionTxId;
          if (effectiveTxId) {
            // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
            // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
            // invocation with no human user session and no user-supplied licenseeId.
            await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
              return tx.souvenirOrder.updateMany({
                where: { transactionId: effectiveTxId, status: 'ORDER_PLACED' },
                data: { status: 'SPLIT_DISBURSED' },
              });
            });
          }

          break;
        }

        case 'transfer.reversed': {
          const transfer = event.data.object as Stripe.Transfer;
          const transactionId = transfer.metadata?.transactionId;

          let targetTransactionId = transactionId;

          // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
          // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
          // invocation with no human user session and no user-supplied licenseeId.
          if (!targetTransactionId) {
            const split = await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
              return tx.financialSplit.findFirst({
                where: { stripeTransferId: transfer.id },
              });
            });
            if (split) {
              targetTransactionId = split.transactionId;
            }
          }

          if (targetTransactionId) {
            // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
            // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
            // invocation with no human user session and no user-supplied licenseeId.
            await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
              const transaction = await tx.transaction.findUnique({
                where: { id: targetTransactionId },
              });

              if (transaction && transaction.status !== TransactionStatus.REVERSED) {
                await tx.transaction.update({
                  where: { id: targetTransactionId },
                  data: { status: TransactionStatus.REVERSED },
                });
              }
            });

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

          // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
          // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
          // invocation with no human user session and no user-supplied licenseeId.
          await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
            if (!targetTxId && paymentIntentId) {
              const foundTx = await tx.transaction.findFirst({
                where: { stripePaymentIntentId: paymentIntentId },
              });
              if (foundTx) {
                targetTxId = foundTx.id;
              }
            }

            if (targetTxId) {
              const transaction = await tx.transaction.findUnique({
                where: { id: targetTxId },
              });
              if (transaction && transaction.status !== TransactionStatus.REFUNDED) {
                await tx.transaction.update({
                  where: { id: targetTxId },
                  data: { status: TransactionStatus.REFUNDED },
                });
              }
            } else {
              console.error(`[WEBHOOK ERROR] charge.refunded event ${event.id} could not find matching transaction`);
            }
          });
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const transactionId = paymentIntent.metadata?.transactionId;

          // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
          // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
          // invocation with no human user session and no user-supplied licenseeId.
          await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
            let targetTx = transactionId
              ? await tx.transaction.findUnique({ where: { id: transactionId } })
              : null;

            if (!targetTx && paymentIntent.id) {
              targetTx = await tx.transaction.findFirst({
                where: { stripePaymentIntentId: paymentIntent.id },
              });
            }

            if (targetTx && targetTx.status === TransactionStatus.PENDING) {
              await tx.transaction.update({
                where: { id: targetTx.id },
                data: { status: TransactionStatus.FAILED },
              });
              console.warn(`[WEBHOOK] Transaction ${targetTx.id} marked FAILED due to payment_intent.payment_failed`);
            }
          });
          break;
        }

        case 'charge.dispute.created': {
          const dispute = event.data.object as Stripe.Dispute;
          alertComplianceOfficer({
            reason: 'CHARGE_DISPUTE_CREATED',
            eventId: event.id,
            extra: {
              disputeId: dispute.id,
              amount: dispute.amount,
              currency: dispute.currency,
              chargeId: typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id,
            },
          });
          break;
        }

        case 'account.updated': {
          // Stripe Connect onboarding confirmation
          // When a charity completes Stripe Express onboarding, Stripe emits account.updated.
          // Transitions charity from APPROVED_AWAITING_STRIPE to ACTIVE with a 1-year contract.
          const account = event.data.object as Stripe.Account;
          const accountId = account.id;
          const isFullyOnboarded =
            Boolean(account.details_submitted) ||
            (Boolean(account.charges_enabled) && Boolean(account.payouts_enabled));

          if (isFullyOnboarded && accountId) {
            // Webhook system bypass: Safe because this execution path is cryptographically authenticated via
            // Stripe HMAC-SHA256 signature verification (stripe.webhooks.constructEvent). It is a server-to-server
            // invocation with no human user session and no user-supplied licenseeId.
            await runWithRls(prisma, { role: 'ADMIN', licenseeId: '' }, async (tx) => {
              const charity = await tx.charity.findFirst({
                where: {
                  stripeConnectedAccountId: accountId,
                  status: CharityStatus.APPROVED_AWAITING_STRIPE,
                },
              });

              if (charity) {
                const contractStartDate = new Date();
                const contractEndDate = new Date(contractStartDate.getTime() + 365 * 24 * 60 * 60 * 1000);

                await tx.charity.update({
                  where: { id: charity.id },
                  data: {
                    status: CharityStatus.ACTIVE,
                    contractStartDate,
                    contractEndDate,
                  },
                });

                console.info(
                  `[WEBHOOK] Charity ${charity.id} (${charity.name}) transitioned to ACTIVE with 1-year contract until ${contractEndDate.toISOString()}.`
                );
              }
            });
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
