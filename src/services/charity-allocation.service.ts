import { PrismaClient, CharityStatus } from '@prisma/client';

export interface CharityBpsInput {
  id?: string;
  charityId?: string;
  bps: number;
}

export interface CharityAllocationResult {
  charityId: string;
  amountCents: number;
}

/**
 * Computes exact integer per-charity amountCents values that sum strictly equal to charityGiftCents.
 * Uses remainder assignment discipline (assigning rounding remainder to the final charity in the list).
 */
export function computeCharityAllocations(
  charityGiftCents: number,
  charities: CharityBpsInput[]
): CharityAllocationResult[] {
  if (!charities || charities.length === 0 || charityGiftCents <= 0) {
    return [];
  }

  let allocatedSum = 0;
  const results: CharityAllocationResult[] = [];

  for (let i = 0; i < charities.length; i++) {
    const isLast = i === charities.length - 1;
    const resolvedCharityId = charities[i].charityId || charities[i].id || '';
    let amountCents = 0;

    if (isLast) {
      amountCents = charityGiftCents - allocatedSum;
    } else {
      amountCents = Math.round((charityGiftCents * charities[i].bps) / 10000);
      allocatedSum += amountCents;
    }

    results.push({
      charityId: resolvedCharityId,
      amountCents,
    });
  }

  return results;
}

/**
 * Fetches strictly ACTIVE charities from DB, computes an equal basis points split,
 * and calls computeCharityAllocations to guarantee exact sum equality.
 */
export async function getOrComputeDefaultCharityAllocations(
  prisma: PrismaClient,
  charityGiftCents: number
): Promise<CharityAllocationResult[]> {
  const activeCharities = await prisma.charity.findMany({
    where: { status: CharityStatus.ACTIVE },
    orderBy: { createdAt: 'asc' },
  });

  if (activeCharities.length === 0) {
    return [];
  }

  const count = activeCharities.length;
  const baseBps = Math.floor(10000 / count);
  const remainderBps = 10000 - baseBps * count;

  const charityBpsInputs: CharityBpsInput[] = activeCharities.map((c, idx) => ({
    id: c.id,
    bps: idx === count - 1 ? baseBps + remainderBps : baseBps,
  }));

  return computeCharityAllocations(charityGiftCents, charityBpsInputs);
}
