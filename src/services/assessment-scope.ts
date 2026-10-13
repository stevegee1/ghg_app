import { Prisma } from '@prisma/client';

/**
 * Assessments are superseded, never deleted. Every gate and listing must only read the
 * licensee's current assessment and its recommendations.
 */
export function currentRecommendationWhere(licenseeId: string): Prisma.ComplianceRecommendationWhereInput {
  return { licenseeId, assessment: { supersededAt: null } };
}
