import 'dotenv/config';
import { prisma } from './db';
import { TransactionService } from './services/transaction.service';
import { CheckoutService } from './services/checkout.service';
import { createApp } from './expressApp';
import { scheduleReconciliationJob } from './jobs/reconcile.job';
import { scheduleFleetRetentionJob } from './jobs/fleet-retention.job';
import { LOCATION_RETENTION_DAYS } from './services/fleet/fleet-retention.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PortalRole } from '@prisma/client';
import { validateAssuranceFeeConfig } from './services/assurance-fee.service';
import { validateFileStorage } from './services/file-storage.service';
import { validateSecretBoxKey } from './services/secret-box.service';
import { validateLlmProviderConfig } from './services/review-pipeline/llm-provider.interface';
import { PLATFORM_LICENSEE_ID, getPlatformStripeAccountId } from './services/platform-account.service';

async function main() {
  console.log('GHG Logo Drop Backend - Milestone 3 Initialized');

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
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Database schema and migrations up to date.');
    } catch (migErr: unknown) {
      // Never fall back to db push in a deployed environment: it can rewrite or drop schema.
      console.error('FATAL: prisma migrate deploy failed. Refusing to start.', migErr);
      process.exit(1);
    }
  }

  // 2. Ensure the platform licensee exists and settles to the configured platform Stripe account.
  // Charities and split configurations are managed by administrators and are never seeded here.
  try {
    await prisma.licensee.upsert({
      where: { id: PLATFORM_LICENSEE_ID },
      update: { stripeConnectedAccountId: getPlatformStripeAccountId() },
      create: {
        id: PLATFORM_LICENSEE_ID,
        name: 'NFTY LOGS® Official Store',
        vertical: 'B2C_SPORTS_MERCH' as any,
        royaltyBps: 8500,
        pricePerDropCents: 500,
        stripeConnectedAccountId: getPlatformStripeAccountId(),
      },
    });

    // 3. Ensure Lead Auditor / Administrator account exists (Google SaaS Standard)
    const isProd = process.env.NODE_ENV === 'production';
    const adminEmail = process.env.ADMIN_EMAIL || (isProd ? 'admin@ghglogodrop.com' : 'admin@ghglogodrop.com');
    let adminPassword = process.env.ADMIN_PASSWORD;
    let generatedOneTimeBootstrap = false;

    if (!adminPassword) {
      if (isProd) {
        // Google Cloud / Workspace Standard: Generate high-entropy CSPRNG bootstrap secret
        adminPassword = crypto.randomBytes(18).toString('base64url') + '!A9';
        generatedOneTimeBootstrap = true;
      } else {
        adminPassword = 'LocalDevPassword123!';
      }
    } else if (isProd && adminPassword.length < 14) {
      console.warn('⚠️  [SECURITY AUDIT WARNING] ADMIN_PASSWORD should be at least 14 characters long according to NIST SP 800-63B standards.');
    }

    const saltRounds = isProd ? 12 : 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    try {
      const existingByEmail = await prisma.portalUser.findUnique({
        where: { email: adminEmail },
      });

      if (existingByEmail) {
        await prisma.portalUser.update({
          where: { id: existingByEmail.id },
          data: {
            role: PortalRole.ADMIN,
            passwordHash,
          },
        });
      } else {
        const existingById = await prisma.portalUser.findUnique({
          where: { id: 'usr_admin_001' },
        });

        if (existingById) {
          await prisma.portalUser.update({
            where: { id: 'usr_admin_001' },
            data: {
              email: adminEmail,
              role: PortalRole.ADMIN,
              passwordHash,
            },
          });
        } else {
          await prisma.portalUser.create({
            data: {
              id: 'usr_admin_001',
              email: adminEmail,
              passwordHash,
              role: PortalRole.ADMIN,
            },
          });
        }
      }

      if (generatedOneTimeBootstrap) {
        console.log('════════════════════════════════════════════════════════════════════════════');
        console.log('🔐 [ENTERPRISE BOOTSTRAP] Production Lead Auditor Initialized via CSPRNG:');
        console.log(`   Admin Email:    ${adminEmail}`);
        console.log(`   One-Time Token: ${adminPassword}`);
        console.log('   Action:         Set ADMIN_PASSWORD in Railway Variables to pin your own.');
        console.log('════════════════════════════════════════════════════════════════════════════');
      } else {
        console.log(`✅ Production Administrator account verified for: ${adminEmail}`);
      }
    } catch (adminErr: any) {
      console.warn('⚠️  [ADMIN BOOTSTRAP WARNING] Non-blocking admin init notice:', adminErr?.message || adminErr);
    }

    const licenseeCount = await prisma.licensee.count();
    const transactionCount = await prisma.transaction.count();
    console.log(`[INFO] Database connected: ${licenseeCount} Licensees, ${transactionCount} Transactions`);
    console.log(`[INFO] Default Admin user initialized: ${adminEmail}`);

    scheduleFleetRetentionJob(prisma);
    console.log(`[INFO] Fleet location retention scheduled: ${LOCATION_RETENTION_DAYS} days.`);
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
