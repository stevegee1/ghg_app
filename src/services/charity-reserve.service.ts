import Stripe from 'stripe';
import { CharityStatus, Prisma, PrismaClient, TransactionStatus } from '@prisma/client';
import { computeCharityAllocations } from './charity-allocation.service';
import { payCharityAllocations } from './settlement.service';
import { runWithRls } from '../db/rls';

/** Platform-wide reads and writes on payment records run under the administrator RLS scope. */
const ADMIN_SCOPE = { role: 'ADMIN' } as const;

/**
 * The charity reserve: the charity share of settled payments taken while the active split named no
 * charities. It is held on the platform account until an administrator assigns it to charities.
 */

export class CharityReserveError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'CharityReserveError';
  }
}

export interface CharityReserveBalance {
  currency: string;
  totalCents: number;
  paymentCount: number;
}

export interface CharityReserveAssignmentInput {
  currency: string;
  charityAllocationBps: { charityId: string; bps: number }[];
}

/** Settled payments whose charity share is still held. */
const heldSplitWhere = (currency?: string): Prisma.FinancialSplitWhereInput => ({
  allocationsFinalized: false,
  charityGiftCents: { gt: 0 },
  transaction: { status: TransactionStatus.SETTLED, ...(currency ? { currency } : {}) },
});

const heldCents = (split: { charityGiftCents: number; charityAllocations: { amountCents: number }[] }) =>
  split.charityGiftCents - split.charityAllocations.reduce((sum, a) => sum + a.amountCents, 0);

/** The held balance in each currency. */
export async function getCharityReserve(prisma: PrismaClient): Promise<CharityReserveBalance[]> {
  const splits = await runWithRls(prisma, ADMIN_SCOPE, (tx) =>
    tx.financialSplit.findMany({
      where: heldSplitWhere(),
      select: { charityGiftCents: true, charityAllocations: { select: { amountCents: true } }, transaction: { select: { currency: true } } },
    })
  );
  const byCurrency = new Map<string, CharityReserveBalance>();
  for (const split of splits) {
    const amount = heldCents(split);
    if (amount <= 0) continue;
    const currency = split.transaction.currency.toUpperCase();
    const balance = byCurrency.get(currency) ?? { currency, totalCents: 0, paymentCount: 0 };
    balance.totalCents += amount;
    balance.paymentCount += 1;
    byCurrency.set(currency, balance);
  }
  return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

/** Validates an administrator's assignment. Returns the input to apply or an error message. */
export function parseReserveAssignment(body: Record<string, unknown>): { value: CharityReserveAssignmentInput } | { error: string } {
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : '';
  if (!/^[A-Z]{3}$/.test(currency)) return { error: 'currency must be a 3-letter currency code.' };
  const list = body.charityAllocationBps;
  if (!Array.isArray(list) || list.length === 0) return { error: 'Choose at least one charity.' };

  const seen = new Set<string>();
  const charityAllocationBps: CharityReserveAssignmentInput['charityAllocationBps'] = [];
  for (const entry of list as unknown[]) {
    const item = entry as { charityId?: unknown; bps?: unknown };
    if (typeof item?.charityId !== 'string' || !item.charityId.trim()) return { error: 'Each entry needs a charityId.' };
    if (typeof item.bps !== 'number' || !Number.isInteger(item.bps) || item.bps <= 0) return { error: 'Each share must be a positive whole number of basis points.' };
    if (seen.has(item.charityId)) return { error: 'Each charity may appear once.' };
    seen.add(item.charityId);
    charityAllocationBps.push({ charityId: item.charityId, bps: item.bps });
  }
  if (charityAllocationBps.reduce((sum, c) => sum + c.bps, 0) !== 10000) return { error: 'Shares must add up to 10000 basis points (100%).' };
  return { value: { currency, charityAllocationBps } };
}

/**
 * Assigns the whole held balance in one currency to the chosen charities, then pays each new
 * allocation to the charity's connected account. Runs serializably so two administrators cannot
 * assign the same funds; a payment that fails stays recorded as failed for reconciliation.
 */
export async function assignCharityReserve(
  prisma: PrismaClient,
  stripe: Stripe,
  input: CharityReserveAssignmentInput,
  adminUserId: string
) {
  const ids = input.charityAllocationBps.map((c) => c.charityId);
  const charities = await prisma.charity.findMany({ where: { id: { in: ids } } });
  if (charities.length !== ids.length) throw new CharityReserveError('One or more charities were not found.', 404);
  const unpayable = charities.filter((c) => c.status !== CharityStatus.ACTIVE || !c.stripeConnectedAccountId);
  if (unpayable.length > 0) {
    throw new CharityReserveError(`These charities are not active with a connected payout account: ${unpayable.map((c) => c.name).join(', ')}.`, 409);
  }

  let outcome: { assignmentId: string; totalCents: number; transactionIds: string[] };
  try {
    outcome = await runWithRls(
      prisma,
      ADMIN_SCOPE,
      async (tx) => {
        const splits = await tx.financialSplit.findMany({
          where: heldSplitWhere(input.currency),
          include: { charityAllocations: { select: { amountCents: true } } },
        });
        const held = splits.map((s) => ({ split: s, amount: heldCents(s) })).filter((h) => h.amount > 0);
        if (held.length === 0) throw new CharityReserveError(`There are no held charity funds in ${input.currency}.`, 409);

        const totalCents = held.reduce((sum, h) => sum + h.amount, 0);
        const assignment = await tx.charityReserveAssignment.create({
          data: {
            assignedByUserId: adminUserId,
            charityAllocationBps: input.charityAllocationBps,
            currency: input.currency,
            splitCount: held.length,
            totalCents,
          },
        });

        for (const { split, amount } of held) {
          const allocations = computeCharityAllocations(amount, input.charityAllocationBps).filter((a) => a.amountCents > 0);
          await tx.charityAllocation.createMany({
            data: allocations.map((a) => ({
              financialSplitId: split.id,
              charityId: a.charityId,
              amountCents: a.amountCents,
              reserveAssignmentId: assignment.id,
            })),
          });
          // The database trigger confirms the allocations now equal the charity share.
          await tx.financialSplit.update({ where: { id: split.id }, data: { allocationsFinalized: true } });
        }

        return { assignmentId: assignment.id, totalCents, transactionIds: held.map((h) => h.split.transactionId) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      throw new CharityReserveError('Another assignment was made at the same time. Refresh and try again.', 409);
    }
    throw err;
  }

  for (const transactionId of outcome.transactionIds) {
    await payCharityAllocations(prisma, stripe, transactionId);
  }

  const failedTransfers = await prisma.charityAllocation.count({
    where: { reserveAssignmentId: outcome.assignmentId, transferFailed: true },
  });

  return {
    assignmentId: outcome.assignmentId,
    currency: input.currency,
    totalCents: outcome.totalCents,
    paymentCount: outcome.transactionIds.length,
    failedTransfers,
  };
}

/** Past assignments, newest first. */
export async function listReserveAssignments(prisma: PrismaClient) {
  return prisma.charityReserveAssignment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { assignedByUser: { select: { email: true } } },
  });
}
