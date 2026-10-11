import { Prisma, PrismaClient } from '@prisma/client';
import { runWithRls } from '../../db/rls';
import { exposureSummary } from '../fleet/weather-exposure.service';
import { latestValuations } from '../fleet/fleet-valuation.service';
import { buildClimateLedger } from '../fleet/fleet-ledger.service';

type Db = Prisma.TransactionClient;

/** MCP protocol versions this server speaks, newest first. */
export const MCP_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const MCP_SERVER_INFO = { name: 'nftylogs-fleet', version: '2026.1' };

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 3 * 366;

export class McpToolError extends Error {}

const dateRange = {
  type: 'object',
  properties: {
    from: { type: 'string', description: 'First day, YYYY-MM-DD' },
    to: { type: 'string', description: 'Last day (inclusive), YYYY-MM-DD' },
  },
  required: ['from', 'to'],
  additionalProperties: false,
} as const;

/** Read-only tools. Every call is limited to the API key's own organisation. Machine locations are never returned. */
export const MCP_TOOLS = [
  {
    name: 'list_machines',
    title: 'List machines',
    description: 'The organisation’s registered machines and vehicles: tag, name, equipment type, fuel, whether active, and how each connects.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_machine_activity',
    title: 'Machine activity',
    description:
      'Fuel, operating and idle hours and CO2e for one machine over a period, from its fuel readings, plus its latest telemetry reading (meters only, no location).',
    inputSchema: {
      type: 'object',
      properties: { assetId: { type: 'string', description: 'Machine id from list_machines' }, ...dateRange.properties },
      required: ['assetId', 'from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_weather_exposure',
    title: 'Weather exposure',
    description: 'Hours each machine worked in heat, frost, heavy rain and high wind over a period, with the threshold versions used.',
    inputSchema: dateRange,
  },
  {
    name: 'get_machine_valuations',
    title: 'Machine value and ownership cost',
    description: 'The latest estimate per machine of value, weather wear and total cost of ownership to date, with method version and warnings.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_project_costs',
    title: 'Contract costs',
    description: 'Each contract (project) with its latest cost calculation: cost per operating hour, fuel and carbon cost, material price movement and margin exposure.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_climate_ledger',
    title: 'Climate ledger',
    description: 'The climate ledger for a period: emissions by scope with factors, Scope 3 supply chain totals, internal carbon prices and contract exposure, with its SHA-256.',
    inputSchema: dateRange,
  },
] as const;

function parseRange(args: Record<string, unknown>): { from: Date; toExclusive: Date } {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof args.from !== 'string' || typeof args.to !== 'string' || !re.test(args.from) || !re.test(args.to)) {
    throw new McpToolError('from and to must be dates in the form YYYY-MM-DD.');
  }
  const from = new Date(`${args.from}T00:00:00Z`);
  const toExclusive = new Date(Date.parse(`${args.to}T00:00:00Z`) + DAY_MS);
  if (Number.isNaN(from.getTime()) || Number.isNaN(toExclusive.getTime()) || toExclusive <= from) throw new McpToolError('to must be on or after from.');
  if ((toExclusive.getTime() - from.getTime()) / DAY_MS > MAX_RANGE_DAYS) throw new McpToolError('The period can be at most 3 years.');
  return { from, toExclusive };
}

const handlers: Record<string, (db: Db, licenseeId: string, args: Record<string, unknown>) => Promise<unknown>> = {
  async list_machines(db, licenseeId) {
    const machines = await db.fleetAsset.findMany({
      where: { licenseeId },
      orderBy: { assetTag: 'asc' },
      select: { id: true, assetTag: true, name: true, category: true, make: true, model: true, fuelType: true, active: true, connectionBranch: true, operationalControl: true },
    });
    return { machines };
  },

  async get_machine_activity(db, licenseeId, args) {
    if (typeof args.assetId !== 'string') throw new McpToolError('assetId is required.');
    const { from, toExclusive } = parseRange(args);
    const asset = await db.fleetAsset.findFirst({ where: { id: args.assetId, licenseeId }, select: { id: true, assetTag: true, name: true } });
    if (!asset) throw new McpToolError('No machine with that id.');
    const readings = await db.fleetReading.findMany({
      where: { licenseeId, assetId: asset.id, periodStart: { gte: from, lt: toExclusive } },
      orderBy: { periodStart: 'asc' },
      select: { periodStart: true, periodEnd: true, fuelQuantity: true, fuelUnit: true, engineHours: true, idleHours: true, kgCo2e: true, source: true },
    });
    const latest = await db.fleetTelemetrySnapshot.findFirst({
      where: { licenseeId, assetId: asset.id },
      orderBy: { observedAt: 'desc' },
      select: { observedAt: true, cumulativeOperatingHours: true, cumulativeIdleHours: true, cumulativeFuelUsedLitres: true, fuelRemainingPercent: true, engineRunning: true },
    });
    const sum = (k: 'fuelQuantity' | 'engineHours' | 'idleHours' | 'kgCo2e') =>
      readings.reduce((s, r) => s.add(r[k] ?? 0), new Prisma.Decimal(0)).toString();
    return {
      machine: asset,
      totals: { fuelLitres: sum('fuelQuantity'), operatingHours: sum('engineHours'), idleHours: sum('idleHours'), kgCo2e: sum('kgCo2e') },
      readings,
      latestTelemetry: latest,
    };
  },

  async get_weather_exposure(db, licenseeId, args) {
    const { from, toExclusive } = parseRange(args);
    return exposureSummary(db, licenseeId, from, toExclusive);
  },

  async get_machine_valuations(db, licenseeId) {
    const valuations = await latestValuations(db, licenseeId);
    return { valuations: valuations.map((v) => ({ assetId: v.assetId, asOf: v.asOf, methodVersion: v.methodVersion, results: v.results, recordSha256: v.recordSha256 })) };
  },

  async get_project_costs(db, licenseeId) {
    const projects = await db.fleetProject.findMany({
      where: { licenseeId },
      orderBy: { startDate: 'desc' },
      include: { costRuns: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        status: p.status,
        contractValuePence: Number(p.contractValuePence),
        budgetedMarginBps: p.budgetedMarginBps,
        currency: p.currency,
        latestCostRun: p.costRuns[0]
          ? { periodFrom: p.costRuns[0].periodFrom, periodTo: p.costRuns[0].periodTo, methodVersion: p.costRuns[0].methodVersion, results: p.costRuns[0].results, recordSha256: p.costRuns[0].recordSha256 }
          : null,
      })),
    };
  },

  async get_climate_ledger(db, licenseeId, args) {
    const { from, toExclusive } = parseRange(args);
    return buildClimateLedger(db, licenseeId, from, toExclusive);
  },
};

/** BigInt and Decimal values become strings so tool output is plain JSON. */
const toJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))) as Record<string, unknown>;

export async function callTool(prisma: PrismaClient, licenseeId: string, name: string, args: Record<string, unknown>) {
  const handler = handlers[name];
  if (!handler) throw new McpToolError(`Unknown tool: ${name}`);
  const data = await runWithRls(prisma, { role: 'PARTNER', licenseeId }, (tx) => handler(tx, licenseeId, args));
  return toJson(data);
}

/** Records one request in the organisation's MCP audit log. Failures to log never fail the request. */
export async function logQuery(
  prisma: PrismaClient,
  entry: { licenseeId: string; apiKeyId: string; method: string; tool?: string; args?: unknown; ok: boolean; error?: string }
) {
  try {
    await runWithRls(prisma, { role: 'PARTNER', licenseeId: entry.licenseeId }, (tx) =>
      tx.mcpQueryLog.create({
        data: {
          licenseeId: entry.licenseeId,
          apiKeyId: entry.apiKeyId,
          method: entry.method.slice(0, 100),
          tool: entry.tool?.slice(0, 100) ?? null,
          arguments: entry.args === undefined ? Prisma.JsonNull : (entry.args as Prisma.InputJsonValue),
          ok: entry.ok,
          error: entry.error?.slice(0, 300) ?? null,
        },
      })
    );
  } catch (err) {
    console.error('[MCP LOG ERROR]', err);
  }
}
