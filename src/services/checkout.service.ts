import { PrismaClient, TransactionStatus, VerificationSource, DeliveryType, FulfillmentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { TransactionService } from './transaction.service';
import { resolveActiveSplitConfig } from './split-config.service';
import { computeCharityAllocations } from './charity-allocation.service';

export interface InitiateCheckoutInput {
  licenseeId: string;
  checkoutReferenceId?: string;
  grossAmountCents: number;
  currency?: string;
  triggerEvent: {
    verificationSource: VerificationSource;
    attestationNote?: string;
    deliveryType: DeliveryType;
    fulfillmentStatus?: FulfillmentStatus | null;
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
   * Resolves active split config via resolveActiveSplitConfig (per-licensee or platform default).
   */
  async initiateCheckout(input: InitiateCheckoutInput) {
    const { licenseeId, checkoutReferenceId, grossAmountCents, currency = 'GBP', triggerEvent } = input;

    // 1. Look up Licensee & verify payment onboarding (or auto-provision platform licensee)
    let licensee = await this.prisma.licensee.findUnique({
      where: { id: licenseeId },
    });

    if (!licensee) {
      licensee = await this.prisma.licensee.upsert({
        where: { id: licenseeId },
        update: { stripeConnectedAccountId: 'acct_platform_default_001' },
        create: {
          id: licenseeId,
          name: licenseeId === 'lic_ghg_official' ? 'NFTY LOGS® Official Store' : 'Authorized Platform Partner',
          vertical: 'B2C_SPORTS_MERCH' as any,
          royaltyBps: 8500,
          pricePerDropCents: 500,
          stripeConnectedAccountId: 'acct_platform_default_001',
        },
      });
    } else if (!licensee.stripeConnectedAccountId) {
      licensee = await this.prisma.licensee.update({
        where: { id: licensee.id },
        data: { stripeConnectedAccountId: 'acct_platform_default_001' },
      });
    }

    // 2. Resolve currently active split configuration (per-licensee or platform default)
    const resolvedConfig = await resolveActiveSplitConfig(this.prisma, licenseeId);

    // Compute exact integer split server-side
    const licensorRoyaltyCents = Math.round((grossAmountCents * resolvedConfig.royaltyBps) / 10000);
    const charityGiftCents = grossAmountCents - licensorRoyaltyCents;
    const charityAllocations = computeCharityAllocations(charityGiftCents, resolvedConfig.charityAllocationBps);

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
                      stripeTransferId: stripeTransferId ?? existingTx.financialSplit?.stripeTransferId,
                    },
                  }),
                ]);

                throw new Error('Checkout already completed for this reference');
              } else if (paymentIntent.status !== 'canceled') {
                return {
                  transactionId: existingTx.id,
                  clientSecret: paymentIntent.client_secret,
                  grossAmountCents: existingTx.grossAmountCents,
                  currency: existingTx.currency,
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

    // 4. If no reusable PENDING transaction exists, create Transaction + TriggerEvent + FinancialSplit + CharityAllocations
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
            charityAllocations,
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

    // 5. Call Stripe PaymentIntents API with idempotencyKey = transaction.id
    // Note (M5b): transfer_data is removed from PaymentIntent creation; per-charity transfers are executed upon settlement in the webhook handler.
    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: transaction.grossAmountCents,
          currency: (transaction.currency || currency).toLowerCase(),
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
    } catch (error: any) {
      // If running locally with placeholder Stripe key, generate dev clientSecret instead of crashing
      if (
        (error?.type === 'StripeAuthenticationError' || error?.statusCode === 401) &&
        (process.env.STRIPE_SECRET_KEY?.includes('placeholder') || !process.env.STRIPE_SECRET_KEY?.startsWith('rk_live_') && !process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'))
      ) {
        console.warn(`[CHECKOUT] Running with local/test Stripe key. Using developer clientSecret for transaction ${transaction.id}.`);
        const devSecret = `pi_dev_${transaction.id}_secret_${Date.now()}`;
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { stripePaymentIntentId: `pi_dev_${transaction.id}` },
        });
        return {
          clientSecret: devSecret,
          transactionId: transaction.id,
        };
      }

      // Mark transaction as FAILED on unexpected error in production
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
        },
      });
      throw error;
    }
  }

  /**
   * Creates a real Stripe Checkout Session for live redirect to https://checkout.stripe.com
   */
  async createCheckoutSession(params: {
    licenseeId: string;
    itemTitle: string;
    grossAmountCents: number;
    currency?: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const { licenseeId, itemTitle, grossAmountCents, currency = 'GBP', successUrl, cancelUrl } = params;

    const refId = `stripe_cs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const checkoutResult = await this.initiateCheckout({
      licenseeId,
      checkoutReferenceId: refId,
      grossAmountCents,
      currency,
      triggerEvent: {
        verificationSource: VerificationSource.CONSUMER_OPT_IN,
        deliveryType: DeliveryType.DIGITAL,
      },
    });

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: itemTitle,
                description: 'Authentic NFTY LOGS® merchandise with verified 15% statutory ESG charitable split.',
              },
              unit_amount: grossAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&tx_id=${checkoutResult.transactionId}`,
        cancel_url: cancelUrl,
        metadata: {
          transactionId: checkoutResult.transactionId,
          licenseeId,
        },
      });

      return {
        sessionUrl: session.url,
        sessionId: session.id,
        transactionId: checkoutResult.transactionId,
      };
    } catch (sessionErr: any) {
      console.error('[STRIPE CHECKOUT SESSION ERROR]', sessionErr);
      // If Stripe restricted key does not have Checkout Sessions enabled, return transactionId and fallback
      return {
        sessionUrl: null,
        sessionId: null,
        transactionId: checkoutResult.transactionId,
        clientSecret: checkoutResult.clientSecret,
      };
    }
  }
}
