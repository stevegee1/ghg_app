import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Every source feeding a client's Fleet data: telemetry by source (their own API key, manufacturer
 * clouds, tracking devices), uploaded files and maintenance records, each with how much it has sent
 * and when it last sent something. API keys are listed by prefix only; the key itself is never stored.
 */
export async function fleetDataSources(db: Db, licenseeId: string) {
  const [keys, telemetry, uploads, bindings, maintenance] = await Promise.all([
    db.fleetApiKey.findMany({
      where: { licenseeId, revokedAt: null },
      select: { name: true, keyPrefix: true, scopes: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.fleetTelemetrySnapshot.groupBy({
      by: ['source'],
      where: { licenseeId },
      _count: { _all: true },
      _max: { receivedAt: true },
    }),
    db.fleetImportBatch.aggregate({ where: { licenseeId }, _count: { _all: true }, _max: { createdAt: true } }),
    db.fleetDeviceBinding.findMany({
      where: { licenseeId, active: true },
      select: { provider: { select: { name: true } } },
    }),
    db.fleetMaintenanceEvent.aggregate({ where: { licenseeId }, _count: { _all: true }, _max: { createdAt: true } }),
  ]);

  const machinesBySource = await db.fleetTelemetrySnapshot.groupBy({ by: ['source', 'assetId'], where: { licenseeId } });
  const machines = new Map<string, number>();
  for (const row of machinesBySource) machines.set(row.source, (machines.get(row.source) ?? 0) + 1);

  const devices = new Map<string, number>();
  for (const b of bindings) devices.set(b.provider.name, (devices.get(b.provider.name) ?? 0) + 1);

  return {
    apiKeys: keys,
    telemetry: telemetry
      .map((t) => ({ source: t.source, snapshots: t._count._all, machines: machines.get(t.source) ?? 0, lastReceivedAt: t._max.receivedAt }))
      .sort((a, b) => (b.lastReceivedAt?.getTime() ?? 0) - (a.lastReceivedAt?.getTime() ?? 0)),
    connectedDevices: [...devices.entries()].map(([provider, count]) => ({ provider, count })),
    uploads: { files: uploads._count._all, lastAt: uploads._max.createdAt },
    maintenanceRecords: { count: maintenance._count._all, lastAt: maintenance._max.createdAt },
  };
}
