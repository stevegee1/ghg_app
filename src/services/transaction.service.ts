import { PrismaClient, TransactionStatus, VerificationSource, DeliveryType, FulfillmentStatus } from '@prisma/client';
import { getOrComputeDefaultCharityAllocations, CharityAllocationResult } from './charity-allocation.service';

export const DEFAULT_ATTESTATION_NOTES: Record<string, string> = {
  THIRD_PARTY_API: "Data submitted via partner's own API/telemetry system. Not independently audited.",
  MANUAL_ATTESTATION: "Manually attested by an authorized user. Not independently audited.",
  CONSUMER_OPT_IN: "Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type.",
  JOB_REPORT_MANUAL: "Self-reported by partner via portal. Not independently verified.",
  JOB_REPORT_API: "Submitted via partner's own system/API. Not independently verified.",
};

const DISALLOWED_POSITIVE_CLAIM_REGEX =
  /(?<!not\s+)(?<!not\s+independently\s+)\b(independently\s+(?:verified|audited)|certified|audited|carbon\s+offset\s+verified|verified\s+by\s+platform)\b/i;

export function validateAttestationNote(note?: string | null): string | undefined {
  if (!note || !note.trim()) return undefined;
  const trimmed = note.trim();
  if (Object.values(DEFAULT_ATTESTATION_NOTES).includes(trimmed)) {
    return trimmed;
  }
  if (DISALLOWED_POSITIVE_CLAIM_REGEX.test(trimmed)) {
    throw new Error('Custom attestationNote cannot claim independent verification or certification.');
  }
  return trimmed;
}

export interface CreateTransactionInput {
  licenseeId: string;
  checkoutReferenceId?: string;
  grossAmountCents: number;
  currency?: string;
  status?: TransactionStatus;
  stripePaymentIntentId?: string;
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
  financialSplit: {
    licensorRoyaltyCents: number;
    charityGiftCents: number;
    stripeTransferId?: string;
    charityStripeAccountId?: string;
    settledAt?: Date;
    charityAllocations?: CharityAllocationResult[];
  };
}

export class TransactionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Creates a Transaction atomically with a mandatory linked TriggerEvent, FinancialSplit, and CharityAllocations.
   * Enforces that triggerEvent and financialSplit are mandatory.
   * Enforces physical/digital fulfillmentStatus rules.
   * Auto-populates attestationNote based on verificationSource unless custom non-disallowed note provided.
   */
  async createTransactionWithTrigger(input: CreateTransactionInput) {
    if (!input.triggerEvent || !input.triggerEvent.verificationSource || !input.triggerEvent.deliveryType) {
      throw new Error("TriggerEvent with a non-null verificationSource and deliveryType is mandatory to create a Transaction.");
    }

    if (!input.financialSplit) {
      throw new Error("FinancialSplit is mandatory to create a Transaction.");
    }

    if (typeof input.grossAmountCents !== 'number' || !Number.isInteger(input.grossAmountCents)) {
      throw new Error("grossAmountCents must be an integer (cents/pence).");
    }

    // Validate and resolve attestationNote
    const customNote = validateAttestationNote(input.triggerEvent.attestationNote);
    const resolvedAttestationNote = customNote ?? DEFAULT_ATTESTATION_NOTES[input.triggerEvent.verificationSource];

    const { licensorRoyaltyCents, charityGiftCents } = input.financialSplit;
    if (!Number.isInteger(licensorRoyaltyCents) || !Number.isInteger(charityGiftCents)) {
      throw new Error("FinancialSplit amounts must be integers (cents/pence).");
    }
    if (licensorRoyaltyCents + charityGiftCents !== input.grossAmountCents) {
      throw new Error(
        `FinancialSplit sum (${licensorRoyaltyCents} + ${charityGiftCents} = ${licensorRoyaltyCents + charityGiftCents}) does not equal Transaction grossAmountCents (${input.grossAmountCents}).`
      );
    }

    const deliveryType = input.triggerEvent.deliveryType;
    const fulfillmentStatus: FulfillmentStatus | null =
      deliveryType === DeliveryType.PHYSICAL
        ? input.triggerEvent.fulfillmentStatus ?? FulfillmentStatus.PENDING
        : null;

    // Resolve allocations: use provided allocations or compute default equal split across active charities
    let allocations = input.financialSplit.charityAllocations;
    if (!allocations || allocations.length === 0) {
      allocations = await getOrComputeDefaultCharityAllocations(this.prisma, charityGiftCents);
    }

    // 1. Create Transaction + TriggerEvent + FinancialSplit + CharityAllocation rows
    const createdTx = await this.prisma.transaction.create({
      data: {
        licenseeId: input.licenseeId,
        checkoutReferenceId: input.checkoutReferenceId,
        grossAmountCents: input.grossAmountCents,
        currency: input.currency ?? 'GBP',
        status: input.status ?? TransactionStatus.PENDING,
        stripePaymentIntentId: input.stripePaymentIntentId,
        triggerEvent: {
          create: {
            verificationSource: input.triggerEvent.verificationSource,
            attestationNote: resolvedAttestationNote,
            deliveryType,
            fulfillmentStatus,
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
            allocationsFinalized: false,
            ...(allocations.length > 0
              ? {
                  charityAllocations: {
                    create: allocations.map((a) => ({
                      charityId: a.charityId,
                      amountCents: a.amountCents,
                    })),
                  },
                }
              : {}),
          },
        },
      },
      include: {
        triggerEvent: true,
        financialSplit: {
          include: {
            charityAllocations: {
              include: { charity: true },
            },
          },
        },
      },
    });

    // 2. Finalize allocations if allocations were created (fires DB trigger check_financial_split_allocations_finalized_trigger)
    if (allocations.length > 0 && createdTx.financialSplit) {
      await this.prisma.financialSplit.update({
        where: { id: createdTx.financialSplit.id },
        data: { allocationsFinalized: true },
      });
    }

    return this.prisma.transaction.findUnique({
      where: { id: createdTx.id },
      include: {
        triggerEvent: true,
        financialSplit: {
          include: {
            charityAllocations: {
              include: { charity: true },
            },
          },
        },
      },
    }) as any;
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
