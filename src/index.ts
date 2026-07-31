import { prisma } from './db';
import { TransactionService } from './services/transaction.service';

async function main() {
  console.log('GHG Logo Drop Backend - Milestone 1 Initialized');
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

export { prisma, TransactionService };
