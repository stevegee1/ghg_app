import 'dotenv/config';
import { PrismaClient, Vertical, TransactionStatus, VerificationSource, PortalRole, DeliveryType, CharityStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedFrameworks } from './seeds/framework-seed';

const prisma = new PrismaClient();

/**
 * Development and test fixtures only: sample companies, users and test-only B2B keys whose plain
 * values are in this file. Never run against production.
 */
export async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The seed contains test fixtures and test-only keys; it must not run in production.');
  }
  console.log('Seeding database...');

  // Ensure ghg_app_user role exists for RLS
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ghg_app_user') THEN
          CREATE ROLE ghg_app_user NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
        END IF;
      END
      $$;
    `);
    await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;`);
  } catch (e) {
    console.error('Seed RLS role setup error:', e);
  }

  // Framework registry (idempotent - safe on every deploy)
  await seedFrameworks(prisma);

  // 0. Seed Charities
  const charitiesData = [
    {
      id: 'charity_green_earth',
      name: 'Green Earth Foundation',
      stripeConnectedAccountId: 'acct_charity_green',
      status: CharityStatus.ACTIVE,
    },
    {
      id: 'charity_ocean_clean',
      name: 'Clean Oceans Trust',
      stripeConnectedAccountId: 'acct_charity_ocean',
      status: CharityStatus.ACTIVE,
    },
    {
      id: 'charity_youth_sport',
      name: 'Youth Eco Sports Alliance',
      stripeConnectedAccountId: 'acct_charity_youth_sport',
      status: CharityStatus.ACTIVE,
    },
    {
      id: 'charity_legacy_inactive',
      name: 'Inactive Legacy Fund',
      stripeConnectedAccountId: 'acct_charity_inactive',
      status: CharityStatus.INACTIVE,
    },
  ];

  for (const char of charitiesData) {
    await prisma.charity.upsert({
      where: { id: char.id },
      update: {
        name: char.name,
        stripeConnectedAccountId: char.stripeConnectedAccountId,
        status: char.status,
      },
      create: char,
    });
  }

  // Remove any transient non-seed charities left by isolated tests
  await prisma.charity.deleteMany({
    where: { id: { notIn: charitiesData.map((c) => c.id) } },
  }).catch(() => {});

  // 1. Seed Licensees
  const b2bApiKeyHashItm = await bcrypt.hash('b2b_key_itm_secret', 10);
  const b2bApiKeyHashJcb = await bcrypt.hash('b2b_key_jcb_secret', 10);

  const licenseesData = [
    {
      id: 'lic_itm_power',
      name: 'ITM Power Test',
      vertical: Vertical.B2B_CLEAN_TECH,
      stripeConnectedAccountId: 'acct_itm_12345',
      pricePerDropCents: 500,
      b2bApiKeyHash: b2bApiKeyHashItm,
      isPubliclyVisible: false,
    },
    {
      id: 'lic_jcb_test',
      name: 'JCB Test',
      vertical: Vertical.B2B_HEAVY_MANUFACTURING,
      stripeConnectedAccountId: 'acct_jcb_67890',
      pricePerDropCents: 750,
      b2bApiKeyHash: b2bApiKeyHashJcb,
      isPubliclyVisible: false,
    },
    {
      id: 'lic_arsenal_fc',
      name: 'Arsenal FC Test',
      vertical: Vertical.B2C_SPORTS_MERCH,
      stripeConnectedAccountId: 'acct_arsenal_11223',
      pricePerDropCents: null,
      b2bApiKeyHash: null,
      isPubliclyVisible: true,
    },
  ];

  for (const lic of licenseesData) {
    await prisma.licensee.upsert({
      where: { id: lic.id },
      update: {
        name: lic.name,
        vertical: lic.vertical,
        stripeConnectedAccountId: lic.stripeConnectedAccountId,
        pricePerDropCents: lic.pricePerDropCents,
        b2bApiKeyHash: lic.b2bApiKeyHash,
        isPubliclyVisible: lic.isPubliclyVisible,
      },
      create: lic,
    });
  }

  // 2. Seed Portal Users
  const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

  await prisma.portalUser.upsert({
    where: { email: 'admin@ghglogodrop.com' },
    update: {
      passwordHash,
      role: PortalRole.ADMIN,
    },
    create: {
      id: 'usr_admin_001',
      email: 'admin@ghglogodrop.com',
      passwordHash,
      role: PortalRole.ADMIN,
    },
  });

  await prisma.portalUser.upsert({
    where: { email: 'partner@itm-power.com' },
    update: {
      passwordHash,
      licenseeId: 'lic_itm_power',
      role: PortalRole.PARTNER,
    },
    create: {
      id: 'usr_partner_001',
      email: 'partner@itm-power.com',
      passwordHash,
      licenseeId: 'lic_itm_power',
      role: PortalRole.PARTNER,
    },
  });

  await prisma.portalUser.upsert({
    where: { email: 'partner@arsenal.com' },
    update: {
      passwordHash,
      licenseeId: 'lic_arsenal_fc',
      role: PortalRole.PARTNER,
    },
    create: {
      id: 'usr_partner_002',
      email: 'partner@arsenal.com',
      passwordHash,
      licenseeId: 'lic_arsenal_fc',
      role: PortalRole.PARTNER,
    },
  });

  // 3. Seed Platform Default Split Config
  const adminUser = await prisma.portalUser.findUnique({ where: { email: 'admin@ghglogodrop.com' } });
  if (adminUser) {
    // Upsert default platform split config with 3 active charities
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
        changedByUserId: adminUser.id,
      },
    });
  }

  // 3. Seed Transactions with linked TriggerEvents and FinancialSplits
  const sampleTransactions = [
    // Licensee 1: ITM Power
    {
      id: 'tx_itm_001',
      licenseeId: 'lic_itm_power',
      grossAmountCents: 10000, // £100.00
      currency: 'GBP',
      status: TransactionStatus.SETTLED,
      stripePaymentIntentId: 'pi_itm_001_settled',
      triggerEvent: {
        id: 'trig_itm_001',
        verificationSource: VerificationSource.THIRD_PARTY_API,
        weatherCondition: 'Sunny 22C',
        eventType: 'SOLAR_MILESTONE_REACHED',
        policyMilestoneRef: 'POLICY_SOLAR_V1',
        rawPayload: { sensorId: 'SN-9872', outputKw: 500 },
      },
      financialSplit: {
        id: 'split_itm_001',
        licensorRoyaltyCents: 8000, // £80.00
        charityGiftCents: 2000,     // £20.00
        stripeTransferId: 'tr_itm_001',
        charityStripeAccountId: 'acct_charity_green',
        settledAt: new Date('2026-07-01T12:00:00Z'),
      },
    },
    {
      id: 'tx_itm_002',
      licenseeId: 'lic_itm_power',
      grossAmountCents: 5500, // £55.00
      currency: 'GBP',
      status: TransactionStatus.PENDING,
      stripePaymentIntentId: 'pi_itm_002_pending',
      triggerEvent: {
        id: 'trig_itm_002',
        verificationSource: VerificationSource.MANUAL_ATTESTATION,
        weatherCondition: 'Windy 15C',
        eventType: 'TURBINE_INSPECTION_PASS',
        policyMilestoneRef: 'POLICY_WIND_V2',
        rawPayload: { inspectorId: 'INS-404', status: 'PASSED' },
      },
      financialSplit: {
        id: 'split_itm_002',
        licensorRoyaltyCents: 4400, // £44.00
        charityGiftCents: 1100,     // £11.00
        stripeTransferId: null,
        charityStripeAccountId: 'acct_charity_green',
        settledAt: null,
      },
    },
    // Licensee 2: JCB Test
    {
      id: 'tx_jcb_001',
      licenseeId: 'lic_jcb_test',
      grossAmountCents: 25000, // £250.00
      currency: 'GBP',
      status: TransactionStatus.SETTLED,
      stripePaymentIntentId: 'pi_jcb_001_settled',
      triggerEvent: {
        id: 'trig_jcb_001',
        verificationSource: VerificationSource.THIRD_PARTY_API,
        weatherCondition: 'Cloudy 18C',
        eventType: 'HEAVY_EQUIPMENT_ZERO_EMISSION_HOURS',
        policyMilestoneRef: 'POLICY_HEAVY_MANUF_V1',
        rawPayload: { telematicsUnit: 'JCB-EV-99', zeroEmissionHours: 100 },
      },
      financialSplit: {
        id: 'split_jcb_001',
        licensorRoyaltyCents: 20000, // £200.00
        charityGiftCents: 5000,      // £50.00
        stripeTransferId: 'tr_jcb_001',
        charityStripeAccountId: 'acct_charity_ocean',
        settledAt: new Date('2026-07-15T10:30:00Z'),
      },
    },
    {
      id: 'tx_jcb_002',
      licenseeId: 'lic_jcb_test',
      grossAmountCents: 12000, // £120.00
      currency: 'GBP',
      status: TransactionStatus.REFUNDED,
      stripePaymentIntentId: 'pi_jcb_002_refunded',
      triggerEvent: {
        id: 'trig_jcb_002',
        verificationSource: VerificationSource.CONSUMER_OPT_IN,
        weatherCondition: 'Rain 12C',
        eventType: 'CUSTOMER_ECO_PLEDGE',
        policyMilestoneRef: 'POLICY_CONSUMER_OPTIN_V1',
        rawPayload: { userOptInRef: 'OPT-7712' },
      },
      financialSplit: {
        id: 'split_jcb_002',
        licensorRoyaltyCents: 9600, // £96.00
        charityGiftCents: 2400,     // £24.00
        stripeTransferId: null,
        charityStripeAccountId: 'acct_charity_ocean',
        settledAt: null,
      },
    },
    // Licensee 3: Arsenal FC Test
    {
      id: 'tx_arsenal_001',
      licenseeId: 'lic_arsenal_fc',
      grossAmountCents: 8000, // £80.00
      currency: 'GBP',
      status: TransactionStatus.SETTLED,
      stripePaymentIntentId: 'pi_ars_001_settled',
      triggerEvent: {
        id: 'trig_arsenal_001',
        verificationSource: VerificationSource.CONSUMER_OPT_IN,
        weatherCondition: 'Clear 20C',
        eventType: 'MATCHDAY_RECYCLING_MERCH',
        policyMilestoneRef: 'POLICY_SPORTS_MERCH_V1',
        rawPayload: { stadiumGate: 'G-04', recycledCount: 3000 },
      },
      financialSplit: {
        id: 'split_arsenal_001',
        licensorRoyaltyCents: 6400, // £64.00
        charityGiftCents: 1600,     // £16.00
        stripeTransferId: 'tr_ars_001',
        charityStripeAccountId: 'acct_charity_youth_sport',
        settledAt: new Date('2026-07-20T16:00:00Z'),
      },
    },
  ];

  for (const txData of sampleTransactions) {
    const { triggerEvent, financialSplit, ...txFields } = txData;

    await prisma.transaction.upsert({
      where: { id: txFields.id },
      update: {
        licenseeId: txFields.licenseeId,
        grossAmountCents: txFields.grossAmountCents,
        currency: txFields.currency,
        status: txFields.status,
        stripePaymentIntentId: txFields.stripePaymentIntentId,
      },
      create: txFields,
    });

    const defaultAttestationNotes: Record<VerificationSource, string> = {
      THIRD_PARTY_API: "Data submitted via partner's own API/telemetry system. Not independently audited.",
      MANUAL_ATTESTATION: "Manually attested by an authorized user. Not independently audited.",
      CONSUMER_OPT_IN: "Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type.",
    };
    const attestationNote = defaultAttestationNotes[triggerEvent.verificationSource];

    await prisma.triggerEvent.upsert({
      where: { transactionId: txFields.id },
      update: {
        verificationSource: triggerEvent.verificationSource,
        attestationNote,
        deliveryType: DeliveryType.DIGITAL,
        fulfillmentStatus: null,
        weatherCondition: triggerEvent.weatherCondition,
        eventType: triggerEvent.eventType,
        policyMilestoneRef: triggerEvent.policyMilestoneRef,
        rawPayload: triggerEvent.rawPayload,
      },
      create: {
        id: triggerEvent.id,
        transactionId: txFields.id,
        verificationSource: triggerEvent.verificationSource,
        attestationNote,
        deliveryType: DeliveryType.DIGITAL,
        fulfillmentStatus: null,
        weatherCondition: triggerEvent.weatherCondition,
        eventType: triggerEvent.eventType,
        policyMilestoneRef: triggerEvent.policyMilestoneRef,
        rawPayload: triggerEvent.rawPayload,
      },
    });

    await prisma.financialSplit.upsert({
      where: { transactionId: txFields.id },
      update: {
        licensorRoyaltyCents: financialSplit.licensorRoyaltyCents,
        charityGiftCents: financialSplit.charityGiftCents,
        stripeTransferId: financialSplit.stripeTransferId,
        charityStripeAccountId: financialSplit.charityStripeAccountId,
        settledAt: financialSplit.settledAt,
      },
      create: {
        id: financialSplit.id,
        transactionId: txFields.id,
        licensorRoyaltyCents: financialSplit.licensorRoyaltyCents,
        charityGiftCents: financialSplit.charityGiftCents,
        stripeTransferId: financialSplit.stripeTransferId,
        charityStripeAccountId: financialSplit.charityStripeAccountId,
        settledAt: financialSplit.settledAt,
      },
    });
  }

  console.log('Seeding completed successfully.');
}

if (require.main === module) {
  seed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
