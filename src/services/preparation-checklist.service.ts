import {
  PrismaClient,
  ChecklistItemDataType,
  ChecklistItemStatus,
  PreparationChecklist,
  PreparationChecklistItem,
} from '@prisma/client';
import { currentVersionInclude } from './framework-version.service';

export interface ChecklistItemTemplate {
  itemCode: string;
  plainEnglishLabel: string;
  plainEnglishGuidance: string;
  isoClauseReference: string;
  dataType: ChecklistItemDataType;
  isMandatory: boolean;
}

export const FRAMEWORK_CHECKLIST_TEMPLATES: Record<string, ChecklistItemTemplate[]> = {
  UK_SECR: [
    {
      itemCode: 'SECR_ELECTRICITY_USAGE',
      plainEnglishLabel: 'Electricity utility bills or supplier statements (last 12 months)',
      plainEnglishGuidance: 'Provide annual statements or 12 monthly electricity bills for all UK operational sites. Enter total kWh or upload supplier summary.',
      isoClauseReference: 'Companies Act 2006 (2019 Regulations) / SECR Para 15 Scope 2',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'SECR_GAS_COMBUSTION',
      plainEnglishLabel: 'Natural gas and heating fuel consumption (last 12 months)',
      plainEnglishGuidance: 'Provide invoices or meter readings for gas combusted in company boilers, heaters, or process equipment.',
      isoClauseReference: 'SECR Scope 1 Stationary Combustion',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'SECR_FLEET_FUEL',
      plainEnglishLabel: 'Company fleet fuel receipts or business mileage logs',
      plainEnglishGuidance: 'Provide fuel expense receipts or business travel mileage logs for all commercial vehicles, company vans, and fleet cars.',
      isoClauseReference: 'SECR Scope 1 Mobile Combustion',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: false,
    },
    {
      itemCode: 'SECR_INTENSITY_METRIC',
      plainEnglishLabel: 'Financial turnover and average employee headcount',
      plainEnglishGuidance: 'Enter your official UK annual turnover in GBP (£) and average full-time employee headcount for the statutory intensity calculation.',
      isoClauseReference: 'SECR Mandatory Intensity Ratio Metric',
      dataType: ChecklistItemDataType.FREE_TEXT,
      isMandatory: true,
    },
    {
      itemCode: 'SECR_ENERGY_EFFICIENCY_NARRATIVE',
      plainEnglishLabel: 'Summary of energy efficiency actions taken this reporting year',
      plainEnglishGuidance: 'A concise paragraph describing energy saving initiatives implemented (e.g. LED retrofitting, insulation, heat pumps, driver training).',
      isoClauseReference: 'SECR Section 19 Narrative Statement',
      dataType: ChecklistItemDataType.FREE_TEXT,
      isMandatory: true,
    },
  ],

  UK_PPN_006: [
    {
      itemCode: 'PPN_BASELINE_YEAR',
      plainEnglishLabel: 'Historical baseline year definition and emissions baseline',
      plainEnglishGuidance: 'Confirm your baseline financial year and total tCO2e baseline figure across Scope 1, Scope 2, and mandated Scope 3 categories.',
      isoClauseReference: 'Cabinet Office PPN 006 Technical Guidance Section 2.1',
      dataType: ChecklistItemDataType.FREE_TEXT,
      isMandatory: true,
    },
    {
      itemCode: 'PPN_NET_ZERO_TARGET',
      plainEnglishLabel: 'Board-signed Net Zero commitment statement',
      plainEnglishGuidance: 'Upload a signed board resolution or policy statement confirming the organisation commitment to achieve Net Zero by 2050 or earlier. Must be published on your company website.',
      isoClauseReference: 'PPN 006 Section 3 Target Commitment',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'PPN_WEBSITE_PUBLICATION',
      plainEnglishLabel: 'Live website URL where Carbon Reduction Plan is publicly published',
      plainEnglishGuidance: 'Provide the URL of the webpage where your Carbon Reduction Plan is published. It must be publicly accessible without login. Contracting authorities will verify this.',
      isoClauseReference: 'PPN 006 Publication Requirement',
      dataType: ChecklistItemDataType.FREE_TEXT,
      isMandatory: true,
    },
    {
      itemCode: 'PPN_SCOPE3_CATEGORIES',
      plainEnglishLabel: 'Required Scope 3 activity records (commuting, travel, waste, freight)',
      plainEnglishGuidance: 'Provide activity logs or calculations for the five mandated Scope 3 subsets: Business Travel, Employee Commuting, Upstream Transportation, Downstream Transportation, and Waste.',
      isoClauseReference: 'PPN 006 Scope 3 Five Subsets Standard',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
  ],

  UK_SECTION_106: [
    {
      itemCode: 'S106_PLANNING_AGREEMENT',
      plainEnglishLabel: 'Executed Section 106 legal agreement with Local Planning Authority',
      plainEnglishGuidance: 'Upload the executed planning obligation agreement setting out the specific local workforce hire quotas, apprenticeship commitments, and training obligations you must meet.',
      isoClauseReference: 'Town and Country Planning Act 1990 Section 106',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'S106_LOCAL_LABOUR_EVIDENCE',
      plainEnglishLabel: 'Local workforce postcode verification and payroll extract',
      plainEnglishGuidance: 'Provide an anonymised payroll or subcontractor headcount log confirming local resident employment targets have been achieved. Home postcode district (not full address) is sufficient.',
      isoClauseReference: 'Section 106 Local Employment and Training Strategy',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'S106_APPRENTICESHIP_EVIDENCE',
      plainEnglishLabel: 'Apprenticeship agreements and training qualification records',
      plainEnglishGuidance: 'Upload signed apprenticeship agreements, Apprenticeship Service commitment statements, and training completion certificates (e.g. CSCS for construction).',
      isoClauseReference: 'Section 106 Skills and Training Covenant',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: false,
    },
    {
      itemCode: 'S106_MONITORING_REPORT',
      plainEnglishLabel: 'LPA monthly local labour monitoring return',
      plainEnglishGuidance: 'Provide the completed LPA monitoring return showing start date, contract type, hours worked, and home postcode district for each worker during the reporting period.',
      isoClauseReference: 'Section 106 Monitoring and Reporting Obligation',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
  ],

  UK_GREEN_CLAIMS_CODE: [
    {
      itemCode: 'CMA_CLAIM_REGISTER',
      plainEnglishLabel: 'Inventory of public environmental and net zero claims',
      plainEnglishGuidance: 'List every public green claim made on marketing collateral, packaging, your website, or press releases (e.g. "Carbon Neutral Deliveries", "Zero Carbon Facility").',
      isoClauseReference: 'CMA Green Claims Code Principle 1 (Accuracy)',
      dataType: ChecklistItemDataType.FREE_TEXT,
      isMandatory: true,
    },
    {
      itemCode: 'CMA_PRIMARY_DATA_SUBSTANTIATION',
      plainEnglishLabel: 'Primary calculation dossier backing public claims',
      plainEnglishGuidance: 'Upload raw utility bills, fuel records, or primary telemetry data proving that claims reflect measured reality rather than industry averages.',
      isoClauseReference: 'CMA Principle 2 (Substantiation via Primary Evidence)',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'CMA_OFFSET_CREDENTIALS',
      plainEnglishLabel: 'Carbon offset retirement certificates (if using offsets)',
      plainEnglishGuidance: 'If claims rely on carbon offsets, upload registry retirement serial numbers from Verra VCS, Gold Standard, or UK Woodland Carbon Code.',
      isoClauseReference: 'CMA Principle 5 & ASA Climate Advertising Guidance',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: false,
    },
  ],

  UK_LCHS: [
    {
      itemCode: 'H2_RENEWABLE_POWER_PPA',
      plainEnglishLabel: 'Renewable Power Purchase Agreement (PPA) and Guarantees of Origin (REGO / GoO)',
      plainEnglishGuidance: 'Provide PPA documentation and REGO or GoO registry certificates verifying hourly or monthly temporal correlation to renewable power generation, as required by the LCHS additionality criterion.',
      isoClauseReference: 'UK Low Carbon Hydrogen Standard (LCHS) Criterion 1 / DESNZ Guidance 2024',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'H2_PRODUCTION_METER_LOGS',
      plainEnglishLabel: 'Continuous fiscal meter logs for electricity input and hydrogen output',
      plainEnglishGuidance: 'Enter or upload fiscal telemetry data showing gross kWh consumed and net kg of pure hydrogen produced, with active meter calibration certificates. Data must cover the full LCHS reporting period.',
      isoClauseReference: 'DESNZ LCHS Metering and Monitoring Requirements / ISO 19880-1',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'H2_WATER_FEED_PURITY',
      plainEnglishLabel: 'Electrolyser feed water consumption and demineralisation log',
      plainEnglishGuidance: 'Provide water consumption volumes and conductivity calibration records for the electrolysis stack across the reporting period.',
      isoClauseReference: 'DESNZ LCHS Scope 1 and 2 Balance Boundary',
      dataType: ChecklistItemDataType.NUMERIC_READING,
      isMandatory: false,
    },
    {
      itemCode: 'H2_LIFECYCLE_GHG_CALC',
      plainEnglishLabel: 'Well-to-gate lifecycle GHG intensity calculation (target: below 20g CO2e/MJ)',
      plainEnglishGuidance: 'Submit your completed well-to-gate GHG intensity calculation using the DESNZ LCHS methodology spreadsheet. The result must be below 20g CO2e/MJ H2 (LHV) to qualify.',
      isoClauseReference: 'DESNZ LCHS GHG Intensity Threshold / ISO 14067 Adaptation',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
  ],

  ISO_14064_1: [
    {
      itemCode: 'ISO14064_BOUNDARY_STATEMENT',
      plainEnglishLabel: 'Organizational boundary and consolidation approach statement',
      plainEnglishGuidance: 'Specify whether your inventory follows operational control, financial control, or equity share, with a list of all included operating entities and facilities.',
      isoClauseReference: 'ISO 14064-1:2018 Clause 5.1 & 5.2',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'ISO14064_SCOPE1_DATA',
      plainEnglishLabel: 'Direct Scope 1 combustion and refrigerant gas records',
      plainEnglishGuidance: 'Upload gas/fuel invoices for heating and generators, plus F-gas equipment maintenance logs documenting any refrigerant top-ups.',
      isoClauseReference: 'ISO 14064-1:2018 Clause 6.1 (Direct Emissions)',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'ISO14064_SCOPE2_DATA',
      plainEnglishLabel: 'Scope 2 electricity consumption statements (all facilities)',
      plainEnglishGuidance: 'Provide electricity invoices for all physical facilities under operational control during the 12-month reporting period.',
      isoClauseReference: 'ISO 14064-1:2018 Clause 6.2 (Energy Indirect)',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'ISO14064_UNCERTAINTY_ASSESSMENT',
      plainEnglishLabel: 'Meter calibration status confirmation',
      plainEnglishGuidance: 'Confirm that energy meters and measurement devices used for billing have been calibrated in line with statutory or manufacturer requirements.',
      isoClauseReference: 'ISO 14064-1:2018 Clause 8.3 (Uncertainty & Calibration)',
      dataType: ChecklistItemDataType.YES_NO,
      isMandatory: false,
    },
  ],

  ISO_50001: [
    {
      itemCode: 'ISO50001_ENERGY_POLICY',
      plainEnglishLabel: 'Board-approved Corporate Energy Policy',
      plainEnglishGuidance: 'Upload your executive-signed policy committing the organization to continuous energy performance improvement and resources.',
      isoClauseReference: 'ISO 50001:2018 Clause 5.2',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'ISO50001_SEU_REGISTER',
      plainEnglishLabel: 'Significant Energy Uses (SEUs) and Energy Baseline register',
      plainEnglishGuidance: 'Upload documentation identifying your major energy-consuming equipment (chillers, boilers, production lines, server halls) and baseline performance figures.',
      isoClauseReference: 'ISO 50001:2018 Clause 6.3 & 6.5',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'ISO50001_METER_CALIBRATION',
      plainEnglishLabel: 'Sub-meter calibration and maintenance certificates',
      plainEnglishGuidance: 'Provide calibration certificates or manufacturer maintenance records for main sub-meters measuring SEU consumption.',
      isoClauseReference: 'ISO 50001:2018 Clause 6.6',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: false,
    },
  ],

  SOCIAL_VALUE_JOBS: [
    {
      itemCode: 'SV_LOCAL_PAYROLL',
      plainEnglishLabel: 'Real Living Wage and local workforce payroll summary',
      plainEnglishGuidance: 'Upload an anonymized payroll statement confirming Real Living Wage compliance and percentage of staff hired from the local economic area.',
      isoClauseReference: 'Public Services (Social Value) Act 2012 / PPN 06/20 Theme 2',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'SV_TRAINING_APPRENTICESHIPS',
      plainEnglishLabel: 'Apprenticeship and vocational skills training agreements',
      plainEnglishGuidance: 'Provide evidence of completed apprenticeship hours or formal recognized vocational training programs delivered during the year.',
      isoClauseReference: 'Social Value Model MAC 2.1 Skills & Employment',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
  ],
};

export class PreparationChecklistService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Provisions a PreparationChecklist and its individual items for an accepted recommendation.
   * Template source priority:
   *   1. WorkflowFramework.questions from the DB registry (seeded via prisma/seeds/framework-seed.ts)
   *   2. FRAMEWORK_CHECKLIST_TEMPLATES TypeScript fallback (legacy / non-DB frameworks)
   */
  async createChecklistForRecommendation(
    recommendationId: string,
    licenseeId: string,
    frameworkCode: string
  ): Promise<PreparationChecklist & { items: PreparationChecklistItem[] }> {
    const existing = await this.prisma.preparationChecklist.findUnique({
      where: { recommendationId },
      include: { items: true },
    });

    if (existing) {
      return existing;
    }

    // ── 1. Resolve templates from DB registry ────────────────────────────────
    const registered = await this.prisma.workflowFramework.findFirst({
      where: { code: frameworkCode },
      include: { versions: currentVersionInclude() },
    });
    // Checklist items come from the questions of the framework's current version.
    const dbFramework = registered?.versions[0] ? { questions: registered.versions[0].questions } : null;

    // ── 2. Build ChecklistItemTemplate[] from DB or TS fallback ──────────────
    let templates: ChecklistItemTemplate[];

    if (dbFramework && dbFramework.questions.length > 0) {
      // Map WorkflowQuestion → ChecklistItemTemplate
      templates = dbFramework.questions.map((q) => ({
        itemCode: q.id,
        plainEnglishLabel: q.text,
        plainEnglishGuidance: q.guidanceNotes || '',
        isoClauseReference: q.isoClauseReference,
        dataType: q.evidenceRequired
          ? ChecklistItemDataType.DOCUMENT_UPLOAD
          : ChecklistItemDataType.FREE_TEXT,
        isMandatory: q.evidenceRequired,
      }));
    } else {
      // Fallback: TypeScript in-memory templates (used until framework is seeded)
      templates = FRAMEWORK_CHECKLIST_TEMPLATES[frameworkCode] || FRAMEWORK_CHECKLIST_TEMPLATES.ISO_14064_1;
      if (!FRAMEWORK_CHECKLIST_TEMPLATES[frameworkCode]) {
        console.warn(`[CHECKLIST] No DB or TS template found for frameworkCode="${frameworkCode}". Using ISO_14064_1 default.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const checklist = await tx.preparationChecklist.create({
        data: {
          recommendationId,
          licenseeId,
          totalItems: templates.length,
          completedItems: 0,
          isReadyToIngest: false,
        },
      });

      await tx.preparationChecklistItem.createMany({
        data: templates.map((t) => ({
          checklistId: checklist.id,
          itemCode: t.itemCode,
          plainEnglishLabel: t.plainEnglishLabel,
          plainEnglishGuidance: t.plainEnglishGuidance,
          isoClauseReference: t.isoClauseReference,
          dataType: t.dataType,
          isMandatory: t.isMandatory,
          status: ChecklistItemStatus.NOT_STARTED,
        })),
      });

      return tx.preparationChecklist.findUniqueOrThrow({
        where: { id: checklist.id },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
    });
  }

  /**
   * Helper to populate linked AuditEvidenceDocument data for checklist items.
   */
  private async attachEvidenceDocuments<T extends { items: any[] }>(checklist: T): Promise<T> {
    const docIds = checklist.items
      .map((i: any) => i.linkedEvidenceDocId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (docIds.length === 0) return checklist;

    const docs = await this.prisma.auditEvidenceDocument.findMany({
      where: { id: { in: docIds } },
      select: { id: true, fileName: true, fileUrl: true, fileSizeBytes: true, sha256Hash: true, createdAt: true },
    });
    const map = new Map(docs.map((d) => [d.id, d]));
    return {
      ...checklist,
      items: checklist.items.map((i: any) => ({
        ...i,
        linkedEvidenceDoc: i.linkedEvidenceDocId ? map.get(i.linkedEvidenceDocId) || null : null,
      })),
    };
  }

  private async attachEvidenceDocumentsList<T extends { items: any[] }>(checklists: T[]): Promise<T[]> {
    const docIds = checklists
      .flatMap((c) => c.items.map((i: any) => i.linkedEvidenceDocId))
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (docIds.length === 0) return checklists;

    const docs = await this.prisma.auditEvidenceDocument.findMany({
      where: { id: { in: docIds } },
      select: { id: true, fileName: true, fileUrl: true, fileSizeBytes: true, sha256Hash: true, createdAt: true },
    });
    const map = new Map(docs.map((d) => [d.id, d]));
    return checklists.map((c) => ({
      ...c,
      items: c.items.map((i: any) => ({
        ...i,
        linkedEvidenceDoc: i.linkedEvidenceDocId ? map.get(i.linkedEvidenceDocId) || null : null,
      })),
    }));
  }

  /**
   * Retrieves all preparation checklists for a licensee with framework details.
   */
  async getChecklistsForLicensee(licenseeId: string) {
    let lists = await this.prisma.preparationChecklist.findMany({
      where: currentChecklistWhere(licenseeId),
      include: {
        recommendation: true,
        items: {
          orderBy: [{ isMandatory: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lists.length === 0) {
      const recs = await this.prisma.complianceRecommendation.findMany({
        where: currentRecommendationWhere(licenseeId),
      });
      if (recs.length > 0) {
        for (const rec of recs) {
          try {
            await this.createChecklistForRecommendation(rec.id, licenseeId, rec.frameworkCode);
          } catch (err) {
            console.error('[AUTO-PROVISION CHECKLIST ERROR]', err);
          }
        }
        lists = await this.prisma.preparationChecklist.findMany({
          where: currentChecklistWhere(licenseeId),
          include: {
            recommendation: true,
            items: {
              orderBy: [{ isMandatory: 'desc' }, { createdAt: 'asc' }],
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    return this.attachEvidenceDocumentsList(lists);
  }

  /**
   * Retrieves a single checklist by ID with its parent recommendation.
   */
  async getChecklistById(checklistId: string, licenseeId?: string) {
    const whereClause: any = { id: checklistId };
    if (licenseeId) {
      whereClause.licenseeId = licenseeId;
    }

    const checklist = await this.prisma.preparationChecklist.findFirst({
      where: whereClause,
      include: {
        recommendation: true,
        items: {
          orderBy: [{ isMandatory: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!checklist) return null;
    return this.attachEvidenceDocuments(checklist);
  }

  /**
   * Client updates a checklist item (submits numeric data, links document, or marks done).
   */
  async updateItemStatus(
    itemId: string,
    licenseeId: string,
    updates: {
      status: ChecklistItemStatus;
      linkedEvidenceDocId?: string;
    }
  ) {
    const item = await this.prisma.preparationChecklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: true },
    });

    if (!item) {
      throw new Error('Checklist item not found');
    }

    if (item.checklist.licenseeId !== licenseeId) {
      throw new Error('Unauthorized to update item for another licensee');
    }

    const completedAt = updates.status === ChecklistItemStatus.COMPLETE ? new Date() : null;

    await this.prisma.preparationChecklistItem.update({
      where: { id: itemId },
      data: {
        status: updates.status,
        linkedEvidenceDocId: updates.linkedEvidenceDocId !== undefined ? updates.linkedEvidenceDocId : item.linkedEvidenceDocId,
        completedAt,
      },
    });

    // Recompute checklist totals and readiness
    return this.recalculateChecklistReadiness(item.checklistId);
  }

  /**
   * Admin-only: Waive a checklist item with a stated reason.
   */
  async waiveItem(itemId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new Error('A waiver reason is required for audit trail transparency');
    }

    const item = await this.prisma.preparationChecklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: true },
    });

    if (!item) {
      throw new Error('Checklist item not found');
    }

    await this.prisma.preparationChecklistItem.update({
      where: { id: itemId },
      data: {
        status: ChecklistItemStatus.WAIVED,
        waivedReason: reason.trim(),
        completedAt: new Date(),
      },
    });

    return this.recalculateChecklistReadiness(item.checklistId);
  }

  /**
   * Recalculates completed item counts and sets isReadyToIngest when all mandatory items are done/waived.
   */
  async recalculateChecklistReadiness(checklistId: string) {
    const items = await this.prisma.preparationChecklistItem.findMany({
      where: { checklistId },
    });

    const totalItems = items.length;
    const completedItems = items.filter(
      (i) => i.status === ChecklistItemStatus.COMPLETE || i.status === ChecklistItemStatus.WAIVED
    ).length;

    // Ready to ingest if ALL mandatory items are COMPLETE or WAIVED
    const mandatoryItems = items.filter((i) => i.isMandatory);
    const mandatoryCompleted = mandatoryItems.every(
      (i) => i.status === ChecklistItemStatus.COMPLETE || i.status === ChecklistItemStatus.WAIVED
    );

    const isReadyToIngest = mandatoryItems.length > 0 ? mandatoryCompleted : completedItems > 0;

    const updated = await this.prisma.preparationChecklist.update({
      where: { id: checklistId },
      data: {
        totalItems,
        completedItems,
        isReadyToIngest,
      },
      include: {
        recommendation: true,
        items: {
          orderBy: [{ isMandatory: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    return this.attachEvidenceDocuments(updated);
  }
}
import { currentChecklistWhere, currentRecommendationWhere } from './assessment-scope';
