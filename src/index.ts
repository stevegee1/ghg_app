import { prisma } from './db';
import { TransactionService } from './services/transaction.service';
import { CheckoutService } from './services/checkout.service';
import { createApp } from './app';
import { scheduleReconciliationJob } from './jobs/reconcile.job';

async function main() {
  console.log('GHG Logo Drop Backend - Milestone 2 Initialized');
  const licenseeCount = await prisma.licensee.count();
  const transactionCount = await prisma.transaction.count();
  console.log(`Database connected. Current stats: ${licenseeCount} Licensees, ${transactionCount} Transactions.`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { prisma, TransactionService, CheckoutService, createApp, scheduleReconciliationJob };
