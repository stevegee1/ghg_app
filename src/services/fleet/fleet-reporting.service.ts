import PDFDocument from 'pdfkit';
import { FleetFuelType, Prisma, PrismaClient } from '@prisma/client';
import { calculateKgCo2e, resolveEmissionFactor } from './emission-factor.service';

type Db = PrismaClient | Prisma.TransactionClient;

export interface FleetTotals {
  fuelLitres: string;
  kgCo2e: string;
  engineHours: string;
  idleHours: string;
  /** Idle hours as a share of engine hours, over readings that report both; null if none do. */
  idleSharePct: string | null;
}

export interface FleetSummary {
  /** Inclusive calendar dates (UTC). */
  period: { from: string; to: string };
  /** Assets under the licensee's operational control (GHG Protocol Scope 1). */
  scope1: FleetTotals;
  /** Assets not under operational control, reported separately (Scope 3). */
  scope3: FleetTotals;
  byAsset: (FleetTotals & { assetId: string; assetTag: string; name: string; siteName: string | null; scope: 'SCOPE_1' | 'SCOPE_3' })[];
  bySite: (FleetTotals & { siteName: string })[];
  byMonth: (FleetTotals & { month: string })[];
  coverage: { activeAssets: number; assetsWithData: number };
  factorsUsed: { source: string; publicationYear: number; fuelType: FleetFuelType; kgCo2ePerUnit: string; unit: string; citation: string }[];
}

class Accumulator {
  fuel = new Prisma.Decimal(0);
  co2 = new Prisma.Decimal(0);
  engine = new Prisma.Decimal(0);
  idle = new Prisma.Decimal(0);
  engineWithIdle = new Prisma.Decimal(0);
  idleWithEngine = new Prisma.Decimal(0);

  add(r: { fuelQuantity: Prisma.Decimal; kgCo2e: Prisma.Decimal; engineHours: Prisma.Decimal | null; idleHours: Prisma.Decimal | null }) {
    this.fuel = this.fuel.add(r.fuelQuantity);
    this.co2 = this.co2.add(r.kgCo2e);
    if (r.engineHours) this.engine = this.engine.add(r.engineHours);
    if (r.idleHours) this.idle = this.idle.add(r.idleHours);
    if (r.engineHours && r.idleHours) {
      this.engineWithIdle = this.engineWithIdle.add(r.engineHours);
      this.idleWithEngine = this.idleWithEngine.add(r.idleHours);
    }
  }

  totals(): FleetTotals {
    return {
      fuelLitres: this.fuel.toFixed(3),
      kgCo2e: this.co2.toFixed(3),
      engineHours: this.engine.toFixed(2),
      idleHours: this.idle.toFixed(2),
      idleSharePct: this.engineWithIdle.gt(0) ? this.idleWithEngine.div(this.engineWithIdle).mul(100).toFixed(1) : null,
    };
  }
}

/** Summarises readings whose period starts within [from, to). Both bounds are UTC dates. */
export async function getFleetSummary(db: Db, licenseeId: string, from: Date, to: Date): Promise<FleetSummary> {
  const readings = await db.fleetReading.findMany({
    where: { licenseeId, periodStart: { gte: from, lt: to } },
    include: {
      asset: { select: { id: true, assetTag: true, name: true, siteName: true, operationalControl: true } },
      emissionFactor: true,
    },
    orderBy: { periodStart: 'asc' },
  });

  const scope1 = new Accumulator();
  const scope3 = new Accumulator();
  const assets = new Map<string, { acc: Accumulator; meta: (typeof readings)[number]['asset'] }>();
  const sites = new Map<string, Accumulator>();
  const months = new Map<string, Accumulator>();
  const factors = new Map<string, (typeof readings)[number]['emissionFactor']>();

  for (const r of readings) {
    (r.asset.operationalControl ? scope1 : scope3).add(r);

    if (!assets.has(r.asset.id)) assets.set(r.asset.id, { acc: new Accumulator(), meta: r.asset });
    assets.get(r.asset.id)!.acc.add(r);

    const site = r.asset.siteName || 'Unassigned';
    if (!sites.has(site)) sites.set(site, new Accumulator());
    sites.get(site)!.add(r);

    const month = r.periodStart.toISOString().slice(0, 7);
    if (!months.has(month)) months.set(month, new Accumulator());
    months.get(month)!.add(r);

    factors.set(r.emissionFactor.id, r.emissionFactor);
  }

  const activeAssets = await db.fleetAsset.count({ where: { licenseeId, active: true } });

  return {
    period: { from: from.toISOString().slice(0, 10), to: new Date(to.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
    scope1: scope1.totals(),
    scope3: scope3.totals(),
    byAsset: [...assets.values()].map(({ acc, meta }) => ({
      assetId: meta.id,
      assetTag: meta.assetTag,
      name: meta.name,
      siteName: meta.siteName,
      scope: meta.operationalControl ? ('SCOPE_1' as const) : ('SCOPE_3' as const),
      ...acc.totals(),
    })),
    bySite: [...sites.entries()].map(([siteName, acc]) => ({ siteName, ...acc.totals() })),
    byMonth: [...months.entries()].map(([month, acc]) => ({ month, ...acc.totals() })),
    coverage: { activeAssets, assetsWithData: assets.size },
    factorsUsed: [...factors.values()].map((f) => ({
      source: f.source,
      publicationYear: f.publicationYear,
      fuelType: f.fuelType,
      kgCo2ePerUnit: f.kgCo2ePerUnit.toFixed(6),
      unit: f.unit,
      citation: f.citation,
    })),
  };
}

export const FLEET_REPORT_STATEMENT =
  'Emissions are calculated from fuel data supplied by the organisation, using the emission factors listed. ' +
  'This report has not been independently verified.';

/** Scope 1 mobile combustion report as a PDF. */
export function buildFleetReportPdf(summary: FleetSummary, organisationName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const tonnes = (kg: string) => new Prisma.Decimal(kg).div(1000).toFixed(3);

    doc.font('Helvetica-Bold').fontSize(16).text('Fleet Emissions Report: Mobile Combustion');
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#334155');
    doc.text(`Organisation: ${organisationName}`);
    doc.text(`Period: ${summary.period.from} to ${summary.period.to} inclusive`);
    doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Totals');
    doc.font('Helvetica').fontSize(10);
    doc.text(`Scope 1 (operational control): ${tonnes(summary.scope1.kgCo2e)} t CO2e from ${summary.scope1.fuelLitres} litres`);
    doc.text(`Scope 3 (no operational control): ${tonnes(summary.scope3.kgCo2e)} t CO2e from ${summary.scope3.fuelLitres} litres`);
    if (summary.scope1.idleSharePct !== null) {
      doc.text(`Idle share of engine hours (Scope 1, where reported): ${summary.scope1.idleSharePct}%`);
    }
    doc.text(`Data coverage: ${summary.coverage.assetsWithData} of ${summary.coverage.activeAssets} active assets reported data`);
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('By asset');
    doc.font('Helvetica').fontSize(9);
    for (const a of summary.byAsset) {
      doc.text(`${a.assetTag}  ${a.name}  [${a.scope}]  ${a.fuelLitres} L  ${tonnes(a.kgCo2e)} t CO2e${a.siteName ? `  Site: ${a.siteName}` : ''}`);
    }
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('Emission factors applied');
    doc.font('Helvetica').fontSize(9);
    for (const f of summary.factorsUsed) {
      doc.text(`${f.fuelType}: ${f.kgCo2ePerUnit} kg CO2e per ${f.unit} (${f.source} ${f.publicationYear}). ${f.citation}`);
    }
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('Method and boundary');
    doc.font('Helvetica').fontSize(9);
    doc.text(
      'Fuel consumed by each asset is multiplied by the emission factor for its fuel type and reporting year. ' +
        'Assets are classified by operational control under the GHG Protocol Corporate Standard: fuel used by assets ' +
        'under the organisation\'s operational control is reported as Scope 1; other assets are reported separately as Scope 3.'
    );
    doc.moveDown();
    doc.font('Helvetica-Oblique').text(FLEET_REPORT_STATEMENT);

    doc.end();
  });
}

/** Public calculator: an estimate using the factor for the current year. */
export async function estimateFuelEmissions(db: Db, fuelType: FleetFuelType, litres: Prisma.Decimal) {
  const factor = await resolveEmissionFactor(db, fuelType, new Date().getUTCFullYear());
  return {
    kgCo2e: calculateKgCo2e(litres, factor).toFixed(3),
    factor: {
      source: factor.source,
      publicationYear: factor.publicationYear,
      kgCo2ePerUnit: factor.kgCo2ePerUnit.toFixed(6),
      unit: factor.unit,
      citation: factor.citation,
    },
    isEstimate: true,
  };
}
