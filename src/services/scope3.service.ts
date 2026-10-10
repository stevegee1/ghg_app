import crypto from 'crypto';
import { Prisma, PrismaClient, Scope3Category, Scope3EnteredBy, Scope3Stage } from '@prisma/client';
import { recordHash, sha256Hex } from './canonical-hash.service';
import { validateWorkEmail } from '../utils/emailValidation';

type Db = PrismaClient | Prisma.TransactionClient;
const D = Prisma.Decimal;

export class Scope3Error extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'Scope3Error';
  }
}

/** How long a supplier invite link works. */
export const INVITE_LIFETIME_DAYS = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new Scope3Error(`${field} must be ${min} to ${max} characters.`);
  }
  return value.trim();
}

function decimal(value: unknown, field: string, dp: number, allowZero: boolean): Prisma.Decimal {
  const re = new RegExp(`^\\d{1,12}(\\.\\d{1,${dp}})?$`);
  if (typeof value !== 'string' || !re.test(value) || (!allowZero && Number(value) === 0)) {
    throw new Scope3Error(`${field} must be a ${allowZero ? 'non-negative' : 'positive'} number with up to ${dp} decimal places, sent as text.`);
  }
  return new D(value);
}

function pastDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || !DATE_RE.test(value)) throw new Scope3Error(`${field} must be a date in the form YYYY-MM-DD.`);
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || iso(d) !== value) throw new Scope3Error(`${field} is not a real date.`);
  if (d.getTime() > Date.now()) throw new Scope3Error(`${field} cannot be in the future.`);
  return d;
}

function serializeRecord(r: Prisma.Scope3RecordGetPayload<object>, supersededIds: Set<string>) {
  return {
    id: r.id,
    stage: r.stage,
    description: r.description,
    supplierName: r.supplierName,
    quantity: r.quantity.toString(),
    unit: r.unit,
    factorKgCo2ePerUnit: r.factorKgCo2ePerUnit.toString(),
    factorSource: r.factorSource,
    kgCo2e: r.kgCo2e.toString(),
    occurredOn: iso(r.occurredOn),
    enteredBy: r.enteredBy,
    supersedesId: r.supersedesId,
    superseded: supersededIds.has(r.id),
    recordSha256: r.recordSha256,
    createdAt: r.createdAt,
  };
}

/** Current records only: a record replaced by a correction no longer counts. */
const currentOnly = <T extends { id: string; supersedesId: string | null }>(records: T[]) => {
  const superseded = new Set(records.map((r) => r.supersedesId).filter((x): x is string => Boolean(x)));
  return { current: records.filter((r) => !superseded.has(r.id)), superseded };
};

export async function listChains(db: Db, licenseeId: string) {
  const chains = await db.scope3Chain.findMany({
    where: { licenseeId },
    orderBy: { createdAt: 'desc' },
    include: { records: { select: { id: true, supersedesId: true, kgCo2e: true } }, project: { select: { id: true, name: true } } },
  });
  return chains.map((c) => {
    const { current } = currentOnly(c.records);
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      project: c.project,
      recordCount: current.length,
      kgCo2e: current.reduce((sum, r) => sum.add(r.kgCo2e), new D(0)).toString(),
      createdAt: c.createdAt,
    };
  });
}

export async function createChain(db: Db, licenseeId: string, body: Record<string, unknown>) {
  const name = text(body.name, 'name', 1, 200);
  if (!Object.values(Scope3Category).includes(body.category as Scope3Category)) {
    throw new Scope3Error(`category must be one of ${Object.values(Scope3Category).join(', ')}.`);
  }
  let projectId: string | null = null;
  if (body.projectId !== undefined && body.projectId !== null && body.projectId !== '') {
    const project = typeof body.projectId === 'string' ? await db.fleetProject.findFirst({ where: { id: body.projectId, licenseeId } }) : null;
    if (!project) throw new Scope3Error('Project not found.', 404);
    projectId = project.id;
  }
  try {
    return await db.scope3Chain.create({ data: { licenseeId, name, category: body.category as Scope3Category, projectId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new Scope3Error('A supply chain with this name already exists.', 409);
    throw err;
  }
}

export async function getChain(db: Db, licenseeId: string, chainId: string) {
  const chain = await db.scope3Chain.findFirst({
    where: { id: chainId, licenseeId },
    include: {
      records: { orderBy: [{ occurredOn: 'asc' }, { createdAt: 'asc' }] },
      invites: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!chain) throw new Scope3Error('Supply chain not found.', 404);
  const { superseded } = currentOnly(chain.records);
  return {
    id: chain.id,
    name: chain.name,
    category: chain.category,
    project: chain.project,
    records: chain.records.map((r) => serializeRecord(r, superseded)),
    invites: chain.invites.map((i) => ({ id: i.id, supplierEmail: i.supplierEmail, expiresAt: i.expiresAt, createdAt: i.createdAt })),
  };
}

/**
 * Adds a stage record. Emissions are quantity x factor; the factor and its source are entered with
 * the record (no factor is assumed). The record's SHA-256 covers every field and is fingerprinted
 * for anchoring by the daily job.
 */
export async function addRecord(
  db: Db,
  licenseeId: string,
  chainId: string,
  body: Record<string, unknown>,
  by: { enteredBy: Scope3EnteredBy; userId?: string; inviteId?: string }
) {
  const chain = await db.scope3Chain.findFirst({ where: { id: chainId, licenseeId } });
  if (!chain) throw new Scope3Error('Supply chain not found.', 404);
  if (!Object.values(Scope3Stage).includes(body.stage as Scope3Stage)) {
    throw new Scope3Error(`stage must be one of ${Object.values(Scope3Stage).join(', ')}.`);
  }
  const stage = body.stage as Scope3Stage;
  const description = text(body.description, 'description', 1, 300);
  const supplierName = text(body.supplierName, 'supplierName', 1, 200);
  const quantity = decimal(body.quantity, 'quantity', 4, false);
  if (typeof body.unit !== 'string' || !/^[a-z0-9_]{1,20}$/.test(body.unit)) {
    throw new Scope3Error('unit must be a short lowercase unit such as tonne, m3, kwh or tonne_km.');
  }
  const unit = body.unit;
  const factor = decimal(body.factorKgCo2ePerUnit, 'factorKgCo2ePerUnit', 6, true);
  const factorSource = text(body.factorSource, 'factorSource', 3, 500);
  const occurredOn = pastDate(body.occurredOn, 'occurredOn');

  let supersedesId: string | null = null;
  if (body.supersedesId !== undefined && body.supersedesId !== null && body.supersedesId !== '') {
    const old = typeof body.supersedesId === 'string' ? await db.scope3Record.findFirst({ where: { id: body.supersedesId, chainId, licenseeId } }) : null;
    if (!old) throw new Scope3Error('The record being corrected was not found in this chain.', 404);
    const already = await db.scope3Record.findFirst({ where: { supersedesId: old.id } });
    if (already) throw new Scope3Error('That record has already been corrected.', 409);
    supersedesId = old.id;
  }

  const kgCo2e = quantity.mul(factor).toDecimalPlaces(4);
  const recordSha256 = recordHash({
    chainId,
    stage,
    description,
    supplierName,
    quantity: quantity.toString(),
    unit,
    factorKgCo2ePerUnit: factor.toString(),
    factorSource,
    kgCo2e: kgCo2e.toString(),
    occurredOn: iso(occurredOn),
    enteredBy: by.enteredBy,
    supersedesId,
  });

  const record = await db.scope3Record.create({
    data: {
      licenseeId,
      chainId,
      stage,
      description,
      supplierName,
      quantity,
      unit,
      factorKgCo2ePerUnit: factor,
      factorSource,
      kgCo2e,
      occurredOn,
      enteredBy: by.enteredBy,
      enteredByUserId: by.userId ?? null,
      inviteId: by.inviteId ?? null,
      supersedesId,
      recordSha256,
    },
  });
  return serializeRecord(record, new Set());
}

/** Creates a supplier invite and returns the raw token once; only its hash is stored. */
export async function createInvite(db: Db, licenseeId: string, chainId: string, body: Record<string, unknown>) {
  const chain = await db.scope3Chain.findFirst({ where: { id: chainId, licenseeId } });
  if (!chain) throw new Scope3Error('Supply chain not found.', 404);
  if (typeof body.supplierEmail !== 'string') throw new Scope3Error('supplierEmail is required.');
  const check = validateWorkEmail(body.supplierEmail);
  if (!check.isValid) throw new Scope3Error(check.error || 'Use the supplier’s work email address.');
  const token = crypto.randomBytes(32).toString('base64url');
  const invite = await db.scope3SupplierInvite.create({
    data: {
      licenseeId,
      chainId,
      supplierEmail: body.supplierEmail.trim().toLowerCase(),
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + INVITE_LIFETIME_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { invite, token, chain };
}

export async function revokeInvite(db: Db, licenseeId: string, chainId: string, inviteId: string) {
  const result = await db.scope3SupplierInvite.updateMany({ where: { id: inviteId, chainId, licenseeId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (result.count === 0) throw new Scope3Error('Invite not found.', 404);
}

/** Finds a working invite by its raw token (callers run this with admin RLS scope). */
export async function findInvite(db: Db, token: unknown) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  return db.scope3SupplierInvite.findFirst({
    where: { tokenHash: sha256Hex(token), revokedAt: null, expiresAt: { gt: new Date() } },
    include: { chain: { include: { licensee: { select: { name: true } } } } },
  });
}

/** Scope 3 supply chain totals for records dated in [from, toExclusive), current records only. */
export async function scope3Summary(db: Db, licenseeId: string, from: Date, toExclusive: Date) {
  const records = await db.scope3Record.findMany({
    where: { licenseeId },
    select: { id: true, supersedesId: true, kgCo2e: true, stage: true, occurredOn: true, factorSource: true, recordSha256: true, chain: { select: { category: true } } },
  });
  const { current } = currentOnly(records);
  const inRange = current.filter((r) => r.occurredOn >= from && r.occurredOn < toExclusive);
  const byCategory = new Map<string, Prisma.Decimal>();
  const byStage = new Map<string, Prisma.Decimal>();
  for (const r of inRange) {
    byCategory.set(r.chain.category, (byCategory.get(r.chain.category) ?? new D(0)).add(r.kgCo2e));
    byStage.set(r.stage, (byStage.get(r.stage) ?? new D(0)).add(r.kgCo2e));
  }
  const tonnes = (kg: Prisma.Decimal) => kg.div(1000).toDecimalPlaces(4).toString();
  return {
    tonnesCo2e: tonnes(inRange.reduce((s, r) => s.add(r.kgCo2e), new D(0))),
    recordCount: inRange.length,
    byCategory: [...byCategory.entries()].sort().map(([category, kg]) => ({ category, tonnesCo2e: tonnes(kg) })),
    byStage: [...byStage.entries()].sort().map(([stage, kg]) => ({ stage, tonnesCo2e: tonnes(kg) })),
    factorSources: [...new Set(inRange.map((r) => r.factorSource))].sort(),
    recordHashes: inRange.map((r) => r.recordSha256).sort(),
  };
}
