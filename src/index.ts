import 'dotenv/config';
import { prisma } from './db';
import { TransactionService } from './services/transaction.service';
import { CheckoutService } from './services/checkout.service';
import { createApp } from './app.js';
import { scheduleReconciliationJob } from './jobs/reconcile.job';

async function main() {
  console.log('GHG Logo Drop Backend - Milestone 3 Initialized');
  const licenseeCount = await prisma.licensee.count();
  const transactionCount = await prisma.transaction.count();
  console.log(`Database connected. Current stats: ${licenseeCount} Licensees, ${transactionCount} Transactions.`);

  const app = createApp();
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Express server running on http://localhost:${port}`);
    console.log(`- Static checkout harness available at http://localhost:${port}/checkout.html`);
    console.log(`- Checkout API mounted at POST /api/checkout`);
    console.log(`- Webhooks handler mounted at POST /webhooks/stripe`);
  });
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { prisma, TransactionService, CheckoutService, createApp, scheduleReconciliationJob };
