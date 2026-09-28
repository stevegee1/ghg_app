import 'dotenv/config';
import { prisma } from './db';
import { TransactionService } from './services/transaction.service';
import { CheckoutService } from './services/checkout.service';
import { createApp } from './expressApp';
import { scheduleReconciliationJob } from './jobs/reconcile.job';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PortalRole } from '@prisma/client';

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
    if (!process.env.POLYGON_PRIVATE_KEY || !process.env.POLYGON_CONTRACT_ADDRESS) {
      console.error('FATAL: POLYGON_PRIVATE_KEY and POLYGON_CONTRACT_ADDRESS must be set in production for on-chain Polygon trust seals. Refusing to start.');
      process.exit(1);
    }
  }

  const app = createApp();
  const port = Number(process.env.PORT) || 3000;

  // Start listening FIRST — Railway health checks need 0.0.0.0:PORT to respond
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
    } catch (migErr: any) {
      console.warn('⚠️  Prisma migrate deploy warning (trying db push fallback):', migErr?.message ?? migErr);
      try {
        const { execSync } = require('child_process');
        execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
        console.log('✅ Database schema pushed successfully.');
      } catch (pushErr: any) {
        console.error('❌ Failed to ensure database tables exist:', pushErr?.message ?? pushErr);
      }
    }
  }

  // 2. Ensure statutory platform charities and platform licensee exist in database
  try {
    const statutoryCharities = [
      { id: 'charity_green_earth', name: 'Green Earth Foundation', stripeConnectedAccountId: 'acct_charity_green' },
      { id: 'charity_ocean_clean', name: 'Clean Oceans Trust', stripeConnectedAccountId: 'acct_charity_ocean' },
      { id: 'charity_youth_sport', name: 'Youth Eco Sports Trust', stripeConnectedAccountId: 'acct_charity_youth_sport' },
    ];

    for (const c of statutoryCharities) {
      await prisma.charity.upsert({
        where: { id: c.id },
        update: { status: 'ACTIVE' },
        create: {
          id: c.id,
          name: c.name,
          stripeConnectedAccountId: c.stripeConnectedAccountId,
          status: 'ACTIVE',
        },
      });
    }

    await prisma.licensee.upsert({
      where: { id: 'lic_ghg_official' },
      update: { stripeConnectedAccountId: 'acct_platform_default_001' },
      create: {
        id: 'lic_ghg_official',
        name: 'NFTY LOGS® Official Store',
        vertical: 'B2C_SPORTS_MERCH' as any,
        royaltyBps: 8500,
        pricePerDropCents: 500,
        stripeConnectedAccountId: 'acct_platform_default_001',
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

    // 4. Ensure platform default split configuration exists
    await prisma.splitConfigHistory.upsert({
      where: { id: 'cfg_platform_default_001' },
      update: {
        royaltyBps: 8500,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 3333 },
          { charityId: 'charity_ocean_clean', bps: 3333 },
          { charityId: 'charity_youth_sport', bps: 3334 },
        ],
        isActive: true,
      },
      create: {
        id: 'cfg_platform_default_001',
        licenseeId: null,
        royaltyBps: 8500,
        charityAllocationBps: [
          { charityId: 'charity_green_earth', bps: 3333 },
          { charityId: 'charity_ocean_clean', bps: 3333 },
          { charityId: 'charity_youth_sport', bps: 3334 },
        ],
        isActive: true,
        changedByUserId: 'usr_admin_001',
      },
    });

    const licenseeCount = await prisma.licensee.count();
    const transactionCount = await prisma.transaction.count();
    console.log(`✅ Database connected: ${licenseeCount} Licensees, ${transactionCount} Transactions`);
    console.log(`✅ Default Admin user initialized: ${adminEmail}`);
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
