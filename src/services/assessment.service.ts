import {
  PrismaClient,
  OrganisationSize,
  RevenueBand,
  IndustrySector,
  WorkflowType,
  ComplianceEffort,
  ClientAssessment,
  ComplianceRecommendation,
} from '@prisma/client';
import { PreparationChecklistService } from './preparation-checklist.service';

export interface IntakeAssessmentInput {
  serviceLines?: ('GHG' | 'CARBON' | 'JOB' | 'MERCH')[]; // Which pipelines the client is purchasing
  /** @deprecated use serviceLines. Kept for backward compatibility during migration. */
  assuranceIntent?: 'CARBON' | 'JOB' | 'DUAL';
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

    // 2. UK Public Procurement Notice (PPN 06/21)
    if (input.isUKPublicContractor) {
      list.push({
        frameworkCode: 'UK_PPN_006',
        frameworkName: 'UK Public Procurement Carbon Reduction Plan (PPN 006)',
        workflowType: WorkflowType.CARBON,
        isLegallyMandatory: true,
        plainEnglishWhy:
          'You hold or bid for UK public sector contracts. Under Crown Commercial Service PPN 006 (formerly PPN 06/21), you must publish a board-signed Carbon Reduction Plan covering Scope 1, 2, and mandated Scope 3 categories on your company website.',
        consequenceIfSkipped:
          'Mandatory disqualification from bidding on UK Central Government contracts valued at £5m per annum or above.',
        enforcementBody: 'Cabinet Office / Crown Commercial Service',
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
          'Your operations feature high energy density or automated metering infrastructure. ISO 50001 certification grants full statutory exemption from costly UK ESOS Phase 3 energy audits.',
        consequenceIfSkipped:
          'Mandatory separate UK ESOS Phase 3 audit filings with external assessors and potential £50,000 Environment Agency non-compliance penalties.',
        enforcementBody: 'Environment Agency (UK) & Accredited Registrars',
        estimatedEffort: ComplianceEffort.HIGH,
      });
    }

    // 8. Social Value Act & Fair Work Job Verification
    const intent = input.assuranceIntent || 'DUAL';
    if (
      intent === 'JOB' ||
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

    // Derive effective service lines from new field, falling back to legacy assuranceIntent
    const selectedLines: string[] = input.serviceLines ?? [];
    const legacyIntent = input.assuranceIntent || 'DUAL';
    const wantsGhg = selectedLines.includes('GHG') || legacyIntent === 'CARBON' || legacyIntent === 'DUAL' || selectedLines.length === 0;
    const wantsCarbon = selectedLines.includes('CARBON') || legacyIntent === 'CARBON' || legacyIntent === 'DUAL' || selectedLines.length === 0;
    const wantsJob = selectedLines.includes('JOB') || legacyIntent === 'JOB' || legacyIntent === 'DUAL' || selectedLines.length === 0;

    const filteredList = list.filter((item) => {
      if (item.workflowType === WorkflowType.GHG) return wantsGhg;
      if (item.workflowType === WorkflowType.CARBON) return wantsCarbon;
      if (item.workflowType === WorkflowType.JOB) return wantsJob;
      return true;
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

export class AssessmentService {
  private readonly checklistService: PreparationChecklistService;

  constructor(private readonly prisma: PrismaClient) {
    this.checklistService = new PreparationChecklistService(prisma);
  }

  /**
   * Submits intake assessment, generates tailored recommendations, initiates checklists,
   * and updates user and licensee onboarding state in one clean transaction.
   */
  async submitAssessment(
    licenseeId: string,
    input: IntakeAssessmentInput,
    userId?: string
  ): Promise<{
    assessment: ClientAssessment;
    recommendations: (ComplianceRecommendation & {
      checklist: { id: string; totalItems: number; completedItems: number; isReadyToIngest: boolean } | null;
    })[];
  }> {
    // 1. Calculate recommendations deterministically
    const computedRecommendations = AssessmentDecisionEngine.evaluate(input);

    return this.prisma.$transaction(async (tx) => {
      // 2. Remove any previous assessment records for a fresh slate
      await tx.clientAssessment.deleteMany({
        where: { licenseeId },
      });

      // 3. Create ClientAssessment
      const assessment = await tx.clientAssessment.create({
        data: {
          licenseeId,
          organisationCountry: input.organisationCountry.trim().toUpperCase().slice(0, 2),
          organisationSize: input.organisationSize,
          annualRevenueBand: input.annualRevenueBand,
          industrySector: input.industrySector,
          hasPhysicalSites: input.hasPhysicalSites ?? false,
          hasProductionProcess: input.hasProductionProcess ?? false,
          hasFleet: input.hasFleet ?? false,
          hasIoTMeters: input.hasIoTMeters ?? false,
          isUKPublicContractor: input.isUKPublicContractor ?? false,
          hasPlanningConsent: input.hasPlanningConsent ?? false,
          makesPublicGreenClaims: input.makesPublicGreenClaims ?? false,
          hasGreenHydrogen: input.hasGreenHydrogen ?? false,
          serviceLinesRequested: (input.serviceLines as any) ?? [],
          completedAt: new Date(),
        },
      });

      // 4. Create ComplianceRecommendations
      const createdRecommendations: ComplianceRecommendation[] = [];
      for (const rec of computedRecommendations) {
        const created = await tx.complianceRecommendation.create({
          data: {
            assessmentId: assessment.id,
            licenseeId,
            frameworkCode: rec.frameworkCode,
            frameworkName: rec.frameworkName,
            workflowType: rec.workflowType,
            isLegallyMandatory: rec.isLegallyMandatory,
            plainEnglishWhy: rec.plainEnglishWhy,
            consequenceIfSkipped: rec.consequenceIfSkipped,
            enforcementBody: rec.enforcementBody,
            estimatedEffort: rec.estimatedEffort,
            clientAccepted: true, // Default to accepted
            clientReviewedAt: new Date(),
            displayOrder: rec.displayOrder,
          },
        });
        createdRecommendations.push(created);
      }

      // 5. Update Licensee state
      await tx.licensee.update({
        where: { id: licenseeId },
        data: {
          hasCompletedAssessment: true,
          organisationCountry: input.organisationCountry.trim().toUpperCase().slice(0, 2),
          industrySector: input.industrySector,
        },
      });

      // 5b. Create ServiceEntitlement records (PENDING) for each selected service line
      const selectedLines: ('GHG' | 'CARBON' | 'JOB' | 'MERCH')[] =
        (input.serviceLines as any) ??
        (input.assuranceIntent === 'CARBON' ? ['GHG', 'CARBON'] :
         input.assuranceIntent === 'JOB' ? ['JOB'] :
         ['GHG', 'CARBON', 'JOB']); // DUAL default

      for (const line of selectedLines) {
        await tx.serviceEntitlement.upsert({
          where: { licenseeId_serviceLine: { licenseeId, serviceLine: line as any } },
          update: { status: 'PENDING', updatedAt: new Date() },
          create: {
            licenseeId,
            serviceLine: line as any,
            status: 'PENDING',
          },
        });
      }

      // 6. Update PortalUser onboarding state if userId is provided
      if (userId) {
        await tx.portalUser.update({
          where: { id: userId },
          data: {
            isOnboardingComplete: true,
            onboardingCompletedAt: new Date(),
          },
        });
      }

      return { assessment, createdRecommendations };
    }).then(async ({ assessment, createdRecommendations }) => {
      // 7. Outside main TX: Initialize preparation checklists for accepted recommendations
      for (const rec of createdRecommendations) {
        await this.checklistService.createChecklistForRecommendation(
          rec.id,
          licenseeId,
          rec.frameworkCode
        );
      }

      // 8. Fetch complete recommendation hierarchy
      const recommendations = await this.prisma.complianceRecommendation.findMany({
        where: { assessmentId: assessment.id },
        include: {
          checklist: {
            select: {
              id: true,
              totalItems: true,
              completedItems: true,
              isReadyToIngest: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      return { assessment, recommendations };
    });
  }

  /**
   * Retrieves the current intake assessment and recommendations for a licensee.
   */
  async getAssessment(licenseeId: string) {
    const assessment = await this.prisma.clientAssessment.findFirst({
      where: { licenseeId },
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

    return assessment;
  }

  /**
   * Activates an additional compliance pipeline (e.g. adding Job Auditing to an existing Carbon licensee).
   */
  async activatePipeline(licenseeId: string, pipeline: 'CARBON' | 'JOB' | 'DUAL' | 'GHG'): Promise<any> {
    const existingAssessment = await this.prisma.clientAssessment.findFirst({
      where: { licenseeId },
      orderBy: { createdAt: 'desc' },
    });

    // Map legacy pipeline string to ServiceLine array
    const newLines: ('GHG' | 'CARBON' | 'JOB')[] =
      pipeline === 'GHG'    ? ['GHG'] :
      pipeline === 'CARBON' ? ['GHG', 'CARBON'] :
      pipeline === 'JOB'    ? ['JOB'] :
                              ['GHG', 'CARBON', 'JOB']; // DUAL

    // Upsert ServiceEntitlement records
    for (const line of newLines) {
      await this.prisma.serviceEntitlement.upsert({
        where: { licenseeId_serviceLine: { licenseeId, serviceLine: line as any } },
        update: { status: 'PENDING', updatedAt: new Date() },
        create: { licenseeId, serviceLine: line as any, status: 'PENDING' },
      });
    }

    if (!existingAssessment) {
      return { success: true, serviceLines: newLines };
    }

    // Evaluate with new service lines
    const updatedInput: IntakeAssessmentInput = {
      organisationCountry: existingAssessment.organisationCountry,
      organisationSize: existingAssessment.organisationSize,
      annualRevenueBand: existingAssessment.annualRevenueBand,
      industrySector: existingAssessment.industrySector,
      hasPhysicalSites: existingAssessment.hasPhysicalSites,
      hasProductionProcess: existingAssessment.hasProductionProcess,
      hasFleet: existingAssessment.hasFleet,
      hasIoTMeters: existingAssessment.hasIoTMeters,
      isUKPublicContractor: existingAssessment.isUKPublicContractor,
      hasPlanningConsent: existingAssessment.hasPlanningConsent,
      makesPublicGreenClaims: existingAssessment.makesPublicGreenClaims,
      hasGreenHydrogen: existingAssessment.hasGreenHydrogen,
      serviceLines: newLines,
    };

    const computed = AssessmentDecisionEngine.evaluate(updatedInput);

    // Existing recommendations
    const existingRecs = await this.prisma.complianceRecommendation.findMany({
      where: { assessmentId: existingAssessment.id },
    });
    const existingCodes = new Set(existingRecs.map((r) => r.frameworkCode));

    // Provision any newly matching recommendations
    for (const rec of computed) {
      if (!existingCodes.has(rec.frameworkCode)) {
        const created = await this.prisma.complianceRecommendation.create({
          data: {
            assessmentId: existingAssessment.id,
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
            displayOrder: rec.displayOrder,
          },
        });
        await this.checklistService.createChecklistForRecommendation(
          created.id,
          licenseeId,
          rec.frameworkCode
        );
      }
    }

    await this.prisma.clientAssessment.update({
      where: { id: existingAssessment.id },
      data: { serviceLinesRequested: newLines as any },
    });

    return this.getAssessment(licenseeId);
  }

  /**
   * Retrieves recommendations for a licensee.
   */
  async getRecommendations(licenseeId: string) {
    return this.prisma.complianceRecommendation.findMany({
      where: { licenseeId },
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
    const licensees = await this.prisma.licensee.findMany({
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
    });

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
        primaryContact: lic.portalUsers[0] || null,
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
