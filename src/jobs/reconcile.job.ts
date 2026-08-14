import cron from 'node-cron';
import Stripe from 'stripe';
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { alertComplianceOfficer } from '../services/compliance.service';

export const DEFAULT_MAX_RECONCILIATION_RETRIES = 3;

export interface ReconciliationResult {
  checkedCount: number;
  mismatchesCount: number;
  mismatches: Array<{
    transactionId: string;
    dbStatus: string;
    stripeStatus: string;
  }>;
  unsettledAllocationsCount?: number;
  allocationDrifts?: Array<{
    allocationId: string;
    charityId: string;
    retryCount: number;
  }>;
}

/**
 * Directly unit-testable reconciliation function.
 * 1. Queries PENDING transactions older than the specified threshold, checks status against Stripe, logs drift.
 * 2. Queries unsettled CharityAllocation records (stripeTransferId null or transferFailed true) for SETTLED transactions.
 *    Retries the transfer using allocation.id as idempotencyKey so retries stay 100% safe.
 *    If a transfer self-heals, updates DB. If it fails and reaches maxRetries (default DEFAULT_MAX_RECONCILIATION_RETRIES = 3), alerts compliance officer.
 */
export async function runReconciliation(
  prisma: PrismaClient,
  stripe: Stripe,
  olderThanMinutes: number = 60,
  maxRetries: number = DEFAULT_MAX_RECONCILIATION_RETRIES
): Promise<ReconciliationResult> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      status: TransactionStatus.PENDING,
      createdAt: {
        lt: cutoff,
      },
      stripePaymentIntentId: {
        not: null,
      },
    },
  });

  const result: ReconciliationResult = {
    checkedCount: pendingTransactions.length,
    mismatchesCount: 0,
    mismatches: [],
    unsettledAllocationsCount: 0,
    allocationDrifts: [],
  };

  // 1. Transaction Status Drift Check
  for (const tx of pendingTransactions) {
    if (!tx.stripePaymentIntentId) continue;

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(tx.stripePaymentIntentId);

      if (paymentIntent && paymentIntent.status === 'succeeded' && tx.status === TransactionStatus.PENDING) {
        result.mismatchesCount++;
        result.mismatches.push({
          transactionId: tx.id,
          dbStatus: tx.status,
          stripeStatus: paymentIntent.status,
        });

        console.warn(
          `[RECONCILIATION DRIFT DETECTED] Transaction ${tx.id} has DB status ${tx.status} but Stripe status ${paymentIntent.status}`
        );

        alertComplianceOfficer({
          transactionId: tx.id,
          reason: 'RECONCILIATION_STATUS_DRIFT',
          extra: {
            dbStatus: tx.status,
            stripeStatus: paymentIntent.status,
            stripePaymentIntentId: tx.stripePaymentIntentId,
          },
        });
      }
    } catch (err: any) {
      console.error(`[RECONCILIATION ERROR] Failed retrieving PaymentIntent for transaction ${tx.id}:`, err);
    }
  }

  // 2. Unsettled CharityAllocation Transfer Retry & Drift Check
  const unsettledAllocations = await prisma.charityAllocation.findMany({
    where: {
      stripeTransferId: null,
      createdAt: {
        lt: cutoff,
      },
      financialSplit: {
        transaction: {
          status: TransactionStatus.SETTLED,
        },
      },
    },
    include: {
      charity: true,
      financialSplit: {
        include: {
          transaction: true,
        },
      },
    },
  });

  result.unsettledAllocationsCount = unsettledAllocations.length;

  if (!stripe.transfers || typeof stripe.transfers.create !== 'function') {
    return result;
  }

  for (const alloc of unsettledAllocations) {
    if (!alloc.charity.stripeConnectedAccountId) continue;

    const newRetryCount = alloc.retryCount + 1;
    const tx = alloc.financialSplit.transaction;

    try {
      // Retry Stripe transfer using allocation.id as idempotencyKey for 100% safety
      const transfer = await stripe.transfers.create(
        {
          amount: alloc.amountCents,
          currency: (tx.currency || 'GBP').toLowerCase(),
          destination: alloc.charity.stripeConnectedAccountId,
          metadata: {
            allocationId: alloc.id,
            transactionId: tx.id,
            retry: newRetryCount,
          },
        },
        {
          idempotencyKey: alloc.id,
        }
      );

      // Self-healed: update DB record
      await prisma.charityAllocation.update({
        where: { id: alloc.id },
        data: {
          stripeTransferId: transfer.id,
          transferFailed: false,
          retryCount: newRetryCount,
        },
      });

      console.log(`[RECONCILIATION RETRY SUCCESS] Allocation ${alloc.id} transfer self-healed on retry #${newRetryCount}.`);
    } catch (retryErr: any) {
      console.warn(`[RECONCILIATION RETRY FAILED] Allocation ${alloc.id} retry #${newRetryCount} failed:`, retryErr);

      await prisma.charityAllocation.update({
        where: { id: alloc.id },
        data: {
          transferFailed: true,
          retryCount: newRetryCount,
        },
      });

      // Fall back to compliance alert after maxRetries (e.g. 3 attempts)
      if (newRetryCount >= maxRetries) {
        result.mismatchesCount++;
        result.allocationDrifts?.push({
          allocationId: alloc.id,
          charityId: alloc.charityId,
          retryCount: newRetryCount,
        });

        alertComplianceOfficer({
          transactionId: tx.id,
          reason: 'CHARITY_ALLOCATION_TRANSFER_DRIFT',
          extra: {
            allocationId: alloc.id,
            charityId: alloc.charityId,
            retryCount: newRetryCount,
            error: retryErr.message,
          },
        });
      }
    }
  }

  return result;
}

/**
 * Schedules nightly reconciliation job via node-cron (at 02:00 AM every night).
 */
export function scheduleReconciliationJob(prisma: PrismaClient, stripe: Stripe) {
  return cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Running nightly transaction reconciliation job...');
    try {
      const res = await runReconciliation(prisma, stripe, 60);
      console.log(`[CRON] Reconciliation completed. Checked: ${res.checkedCount}, Mismatches: ${res.mismatchesCount}`);
    } catch (err) {
      console.error('[CRON ERROR] Nightly reconciliation failed:', err);
    }
  });
}
