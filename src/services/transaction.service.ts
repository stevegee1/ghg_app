import { PrismaClient, TransactionStatus, VerificationSource } from '@prisma/client';

export interface CreateTransactionInput {
  licenseeId: string;
  grossAmountCents: number;
  currency?: string;
  status?: TransactionStatus;
  stripePaymentIntentId?: string;
  triggerEvent: {
    verificationSource: VerificationSource;
    weatherCondition?: string;
    eventType?: string;
    policyMilestoneRef?: string;
    rawPayload?: any;
  };
  financialSplit: {
    licensorRoyaltyCents: number;
    charityGiftCents: number;
    stripeTransferId?: string;
    charityStripeAccountId?: string;
    settledAt?: Date;
  };
}

export class TransactionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a Transaction atomically with a mandatory linked TriggerEvent and FinancialSplit.
   * Enforces that triggerEvent (with non-null verificationSource) and financialSplit are mandatory.
   * Validates that licensorRoyaltyCents + charityGiftCents === grossAmountCents at the app layer,
   * backed up by a PostgreSQL trigger at the database layer.
   */
  async createTransactionWithTrigger(input: CreateTransactionInput) {
    if (!input.triggerEvent || !input.triggerEvent.verificationSource) {
      throw new Error("TriggerEvent with a non-null verificationSource is mandatory to create a Transaction.");
    }

    if (!input.financialSplit) {
      throw new Error("FinancialSplit is mandatory to create a Transaction.");
    }

    if (typeof input.grossAmountCents !== 'number' || !Number.isInteger(input.grossAmountCents)) {
      throw new Error("grossAmountCents must be an integer (cents/pence).");
    }

    const { licensorRoyaltyCents, charityGiftCents } = input.financialSplit;
    if (!Number.isInteger(licensorRoyaltyCents) || !Number.isInteger(charityGiftCents)) {
      throw new Error("FinancialSplit amounts must be integers (cents/pence).");
    }
    if (licensorRoyaltyCents + charityGiftCents !== input.grossAmountCents) {
      throw new Error(
        `FinancialSplit sum (${licensorRoyaltyCents} + ${charityGiftCents} = ${licensorRoyaltyCents + charityGiftCents}) does not equal Transaction grossAmountCents (${input.grossAmountCents}).`
      );
    }

    return this.prisma.transaction.create({
      data: {
        licenseeId: input.licenseeId,
        grossAmountCents: input.grossAmountCents,
        currency: input.currency ?? 'GBP',
        status: input.status ?? TransactionStatus.PENDING,
        stripePaymentIntentId: input.stripePaymentIntentId,
        triggerEvent: {
          create: {
            verificationSource: input.triggerEvent.verificationSource,
            weatherCondition: input.triggerEvent.weatherCondition,
            eventType: input.triggerEvent.eventType,
            policyMilestoneRef: input.triggerEvent.policyMilestoneRef,
            rawPayload: input.triggerEvent.rawPayload,
          },
        },
        financialSplit: {
          create: {
            licensorRoyaltyCents: input.financialSplit.licensorRoyaltyCents,
            charityGiftCents: input.financialSplit.charityGiftCents,
            stripeTransferId: input.financialSplit.stripeTransferId,
            charityStripeAccountId: input.financialSplit.charityStripeAccountId,
            settledAt: input.financialSplit.settledAt,
          },
        },
      },
      include: {
        triggerEvent: true,
        financialSplit: true,
      },
    });
  }

  /**
   * Adds a FinancialSplit to an existing Transaction, enforcing that sum equals grossAmountCents.
   */
  async createFinancialSplit(
    transactionId: string,
    split: {
      licensorRoyaltyCents: number;
      charityGiftCents: number;
      stripeTransferId?: string;
      charityStripeAccountId?: string;
      settledAt?: Date;
    }
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error(`Transaction with id ${transactionId} not found.`);
    }

    if (split.licensorRoyaltyCents + split.charityGiftCents !== transaction.grossAmountCents) {
      throw new Error(
        `FinancialSplit sum (${split.licensorRoyaltyCents} + ${split.charityGiftCents} = ${split.licensorRoyaltyCents + split.charityGiftCents}) does not equal Transaction grossAmountCents (${transaction.grossAmountCents}).`
      );
    }

    return this.prisma.financialSplit.create({
      data: {
        transactionId,
        licensorRoyaltyCents: split.licensorRoyaltyCents,
        charityGiftCents: split.charityGiftCents,
        stripeTransferId: split.stripeTransferId,
        charityStripeAccountId: split.charityStripeAccountId,
        settledAt: split.settledAt,
      },
    });
  }

  /**
   * Returns transactions filtered strictly by licenseeId.
   */
  async getTransactionsByLicensee(licenseeId: string) {
    return this.prisma.transaction.findMany({
      where: { licenseeId },
      include: {
        triggerEvent: true,
        financialSplit: true,
      },
    });
  }
}
