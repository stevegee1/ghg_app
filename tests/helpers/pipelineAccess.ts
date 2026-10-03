import {
  PrismaClient,
  WorkflowType,
  ServiceLine,
  EntitlementStatus,
  OrganisationSize,
  RevenueBand,
  IndustrySector,
  ComplianceEffort,
} from '@prisma/client';

/**
 * Satisfies the statutory gates a licensee must pass before using a workflow pipeline:
 * an ACTIVE service entitlement, a completed intake assessment, and a mandatory
 * recommendation whose preparation checklist is ready to ingest.
 */
export async function grantPipelineAccess(
  prisma: PrismaClient,
  licenseeId: string,
  workflowType: WorkflowType,
  frameworkCode: string
): Promise<void> {
  await prisma.serviceEntitlement.upsert({
    where: { licenseeId_serviceLine: { licenseeId, serviceLine: workflowType as ServiceLine } },
    update: { status: EntitlementStatus.ACTIVE },
    create: { licenseeId, serviceLine: workflowType as ServiceLine, status: EntitlementStatus.ACTIVE },
  });

  await prisma.licensee.update({
    where: { id: licenseeId },
    data: { hasCompletedAssessment: true },
  });

  const assessment = await prisma.clientAssessment.create({
    data: {
      licenseeId,
      organisationCountry: 'GB',
      organisationSize: OrganisationSize.LARGE_250_PLUS,
      annualRevenueBand: RevenueBand.BAND_36M_PLUS,
      industrySector: IndustrySector.MANUFACTURING,
      hasPhysicalSites: true,
      hasProductionProcess: true,
      hasFleet: false,
      hasIoTMeters: false,
      isUKPublicContractor: workflowType === WorkflowType.JOB,
      hasPlanningConsent: workflowType === WorkflowType.JOB,
      makesPublicGreenClaims: workflowType === WorkflowType.CARBON,
      hasGreenHydrogen: false,
      completedAt: new Date(),
    },
  });

  const recommendation = await prisma.complianceRecommendation.create({
    data: {
      licenseeId,
      assessmentId: assessment.id,
      frameworkCode,
      frameworkName: frameworkCode,
      workflowType,
      isLegallyMandatory: true,
      plainEnglishWhy: `Required for ${frameworkCode} compliance testing.`,
      estimatedEffort: ComplianceEffort.MEDIUM,
      clientAccepted: true,
      displayOrder: 1,
    },
  });

  await prisma.preparationChecklist.create({
    data: {
      recommendationId: recommendation.id,
      licenseeId,
      totalItems: 1,
      completedItems: 1,
      isReadyToIngest: true,
    },
  });
}
