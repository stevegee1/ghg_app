import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

/**
 * Transfers each unpaid charity allocation of a settled transaction to the charity's connected
 * Stripe account. Allocations already transferred are skipped, and the allocation ID is the
 * idempotency key, so a repeated call never pays twice. Failures are recorded for reconciliation.
 */
export async function payCharityAllocations(prisma: PrismaClient, stripe: Stripe, transactionId: string): Promise<void> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { financialSplit: { include: { charityAllocations: { include: { charity: true } } } } },
  });
  if (!transaction?.financialSplit) return;

  for (const alloc of transaction.financialSplit.charityAllocations) {
    if (alloc.stripeTransferId) continue;

    if (!alloc.charity.stripeConnectedAccountId) {
      console.warn(`[SETTLEMENT] Charity ${alloc.charity.id} has no connected account; allocation ${alloc.id} marked failed.`);
      await prisma.charityAllocation.update({ where: { id: alloc.id }, data: { transferFailed: true } });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: alloc.amountCents,
          currency: transaction.currency.toLowerCase(),
          destination: alloc.charity.stripeConnectedAccountId,
          metadata: { allocationId: alloc.id, transactionId: transaction.id },
        },
        { idempotencyKey: alloc.id }
      );
      await prisma.charityAllocation.update({
        where: { id: alloc.id },
        data: { stripeTransferId: transfer.id, transferFailed: false, retryCount: alloc.retryCount + 1 },
      });
    } catch (err) {
      console.error(`[SETTLEMENT] Charity transfer failed for allocation ${alloc.id}:`, err);
      await prisma.charityAllocation.update({
        where: { id: alloc.id },
        data: { transferFailed: true, retryCount: alloc.retryCount + 1 },
      });
    }
  }
}
