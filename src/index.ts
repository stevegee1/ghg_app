import 'dotenv/config';
import { prisma } from './db';
import { TransactionService } from './services/transaction.service';
import { CheckoutService } from './services/checkout.service';
import { createApp } from './expressApp';
import { scheduleReconciliationJob } from './jobs/reconcile.job';

async function main() {
  console.log('GHG Logo Drop Backend - Milestone 3 Initialized');

  const app = createApp();
  const port = Number(process.env.PORT) || 8080;

  // Start listening FIRST — Railway health checks need 0.0.0.0:PORT to respond
  app.listen(port, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${port}`);
    console.log(`- API mounted at /api`);
    console.log(`- Webhooks handler at POST /webhooks/stripe`);
  });

  // Check DB connection on startup
  try {
    const licenseeCount = await prisma.licensee.count();
    const transactionCount = await prisma.transaction.count();
    console.log(`Database connected: ${licenseeCount} Licensees, ${transactionCount} Transactions`);
  } catch (e: any) {
    console.error('⚠️  DB connection failed (check DATABASE_URL):', e?.message ?? e);
    // Don't exit — server remains up to handle health checks and API errors gracefully
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { prisma, TransactionService, CheckoutService, createApp, scheduleReconciliationJob };
