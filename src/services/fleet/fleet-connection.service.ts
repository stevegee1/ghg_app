import { FleetConnectionBranch, FleetSetupRequestStatus, Prisma, PrismaClient, RoutingEventType, ServiceLine } from '@prisma/client';
import { recordRoutingEvent } from '../service-routing.service';
import { currentAssessmentFleetProfile } from './fleet-onboarding';

type Db = PrismaClient | Prisma.TransactionClient;

/** Branches a client can confirm. UNCONFIRMED is only ever the starting state. */
export const CONFIRMABLE_BRANCHES: FleetConnectionBranch[] = [
  FleetConnectionBranch.CLOUD_CONNECTED,
  FleetConnectionBranch.TRACKING_DEVICE,
  FleetConnectionBranch.MANUAL,
];

const OPEN_SETUP_STATUSES: FleetSetupRequestStatus[] = [FleetSetupRequestStatus.REQUESTED, FleetSetupRequestStatus.SCHEDULED];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ASSETS_PER_CALL = 500;

export class FleetConnectionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'FleetConnectionError';
  }
}

function assetIdList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ASSETS_PER_CALL || !value.every((v) => typeof v === 'string' && v)) {
    throw new FleetConnectionError(`assetIds must list between 1 and ${MAX_ASSETS_PER_CALL} assets.`);
  }
  return [...new Set(value as string[])];
}

/**
 * Records how each asset connects. Every decision is logged as a routing event with the previous
 * and new branch, so it can be traced later.
 */
export async function setAssetConnections(db: Db, licenseeId: string, actorId: string, body: Record<string, unknown>) {
  const branch = body.branch;
  if (typeof branch !== 'string' || !(CONFIRMABLE_BRANCHES as string[]).includes(branch)) {
    throw new FleetConnectionError(`branch must be one of: ${CONFIRMABLE_BRANCHES.join(', ')}.`);
  }
  const ids = assetIdList(body.assetIds);
  const assets = await db.fleetAsset.findMany({
    where: { id: { in: ids }, licenseeId },
    select: { id: true, assetTag: true, connectionBranch: true },
  });
  if (assets.length !== ids.length) throw new FleetConnectionError('One or more assets were not found.', 404);

  const changed = assets.filter((a) => a.connectionBranch !== branch);
  if (changed.length > 0) {
    await db.fleetAsset.updateMany({
      where: { id: { in: changed.map((a) => a.id) }, licenseeId },
      data: { connectionBranch: branch as FleetConnectionBranch, connectionConfirmedAt: new Date(), connectionConfirmedById: actorId },
    });
    await recordRoutingEvent(db, {
      licenseeId,
      eventType: RoutingEventType.FLEET_ASSET_BRANCH_SET,
      serviceLine: ServiceLine.FLEET,
      actor: actorId,
      detail: { branch, assets: changed.map((a) => ({ assetTag: a.assetTag, from: a.connectionBranch, to: branch })) },
    });
  }
  return { updated: changed.length, unchanged: assets.length - changed.length };
}

/** How the client's assets connect, their onboarding answer as a hint, and their set-up requests. */
export async function getConnectionOverview(db: Db, licenseeId: string) {
  const [grouped, requests, profile] = await Promise.all([
    db.fleetAsset.groupBy({ by: ['connectionBranch'], where: { licenseeId, active: true }, _count: { _all: true } }),
    db.fleetSetupRequest.findMany({
      where: { licenseeId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, assetIds: true, status: true, scheduledFor: true, preferredTimes: true, createdAt: true },
    }),
    currentAssessmentFleetProfile(db, licenseeId),
  ]);
  const counts: Record<FleetConnectionBranch, number> = { UNCONFIRMED: 0, CLOUD_CONNECTED: 0, TRACKING_DEVICE: 0, MANUAL: 0 };
  for (const g of grouped) counts[g.connectionBranch] = g._count._all;
  return { counts, onboardingCloudConnection: profile?.cloudConnection ?? null, setupRequests: requests };
}

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) throw new FleetConnectionError(`${field} must be text of at most ${max} characters.`);
  return value.trim() || null;
}

/** A request for a call to set up tracking devices. Only Branch B assets without an open request qualify. */
export async function createSetupRequest(db: Db, licenseeId: string, requestedById: string, body: Record<string, unknown>) {
  const ids = assetIdList(body.assetIds);
  const contactName = optionalText(body.contactName, 'contactName', 120);
  const contactEmail = optionalText(body.contactEmail, 'contactEmail', 254);
  if (!contactName) throw new FleetConnectionError('contactName is required.');
  if (!contactEmail || !EMAIL_PATTERN.test(contactEmail)) throw new FleetConnectionError('contactEmail must be a valid email address.');

  const assets = await db.fleetAsset.findMany({ where: { id: { in: ids }, licenseeId }, select: { id: true, assetTag: true, connectionBranch: true } });
  if (assets.length !== ids.length) throw new FleetConnectionError('One or more assets were not found.', 404);
  const notDevice = assets.filter((a) => a.connectionBranch !== FleetConnectionBranch.TRACKING_DEVICE);
  if (notDevice.length > 0) {
    throw new FleetConnectionError(`Set-up calls are for tracking-device assets. Not set as tracking device: ${notDevice.map((a) => a.assetTag).join(', ')}.`);
  }
  const open = await db.fleetSetupRequest.findMany({ where: { licenseeId, status: { in: OPEN_SETUP_STATUSES } }, select: { assetIds: true } });
  const alreadyRequested = new Set(open.flatMap((r) => r.assetIds));
  const duplicate = assets.filter((a) => alreadyRequested.has(a.id));
  if (duplicate.length > 0) {
    throw new FleetConnectionError(`A set-up call is already requested for: ${duplicate.map((a) => a.assetTag).join(', ')}.`, 409);
  }

  return db.fleetSetupRequest.create({
    data: {
      licenseeId,
      requestedById,
      assetIds: ids,
      contactName,
      contactEmail,
      contactPhone: optionalText(body.contactPhone, 'contactPhone', 40),
      preferredTimes: optionalText(body.preferredTimes, 'preferredTimes', 500),
      notes: optionalText(body.notes, 'notes', 2000),
    },
  });
}

/** Administrators' list of set-up requests, open ones first, with the client and asset tags. */
export async function listSetupRequestsForAdmin(db: Db) {
  const requests = await db.fleetSetupRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    take: 200,
    include: { licensee: { select: { id: true, name: true } } },
  });
  const assetIds = [...new Set(requests.flatMap((r) => r.assetIds))];
  const assets = await db.fleetAsset.findMany({ where: { id: { in: assetIds } }, select: { id: true, assetTag: true, name: true, make: true, model: true } });
  const byId = new Map(assets.map((a) => [a.id, a]));
  return requests.map((r) => ({ ...r, assets: r.assetIds.map((id) => byId.get(id)).filter(Boolean) }));
}

export async function updateSetupRequest(db: Db, requestId: string, body: Record<string, unknown>) {
  const status = body.status;
  if (typeof status !== 'string' || !(Object.values(FleetSetupRequestStatus) as string[]).includes(status)) {
    throw new FleetConnectionError(`status must be one of: ${Object.values(FleetSetupRequestStatus).join(', ')}.`);
  }
  let scheduledFor: Date | null | undefined;
  if (body.scheduledFor !== undefined) {
    scheduledFor = body.scheduledFor === null ? null : new Date(String(body.scheduledFor));
    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) throw new FleetConnectionError('scheduledFor must be a date-time.');
  }
  if (status === FleetSetupRequestStatus.SCHEDULED && !scheduledFor) throw new FleetConnectionError('A scheduled call needs scheduledFor.');
  const existing = await db.fleetSetupRequest.findUnique({ where: { id: requestId }, select: { id: true } });
  if (!existing) throw new FleetConnectionError('Set-up request not found.', 404);
  return db.fleetSetupRequest.update({
    where: { id: requestId },
    data: {
      status: status as FleetSetupRequestStatus,
      ...(scheduledFor !== undefined ? { scheduledFor } : {}),
      adminNotes: optionalText(body.adminNotes, 'adminNotes', 2000),
    },
  });
}
