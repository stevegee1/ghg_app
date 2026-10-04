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
