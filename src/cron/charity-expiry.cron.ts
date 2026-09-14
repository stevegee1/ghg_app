import { PrismaClient, CharityStatus } from '@prisma/client';

export interface ExpiryJobResult {
  expiredCount: number;
  expiredCharityIds: string[];
  reopenedSlotCount: number;
}

/**
 * Scheduled daily maintenance job:
 * Scans all ACTIVE charities. If contractEndDate has passed (1 year elapsed),
 * sets status to EXPIRED and removes them from the active ESG split pool immediately.
 * Reopens statutory charity slots for new applications.
 */
export async function expireElapsedCharityContracts(prisma: PrismaClient): Promise<ExpiryJobResult> {
  const now = new Date();

  const expiredCharities = await prisma.charity.findMany({
    where: {
      status: CharityStatus.ACTIVE,
      contractEndDate: {
        lte: now,
      },
    },
    select: { id: true, name: true, contractEndDate: true },
  });

  if (expiredCharities.length === 0) {
    return {
      expiredCount: 0,
      expiredCharityIds: [],
      reopenedSlotCount: 0,
    };
  }

  const expiredIds = expiredCharities.map((c) => c.id);

  await prisma.charity.updateMany({
    where: { id: { in: expiredIds } },
    data: { status: CharityStatus.EXPIRED },
  });

  console.info(`[CHARITY EXPIRY CRON] Successfully transitioned ${expiredIds.length} charity(s) to EXPIRED: ${expiredIds.join(', ')}.`);

  return {
    expiredCount: expiredIds.length,
    expiredCharityIds: expiredIds,
    reopenedSlotCount: expiredIds.length,
  };
}
