import { MarketIndexCategory, MarketIndexFeed, Prisma, PrismaClient } from '@prisma/client';

export class MarketIndexError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'MarketIndexError';
  }
}

/** Env var holding the GOV.UK Content API URL for the weekly road fuel prices publication. */
export const FUEL_FEED_ENV = 'UK_FUEL_PRICE_FEED_URL';

export function fuelFeedUrl(): string | null {
  const raw = process.env[FUEL_FEED_ENV]?.trim();
  return raw ? raw : null;
}

/** Throws at boot when the feed URL is set but is not an https URL. Unset means the feed is off. */
export function validateFuelFeedConfig(): void {
  const raw = fuelFeedUrl();
  if (raw === null) return;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${FUEL_FEED_ENV} must be a valid URL.`);
  }
  if (url.protocol !== 'https:') throw new Error(`${FUEL_FEED_ENV} must use https.`);
}

export interface WeeklyFuelRow {
  /** Monday of the survey week, UTC midnight */
  date: Date;
  /** Pump price in pence per litre and VAT rate in percent, keyed by fuel column (ULSP, ULSD) */
  prices: Record<string, { pumpPencePerLitre: number; vatPercent: number }>;
}

/** Splits one CSV line, honouring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(field);
      field = '';
    } else field += ch;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/** Parses dd/mm/yyyy into a UTC date. */
function parseUkDate(text: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Parses the DESNZ weekly road fuel prices CSV. Columns are found by their header text
 * ("ULSD ... Pump price", "ULSD ... VAT"), so column order changes do not break the import.
 */
export function parseWeeklyFuelCsv(text: string): WeeklyFuelRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new MarketIndexError('The fuel price file has no data rows.', 502);
  const header = splitCsvLine(lines[0]);
  const columnsFor = (fuel: string) => ({
    pump: header.findIndex((h) => h.startsWith(fuel) && /pump price/i.test(h)),
    vat: header.findIndex((h) => h.startsWith(fuel) && /\bVAT\b/.test(h)),
  });
  const fuels = ['ULSP', 'ULSD'].map((fuel) => ({ fuel, ...columnsFor(fuel) }));
  if (header[0]?.toLowerCase() !== 'date' || fuels.some((f) => f.pump < 0 || f.vat < 0)) {
    throw new MarketIndexError('The fuel price file layout is not recognised.', 502);
  }

  const rows: WeeklyFuelRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = parseUkDate(cells[0] ?? '');
    if (!date) continue;
    const prices: WeeklyFuelRow['prices'] = {};
    for (const f of fuels) {
      const pump = Number(cells[f.pump]);
      const vat = Number(cells[f.vat]);
      if (Number.isFinite(pump) && pump > 0 && Number.isFinite(vat) && vat >= 0) {
        prices[f.fuel] = { pumpPencePerLitre: pump, vatPercent: vat };
      }
    }
    if (Object.keys(prices).length > 0) rows.push({ date, prices });
  }
  return rows;
}

/** Pump price in pence per litre, including VAT, to pounds per litre excluding VAT (VAT is reclaimable by businesses). */
export function exVatPoundsPerLitre(pumpPencePerLitre: number, vatPercent: number): Prisma.Decimal {
  return new Prisma.Decimal(pumpPencePerLitre).div(100).div(new Prisma.Decimal(vatPercent).div(100).add(1)).toDecimalPlaces(6);
}

type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/**
 * Imports the UK weekly road fuel prices into every active index fed by it. Reads the publication's
 * CSV attachments from the GOV.UK Content API; existing dates are left untouched.
 */
export async function importWeeklyFuelPrices(
  prisma: PrismaClient,
  fetcher: Fetcher = fetch
): Promise<{ inserted: number; latestDate: string | null }> {
  const feedUrl = fuelFeedUrl();
  if (!feedUrl) throw new MarketIndexError(`The fuel price feed is off. Set ${FUEL_FEED_ENV} to enable it.`, 409);

  const indices = await prisma.marketIndex.findMany({
    where: { feed: MarketIndexFeed.UK_WEEKLY_ROAD_FUEL, active: true, feedColumn: { not: null } },
  });
  if (indices.length === 0) return { inserted: 0, latestDate: null };

  const meta = await fetcher(feedUrl);
  if (!meta.ok) throw new MarketIndexError(`The fuel price publication returned HTTP ${meta.status}.`, 502);
  let attachments: { url?: unknown; content_type?: unknown }[];
  try {
    attachments = (JSON.parse(await meta.text()) as { details?: { attachments?: { url?: unknown; content_type?: unknown }[] } }).details?.attachments ?? [];
  } catch {
    throw new MarketIndexError('The fuel price publication is not valid JSON.', 502);
  }
  const csvUrls = attachments
    .filter((a) => a.content_type === 'text/csv' && typeof a.url === 'string' && (a.url as string).startsWith('https://'))
    .map((a) => a.url as string);
  if (csvUrls.length === 0) throw new MarketIndexError('The fuel price publication has no CSV file.', 502);

  let inserted = 0;
  let latest: Date | null = null;
  for (const csvUrl of csvUrls) {
    const res = await fetcher(csvUrl);
    if (!res.ok) throw new MarketIndexError(`A fuel price file returned HTTP ${res.status}.`, 502);
    const rows = parseWeeklyFuelCsv(await res.text());
    for (const index of indices) {
      const data = rows
        .filter((r) => r.prices[index.feedColumn as string])
        .map((r) => {
          const p = r.prices[index.feedColumn as string];
          return {
            indexId: index.id,
            effectiveDate: r.date,
            value: exVatPoundsPerLitre(p.pumpPencePerLitre, p.vatPercent),
            sourceReference: `${csvUrl} (pump ${p.pumpPencePerLitre}p/l, VAT ${p.vatPercent}%)`,
          };
        });
      const result = await prisma.marketIndexValue.createMany({ data, skipDuplicates: true });
      inserted += result.count;
    }
    for (const r of rows) if (!latest || r.date > latest) latest = r.date;
  }
  return { inserted, latestDate: latest ? latest.toISOString().slice(0, 10) : null };
}

/** The value in force on a date: the latest value dated on or before it. */
export async function valueOn(prisma: PrismaClient | Prisma.TransactionClient, indexId: string, date: Date) {
  return prisma.marketIndexValue.findFirst({
    where: { indexId, effectiveDate: { lte: date } },
    orderBy: { effectiveDate: 'desc' },
  });
}

export async function listIndices(prisma: PrismaClient) {
  const indices = await prisma.marketIndex.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  const latest = await Promise.all(
    indices.map((i) => prisma.marketIndexValue.findFirst({ where: { indexId: i.id }, orderBy: { effectiveDate: 'desc' } }))
  );
  return indices.map((i, n) => ({
    ...i,
    latest: latest[n] ? { effectiveDate: latest[n]!.effectiveDate.toISOString().slice(0, 10), value: latest[n]!.value.toString() } : null,
  }));
}

/** Parses an ISO yyyy-mm-dd date that is not in the future. */
function parseEffectiveDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new MarketIndexError('effectiveDate must be a date in the form YYYY-MM-DD.', 400);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new MarketIndexError('effectiveDate is not a real date.', 400);
  }
  if (date.getTime() > Date.now()) throw new MarketIndexError('effectiveDate cannot be in the future.', 400);
  return date;
}

export async function addManualValue(
  prisma: PrismaClient,
  params: { indexId: string; effectiveDate: unknown; value: unknown; sourceReference: unknown; userId: string }
) {
  const index = await prisma.marketIndex.findUnique({ where: { id: params.indexId } });
  if (!index) throw new MarketIndexError('Market input not found.', 404);
  if (index.feed !== MarketIndexFeed.MANUAL) throw new MarketIndexError('This input is filled by its feed and cannot be entered by hand.', 409);
  const effectiveDate = parseEffectiveDate(params.effectiveDate);
  if (typeof params.value !== 'string' || !/^\d{1,8}(\.\d{1,6})?$/.test(params.value) || Number(params.value) <= 0) {
    throw new MarketIndexError('value must be a positive number with up to 6 decimal places, sent as text.', 400);
  }
  if (typeof params.sourceReference !== 'string' || params.sourceReference.trim().length < 3 || params.sourceReference.length > 500) {
    throw new MarketIndexError('sourceReference must say where the value comes from (3 to 500 characters).', 400);
  }
  try {
    return await prisma.marketIndexValue.create({
      data: {
        indexId: index.id,
        effectiveDate,
        value: new Prisma.Decimal(params.value),
        sourceReference: params.sourceReference.trim(),
        enteredByUserId: params.userId,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new MarketIndexError('A value already exists for this date. Delete it first to correct it.', 409);
    }
    throw err;
  }
}

export async function deleteManualValue(prisma: PrismaClient, indexId: string, valueId: string) {
  const value = await prisma.marketIndexValue.findFirst({ where: { id: valueId, indexId }, include: { index: true } });
  if (!value) throw new MarketIndexError('Value not found.', 404);
  if (value.index.feed !== MarketIndexFeed.MANUAL) throw new MarketIndexError('Feed values cannot be deleted.', 409);
  await prisma.marketIndexValue.delete({ where: { id: valueId } });
}

export async function createManualIndex(prisma: PrismaClient, body: Record<string, unknown>) {
  const { code, name, category, unit, currency, source, sourceUrl } = body;
  if (typeof code !== 'string' || !/^[A-Z0-9_]{3,60}$/.test(code)) throw new MarketIndexError('code must be 3 to 60 capital letters, digits or underscores.', 400);
  if (typeof name !== 'string' || !name.trim() || name.length > 200) throw new MarketIndexError('name is required (up to 200 characters).', 400);
  if (!Object.values(MarketIndexCategory).includes(category as MarketIndexCategory)) {
    throw new MarketIndexError(`category must be one of ${Object.values(MarketIndexCategory).join(', ')}.`, 400);
  }
  if (typeof unit !== 'string' || !/^[A-Z0-9_]{3,40}$/.test(unit)) throw new MarketIndexError('unit must look like GBP_PER_TONNE.', 400);
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new MarketIndexError('currency must be a 3-letter ISO code.', 400);
  if (typeof source !== 'string' || source.trim().length < 3) throw new MarketIndexError('source is required.', 400);
  if (sourceUrl !== undefined && sourceUrl !== null && (typeof sourceUrl !== 'string' || !/^https:\/\//.test(sourceUrl))) {
    throw new MarketIndexError('sourceUrl must be an https link.', 400);
  }
  try {
    return await prisma.marketIndex.create({
      data: {
        code,
        name: name.trim(),
        category: category as MarketIndexCategory,
        unit,
        currency,
        source: source.trim(),
        sourceUrl: (sourceUrl as string | undefined) ?? null,
        feed: MarketIndexFeed.MANUAL,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new MarketIndexError('An input with this code already exists.', 409);
    }
    throw err;
  }
}
