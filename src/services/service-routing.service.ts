import { EntitlementStatus, Prisma, PrismaClient, RoutingEventType, ServiceLine } from '@prisma/client';
import { isBillingEnabled } from './billing-config.service';

/** Recorded as the actor when Fleet is activated because Fleet billing is off. */
const FLEET_BILLING_OFF_ACTOR = 'system:fleet-billing-off';

type Db = PrismaClient | Prisma.TransactionClient;

/** The three client-facing services. Each runs in its own isolated pipeline. */
export const CLIENT_SERVICES = ['GHG', 'WORKFORCE', 'FLEET'] as const;
export type ClientService = (typeof CLIENT_SERVICES)[number];

/** Entitlements behind each service. GHG includes the carbon-claims frameworks (CARBON). */
export const SERVICE_LINES: Record<ClientService, ServiceLine[]> = {
  GHG: [ServiceLine.GHG, ServiceLine.CARBON],
  WORKFORCE: [ServiceLine.JOB],
  FLEET: [ServiceLine.FLEET],
};

/** Where the client lands after choosing the service. */
export const SERVICE_DESTINATIONS: Record<ClientService, string> = {
  GHG: '/portal?tab=checklist&scope=CARBON_EMISSION',
  WORKFORCE: '/portal?tab=checklist&scope=JOB_REPORTING',
  FLEET: '/portal?tab=fleet',
};

export function isClientService(value: unknown): value is ClientService {
  return typeof value === 'string' && (CLIENT_SERVICES as readonly string[]).includes(value);
}

export async function recordRoutingEvent(
  db: Db,
  event: { licenseeId: string; eventType: RoutingEventType; serviceLine?: ServiceLine | null; actor: string; detail: Record<string, unknown> }
): Promise<void> {
  await db.serviceRoutingEvent.create({
    data: {
      licenseeId: event.licenseeId,
      eventType: event.eventType,
      serviceLine: event.serviceLine ?? null,
      actor: event.actor,
      detail: event.detail as Prisma.InputJsonValue,
    },
  });
}

/**
 * Turns on the entitlements behind a chosen service.
 * GHG and Workforce activate immediately. Fleet stays PENDING until its subscription activates it,
 * or activates immediately when Fleet billing is off.
 * An entitlement an administrator has SUSPENDED or REVOKED is never reactivated here; the attempt is logged.
 */
export async function enableClientService(
  db: Db,
  params: { licenseeId: string; service: ClientService; actor: string; reason: string }
): Promise<{ activated: ServiceLine[]; blocked: ServiceLine[]; pending: ServiceLine[] }> {
  const result = { activated: [] as ServiceLine[], blocked: [] as ServiceLine[], pending: [] as ServiceLine[] };
  const now = new Date();

  for (const serviceLine of SERVICE_LINES[params.service]) {
    const existing = await db.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId: params.licenseeId, serviceLine } },
    });

    if (existing && (existing.status === EntitlementStatus.SUSPENDED || existing.status === EntitlementStatus.REVOKED)) {
      result.blocked.push(serviceLine);
      await recordRoutingEvent(db, {
        licenseeId: params.licenseeId,
        eventType: RoutingEventType.SERVICE_ACTIVATION_BLOCKED,
        serviceLine,
        actor: params.actor,
        detail: { reason: params.reason, entitlementStatus: existing.status },
      });
      continue;
    }

    // Fleet waits for its subscription only when Fleet billing is on.
    if (serviceLine === ServiceLine.FLEET && isBillingEnabled('FLEET')) {
      if (!existing) {
        await db.serviceEntitlement.create({
          data: { licenseeId: params.licenseeId, serviceLine, status: EntitlementStatus.PENDING },
        });
      }
      result.pending.push(serviceLine);
      continue;
    }

    if (existing?.status === EntitlementStatus.ACTIVE) {
      result.activated.push(serviceLine);
      continue;
    }

    await db.serviceEntitlement.upsert({
      where: { licenseeId_serviceLine: { licenseeId: params.licenseeId, serviceLine } },
      update: { status: EntitlementStatus.ACTIVE, grantedAt: now, grantedBy: params.actor },
      create: { licenseeId: params.licenseeId, serviceLine, status: EntitlementStatus.ACTIVE, grantedAt: now, grantedBy: params.actor },
    });
    result.activated.push(serviceLine);
    await recordRoutingEvent(db, {
      licenseeId: params.licenseeId,
      eventType: RoutingEventType.SERVICE_ACTIVATED,
      serviceLine,
      actor: params.actor,
      detail: { reason: params.reason },
    });
  }

  return result;
}

/**
 * With Fleet billing off, Fleet entitlements still waiting for a subscription are activated. Run at
 * start-up so turning billing off takes effect for existing clients. Each activation is logged.
 */
export async function activatePendingFleetWithoutBilling(db: Db): Promise<number> {
  if (isBillingEnabled('FLEET')) return 0;
  const pending = await db.serviceEntitlement.findMany({
    where: { serviceLine: ServiceLine.FLEET, status: EntitlementStatus.PENDING },
    select: { licenseeId: true },
  });
  const now = new Date();
  for (const { licenseeId } of pending) {
    await db.serviceEntitlement.update({
      where: { licenseeId_serviceLine: { licenseeId, serviceLine: ServiceLine.FLEET } },
      data: { status: EntitlementStatus.ACTIVE, grantedAt: now, grantedBy: FLEET_BILLING_OFF_ACTOR },
    });
    await recordRoutingEvent(db, {
      licenseeId,
      eventType: RoutingEventType.SERVICE_ACTIVATED,
      serviceLine: ServiceLine.FLEET,
      actor: FLEET_BILLING_OFF_ACTOR,
      detail: { reason: 'Fleet billing is off for this environment' },
    });
  }
  return pending.length;
}
