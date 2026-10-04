import crypto from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export const FLEET_API_SCOPES = ['telemetry:write', 'fleet:read'] as const;
export type FleetApiScope = (typeof FLEET_API_SCOPES)[number];

const KEY_PREFIX = 'flt_';
const MAX_ACTIVE_KEYS = 20;
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export class FleetApiKeyError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'FleetApiKeyError';
  }
}

export function hashFleetApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateKey(): string {
  const bytes = crypto.randomBytes(40);
  let body = '';
  for (const b of bytes) body += BASE62[b % 62];
  return `${KEY_PREFIX}${body}`;
}

const listSelect = { id: true, name: true, keyPrefix: true, scopes: true, createdAt: true, lastUsedAt: true, revokedAt: true } as const;

/** Creates a key. The full key is returned once here and never stored or shown again. */
export async function createFleetApiKey(db: Db, licenseeId: string, createdById: string, body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 80) throw new FleetApiKeyError('Give the key a name of up to 80 characters.');
  const scopes = Array.isArray(body.scopes) ? [...new Set(body.scopes)] : [];
  if (scopes.length === 0 || !scopes.every((s): s is FleetApiScope => (FLEET_API_SCOPES as readonly unknown[]).includes(s))) {
    throw new FleetApiKeyError(`scopes must include one or more of: ${FLEET_API_SCOPES.join(', ')}.`);
  }
  const active = await db.fleetApiKey.count({ where: { licenseeId, revokedAt: null } });
  if (active >= MAX_ACTIVE_KEYS) throw new FleetApiKeyError(`You can have at most ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`, 409);

  const key = generateKey();
  const record = await db.fleetApiKey.create({
    data: { licenseeId, name, scopes, keyHash: hashFleetApiKey(key), keyPrefix: key.slice(0, 12), createdById },
    select: listSelect,
  });
  return { ...record, key };
}

export function listFleetApiKeys(db: Db, licenseeId: string) {
  return db.fleetApiKey.findMany({ where: { licenseeId }, select: listSelect, orderBy: { createdAt: 'desc' } });
}

export async function revokeFleetApiKey(db: Db, licenseeId: string, keyId: string) {
  const key = await db.fleetApiKey.findFirst({ where: { id: keyId, licenseeId }, select: { id: true, revokedAt: true } });
  if (!key) throw new FleetApiKeyError('Key not found.', 404);
  if (key.revokedAt) return db.fleetApiKey.findUniqueOrThrow({ where: { id: key.id }, select: listSelect });
  return db.fleetApiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() }, select: listSelect });
}

/** Resolves an active key by its hash. Callers run this in a system (admin) RLS scope. */
export async function findActiveFleetApiKey(db: Db, presented: string) {
  if (!presented.startsWith(KEY_PREFIX) || presented.length !== KEY_PREFIX.length + 40) return null;
  return db.fleetApiKey.findFirst({
    where: { keyHash: hashFleetApiKey(presented), revokedAt: null },
    select: { id: true, licenseeId: true, scopes: true, lastUsedAt: true },
  });
}
