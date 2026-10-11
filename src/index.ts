import 'dotenv/config';
import { prisma } from './db';
import { TransactionService } from './services/transaction.service';
import { CheckoutService } from './services/checkout.service';
import { createApp } from './expressApp';
import { scheduleReconciliationJob } from './jobs/reconcile.job';
import { scheduleFleetRetentionJob } from './jobs/fleet-retention.job';
import { LOCATION_RETENTION_DAYS } from './services/fleet/fleet-retention.service';
import { Vertical } from '@prisma/client';
import { syncFrameworkRegistry } from './services/framework-registry';
import { ensureAdministrator } from './services/admin-bootstrap.service';
import { validateAssuranceFeeConfig } from './services/assurance-fee.service';
import { validateFileStorage } from './services/file-storage.service';
import { validateSecretBoxKey } from './services/secret-box.service';
import { validateLlmProviderConfig } from './services/review-pipeline/llm-provider.interface';
import { validateFuelFeedConfig } from './services/market-index.service';
import { scheduleMarketIndexJob } from './jobs/market-index.job';
import { scheduleAnchorJob, scheduleAnchorPublishJob } from './jobs/anchor.job';
import { validateAnchorConfig } from './services/anchor/anchor-publisher';
import { validateWeatherConfig } from './services/fleet/weather-exposure.service';
import { scheduleWeatherJob } from './jobs/weather.job';
import { PLATFORM_LICENSEE_ID, getPlatformStripeAccountId } from './services/platform-account.service';

async function main() {
  console.log('NFTYLOGS Backend - Milestone 3 Initialized');

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
      console.error('FATAL: JWT_SECRET environment variable must be set in production. Refusing to start.');
      process.exit(1);
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('FATAL: STRIPE_WEBHOOK_SECRET environment variable must be set in production. Refusing to start.');
      process.exit(1);
    }
  }

  for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PLATFORM_ACCOUNT_ID', 'STRIPE_FLEET_PRICE_ID']) {
    if (!process.env[name]) {
      console.error(`FATAL: ${name} environment variable must be set. Refusing to start.`);
      process.exit(1);
    }
  }

  try {
    validateAssuranceFeeConfig();
  } catch (err) {
    console.error(`FATAL: Assurance fee configuration is invalid. ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  try {
    validateFileStorage();
  } catch (err) {
    console.error(`FATAL: File storage is unavailable. ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  try {
    validateSecretBoxKey();
  } catch (err) {
    console.error(`FATAL: Fleet secret encryption is not configured. ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  try {
    validateLlmProviderConfig();
  } catch (err) {
    console.error(`FATAL: AI review provider configuration is invalid. ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  try {
    validateAnchorConfig();
  } catch (err) {
    console.error(`FATAL: Blockchain anchoring configuration is invalid. ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  try {
    validateWeatherConfig();
  } catch (err) {
    console.error(`FATAL: Weather provider configuration is invalid. ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  try {
    validateFuelFeedConfig();
  } catch (err) {
    console.error(`FATAL: Fuel price feed configuration is invalid. ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  const app = createApp();
  const port = Number(process.env.PORT) || 3000;

  // Start listening FIRST: Railway health checks need 0.0.0.0:PORT to respond
  app.listen(port, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${port}`);
    console.log(`- API mounted at /api`);
    console.log(`- Webhooks handler at POST /webhooks/stripe`);
  });

  // 1. Apply database migrations to ensure all tables exist in PostgreSQL
  if (process.env.DATABASE_URL) {
    try {
      console.log('🔄 Running database migrations on startup...');
      const { execSync } = require('child_process');
      execSync('npx --no-install prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Database schema and migrations up to date.');
    } catch (migErr: unknown) {
      // Never fall back to db push in a deployed environment: it can rewrite or drop schema.
      console.error('FATAL: prisma migrate deploy failed. Refusing to start.', migErr);
      process.exit(1);
    }
  }

  // 2. Platform records that every deployment needs. Nothing here is sample data: the platform store
  // licensee, the compliance framework registry shipped with this release, and the administrator.
  try {
    await prisma.licensee.upsert({
      where: { id: PLATFORM_LICENSEE_ID },
      update: { stripeConnectedAccountId: getPlatformStripeAccountId() },
      create: {
        id: PLATFORM_LICENSEE_ID,
        name: 'NFTYLOGS Official Store',
        vertical: Vertical.B2C_SPORTS_MERCH,
        stripeConnectedAccountId: getPlatformStripeAccountId(),
      },
    });
  } catch (err) {
    console.error('FATAL: The platform store record could not be prepared.', err);
    process.exit(1);
  }

  try {
    await syncFrameworkRegistry(prisma);
  } catch (err) {
    console.error(`FATAL: The compliance framework registry could not be synced. ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  try {
    const admin = await ensureAdministrator(prisma);
    if (admin.action !== 'unchanged') console.log(`[INFO] Administrator ${admin.action}: ${admin.email}`);
    if (admin.retiredSeedAdmin) console.log('[INFO] The development seed administrator account was retired.');
  } catch (err) {
    console.error(`FATAL: ${(err as Error).message} Refusing to start.`);
    process.exit(1);
  }

  try {
    const licenseeCount = await prisma.licensee.count();
    const transactionCount = await prisma.transaction.count();
    console.log(`[INFO] Database connected: ${licenseeCount} Licensees, ${transactionCount} Transactions`);

    scheduleFleetRetentionJob(prisma);
    console.log(`[INFO] Fleet location retention scheduled: ${LOCATION_RETENTION_DAYS} days.`);
    scheduleMarketIndexJob(prisma);
    scheduleAnchorJob(prisma);
    scheduleAnchorPublishJob(prisma);
    scheduleWeatherJob(prisma);
  } catch (e: any) {
    console.error('[ERROR] DB connection failed (check DATABASE_URL):', e?.message ?? e);
    // Do not exit: server remains up to handle health checks and API errors gracefully
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { prisma, TransactionService, CheckoutService, createApp, scheduleReconciliationJob };
