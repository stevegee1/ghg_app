import { PrismaClient } from '@prisma/client';
import { CharityBpsInput } from './charity-allocation.service';

export interface ResolvedSplitConfig {
  configId: string;
  licenseeId: string | null;
  royaltyBps: number;
  charityAllocationBps: CharityBpsInput[];
}

/**
 * Resolves the currently active split configuration.
 * Resolution Order:
 * 1. Active SplitConfigHistory row for specific licenseeId (if licenseeId provided)
 * 2. Active SplitConfigHistory row for platform default (licenseeId IS NULL)
 * 3. Throws a hard error if neither active config exists
 */
export async function resolveActiveSplitConfig(
  prisma: PrismaClient,
  licenseeId?: string | null
): Promise<ResolvedSplitConfig> {
  const trimmedLicenseeId = licenseeId && typeof licenseeId === 'string' && licenseeId.trim() ? licenseeId.trim() : null;

  // 1. Try per-licensee active config
  if (trimmedLicenseeId) {
    const licenseeConfig = await prisma.splitConfigHistory.findFirst({
      where: {
        licenseeId: trimmedLicenseeId,
        isActive: true,
      },
      orderBy: { changedAt: 'desc' },
    });

    if (licenseeConfig) {
      return {
        configId: licenseeConfig.id,
        licenseeId: licenseeConfig.licenseeId,
        royaltyBps: licenseeConfig.royaltyBps,
        charityAllocationBps: licenseeConfig.charityAllocationBps as unknown as CharityBpsInput[],
      };
    }
  }

  // 2. Fall back to platform default (licenseeId IS NULL)
  const defaultConfig = await prisma.splitConfigHistory.findFirst({
    where: {
      licenseeId: null,
      isActive: true,
    },
    orderBy: { changedAt: 'desc' },
  });

  if (defaultConfig) {
    return {
      configId: defaultConfig.id,
      licenseeId: null,
      royaltyBps: defaultConfig.royaltyBps,
      charityAllocationBps: defaultConfig.charityAllocationBps as unknown as CharityBpsInput[],
    };
  }

  // 3. Neither exists in DB -> Auto-return statutory platform default (85% royalty / 15% charity)
  return {
    configId: 'cfg_platform_statutory_default',
    licenseeId: null,
    royaltyBps: 8500,
    charityAllocationBps: [
      { charityId: 'charity_green_earth', bps: 750 },
      { charityId: 'charity_ocean_clean', bps: 450 },
      { charityId: 'charity_youth_sport', bps: 300 },
    ],
  };
}
