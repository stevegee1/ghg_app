import { Prisma, PrismaClient } from '@prisma/client';
import { FLEET_REPORT_STATEMENT, getFleetSummary } from './fleet-reporting.service';
import { toIsoDate } from './fleet-project.service';
import { recordHash } from '../canonical-hash.service';

/** The fields of a stored cost run's results (fleet-project-cost.service.ts) the ledger reports. */
interface CostRunResults {
  currency: string;
  operatingHours: string;
  fuel: { litres: string; costPence: number; unpricedLitres: string };
  carbon: { tonnesCo2e: string; costPence: number; unpricedTonnesCo2e: string };
  costPerOperatingHourPence: number | null;
  materialExposurePence: number;
  totalExposurePence: number;
  budgetedMarginPence: number;
  exposureShareOfMarginPercent: string | null;
}

type Db = PrismaClient | Prisma.TransactionClient;

export const CLIMATE_LEDGER_SCHEMA = 'NFTYLOGS-CLIMATE-LEDGER-2026.1';
export const CLIMATE_LEDGER_ALIGNMENT =
  'Metrics follow the IFRS S2 Climate-related Disclosures cross-industry metrics (paragraph 29: greenhouse gas emissions, ' +
  'transition risk exposure, internal carbon prices), the basis for UK SRS S2.';

const DAY_MS = 24 * 60 * 60 * 1000;
const tonnes = (kg: string) => new Prisma.Decimal(kg).div(1000).toDecimalPlaces(4).toString();

/**
 * The machine-readable climate ledger for a period [from, toExclusive): fleet emissions by scope with
 * the factors used, the internal carbon prices applied, and the latest cost run of every project whose
 * run period overlaps the ledger period. ledgerSha256 covers everything except generatedAt.
 */
export async function buildClimateLedger(db: Db, licenseeId: string, from: Date, toExclusive: Date) {
  const licensee = await db.licensee.findUnique({ where: { id: licenseeId }, select: { name: true } });
  const summary = await getFleetSummary(db, licenseeId, from, toExclusive);
  const lastDay = new Date(toExclusive.getTime() - DAY_MS);

  const runs = await db.fleetProjectCostRun.findMany({
    where: { licenseeId, periodFrom: { lte: lastDay }, periodTo: { gte: from } },
    orderBy: { createdAt: 'desc' },
    include: { project: { select: { name: true, reference: true } } },
  });
  const latestByProject = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!latestByProject.has(r.projectId)) latestByProject.set(r.projectId, r);

  const carbonPrices = new Map<string, { indexCode: string; effectiveDate: string; value: string }>();
  const projects = [...latestByProject.values()]
    .sort((a, b) => a.project.name.localeCompare(b.project.name))
    .map((r) => {
      const res = r.results as unknown as CostRunResults;
      const inputs = r.inputs as unknown as { marketValues?: { id: string; indexCode: string; effectiveDate: string; value: string }[] };
      for (const v of inputs.marketValues ?? []) {
        if (v.indexCode.includes('CARBON')) carbonPrices.set(v.id, { indexCode: v.indexCode, effectiveDate: v.effectiveDate, value: v.value });
      }
      return {
        projectName: r.project.name,
        reference: r.project.reference,
        costRunId: r.id,
        period: { from: toIsoDate(r.periodFrom), to: toIsoDate(r.periodTo) },
        methodVersion: r.methodVersion,
        currency: res.currency,
        operatingHours: res.operatingHours,
        fuelLitres: res.fuel.litres,
        tonnesCo2e: res.carbon.tonnesCo2e,
        fuelCostPence: res.fuel.costPence,
        carbonCostPence: res.carbon.costPence,
        costPerOperatingHourPence: res.costPerOperatingHourPence,
        materialExposurePence: res.materialExposurePence,
        totalExposurePence: res.totalExposurePence,
        budgetedMarginPence: res.budgetedMarginPence,
        exposureShareOfMarginPercent: res.exposureShareOfMarginPercent,
        unpriced: { litres: res.fuel.unpricedLitres, tonnesCo2e: res.carbon.unpricedTonnesCo2e },
        recordSha256: r.recordSha256,
      };
    });

  const content = {
    schema: CLIMATE_LEDGER_SCHEMA,
    alignment: CLIMATE_LEDGER_ALIGNMENT,
    entity: { licenseeId, name: licensee?.name ?? null },
    period: summary.period,
    ghgEmissions: {
      method: 'GHG Protocol Corporate Standard, fuel-based mobile combustion',
      scope1: { tonnesCo2e: tonnes(summary.scope1.kgCo2e), fuelLitres: summary.scope1.fuelLitres, operatingHours: summary.scope1.engineHours },
      scope3: {
        tonnesCo2e: tonnes(summary.scope3.kgCo2e),
        fuelLitres: summary.scope3.fuelLitres,
        operatingHours: summary.scope3.engineHours,
        note: 'Machines the organisation does not operationally control',
      },
      coverage: summary.coverage,
      emissionFactors: summary.factorsUsed,
    },
    internalCarbonPrices: [...carbonPrices.values()].sort((a, b) => (a.effectiveDate < b.effectiveDate ? -1 : 1)),
    transitionRiskExposure: {
      projects,
      totals: projects.reduce(
        (acc, p) => ({
          fuelCostPence: acc.fuelCostPence + p.fuelCostPence,
          carbonCostPence: acc.carbonCostPence + p.carbonCostPence,
          materialExposurePence: acc.materialExposurePence + p.materialExposurePence,
          totalExposurePence: acc.totalExposurePence + p.totalExposurePence,
        }),
        { fuelCostPence: 0, carbonCostPence: 0, materialExposurePence: 0, totalExposurePence: 0 }
      ),
      currencies: [...new Set(projects.map((p) => p.currency))],
    },
    statement: FLEET_REPORT_STATEMENT,
  };
  return { ...content, generatedAt: new Date().toISOString(), ledgerSha256: recordHash(content) };
}

export type ClimateLedger = Awaited<ReturnType<typeof buildClimateLedger>>;

const csvCell = (v: unknown) => {
  const text = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** The same ledger as CSV rows: section, item, metric, value, unit, reference. */
export function ledgerToCsv(l: ClimateLedger): string {
  const rows: unknown[][] = [['section', 'item', 'metric', 'value', 'unit', 'reference']];
  const pounds = (pence: number | null) => (pence === null ? null : (pence / 100).toFixed(2));
  rows.push(['ledger', l.schema, 'period', `${l.period.from} to ${l.period.to}`, '', l.ledgerSha256]);
  rows.push(['ledger', l.schema, 'entity', l.entity.name, '', l.entity.licenseeId]);
  for (const scope of ['scope1', 'scope3'] as const) {
    const s = l.ghgEmissions[scope];
    rows.push(['ghg_emissions', scope, 'emissions', s.tonnesCo2e, 'tCO2e', l.ghgEmissions.method]);
    rows.push(['ghg_emissions', scope, 'fuel', s.fuelLitres, 'litre', '']);
  }
  for (const f of l.ghgEmissions.emissionFactors) {
    rows.push(['emission_factor', f.fuelType, 'factor', f.kgCo2ePerUnit, `kgCO2e/${f.unit}`, `${f.source} ${f.publicationYear}`]);
  }
  for (const c of l.internalCarbonPrices) rows.push(['internal_carbon_price', c.indexCode, c.effectiveDate, c.value, 'per tCO2e', '']);
  for (const p of l.transitionRiskExposure.projects) {
    const item = p.reference ? `${p.projectName} (${p.reference})` : p.projectName;
    const ref = `${p.costRunId} ${p.recordSha256}`;
    rows.push(['transition_risk', item, 'operating_hours', p.operatingHours, 'hour', ref]);
    rows.push(['transition_risk', item, 'fuel_cost', pounds(p.fuelCostPence), p.currency, ref]);
    rows.push(['transition_risk', item, 'carbon_cost', pounds(p.carbonCostPence), p.currency, ref]);
    rows.push(['transition_risk', item, 'cost_per_operating_hour', pounds(p.costPerOperatingHourPence), p.currency, ref]);
    rows.push(['transition_risk', item, 'material_price_exposure', pounds(p.materialExposurePence), p.currency, ref]);
    rows.push(['transition_risk', item, 'share_of_budgeted_margin', p.exposureShareOfMarginPercent, 'percent', ref]);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** Recomputes the ledger hash from a ledger document, for anyone verifying a downloaded copy. */
export function verifyLedgerHash(l: ClimateLedger): boolean {
  const { generatedAt, ledgerSha256, ...content } = l;
  return Boolean(generatedAt) && recordHash(content) === ledgerSha256;
}
