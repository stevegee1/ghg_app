import cron from 'node-cron';
import Stripe from 'stripe';
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { alertComplianceOfficer } from '../services/compliance.service';

export interface ReconciliationResult {
  checkedCount: number;
  mismatchesCount: number;
  mismatches: Array<{
    transactionId: string;
    dbStatus: string;
    stripeStatus: string;
  }>;
}

/**
 * Directly unit-testable reconciliation function.
 * Queries PENDING transactions older than the specified threshold,
 * checks their status against Stripe, logs drift, and alerts compliance officer.
 */
export async function runReconciliation(
  prisma: PrismaClient,
  stripe: Stripe,
  olderThanMinutes: number = 60
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
  };

  for (const tx of pendingTransactions) {
    if (!tx.stripePaymentIntentId) continue;

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(tx.stripePaymentIntentId);

      if (paymentIntent.status === 'succeeded' && tx.status === TransactionStatus.PENDING) {
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
