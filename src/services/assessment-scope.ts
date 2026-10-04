import { Prisma } from '@prisma/client';

/**
 * Assessments are superseded, never deleted. Every gate and listing must only read the
 * licensee's current assessment, its recommendations and their checklists.
 */
export function currentRecommendationWhere(licenseeId: string): Prisma.ComplianceRecommendationWhereInput {
  return { licenseeId, assessment: { supersededAt: null } };
}

export function currentChecklistWhere(licenseeId: string): Prisma.PreparationChecklistWhereInput {
  return { licenseeId, recommendation: { assessment: { supersededAt: null } } };
}
