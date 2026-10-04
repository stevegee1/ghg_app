import { Prisma, PrismaClient } from '@prisma/client';
import { FLEET_CLOUD_CONNECTION, FleetProfile } from '../assessment.service';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The Fleet answers from the client's current onboarding assessment. Used only as a hint when
 * the client confirms each asset's connection; it never decides one.
 */
export async function currentAssessmentFleetProfile(db: Db, licenseeId: string): Promise<FleetProfile | null> {
  const assessment = await db.clientAssessment.findFirst({
    where: { licenseeId, supersededAt: null },
    orderBy: { createdAt: 'desc' },
    select: { fleetProfile: true },
  });
  const profile = assessment?.fleetProfile as unknown as FleetProfile | null | undefined;
  if (!profile || !(FLEET_CLOUD_CONNECTION as readonly string[]).includes(profile.cloudConnection)) return null;
  return profile;
}
