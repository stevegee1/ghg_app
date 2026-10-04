import {
  FleetConnectionBranch,
  FleetDataProvider,
  FleetProviderAuthType,
  FleetProviderKind,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { encryptSecret } from '../secret-box.service';
import { FLEET_SCHEMA_VERSION_ID } from './fleet-schema';
import { FieldMappingError, applyFieldMapping, extractMessages, validateFieldMapping } from './fleet-field-mapping';
import { normaliseSnapshot } from './fleet-telemetry.service';

type Db = PrismaClient | Prisma.TransactionClient;

const DEVICE_AUTH_TYPES: FleetProviderAuthType[] = [FleetProviderAuthType.DEVICE_SHARED_KEY, FleetProviderAuthType.DEVICE_HMAC_SHA256];
const HEADER_PATTERN = /^[a-z0-9-]{1,64}$/;
const MIN_SECRET_LENGTH = 16;

export class FleetProviderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'FleetProviderError';
  }
}

export interface DeviceAuthConfig {
  headerName?: string;
  signatureHeader?: string;
  timestampHeader?: string;
  toleranceSeconds?: number;
}

/** Fills defaults and checks the non-secret auth settings for a device provider. */
export function normaliseDeviceAuthConfig(authType: FleetProviderAuthType, input: unknown): DeviceAuthConfig {
  const c = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const header = (value: unknown, fallback: string, label: string) => {
    const h = (typeof value === 'string' && value.trim() ? value.trim() : fallback).toLowerCase();
    if (!HEADER_PATTERN.test(h)) throw new FleetProviderError(`${label} must be a header name of letters, digits and hyphens.`);
    return h;
  };
  if (authType === FleetProviderAuthType.DEVICE_SHARED_KEY) {
    return { headerName: header(c.headerName, 'x-device-key', 'headerName') };
  }
  const tolerance = c.toleranceSeconds === undefined ? 300 : Number(c.toleranceSeconds);
  if (!Number.isInteger(tolerance) || tolerance < 30 || tolerance > 3600) {
    throw new FleetProviderError('toleranceSeconds must be a whole number from 30 to 3600.');
  }
  return {
    signatureHeader: header(c.signatureHeader, 'x-signature', 'signatureHeader'),
    timestampHeader: header(c.timestampHeader, 'x-timestamp', 'timestampHeader'),
    toleranceSeconds: tolerance,
  };
}

function mapping(input: unknown) {
  try {
    return validateFieldMapping(input);
  } catch (err) {
    if (err instanceof FieldMappingError) throw new FleetProviderError(err.message);
    throw err;
  }
}

function secret(value: unknown): string {
  if (typeof value !== 'string' || value.length < MIN_SECRET_LENGTH || value.length > 512) {
    throw new FleetProviderError(`The shared secret must be ${MIN_SECRET_LENGTH} to 512 characters.`);
  }
  return encryptSecret(value);
}

/** What administrators see of a provider. The secret is never returned, only whether one is set. */
export function presentProvider(p: FleetDataProvider & { _count?: { bindings: number } }) {
  const { secretCiphertext, ...rest } = p;
  return { ...rest, hasSecret: Boolean(secretCiphertext), activeBindings: p._count?.bindings ?? undefined };
}

export async function listProviders(db: Db) {
  const providers = await db.fleetDataProvider.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { bindings: { where: { active: true } } } } },
  });
  return providers.map(presentProvider);
}

/** Tracking-device providers are configured here; manufacturer clouds arrive with their connector. */
export async function createProvider(db: Db, adminId: string, body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) throw new FleetProviderError('Give the provider a name of up to 120 characters.');
  if (body.kind !== FleetProviderKind.TRACKING_DEVICE) {
    throw new FleetProviderError('Only tracking-device providers can be added at the moment.');
  }
  const authType = body.authType as FleetProviderAuthType;
  if (!DEVICE_AUTH_TYPES.includes(authType)) throw new FleetProviderError(`authType must be one of: ${DEVICE_AUTH_TYPES.join(', ')}.`);
  if (await db.fleetDataProvider.findUnique({ where: { name } })) throw new FleetProviderError('A provider with this name already exists.', 409);

  const created = await db.fleetDataProvider.create({
    data: {
      name,
      kind: FleetProviderKind.TRACKING_DEVICE,
      authType,
      authConfig: normaliseDeviceAuthConfig(authType, body.authConfig) as Prisma.InputJsonValue,
      secretCiphertext: secret(body.secret),
      fieldMapping: mapping(body.fieldMapping) as unknown as Prisma.InputJsonValue,
      schemaVersionId: FLEET_SCHEMA_VERSION_ID,
      createdById: adminId,
    },
  });
  return presentProvider(created);
}

/** Changes settings, rotates the secret, or switches the provider off. Stored data is untouched. */
export async function updateProvider(db: Db, id: string, body: Record<string, unknown>) {
  const existing = await db.fleetDataProvider.findUnique({ where: { id } });
  if (!existing) throw new FleetProviderError('Provider not found.', 404);
  const data: Prisma.FleetDataProviderUpdateInput = {};
  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) throw new FleetProviderError('Give the provider a name of up to 120 characters.');
    data.name = name;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') throw new FleetProviderError('active must be true or false.');
    data.active = body.active;
  }
  if (body.authConfig !== undefined) data.authConfig = normaliseDeviceAuthConfig(existing.authType, body.authConfig) as Prisma.InputJsonValue;
  if (body.fieldMapping !== undefined) data.fieldMapping = mapping(body.fieldMapping) as unknown as Prisma.InputJsonValue;
  if (body.secret !== undefined) data.secretCiphertext = secret(body.secret);
  return presentProvider(await db.fleetDataProvider.update({ where: { id }, data }));
}

/**
 * Runs a sample body through a mapping without storing anything, so an administrator can check a
 * new device's configuration before it goes live.
 */
export function testMapping(mappingInput: unknown, sample: unknown) {
  const m = mapping(mappingInput);
  let messages: unknown[];
  try {
    messages = extractMessages(m, sample);
  } catch (err) {
    throw new FleetProviderError((err as Error).message);
  }
  return messages.slice(0, 50).map((message, index) => {
    try {
      const { externalDeviceId, snapshot } = applyFieldMapping(m, message);
      normaliseSnapshot({ ...snapshot, assetTag: 'TEST' });
      return { index, ok: true as const, externalDeviceId, snapshot };
    } catch (err) {
      return { index, ok: false as const, error: (err as Error).message };
    }
  });
}

// ── Device bindings ──────────────────────────────────────────────────────

const bindingInclude = {
  asset: { select: { id: true, assetTag: true, name: true } },
  licensee: { select: { id: true, name: true } },
  provider: { select: { id: true, name: true } },
} as const;

export function listBindings(db: Db) {
  return db.fleetDeviceBinding.findMany({ orderBy: [{ active: 'desc' }, { createdAt: 'desc' }], include: bindingInclude, take: 500 });
}

/** Tracking-device assets across clients, for binding a fitted tracker. */
export function listTrackingDeviceAssets(db: Db) {
  return db.fleetAsset.findMany({
    where: { connectionBranch: FleetConnectionBranch.TRACKING_DEVICE, active: true },
    orderBy: [{ licenseeId: 'asc' }, { assetTag: 'asc' }],
    select: {
      id: true,
      assetTag: true,
      name: true,
      make: true,
      model: true,
      licensee: { select: { id: true, name: true } },
      bindings: { where: { active: true }, select: { id: true, externalDeviceId: true, provider: { select: { name: true } } } },
    },
  });
}

/** Links a fitted tracker to an asset. One active device per asset, so meters never interleave. */
export async function createBinding(db: Db, adminId: string, body: Record<string, unknown>) {
  const providerId = typeof body.providerId === 'string' ? body.providerId : '';
  const assetId = typeof body.assetId === 'string' ? body.assetId : '';
  const externalDeviceId = typeof body.externalDeviceId === 'string' ? body.externalDeviceId.trim() : '';
  if (!externalDeviceId || externalDeviceId.length > 128) throw new FleetProviderError('externalDeviceId is required (up to 128 characters).');

  const provider = await db.fleetDataProvider.findUnique({ where: { id: providerId } });
  if (!provider || provider.kind !== FleetProviderKind.TRACKING_DEVICE) throw new FleetProviderError('Tracking-device provider not found.', 404);
  const asset = await db.fleetAsset.findUnique({ where: { id: assetId }, select: { id: true, licenseeId: true, assetTag: true, active: true, connectionBranch: true } });
  if (!asset) throw new FleetProviderError('Asset not found.', 404);
  if (!asset.active || asset.connectionBranch !== FleetConnectionBranch.TRACKING_DEVICE) {
    throw new FleetProviderError(`${asset.assetTag} is not an active tracking-device asset. The client sets this on the asset first.`);
  }
  const activeKey = `${providerId}:${externalDeviceId}`;
  if (await db.fleetDeviceBinding.findUnique({ where: { activeKey } })) {
    throw new FleetProviderError('This device is already bound. Unbind it first to move it.', 409);
  }
  if (await db.fleetDeviceBinding.findFirst({ where: { assetId, active: true } })) {
    throw new FleetProviderError(`${asset.assetTag} already has an active tracker. Unbind it first.`, 409);
  }
  return db.fleetDeviceBinding.create({
    data: { providerId, externalDeviceId, activeKey, assetId, licenseeId: asset.licenseeId, createdById: adminId },
    include: bindingInclude,
  });
}

/** Stops a device's data being accepted. The binding is kept for the record and the device id is free to bind again. */
export async function deactivateBinding(db: Db, id: string) {
  const binding = await db.fleetDeviceBinding.findUnique({ where: { id } });
  if (!binding) throw new FleetProviderError('Binding not found.', 404);
  if (!binding.active) return db.fleetDeviceBinding.findUniqueOrThrow({ where: { id }, include: bindingInclude });
  return db.fleetDeviceBinding.update({
    where: { id },
    data: { active: false, deactivatedAt: new Date(), activeKey: null },
    include: bindingInclude,
  });
}
