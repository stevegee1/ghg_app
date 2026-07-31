import { PrismaClient, TransactionStatus, VerificationSource } from '@prisma/client';
import Stripe from 'stripe';
import { TransactionService } from './transaction.service';

export interface InitiateCheckoutInput {
  licenseeId: string;
  checkoutReferenceId?: string;
  grossAmountCents: number;
  currency?: string;
  triggerEvent: {
    verificationSource: VerificationSource;
    weatherCondition?: string;
    eventType?: string;
    policyMilestoneRef?: string;
    rawPayload?: any;
  };
}

export class CheckoutService {
  private transactionService: TransactionService;

  constructor(
    private prisma: PrismaClient,
    private stripe: Stripe
  ) {
    this.transactionService = new TransactionService(prisma);
  }

  /**
   * Initiates checkout by computing server-side splits, creating DB records,
   * calling Stripe PaymentIntents API with destination transfer, and attaching the payment intent ID.
   * Handles checkout retries cleanly:
   * - If checkoutReferenceId exists and has a PENDING transaction with an active PaymentIntent, reuses its clientSecret.
   * - If retrieve() returns 'succeeded', updates local status to SETTLED and throws error indicating checkout already completed.
   * - Handles P2002 race conditions by re-fetching and continuing reuse logic.
   * - Uses stored FinancialSplit amounts when reusing an existing transaction.
   */
  async initiateCheckout(input: InitiateCheckoutInput) {
    const { licenseeId, checkoutReferenceId, grossAmountCents, currency = 'GBP', triggerEvent } = input;

    // 1. Look up Licensee & verify payment onboarding
    const licensee = await this.prisma.licensee.findUnique({
      where: { id: licenseeId },
    });

    if (!licensee || !licensee.stripeConnectedAccountId) {
      throw new Error('Licensee is not fully onboarded for payments');
    }

    // 2. Compute exact integer split server-side from licensee.royaltyBps (for new transactions)
    const royaltyBps = licensee.royaltyBps ?? 1500;
    const charityGiftCents = Math.round((grossAmountCents * royaltyBps) / 10000);
    const licensorRoyaltyCents = grossAmountCents - charityGiftCents;

    let transaction: any = null;

    // 3. Check for existing PENDING transaction with checkoutReferenceId
    if (checkoutReferenceId) {
      const existingTx = await this.prisma.transaction.findUnique({
        where: { checkoutReferenceId },
        include: { financialSplit: true },
      });

      if (existingTx && existingTx.status === TransactionStatus.PENDING) {
        if (existingTx.stripePaymentIntentId) {
          try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(existingTx.stripePaymentIntentId);
            if (paymentIntent) {
              if (paymentIntent.status === 'succeeded') {
                const rawPaymentIntent = paymentIntent as any;
                const stripeTransferId = typeof rawPaymentIntent.transfer === 'string' ? rawPaymentIntent.transfer : null;

                await this.prisma.$transaction([
                  this.prisma.transaction.update({
                    where: { id: existingTx.id },
                    data: { status: TransactionStatus.SETTLED },
                  }),
                  this.prisma.financialSplit.update({
                    where: { transactionId: existingTx.id },
                    data: {
                      settledAt: new Date(),
                      stripeTransferId: stripeTransferId ?? undefined,
                    },
                  }),
                ]);

                throw new Error('Checkout already completed for this reference');
              }

              if (paymentIntent.status !== 'canceled' && paymentIntent.client_secret) {
                return {
                  clientSecret: paymentIntent.client_secret,
                  transactionId: existingTx.id,
                };
              }
            }
          } catch (err: any) {
            if (err.message === 'Checkout already completed for this reference') {
              throw err;
            }
            console.warn(
              `[CHECKOUT] Failed retrieving PaymentIntent ${existingTx.stripePaymentIntentId} for transaction ${existingTx.id}, creating fresh PaymentIntent:`,
              err
            );
          }
        }
        // Reuse existingTx if stripePaymentIntentId was null or retrieve failed/canceled
        transaction = existingTx;
      }
    }

    // 4. If no reusable PENDING transaction exists, create Transaction + TriggerEvent + FinancialSplit
    if (!transaction) {
      try {
        transaction = await this.transactionService.createTransactionWithTrigger({
          licenseeId,
          checkoutReferenceId,
          grossAmountCents,
          currency,
          status: TransactionStatus.PENDING,
          triggerEvent,
          financialSplit: {
            licensorRoyaltyCents,
            charityGiftCents,
          },
        });
      } catch (createErr: any) {
        // Handle P2002 unique constraint race condition on checkoutReferenceId
        if (
          checkoutReferenceId &&
          (createErr.code === 'P2002' ||
            createErr.message?.includes('Unique constraint failed') ||
            createErr.message?.includes('checkoutReferenceId'))
        ) {
          const racedTx = await this.prisma.transaction.findUnique({
            where: { checkoutReferenceId },
            include: { financialSplit: true },
          });
          if (racedTx) {
            transaction = racedTx;
          } else {
            throw createErr;
          }
        } else {
          throw createErr;
        }
      }
    }

    // 5. Determine charity gift amount: use stored FinancialSplit if reusing existing transaction
    const targetCharityGiftCents = transaction.financialSplit?.charityGiftCents ?? charityGiftCents;

    // 6. Call Stripe PaymentIntents API with idempotencyKey = transaction.id
    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: transaction.grossAmountCents,
          currency: (transaction.currency || currency).toLowerCase(),
          transfer_data: {
            destination: licensee.stripeConnectedAccountId,
            amount: targetCharityGiftCents,
          },
          metadata: {
            transactionId: transaction.id,
          },
        },
        {
          idempotencyKey: transaction.id,
        }
      );

      // 7. Save returned stripePaymentIntentId on Transaction
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction.id,
      };
    } catch (error) {
      // Mark transaction as FAILED on error
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
        },
      });
      throw error;
    }
  }
}
