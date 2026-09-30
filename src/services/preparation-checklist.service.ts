import {
  PrismaClient,
  ChecklistItemDataType,
  ChecklistItemStatus,
  PreparationChecklist,
  PreparationChecklistItem,
} from '@prisma/client';

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

  UK_PPN_0621: [
    {
      itemCode: 'PPN_BASELINE_YEAR',
      plainEnglishLabel: 'Historical baseline year definition and emissions baseline',
      plainEnglishGuidance: 'Confirm your baseline financial year and total tCO2e baseline figure across Scope 1, Scope 2, and mandated Scope 3 categories.',
      isoClauseReference: 'Cabinet Office PPN 06/21 Technical Guidance Section 2.1',
      dataType: ChecklistItemDataType.FREE_TEXT,
      isMandatory: true,
    },
    {
      itemCode: 'PPN_NET_ZERO_TARGET',
      plainEnglishLabel: 'Director-signed Net Zero commitment statement',
      plainEnglishGuidance: 'Upload a signed board resolution or policy statement confirming the organization commitment to achieve Net Zero by 2050 or earlier.',
      isoClauseReference: 'PPN 06/21 Section 3 Target Commitment',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'PPN_SCOPE3_CATEGORIES',
      plainEnglishLabel: 'Required Scope 3 activity records (commuting, travel, waste, freight)',
      plainEnglishGuidance: 'Provide activity logs or calculations for the 5 mandated Scope 3 subsets: Business Travel, Employee Commuting, Upstream Transportation, Downstream Transportation, and Waste.',
      isoClauseReference: 'PPN 06/21 Scope 3 Five Subsets Standard',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
  ],

  UK_SECTION_106: [
    {
      itemCode: 'S106_PLANNING_AGREEMENT',
      plainEnglishLabel: 'Executed Section 106 legal agreement with Local Planning Authority',
      plainEnglishGuidance: 'Upload the planning obligation agreement containing specific carbon offset payments or local workforce hire quotas.',
      isoClauseReference: 'Town and Country Planning Act 1990 Section 106',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'S106_LOCAL_LABOUR_EVIDENCE',
      plainEnglishLabel: 'Local workforce postcode verification and payroll extract',
      plainEnglishGuidance: 'Provide an anonymized payroll or subcontractor headcount log confirming local resident employment targets have been achieved.',
      isoClauseReference: 'Section 106 Local Employment and Training Strategy',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'S106_ENERGY_STRATEGY',
      plainEnglishLabel: 'As-built energy strategy & carbon shortfall offset confirmation',
      plainEnglishGuidance: 'Upload the accredited energy assessor sign-off or carbon offset tariff receipt submitted to building control.',
      isoClauseReference: 'Local Plan Sustainable Design and Construction Policy',
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

  GREEN_HYDROGEN_CERTIFHY: [
    {
      itemCode: 'H2_RENEWABLE_POWER_PPA',
      plainEnglishLabel: 'Renewable Power Purchase Agreement (PPA) and Guarantees of Origin',
      plainEnglishGuidance: 'Provide PPA documentation and REGO / GoO registry certificates verifying hourly or monthly temporal correlation to renewable power generation.',
      isoClauseReference: 'UK Low Carbon Hydrogen Standard Criterion 1 / EU RED II Art 27',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'H2_PRODUCTION_METER_LOGS',
      plainEnglishLabel: 'Continuous fiscal meter logs for electricity input and hydrogen output',
      plainEnglishGuidance: 'Enter or upload fiscal telemetry data showing gross kWh consumed and net kg of pure hydrogen produced with meter calibration certificates.',
      isoClauseReference: 'ISO 19880 / CertifHy Mass Balance Methodology',
      dataType: ChecklistItemDataType.DOCUMENT_UPLOAD,
      isMandatory: true,
    },
    {
      itemCode: 'H2_WATER_FEED_PURITY',
      plainEnglishLabel: 'Electrolyser feed water consumption and demineralisation log',
      plainEnglishGuidance: 'Provide water consumption volumes and conductivity calibration records for the electrolysis stack.',
      isoClauseReference: 'DESNZ LCHS Scope 1 and 2 Balance Boundary',
      dataType: ChecklistItemDataType.NUMERIC_READING,
      isMandatory: false,
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

    const templates = FRAMEWORK_CHECKLIST_TEMPLATES[frameworkCode] || FRAMEWORK_CHECKLIST_TEMPLATES.ISO_14064_1;

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

      const fullChecklist = await tx.preparationChecklist.findUniqueOrThrow({
        where: { id: checklist.id },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });

      return fullChecklist;
    });
  }

  /**
   * Retrieves all preparation checklists for a licensee with framework details.
   */
  async getChecklistsForLicensee(licenseeId: string) {
    return this.prisma.preparationChecklist.findMany({
      where: { licenseeId },
      include: {
        recommendation: true,
        items: {
          orderBy: [{ isMandatory: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single checklist by ID with its parent recommendation.
   */
  async getChecklistById(checklistId: string, licenseeId?: string) {
    const whereClause: any = { id: checklistId };
    if (licenseeId) {
      whereClause.licenseeId = licenseeId;
    }

    return this.prisma.preparationChecklist.findFirst({
      where: whereClause,
      include: {
        recommendation: true,
        items: {
          orderBy: [{ isMandatory: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
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

    return updated;
  }
}
