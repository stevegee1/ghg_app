import { PrismaClient } from '@prisma/client';
import { seed } from '../fixtures/sample-data';

/**
 * Ensures an active platform-default split configuration backed by ACTIVE charity rows exists.
 * Payments refuse to proceed without one. Uses the idempotent development seed, which the
 * database's single-active-config constraint requires every suite to share.
 */
export async function ensurePlatformSplitConfig(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.splitConfigHistory.findFirst({ where: { licenseeId: null, isActive: true } });
  if (existing) return;
  await seed();
}
