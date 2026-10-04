import { PrismaClient, Prisma, FleetFuelType, Vertical } from '@prisma/client';
import { parseCsv, CsvParseError } from '../src/utils/csv';
import {
  resolveEmissionFactor,
  calculateKgCo2e,
  EmissionFactorMissingError,
} from '../src/services/fleet/emission-factor.service';
import {
  importFleetAssets,
  importFleetReadings,
  importFuelCardTransactions,
  FleetImportFileError,
} from '../src/services/fleet/fleet-import.service';
import { runWithRls } from '../src/db/rls';
import Stripe from 'stripe';
import request from 'supertest';
import {
  createFleetSubscriptionCheckout,
  applyFleetSubscriptionEvent,
  syncFleetQuantity,
  recordPaidFleetInvoice,
  FleetBillingError,
} from '../src/services/fleet/fleet-billing.service';
import { PLATFORM_LICENSEE_ID } from '../src/services/platform-account.service';
import { ensurePlatformSplitConfig } from './helpers/platformSplit';
import { resolveActiveSplitConfig } from '../src/services/split-config.service';
import { createApp } from '../src/expressApp';

const prisma = new PrismaClient();

// Fixture factor values for tests only. Production factors are entered from the published source.
const FIXTURE_SOURCE = 'TEST FIXTURE';
const DIESEL_2025 = '2.500000';
const DIESEL_2026 = '2.600000';

describe('Fleet Emissions: CSV parsing', () => {
  it('parses quoted fields, escaped quotes, CRLF line endings and a byte order mark', () => {
    const table = parseCsv('﻿asset_tag,name\r\nEX-01,"Excavator, ""big"""\r\n\r\nDT-02,Dumper\r\n', { maxRows: 10 });
    expect(table.headers).toEqual(['asset_tag', 'name']);
    expect(table.rows).toEqual([
      { line: 2, values: { asset_tag: 'EX-01', name: 'Excavator, "big"' } },
      { line: 4, values: { asset_tag: 'DT-02', name: 'Dumper' } },
    ]);
  });

  it.each([
    ['', /empty/],
    ['a,b\n', /no data rows/],
    ['a,b\n1,2,3\n', /expected 2 columns/],
    ['a,a\n1,2\n', /more than once/],
    ['a\n"unclosed\n', /not closed/],
    ['a\n1\n2\n3\n', /limit is 2/],
  ])('rejects malformed input %#', (text, message) => {
    expect(() => parseCsv(text, { maxRows: 2 })).toThrow(CsvParseError);
    expect(() => parseCsv(text, { maxRows: 2 })).toThrow(message);
  });
});

describe('Fleet Emissions: factors, imports and isolation', () => {
  let licenseeA: { id: string };
  let licenseeB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let admin: { id: string };

  const assetsCsv = [
    'asset_tag,name,category,make,model,serial_number,fuel_type,ownership,operational_control,site_name',
    'EX-01,Excavator 1,excavator,CAT,320,SN1,diesel_average_biofuel_blend,owned,yes,Site North',
    'DT-02,Dump truck 2,DUMP_TRUCK,Volvo,A30G,SN2,DIESEL_AVERAGE_BIOFUEL_BLEND,RENTED_IN,yes,Site North',
    'LV-03,Van 3,light commercial vehicle,Ford,Transit,,PETROL_MINERAL,leased,yes,',
  ].join('\n');

  beforeAll(async () => {
    const suffix = Date.now().toString(36);
    licenseeA = await prisma.licensee.create({ data: { name: `Fleet A ${suffix}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    licenseeB = await prisma.licensee.create({ data: { name: `Fleet B ${suffix}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    userA = await prisma.portalUser.create({ data: { email: `fleet.a.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licenseeA.id } });
    userB = await prisma.portalUser.create({ data: { email: `fleet.b.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licenseeB.id } });
    admin = await prisma.portalUser.create({ data: { email: `fleet.admin.${suffix}@test.example`, passwordHash: 'x', role: 'ADMIN' } });

    await prisma.emissionFactor.createMany({
      data: [
        { source: FIXTURE_SOURCE, publicationYear: 2025, fuelType: FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND, unit: 'litre', kgCo2ePerUnit: DIESEL_2025, citation: 'Test fixture', createdByUserId: admin.id },
        { source: FIXTURE_SOURCE, publicationYear: 2026, fuelType: FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND, unit: 'litre', kgCo2ePerUnit: DIESEL_2026, citation: 'Test fixture', createdByUserId: admin.id },
        { source: `${FIXTURE_SOURCE} RETIRED`, publicationYear: 2026, fuelType: FleetFuelType.HVO, unit: 'litre', kgCo2ePerUnit: '0.100000', citation: 'Test fixture', createdByUserId: admin.id, retiredAt: new Date() },
      ],
    });
  });

  afterAll(async () => {
    // Fleet audit records block deletion of the users who created them, so remove them first.
    const licenseeIds = [licenseeA.id, licenseeB.id];
    await prisma.fleetReading.deleteMany({ where: { licenseeId: { in: licenseeIds } } });
    await prisma.fleetImportBatch.deleteMany({ where: { licenseeId: { in: licenseeIds } } });
    await prisma.fleetAsset.deleteMany({ where: { licenseeId: { in: licenseeIds } } });
    await prisma.emissionFactor.deleteMany({ where: { createdByUserId: admin.id } });
    await prisma.portalUser.deleteMany({ where: { id: { in: [userA.id, userB.id, admin.id] } } });
    await prisma.licensee.deleteMany({ where: { id: { in: licenseeIds } } });
    await prisma.$disconnect();
  });

  it('resolves the latest non-retired factor published for the year or earlier', async () => {
    expect((await resolveEmissionFactor(prisma, FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND, 2025)).kgCo2ePerUnit.toFixed(6)).toBe(DIESEL_2025);
    expect((await resolveEmissionFactor(prisma, FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND, 2026)).kgCo2ePerUnit.toFixed(6)).toBe(DIESEL_2026);
    expect((await resolveEmissionFactor(prisma, FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND, 2030)).kgCo2ePerUnit.toFixed(6)).toBe(DIESEL_2026);
    await expect(resolveEmissionFactor(prisma, FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND, 2024)).rejects.toBeInstanceOf(EmissionFactorMissingError);
    await expect(resolveEmissionFactor(prisma, FleetFuelType.HVO, 2026)).rejects.toBeInstanceOf(EmissionFactorMissingError);
  });

  it('calculates kg CO2e with exact decimal arithmetic', () => {
    const result = calculateKgCo2e(new Prisma.Decimal('1234.567'), { kgCo2ePerUnit: new Prisma.Decimal('2.512060') });
    expect(result.toFixed(3)).toBe('3101.306');
  });

  it('registers assets only when every row is valid', async () => {
    const bad = `${assetsCsv}\nRO-04,Rented out,crane,,,,diesel_mineral,rented_out,yes,\nXX-05,Bad,spaceship,,,,diesel_mineral,owned,yes,`;
    const rejected = await importFleetAssets(prisma, { userId: userA.id, licenseeId: licenseeA.id }, bad);
    expect(rejected.created).toBe(0);
    expect(rejected.rejections.map((r) => r.line)).toEqual([5, 6]);
    expect(rejected.rejections[0].reason).toMatch(/operational control/);
    expect(rejected.rejections[1].reason).toMatch(/category must be one of/);
    expect(await prisma.fleetAsset.count({ where: { licenseeId: licenseeA.id } })).toBe(0);

    const ok = await importFleetAssets(prisma, { userId: userA.id, licenseeId: licenseeA.id }, assetsCsv);
    expect(ok.created).toBe(3);

    const again = await importFleetAssets(prisma, { userId: userA.id, licenseeId: licenseeA.id }, assetsCsv);
    expect(again.created).toBe(0);
    expect(again.rejections[0].reason).toMatch(/already registered/);
  });

  it('rejects the whole readings file when any row is invalid and records why', async () => {
    const csv = [
      'asset_tag,period_start,period_end,fuel_litres,engine_hours,idle_hours,distance_km',
      'EX-01,2026-01-01,2026-01-31,1000,150,20,',
      'DT-02,2026-01-01,2026-01-31,500,80,90,1200',
      'ZZ-99,2026-01-01,2026-01-31,10,,,',
      'EX-01,2026-02-30,2026-03-01,10,,,',
      'EX-01,2026-03-01,2026-03-31,1,000,,,',
    ].join('\n');

    await expect(importFleetReadings(prisma, { userId: userA.id, licenseeId: licenseeA.id }, 'jan.csv', csv)).rejects.toBeInstanceOf(FleetImportFileError);

    const valid = csv.split('\n').slice(0, 5).join('\n');
    const result = await importFleetReadings(prisma, { userId: userA.id, licenseeId: licenseeA.id }, 'jan.csv', valid);
    expect(result.rowsAccepted).toBe(0);
    expect(result.rowsRejected).toBe(4);
    expect(result.rejections.map((r) => r.reason)).toEqual([
      expect.stringMatching(/idle_hours cannot exceed engine_hours/),
      expect.stringMatching(/ZZ-99 is not registered/),
      expect.stringMatching(/not a real calendar date/),
    ]);

    const batch = await prisma.fleetImportBatch.findUnique({ where: { id: result.batchId! } });
    expect(batch!.rowsAccepted).toBe(0);
    expect(await prisma.fleetReading.count({ where: { licenseeId: licenseeA.id } })).toBe(0);
  });

  it('imports valid readings with the factor version fixed on each reading', async () => {
    const csv = [
      'asset_tag,period_start,period_end,fuel_litres,engine_hours,idle_hours,distance_km',
      'EX-01,2025-12-01,2025-12-31,1000,150,20,',
      'EX-01,2026-01-01,2026-01-31,1000,150,20,',
    ].join('\n');

    const result = await importFleetReadings(prisma, { userId: userA.id, licenseeId: licenseeA.id }, 'q.csv', csv);
    expect(result.rowsAccepted).toBe(2);
    expect(result.totalKgCo2e).toBe('5100.000');

    const readings = await prisma.fleetReading.findMany({
      where: { licenseeId: licenseeA.id },
      include: { emissionFactor: true },
      orderBy: { periodStart: 'asc' },
    });
    expect(readings.map((r) => r.kgCo2e.toFixed(3))).toEqual(['2500.000', '2600.000']);
    expect(readings.map((r) => r.emissionFactor.publicationYear)).toEqual([2025, 2026]);
    expect(readings[1].periodEnd.toISOString()).toBe('2026-02-01T00:00:00.000Z');

    const duplicate = await importFleetReadings(prisma, { userId: userA.id, licenseeId: licenseeA.id }, 'q.csv', csv);
    expect(duplicate.rowsAccepted).toBe(0);
    expect(duplicate.rejections[0].reason).toMatch(/already has data imported/);
  });

  it('refuses readings when no emission factor exists for the fuel', async () => {
    const csv = 'asset_tag,period_start,period_end,fuel_litres\nLV-03,2026-01-01,2026-01-31,100';
    const result = await importFleetReadings(prisma, { userId: userA.id, licenseeId: licenseeA.id }, 'van.csv', csv);
    expect(result.rowsAccepted).toBe(0);
    expect(result.rejections[0].reason).toMatch(/No emission factor is configured for PETROL_MINERAL/);
  });

  it('sums same-day fuel card fill-ups into one daily reading', async () => {
    const csv = [
      'asset_tag,transaction_date,litres',
      'DT-02,2026-02-03,120.5',
      'DT-02,2026-02-03,80',
      'DT-02,2026-02-04,60',
    ].join('\n');

    const result = await importFuelCardTransactions(prisma, { userId: userA.id, licenseeId: licenseeA.id }, 'card.csv', csv);
    expect(result.rowsAccepted).toBe(3);
    expect(result.rowsRejected).toBe(0);

    const asset = await prisma.fleetAsset.findFirstOrThrow({ where: { licenseeId: licenseeA.id, assetTag: 'DT-02' } });
    const readings = await prisma.fleetReading.findMany({ where: { assetId: asset.id, source: 'FUEL_CARD' }, orderBy: { periodStart: 'asc' } });
    expect(readings.map((r) => r.fuelQuantity.toFixed(3))).toEqual(['200.500', '60.000']);
    expect(readings[0].kgCo2e.toFixed(3)).toBe('521.300');
  });

  it("does not expose one licensee's fleet to another under row-level security", async () => {
    await importFleetAssets(prisma, { userId: userB.id, licenseeId: licenseeB.id }, assetsCsv);

    const seenByB = await runWithRls(prisma, { role: 'PARTNER', licenseeId: licenseeB.id }, async (tx) => ({
      assets: await tx.fleetAsset.findMany({ select: { licenseeId: true } }),
      readings: await tx.fleetReading.findMany({ select: { licenseeId: true } }),
      batches: await tx.fleetImportBatch.findMany({ select: { licenseeId: true } }),
    }));
    expect(seenByB.assets.length).toBe(3);
    expect([...seenByB.assets, ...seenByB.readings, ...seenByB.batches].every((r) => r.licenseeId === licenseeB.id)).toBe(true);

    const seenWithoutLicensee = await runWithRls(prisma, { role: 'PARTNER', licenseeId: '' }, async (tx) => tx.fleetAsset.count());
    expect(seenWithoutLicensee).toBe(0);
  });
});

describe('Fleet Emissions: per-asset subscription billing', () => {
  let licensee: { id: string };
  let user: { id: string };
  const stripeMock = {
    customers: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
    subscriptions: { retrieve: jest.fn() },
    subscriptionItems: { update: jest.fn() },
    transfers: { create: jest.fn() },
    paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  };
  const stripe = stripeMock as unknown as Stripe;

  const subscriptionEvent = (status: Stripe.Subscription.Status, quantity: number, service = 'FLEET') =>
    ({
      id: 'sub_fleet_test',
      status,
      customer: 'cus_fleet_test',
      current_period_end: 1893456000,
      metadata: { service, licenseeId: licensee.id },
      items: { data: [{ id: 'si_fleet_test', quantity }] },
    }) as unknown as Stripe.Subscription;

  beforeAll(async () => {
    const suffix = Date.now().toString(36);
    licensee = await prisma.licensee.create({ data: { name: `Fleet Billing ${suffix}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    user = await prisma.portalUser.create({ data: { email: `fleet.billing.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licensee.id } });
    await prisma.licensee.upsert({
      where: { id: PLATFORM_LICENSEE_ID },
      update: {},
      create: { id: PLATFORM_LICENSEE_ID, name: 'Platform', vertical: Vertical.B2C_SPORTS_MERCH, stripeConnectedAccountId: 'acct_jest_offline_platform' },
    });
    await ensurePlatformSplitConfig(prisma);
  });

  afterAll(async () => {
    await prisma.serviceEntitlement.deleteMany({ where: { licenseeId: licensee.id } });
    await prisma.fleetSubscription.deleteMany({ where: { licenseeId: licensee.id } });
    await prisma.fleetAsset.deleteMany({ where: { licenseeId: licensee.id } });
    await prisma.portalUser.deleteMany({ where: { id: user.id } });
    await prisma.licensee.deleteMany({ where: { id: licensee.id } });
  });

  const checkoutParams = () => ({
    licenseeId: licensee.id,
    customerEmail: 'billing@test.example',
    successUrl: 'https://app.test/portal?fleet=subscribed',
    cancelUrl: 'https://app.test/portal?fleet=cancelled',
  });

  it('requires at least one active asset before subscribing', async () => {
    await expect(createFleetSubscriptionCheckout(prisma, stripe, checkoutParams())).rejects.toBeInstanceOf(FleetBillingError);
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it('opens a subscription checkout billed per active asset', async () => {
    await prisma.fleetAsset.createMany({
      data: ['A1', 'A2', 'A3'].map((tag) => ({
        licenseeId: licensee.id,
        assetTag: tag,
        name: tag,
        category: 'EXCAVATOR' as const,
        fuelType: FleetFuelType.DIESEL_AVERAGE_BIOFUEL_BLEND,
        ownership: 'OWNED' as const,
        operationalControl: true,
        active: tag !== 'A3',
      })),
    });
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_fleet_test' });
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_fleet' });

    const result = await createFleetSubscriptionCheckout(prisma, stripe, checkoutParams());
    expect(result).toEqual({ checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_fleet', quantity: 2 });

    const params = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(params.mode).toBe('subscription');
    expect(params.customer).toBe('cus_fleet_test');
    expect(params.line_items).toEqual([{ price: process.env.STRIPE_FLEET_PRICE_ID, quantity: 2 }]);
    expect(params.subscription_data.metadata).toEqual({ licenseeId: licensee.id, service: 'FLEET' });

    stripeMock.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_fleet_2' });
    await createFleetSubscriptionCheckout(prisma, stripe, checkoutParams());
    expect(stripeMock.customers.create).toHaveBeenCalledTimes(1);
  });

  it('activates the FLEET entitlement from the subscription webhook and suspends it on cancellation', async () => {
    expect(await applyFleetSubscriptionEvent(prisma, subscriptionEvent('active', 2, 'OTHER'))).toBe(false);

    await applyFleetSubscriptionEvent(prisma, subscriptionEvent('active', 2));
    let entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId: licensee.id, serviceLine: 'FLEET' } },
    });
    expect(entitlement!.status).toBe('ACTIVE');
    const sub = await prisma.fleetSubscription.findUnique({ where: { licenseeId: licensee.id } });
    expect(sub).toMatchObject({ status: 'ACTIVE', quantity: 2, stripeSubscriptionId: 'sub_fleet_test' });

    await expect(createFleetSubscriptionCheckout(prisma, stripe, checkoutParams())).rejects.toThrow(/already active/);

    await applyFleetSubscriptionEvent(prisma, subscriptionEvent('past_due', 2));
    entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId: licensee.id, serviceLine: 'FLEET' } },
    });
    expect(entitlement!.status).toBe('ACTIVE');

    await applyFleetSubscriptionEvent(prisma, subscriptionEvent('canceled', 2));
    entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId: licensee.id, serviceLine: 'FLEET' } },
    });
    expect(entitlement!.status).toBe('SUSPENDED');
    expect(await prisma.fleetAsset.count({ where: { licenseeId: licensee.id } })).toBe(3);

    await applyFleetSubscriptionEvent(prisma, subscriptionEvent('active', 2));
  });

  it('syncs the Stripe quantity to the active asset count', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue({ items: { data: [{ id: 'si_fleet_test' }] } });
    await prisma.fleetAsset.updateMany({ where: { licenseeId: licensee.id, assetTag: 'A3' }, data: { active: true } });

    await syncFleetQuantity(prisma, stripe, licensee.id);
    expect(stripeMock.subscriptionItems.update).toHaveBeenCalledWith('si_fleet_test', { quantity: 3 });
    expect((await prisma.fleetSubscription.findUnique({ where: { licenseeId: licensee.id } }))!.quantity).toBe(3);

    await syncFleetQuantity(prisma, stripe, licensee.id);
    expect(stripeMock.subscriptionItems.update).toHaveBeenCalledTimes(1);
  });

  it('records each paid invoice once with the active charity split and pays the charities', async () => {
    stripeMock.transfers.create.mockResolvedValue({ id: 'tr_fleet_test' });
    const invoice = {
      id: `in_fleet_${Date.now()}`,
      amount_paid: 9999,
      currency: 'gbp',
      payment_intent: 'pi_fleet_test',
      subscription_details: { metadata: { service: 'FLEET', licenseeId: licensee.id } },
    } as unknown as Stripe.Invoice;

    expect(await recordPaidFleetInvoice(prisma, stripe, { ...invoice, subscription_details: { metadata: {} } } as unknown as Stripe.Invoice)).toBe(false);
    expect(await recordPaidFleetInvoice(prisma, stripe, invoice)).toBe(true);
    expect(await recordPaidFleetInvoice(prisma, stripe, invoice)).toBe(true);

    const transactions = await prisma.transaction.findMany({
      where: { checkoutReferenceId: `fleet_invoice_${invoice.id}` },
      include: { financialSplit: { include: { charityAllocations: true } }, triggerEvent: true },
    });
    expect(transactions).toHaveLength(1);
    const tx = transactions[0];
    const split = await resolveActiveSplitConfig(prisma, PLATFORM_LICENSEE_ID);
    const expectedRoyalty = Math.round((9999 * split.royaltyBps) / 10000);
    expect(tx.licenseeId).toBe(PLATFORM_LICENSEE_ID);
    expect(tx.status).toBe('SETTLED');
    expect(tx.financialSplit!.licensorRoyaltyCents).toBe(expectedRoyalty);
    expect(tx.financialSplit!.charityGiftCents).toBe(9999 - expectedRoyalty);
    expect(tx.financialSplit!.charityAllocations.reduce((sum, a) => sum + a.amountCents, 0)).toBe(9999 - expectedRoyalty);
    expect(stripeMock.transfers.create).toHaveBeenCalledTimes(tx.financialSplit!.charityAllocations.length);
  });

  it('processes Fleet subscription events through the signed webhook', async () => {
    const app = createApp(stripe);
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: subscriptionEvent('unpaid', 3) },
    });

    await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 't=1,v1=test')
      .set('Content-Type', 'application/json')
      .send('{}')
      .expect(200);

    const entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId: licensee.id, serviceLine: 'FLEET' } },
    });
    expect(entitlement!.status).toBe('SUSPENDED');
    expect((await prisma.fleetSubscription.findUnique({ where: { licenseeId: licensee.id } }))!.status).toBe('UNPAID');
  });
});

