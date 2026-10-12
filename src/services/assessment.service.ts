import {
  PrismaClient,
  OrganisationSize,
  RevenueBand,
  IndustrySector,
  WorkflowType,
  ComplianceEffort,
  ClientAssessment,
  ComplianceRecommendation,
  FleetAssetCategory,
  Prisma,
  RoutingEventType,
  ServiceLine,
} from '@prisma/client';
import { PreparationChecklistService } from './preparation-checklist.service';
import {
  ClientService,
  SERVICE_DESTINATIONS,
  SERVICE_LINES,
  enableClientService,
  recordRoutingEvent,
} from './service-routing.service';
import { currentRecommendationWhere } from './assessment-scope';

export interface FleetProfile {
  assetCountBand: (typeof FLEET_ASSET_COUNT_BANDS)[number];
  categories: FleetAssetCategory[];
  /** Whether machines already report to an OEM or telematics cloud; decides Branch A or B per asset later. */
  cloudConnection: (typeof FLEET_CLOUD_CONNECTION)[number];
}

export const FLEET_ASSET_COUNT_BANDS = ['1_10', '11_50', '51_200', '200_PLUS'] as const;
export const FLEET_CLOUD_CONNECTION = ['ALL', 'SOME', 'NONE', 'NOT_SURE'] as const;

export interface IntakeAssessmentInput {
  /** Client services this assessment covers. Each runs in its own isolated pipeline. */
  services: ClientService[];
  organisationCountry: string; // ISO 3166-1 alpha-2 e.g. "GB", "DE", "US"
  organisationSize: OrganisationSize;
  annualRevenueBand: RevenueBand;
  industrySector: IndustrySector;

  hasPhysicalSites?: boolean;
  hasProductionProcess?: boolean;
  hasFleet?: boolean;
  hasIoTMeters?: boolean;

  isUKPublicContractor?: boolean;
  hasPlanningConsent?: boolean;
  makesPublicGreenClaims?: boolean;
  hasGreenHydrogen?: boolean;

  fleetProfile?: FleetProfile | null;
}

export interface ComputedRecommendation {
  frameworkCode: string;
  frameworkName: string;
  workflowType: WorkflowType;
  isLegallyMandatory: boolean;
  plainEnglishWhy: string;
  consequenceIfSkipped: string;
  enforcementBody: string;
  estimatedEffort: ComplianceEffort;
  displayOrder: number;
}

export class AssessmentDecisionEngine {
  /**
   * Deterministically evaluates the 12 intake answers and returns the personalized
   * compliance frameworks. The client never deals with ISO codes or raw regulation texts.
   */
  static evaluate(input: IntakeAssessmentInput): ComputedRecommendation[] {
    const list: Omit<ComputedRecommendation, 'displayOrder'>[] = [];
    const isUK = input.organisationCountry.trim().toUpperCase() === 'GB';
    const isLarge = input.organisationSize === OrganisationSize.LARGE_250_PLUS;
    const isHighRevenue =
      input.annualRevenueBand === RevenueBand.BAND_36M_PLUS ||
      input.annualRevenueBand === RevenueBand.BAND_10M_36M;

    // 1. UK SECR Mandate
    if (isUK && (isLarge || input.annualRevenueBand === RevenueBand.BAND_36M_PLUS)) {
      list.push({
        frameworkCode: 'UK_SECR',
        frameworkName: 'Streamlined Energy and Carbon Reporting (SECR)',
        workflowType: WorkflowType.GHG,
        isLegallyMandatory: true,
        plainEnglishWhy:
          'Because your organization operates in the United Kingdom with over 250 employees or over £36m turnover, you have a statutory duty under the Companies Act 2006 to report Scope 1 and Scope 2 emissions and energy efficiency in your annual Directors Report.',
        consequenceIfSkipped:
          'Statutory financial penalties, rejection of annual accounts filing by Companies House, and public enforcement review by the Financial Reporting Council (FRC).',
        enforcementBody: 'Financial Reporting Council (FRC) & Companies House',
        estimatedEffort: ComplianceEffort.MEDIUM,
      });
    }

    // 2. UK Procurement Policy Note PPN 006 (replaced PPN 06/21 from 24 February 2025)
    if (input.isUKPublicContractor) {
      list.push({
        frameworkCode: 'UK_PPN_006',
        frameworkName: 'UK Public Procurement Carbon Reduction Plan (PPN 006)',
        workflowType: WorkflowType.CARBON,
        isLegallyMandatory: true,
        plainEnglishWhy:
          'You hold or bid for UK public sector contracts. Under Cabinet Office PPN 006 (which replaced PPN 06/21 for procurements started from 24 February 2025), you must publish a board-signed Carbon Reduction Plan covering Scope 1, 2, and mandated Scope 3 categories on your company website.',
        consequenceIfSkipped:
          'Mandatory disqualification from bidding on UK Central Government contracts valued at £5m per annum or above.',
        enforcementBody: 'Cabinet Office',
        estimatedEffort: ComplianceEffort.MEDIUM,
      });
    }

    // 3. Section 106 Planning Compliance
    if (isUK && input.hasPlanningConsent) {
      list.push({
        frameworkCode: 'UK_SECTION_106',
        frameworkName: 'Section 106 Planning Obligation (Local Employment)',
        workflowType: WorkflowType.JOB,
        isLegallyMandatory: true,
        plainEnglishWhy:
          'Your development operates under planning permission subject to Section 106 legal agreements. The Local Planning Authority requires verified evidence of local workforce hire quotas, apprenticeship targets, and training records.',
        consequenceIfSkipped:
          'Planning breach notices, withholding of building control sign-off, or refusal of certificate of lawful occupancy.',
        enforcementBody: 'Local Planning Authority (LPA)',
        estimatedEffort: ComplianceEffort.LOW,
      });
    }

    // 4. UK CMA Green Claims Code & Anti-Greenwashing
    if (input.makesPublicGreenClaims) {
      list.push({
        frameworkCode: 'UK_GREEN_CLAIMS_CODE',
        frameworkName: 'CMA Green Claims Code & Anti-Greenwashing Compliance',
        workflowType: WorkflowType.CARBON,
        isLegallyMandatory: true,
        plainEnglishWhy:
          'You make environmental claims in public communications, marketing, or customer portals. Under the UK Competition and Markets Authority (CMA) Green Claims Code and Digital Markets, Competition and Consumers Act 2024, all claims must be substantiated with verifiable primary evidence.',
        consequenceIfSkipped:
          'CMA formal investigations, ASA advertising bans, and civil court fines up to 10% of worldwide turnover for deceptive green marketing.',
        enforcementBody: 'Competition and Markets Authority (CMA) & Advertising Standards Authority (ASA)',
        estimatedEffort: ComplianceEffort.LOW,
      });
    }

    // 5. Green Hydrogen Production & Guarantee of Origin
    if (input.hasGreenHydrogen || input.industrySector === IndustrySector.GREEN_HYDROGEN) {
      list.push({
        frameworkCode: 'UK_LCHS',
        frameworkName: 'UK Low Carbon Hydrogen Standard (LCHS)',
        workflowType: WorkflowType.GHG,
        isLegallyMandatory: true,
        plainEnglishWhy:
          'You produce, compress, or distribute electrolytic green hydrogen. Under the UK Low Carbon Hydrogen Standard (LCHS) administered by DESNZ and Ofgem, hydrogen must be proven below 20g CO2e/MJ with verified hourly renewable power correlation to qualify for the Hydrogen Business Model (HBM) subsidy.',
        consequenceIfSkipped:
          'Ineligibility for Hydrogen Business Model (HBM) subsidy revenues, cancellation of premium offtake agreements, and loss of LCHS certification status.',
        enforcementBody: 'Department for Energy Security and Net Zero (DESNZ) / Ofgem',
        estimatedEffort: ComplianceEffort.HIGH,
      });
    }

    // 6. ISO 14064-1 Corporate GHG Accounting (Universal Gold Standard)
    if (input.hasPhysicalSites || input.hasProductionProcess || input.hasFleet) {
      list.push({
        frameworkCode: 'ISO_14064_1',
        frameworkName: 'ISO 14064-1:2018 Organisation GHG Quantification and Disclosure',
        workflowType: WorkflowType.GHG,
        isLegallyMandatory: false,
        plainEnglishWhy:
          'Because you manage physical facilities, manufacturing lines, or vehicles, ISO 14064-1 provides the international audit standard recognized by global banks, institutional investors, and Tier-1 enterprise supply chain auditors.',
        consequenceIfSkipped:
          'Difficulty passing Tier-1 enterprise supplier ESG audits and commercial procurement screenings that mandate ISO-assured carbon disclosures.',
        enforcementBody: 'UKAS / International Accreditation Forum (IAF) Accredited Bodies',
        estimatedEffort: ComplianceEffort.MEDIUM,
      });
    }

    // 7. ISO 50001 Energy Management System (EnMS)
    if (
      input.hasIoTMeters ||
      isLarge ||
      input.industrySector === IndustrySector.DATA_CENTRE ||
      input.industrySector === IndustrySector.MANUFACTURING
    ) {
      list.push({
        frameworkCode: 'ISO_50001',
        frameworkName: 'ISO 50001:2018 Energy Management System (EnMS)',
        workflowType: WorkflowType.GHG,
        isLegallyMandatory: false,
        plainEnglishWhy:
          'Your operations feature high energy density or automated metering infrastructure. An ISO 50001 certificate covering all of your organisation\'s energy use is an accepted route to ESOS compliance, in place of a separate ESOS audit.',
        consequenceIfSkipped:
          'If you are in ESOS scope, a separate ESOS assessment signed off by a lead assessor, and Environment Agency penalties of up to £50,000 for non-compliance.',
        enforcementBody: 'Environment Agency (UK) & Accredited Registrars',
        estimatedEffort: ComplianceEffort.HIGH,
      });
    }

    // 8. Social Value Act & Fair Work Job Verification
    if (
      input.services.includes('WORKFORCE') ||
      input.hasPlanningConsent ||
      input.isUKPublicContractor ||
      input.industrySector === IndustrySector.CONSTRUCTION ||
      isLarge
    ) {
      list.push({
        frameworkCode: 'SOCIAL_VALUE_JOBS',
        frameworkName: 'Social Value Act & Section 106 Job Verification',
        workflowType: WorkflowType.JOB,
        isLegallyMandatory: Boolean(input.hasPlanningConsent),
        plainEnglishWhy:
          'Section 106 municipal planning conditions and public tenders require verified social value, Real Living Wage compliance, local community hiring, and apprentice training hours.',
        consequenceIfSkipped:
          'Inability to discharge Section 106 local authority planning covenants or lower competitive tender scoring against competing bidders.',
        enforcementBody: 'Local Planning Authorities & Cabinet Office Procurement Boards',
        estimatedEffort: ComplianceEffort.LOW,
      });
    }

    // Only frameworks for the services the client chose. Fleet has no compliance frameworks.
    const lines = new Set(input.services.flatMap((service) => SERVICE_LINES[service]));
    const wantsGhg = lines.has(ServiceLine.GHG);
    const wantsCarbon = lines.has(ServiceLine.CARBON);
    const wantsJob = lines.has(ServiceLine.JOB);

    const filteredList = list.filter((item) => {
      if (item.workflowType === WorkflowType.GHG) return wantsGhg;
      if (item.workflowType === WorkflowType.CARBON) return wantsCarbon;
      if (item.workflowType === WorkflowType.JOB) return wantsJob;
      return false;
    });

    // Sort: Legally mandatory first, then by estimated effort (LOW first for quick wins)
    filteredList.sort((a, b) => {
      if (a.isLegallyMandatory !== b.isLegallyMandatory) {
        return a.isLegallyMandatory ? -1 : 1;
      }
      const effortWeight = {
        [ComplianceEffort.LOW]: 1,
        [ComplianceEffort.MEDIUM]: 2,
        [ComplianceEffort.HIGH]: 3,
      };
      return effortWeight[a.estimatedEffort] - effortWeight[b.estimatedEffort];
    });

    return filteredList.map((item, index) => ({
      ...item,
      displayOrder: index + 1,
    }));
  }
}

export class AssessmentFlowError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AssessmentFlowError';
  }
}

function answerFields(input: IntakeAssessmentInput) {
  return {
    hasPhysicalSites: input.hasPhysicalSites ?? false,
    hasProductionProcess: input.hasProductionProcess ?? false,
    hasFleet: input.hasFleet ?? false,
    hasIoTMeters: input.hasIoTMeters ?? false,
    isUKPublicContractor: input.isUKPublicContractor ?? false,
    hasPlanningConsent: input.hasPlanningConsent ?? false,
    makesPublicGreenClaims: input.makesPublicGreenClaims ?? false,
    hasGreenHydrogen: input.hasGreenHydrogen ?? false,
  };
}

/** The answers recorded with a routing decision, so the log shows why the client was routed. */
function routingAnswers(input: IntakeAssessmentInput): Record<string, unknown> {
  return {
    organisationCountry: input.organisationCountry,
    organisationSize: input.organisationSize,
    annualRevenueBand: input.annualRevenueBand,
    industrySector: input.industrySector,
    ...answerFields(input),
    fleetProfile: input.fleetProfile ?? null,
  };
}

function servicesFromLines(lines: ServiceLine[]): ClientService[] {
  const services: ClientService[] = [];
  if (lines.includes(ServiceLine.GHG) || lines.includes(ServiceLine.CARBON)) services.push('GHG');
  if (lines.includes(ServiceLine.JOB)) services.push('WORKFORCE');
  if (lines.includes(ServiceLine.FLEET)) services.push('FLEET');
  return services;
}

async function createRecommendations(
  tx: Prisma.TransactionClient,
  assessmentId: string,
  licenseeId: string,
  computed: ComputedRecommendation[],
  orderOffset = 0
): Promise<ComplianceRecommendation[]> {
  const created: ComplianceRecommendation[] = [];
  for (const rec of computed) {
    created.push(
      await tx.complianceRecommendation.create({
        data: {
          assessmentId,
          licenseeId,
          frameworkCode: rec.frameworkCode,
          frameworkName: rec.frameworkName,
          workflowType: rec.workflowType,
          isLegallyMandatory: rec.isLegallyMandatory,
          plainEnglishWhy: rec.plainEnglishWhy,
          consequenceIfSkipped: rec.consequenceIfSkipped,
          enforcementBody: rec.enforcementBody,
          estimatedEffort: rec.estimatedEffort,
          clientAccepted: true,
          clientReviewedAt: new Date(),
          displayOrder: orderOffset + rec.displayOrder,
        },
      })
    );
  }
  return created;
}

export class AssessmentService {
  private readonly checklistService: PreparationChecklistService;

  constructor(private readonly prisma: PrismaClient) {
    this.checklistService = new PreparationChecklistService(prisma);
  }

  /**
   * Completes onboarding: supersedes any previous assessment (history is kept), records the
   * answers, routes the client to the chosen service, generates that service's recommendations
   * and checklists, and logs the routing decision with the answers that drove it.
   */
  async submitAssessment(
    licenseeId: string,
    input: IntakeAssessmentInput,
    userId: string
  ): Promise<{
    assessment: ClientAssessment;
    recommendations: Awaited<ReturnType<AssessmentService['listCurrentRecommendations']>>;
    destination: string;
  }> {
    const computedRecommendations = AssessmentDecisionEngine.evaluate(input);
    const lines = [...new Set(input.services.flatMap((service) => SERVICE_LINES[service]))];
    const country = input.organisationCountry.trim().toUpperCase().slice(0, 2);

    const { assessment, created } = await this.prisma.$transaction(async (tx) => {
      await tx.clientAssessment.updateMany({
        where: { licenseeId, supersededAt: null },
        data: { supersededAt: new Date() },
      });

      const assessment = await tx.clientAssessment.create({
        data: {
          licenseeId,
          organisationCountry: country,
          organisationSize: input.organisationSize,
          annualRevenueBand: input.annualRevenueBand,
          industrySector: input.industrySector,
          ...answerFields(input),
          serviceLinesRequested: lines,
          fleetProfile: input.fleetProfile ? (input.fleetProfile as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          completedAt: new Date(),
        },
      });

      const created = await createRecommendations(tx, assessment.id, licenseeId, computedRecommendations);

      await tx.licensee.update({
        where: { id: licenseeId },
        data: { hasCompletedAssessment: true, organisationCountry: country, industrySector: input.industrySector },
      });

      for (const service of input.services) {
        await recordRoutingEvent(tx, {
          licenseeId,
          eventType: RoutingEventType.SERVICE_SELECTED,
          actor: userId,
          detail: { service, assessmentId: assessment.id, answers: routingAnswers(input), frameworks: computedRecommendations.map((r) => r.frameworkCode) },
        });
        await enableClientService(tx, { licenseeId, service, actor: userId, reason: 'Selected during onboarding' });
      }

      await tx.portalUser.update({
        where: { id: userId },
        data: { isOnboardingComplete: true, onboardingCompletedAt: new Date() },
      });

      return { assessment, created };
    });

    for (const rec of created) {
      await this.checklistService.createChecklistForRecommendation(rec.id, licenseeId, rec.frameworkCode);
    }

    return {
      assessment,
      recommendations: await this.listCurrentRecommendations(licenseeId),
      destination: SERVICE_DESTINATIONS[input.services[0]],
    };
  }

  /** The licensee's current (not superseded) assessment with recommendations and checklists. */
  async getAssessment(licenseeId: string) {
    return this.prisma.clientAssessment.findFirst({
      where: { licenseeId, supersededAt: null },
      include: {
        recommendations: {
          include: {
            checklist: {
              include: {
                items: {
                  orderBy: [{ isMandatory: 'desc' }, { createdAt: 'asc' }],
                },
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Adds another service for an onboarded client. Merges that service's answers into the current
   * assessment, adds its recommendations and checklists, activates it and logs the decision.
   * Each service keeps its own isolated pipeline.
   */
  async addService(
    licenseeId: string,
    service: ClientService,
    answers: Partial<Omit<IntakeAssessmentInput, 'services' | 'organisationCountry' | 'organisationSize' | 'annualRevenueBand' | 'industrySector'>>,
    userId: string
  ): Promise<{ destination: string }> {
    const current = await this.prisma.clientAssessment.findFirst({
      where: { licenseeId, supersededAt: null },
      orderBy: { createdAt: 'desc' },
      include: { recommendations: { select: { frameworkCode: true } } },
    });
    if (!current) {
      throw new AssessmentFlowError('Complete onboarding before adding a service.', 409);
    }
    if (SERVICE_LINES[service].every((line) => current.serviceLinesRequested.includes(line))) {
      throw new AssessmentFlowError('This service is already part of your account.', 409);
    }

    const services = servicesFromLines(current.serviceLinesRequested);
    const merged: IntakeAssessmentInput = {
      services: [...new Set([...services, service])],
      organisationCountry: current.organisationCountry,
      organisationSize: current.organisationSize,
      annualRevenueBand: current.annualRevenueBand,
      industrySector: current.industrySector,
      hasPhysicalSites: answers.hasPhysicalSites ?? current.hasPhysicalSites,
      hasProductionProcess: answers.hasProductionProcess ?? current.hasProductionProcess,
      hasFleet: answers.hasFleet ?? current.hasFleet,
      hasIoTMeters: answers.hasIoTMeters ?? current.hasIoTMeters,
      isUKPublicContractor: answers.isUKPublicContractor ?? current.isUKPublicContractor,
      hasPlanningConsent: answers.hasPlanningConsent ?? current.hasPlanningConsent,
      makesPublicGreenClaims: answers.makesPublicGreenClaims ?? current.makesPublicGreenClaims,
      hasGreenHydrogen: answers.hasGreenHydrogen ?? current.hasGreenHydrogen,
      fleetProfile: answers.fleetProfile ?? (current.fleetProfile as unknown as FleetProfile | null),
    };

    const existingCodes = new Set(current.recommendations.map((r) => r.frameworkCode));
    const additions = AssessmentDecisionEngine.evaluate(merged).filter((r) => !existingCodes.has(r.frameworkCode));
    const lines = [...new Set([...current.serviceLinesRequested, ...SERVICE_LINES[service]])];

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.clientAssessment.update({
        where: { id: current.id },
        data: {
          ...answerFields(merged),
          serviceLinesRequested: lines,
          fleetProfile: merged.fleetProfile ? (merged.fleetProfile as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
      const recs = await createRecommendations(tx, current.id, licenseeId, additions, existingCodes.size);
      await recordRoutingEvent(tx, {
        licenseeId,
        eventType: RoutingEventType.SERVICE_ADDED,
        actor: userId,
        detail: { service, assessmentId: current.id, answers: routingAnswers(merged), frameworks: additions.map((r) => r.frameworkCode) },
      });
      await enableClientService(tx, { licenseeId, service, actor: userId, reason: 'Added by client' });
      return recs;
    });

    for (const rec of created) {
      await this.checklistService.createChecklistForRecommendation(rec.id, licenseeId, rec.frameworkCode);
    }

    return { destination: SERVICE_DESTINATIONS[service] };
  }

  async listCurrentRecommendations(licenseeId: string) {
    return this.prisma.complianceRecommendation.findMany({
      where: currentRecommendationWhere(licenseeId),
      include: {
        checklist: { select: { id: true, totalItems: true, completedItems: true, isReadyToIngest: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Retrieves recommendations for a licensee.
   */
  async getRecommendations(licenseeId: string) {
    return this.prisma.complianceRecommendation.findMany({
      where: currentRecommendationWhere(licenseeId),
      include: {
        checklist: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Accepts or defers a recommendation. Mandatory recommendations cannot be deferred.
   */
  async acceptOrDeferRecommendation(
    licenseeId: string,
    recommendationId: string,
    clientAccepted: boolean,
    deferredReason?: string
  ) {
    const rec = await this.prisma.complianceRecommendation.findFirst({
      where: { id: recommendationId, licenseeId },
    });

    if (!rec) {
      throw new Error('Compliance recommendation not found');
    }

    if (rec.isLegallyMandatory && !clientAccepted) {
      throw new Error(
        'Legally mandatory frameworks cannot be deferred because statute and reporting regulations require compliance.'
      );
    }

    const updated = await this.prisma.complianceRecommendation.update({
      where: { id: recommendationId },
      data: {
        clientAccepted,
        deferredReason: !clientAccepted ? deferredReason || 'Deferred by client' : null,
        clientReviewedAt: new Date(),
      },
      include: {
        checklist: {
          include: { items: true },
        },
      },
    });

    // If accepted and checklist missing, create it
    if (clientAccepted && !updated.checklist) {
      await this.checklistService.createChecklistForRecommendation(
        rec.id,
        licenseeId,
        rec.frameworkCode
      );
    }

    return updated;
  }

  /**
   * Admin view: Aggregated client readiness and assessment progress tracker.
   */
  async getAdminReadinessOverview() {
    const licensees: any[] = await this.prisma.licensee.findMany({
      include: {
        clientAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            recommendations: {
              include: {
                checklist: {
                  include: {
                    items: true,
                  },
                },
              },
            },
          },
        },
        entitlements: {
          select: {
            serviceLine: true,
            status: true,
            grantedAt: true,
          },
          orderBy: { serviceLine: 'asc' },
        },
        portalUsers: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            primaryRole: true,
            isOnboardingComplete: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    } as any);

    return licensees.map((lic) => {
      const latestAssessment = lic.clientAssessments[0] || null;
      const recommendations: any[] = latestAssessment?.recommendations || [];

      let totalItems = 0;
      let completedItems = 0;
      let readyFrameworks = 0;

      recommendations.forEach((r: any) => {
        if (r.checklist) {
          totalItems += r.checklist.totalItems;
          completedItems += r.checklist.completedItems;
          if (r.checklist.isReadyToIngest) {
            readyFrameworks += 1;
          }
        }
      });

      const readinessPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        licenseeId: lic.id,
        licenseeName: lic.name,
        country: lic.organisationCountry || 'GB',
        industrySector: lic.industrySector,
        hasCompletedAssessment: lic.hasCompletedAssessment,
        assessmentCompletedAt: latestAssessment?.completedAt || null,
        totalFrameworksRecommended: recommendations.length,
        mandatoryFrameworksCount: recommendations.filter((r: any) => r.isLegallyMandatory).length,
        readyFrameworksCount: readyFrameworks,
        totalChecklistItems: totalItems,
        completedChecklistItems: completedItems,
        readinessPercentage,
        primaryContact: (lic as any).portalUsers?.[0] || null,
        serviceEntitlements: (lic as any).entitlements ?? [],
        frameworks: recommendations.map((r: any) => ({
          frameworkCode: r.frameworkCode,
          frameworkName: r.frameworkName,
          isLegallyMandatory: r.isLegallyMandatory,
          clientAccepted: r.clientAccepted,
          isReadyToIngest: r.checklist?.isReadyToIngest ?? false,
          totalItems: r.checklist?.totalItems ?? 0,
          completedItems: r.checklist?.completedItems ?? 0,
        })),
      };
    });
  }
}
