import crypto from 'crypto';
import { EntitlementStatus, FleetDataProvider, FleetProviderAuthType, FleetProviderKind, FleetReadingSource, PrismaClient, ServiceLine } from '@prisma/client';
import { runWithRls } from '../../db/rls';
import { decryptSecret } from '../secret-box.service';
import { FieldMappingConfig, applyFieldMapping, extractMessages } from './fleet-field-mapping';
import { DeviceAuthConfig } from './fleet-provider.service';
import { TELEMETRY_MAX_SNAPSHOTS, ingestTelemetry } from './fleet-telemetry.service';
import { FLEET_SCHEMA_VERSION_ID } from './fleet-schema';

const SYSTEM_SCOPE = { role: 'ADMIN', licenseeId: null };

export class DeviceIngestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'DeviceIngestError';
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** An active tracking-device provider, or null. Looked up as the system, before any client is known. */
export function findDeviceProvider(prisma: PrismaClient, providerId: string) {
  return runWithRls(prisma, SYSTEM_SCOPE, (tx) =>
    tx.fleetDataProvider.findFirst({ where: { id: providerId, active: true, kind: FleetProviderKind.TRACKING_DEVICE } })
  );
}

/**
 * Checks a device request against the provider's configured method. HMAC signatures cover
 * "<timestamp>.<raw body>" and the timestamp must be within the configured tolerance.
 */
export function verifyDeviceRequest(
  provider: FleetDataProvider,
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer,
  now: Date = new Date()
): boolean {
  if (!provider.secretCiphertext) return false;
  const secret = decryptSecret(provider.secretCiphertext);
  const config = provider.authConfig as DeviceAuthConfig;
  const header = (name: string | undefined) => {
    const value = name ? headers[name] : undefined;
    return typeof value === 'string' ? value.trim() : '';
  };

  if (provider.authType === FleetProviderAuthType.DEVICE_SHARED_KEY) {
    const presented = header(config.headerName);
    return presented !== '' && safeEqual(presented, secret);
  }
  if (provider.authType === FleetProviderAuthType.DEVICE_HMAC_SHA256) {
    const timestamp = header(config.timestampHeader);
    const signature = header(config.signatureHeader).replace(/^sha256=/i, '').toLowerCase();
    if (!/^\d{9,11}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false;
    if (Math.abs(now.getTime() / 1000 - Number(timestamp)) > (config.toleranceSeconds ?? 300)) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
    return safeEqual(signature, expected);
  }
  return false;
}

export interface DeviceIngestResult {
  received: number;
  accepted: number;
  duplicates: number;
  readingsCreated: number;
  rejected: { index: number; reason: string }[];
  notCalculated: { index: number; reason: string }[];
  schemaVersion: string;
}

/**
 * Maps each message to the standard schema, finds the asset its device is bound to, and stores it
 * through the same pipeline as every other source, separately for each client.
 */
export async function ingestDeviceMessages(prisma: PrismaClient, provider: FleetDataProvider, body: unknown): Promise<DeviceIngestResult> {
  const mapping = provider.fieldMapping as unknown as FieldMappingConfig;
  let messages: unknown[];
  try {
    messages = extractMessages(mapping, body);
  } catch (err) {
    throw new DeviceIngestError((err as Error).message);
  }
  if (messages.length === 0) throw new DeviceIngestError('No messages to store.');
  if (messages.length > TELEMETRY_MAX_SNAPSHOTS) throw new DeviceIngestError(`Send at most ${TELEMETRY_MAX_SNAPSHOTS} messages per request.`);

  const result: DeviceIngestResult = {
    received: messages.length,
    accepted: 0,
    duplicates: 0,
    readingsCreated: 0,
    rejected: [],
    notCalculated: [],
    schemaVersion: FLEET_SCHEMA_VERSION_ID,
  };

  const mapped: { index: number; externalDeviceId: string; snapshot: Record<string, unknown> }[] = [];
  messages.forEach((message, index) => {
    try {
      mapped.push({ index, ...applyFieldMapping(mapping, message) });
    } catch (err) {
      result.rejected.push({ index, reason: (err as Error).message });
    }
  });

  const deviceIds = [...new Set(mapped.map((m) => m.externalDeviceId))];
  const bindings = await runWithRls(prisma, SYSTEM_SCOPE, (tx) =>
    tx.fleetDeviceBinding.findMany({
      where: { providerId: provider.id, active: true, externalDeviceId: { in: deviceIds } },
      select: { externalDeviceId: true, licenseeId: true, asset: { select: { assetTag: true } } },
    })
  );
  const bindingByDevice = new Map(bindings.map((b) => [b.externalDeviceId, b]));
  const entitled = new Set(
    (
      await prisma.serviceEntitlement.findMany({
        where: { licenseeId: { in: [...new Set(bindings.map((b) => b.licenseeId))] }, serviceLine: ServiceLine.FLEET, status: EntitlementStatus.ACTIVE },
        select: { licenseeId: true },
      })
    ).map((e) => e.licenseeId)
  );

  const byLicensee = new Map<string, { index: number; snapshot: Record<string, unknown> }[]>();
  for (const m of mapped) {
    const binding = bindingByDevice.get(m.externalDeviceId);
    if (!binding) {
      result.rejected.push({ index: m.index, reason: `Device ${m.externalDeviceId} is not bound to an asset.` });
      continue;
    }
    if (!entitled.has(binding.licenseeId)) {
      result.rejected.push({ index: m.index, reason: `Device ${m.externalDeviceId} belongs to an account without an active Fleet subscription.` });
      continue;
    }
    const list = byLicensee.get(binding.licenseeId) ?? [];
    list.push({ index: m.index, snapshot: { ...m.snapshot, assetTag: binding.asset.assetTag } });
    byLicensee.set(binding.licenseeId, list);
  }

  for (const [licenseeId, items] of byLicensee) {
    const outcome = await runWithRls(prisma, { role: 'PARTNER', licenseeId }, (tx) =>
      ingestTelemetry(tx, licenseeId, FleetReadingSource.TRACKING_DEVICE, items.map((i) => i.snapshot))
    );
    result.accepted += outcome.accepted;
    result.duplicates += outcome.duplicates;
    result.readingsCreated += outcome.readingsCreated;
    for (const r of outcome.rejected) result.rejected.push({ index: items[r.index].index, reason: r.reason });
    for (const n of outcome.notCalculated) result.notCalculated.push({ index: items[n.index].index, reason: n.reason });
  }

  result.rejected.sort((a, b) => a.index - b.index);
  result.notCalculated.sort((a, b) => a.index - b.index);
  return result;
}
