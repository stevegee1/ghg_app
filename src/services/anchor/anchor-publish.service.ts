import { AnchorBatchStatus, Prisma, PrismaClient } from '@prisma/client';
import { AnchorPublisher, FeeAboveCapError } from './anchor-publisher';

/** Most publishing attempts for one batch before an administrator must look at it. */
export const MAX_PUBLISH_ATTEMPTS = 5;
/** A submitted transaction with no receipt after this long is treated as dropped and published again. */
export const DROPPED_AFTER_MS = 60 * 60 * 1000;
/** Postgres advisory lock key so only one server instance publishes at a time. */
const LOCK_KEY = 7_315_220_461;

const shortError = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

/**
 * Publishes waiting batches and confirms submitted ones inside one transaction holding an advisory
 * lock, so concurrent runs (several instances, or the job and an admin) never double-publish.
 */
export async function publishAndConfirm(prisma: PrismaClient, publisher: AnchorPublisher, now: () => Date = () => new Date()) {
  return prisma.$transaction((tx) => runLocked(tx, publisher, now), { timeout: 10 * 60 * 1000, maxWait: 10_000 });
}

async function runLocked(prisma: Prisma.TransactionClient, publisher: AnchorPublisher, now: () => Date) {
  const [{ locked }] = await prisma.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`;
  if (!locked) return { skipped: true, published: 0, confirmed: 0, failed: 0 };
  let published = 0;
  let confirmed = 0;
  let failed = 0;
  {
    // 1. Confirm or fail submitted batches.
    const submitted = await prisma.anchorBatch.findMany({ where: { status: AnchorBatchStatus.SUBMITTED, chainId: publisher.chainId } });
    for (const b of submitted) {
      try {
        const r = await publisher.receipt(b.txHash!);
        if (r?.state === 'CONFIRMED') {
          await prisma.anchorBatch.update({
            where: { id: b.id },
            data: { status: AnchorBatchStatus.CONFIRMED, blockNumber: BigInt(r.blockNumber), confirmedAt: now(), lastError: null },
          });
          confirmed++;
        } else if (r?.state === 'REVERTED') {
          await prisma.anchorBatch.update({ where: { id: b.id }, data: { status: AnchorBatchStatus.FAILED, lastError: 'Transaction reverted' } });
          failed++;
        } else if (!r && b.submittedAt && now().getTime() - b.submittedAt.getTime() > DROPPED_AFTER_MS) {
          await prisma.anchorBatch.update({ where: { id: b.id }, data: { status: AnchorBatchStatus.FAILED, lastError: 'Transaction not mined; will publish again' } });
          failed++;
        }
      } catch (err) {
        await prisma.anchorBatch.update({ where: { id: b.id }, data: { lastError: shortError(err) } });
      }
    }

    // 2. Publish waiting batches, oldest first.
    const waiting = await prisma.anchorBatch.findMany({
      where: { status: { in: [AnchorBatchStatus.PENDING, AnchorBatchStatus.FAILED] }, attempts: { lt: MAX_PUBLISH_ATTEMPTS } },
      orderBy: { createdAt: 'asc' },
    });
    for (const b of waiting) {
      try {
        const { txHash } = await publisher.publish(b.merkleRoot);
        await prisma.anchorBatch.update({
          where: { id: b.id },
          data: {
            status: AnchorBatchStatus.SUBMITTED,
            txHash,
            network: publisher.network,
            chainId: publisher.chainId,
            submittedAt: now(),
            attempts: { increment: 1 },
            lastError: null,
          },
        });
        published++;
      } catch (err) {
        // A fee above the cap is a postponement, not a failed attempt.
        await prisma.anchorBatch.update({
          where: { id: b.id },
          data: { lastError: shortError(err), ...(err instanceof FeeAboveCapError ? {} : { attempts: { increment: 1 } }) },
        });
        if (err instanceof FeeAboveCapError) break;
      }
    }
    return { skipped: false, published, confirmed, failed };
  }
}
