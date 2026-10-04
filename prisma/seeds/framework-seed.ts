/**
 * framework-seed.ts
 *
 * Seeds the DB-backed framework registry:
 *   WorkflowFramework  - one row per compliance standard
 *   WorkflowQuestion   - one row per question per standard
 *
 *   WorkflowFrameworkVersion - one row per published edition; questions belong to a version
 *
 * Safe to rerun: an unchanged published version is left as it is, and a changed one stops the seed.
 * Covers all four service pipelines: GHG | CARBON | JOB | (MERCH uses GHG/CARBON)
 *
 * WorkflowType mapping:
 *   GHG    → UK_SECR, ISO_14064_1, ISO_50001
 *   CARBON → UK_PPN_006, UK_GREEN_CLAIMS_CODE, UK_LCHS
 *   JOB    → UK_SECTION_106, SOCIAL_VALUE_JOBS
 */

import { PrismaClient, WorkflowType, WorkflowAnswerType } from '@prisma/client';
import { questionSetHash } from '../../src/services/framework-version.service';

export interface FrameworkVersionSeed {
  /** Our version label, e.g. "2026.1". Never reuse a label for different questions. */
  version: string;
  /** The edition of the external standard these questions reflect */
  standardReference: string;
  effectiveFrom: Date;
  changeSummary: string;
}

export interface FrameworkSeedRecord {
  id: string;
  /** The framework's current version. Omitted means the initial version 2026.1. */
  version?: FrameworkVersionSeed;
  workflowType: WorkflowType;
  code: string;
  name: string;
  governingBody: string;
  jurisdiction: string;
  description: string;
  questions: {
    id: string;
    orderIndex: number;
    text: string;
    answerType: WorkflowAnswerType;
    options: string[];
    evidenceRequired: boolean;
    isoClauseReference: string;
    guidanceNotes: string;
  }[];
}

/** The version every framework was first published under; matches the migration backfill. */
function initialVersion(fw: FrameworkSeedRecord): FrameworkVersionSeed {
  return {
    version: '2026.1',
    standardReference: fw.name,
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    changeSummary: 'Initial published version.',
  };
}

export const FRAMEWORK_SEED_DATA: FrameworkSeedRecord[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // GHG PIPELINE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'fwk_uk_secr',
    workflowType: WorkflowType.GHG,
    code: 'UK_SECR',
    name: 'Streamlined Energy and Carbon Reporting (SECR)',
    governingBody: 'UK Department for Energy Security and Net Zero (DESNZ)',
    jurisdiction: 'United Kingdom',
    description: 'Mandatory annual directors-report disclosures of energy use, Scope 1 and 2 emissions, and intensity metrics for qualifying UK enterprises under the Companies Act 2006 (2019 Regulations).',
    questions: [
      {
        id: 'fwk_uk_secr_q1',
        orderIndex: 1,
        text: 'Have you collected your full 12-month electricity utility statements for all UK operational sites?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'Companies Act 2006 (2019 Regulations) / SECR Para 15 Scope 2',
        guidanceNotes: 'Provide annual supplier statements or 12 monthly electricity bills. Enter total kWh or upload a supplier summary.',
      },
      {
        id: 'fwk_uk_secr_q2',
        orderIndex: 2,
        text: 'Have you collected 12-month natural gas and heating fuel consumption records for all sites?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'SECR Scope 1 Stationary Combustion',
        guidanceNotes: 'Provide gas invoices or meter readings for boilers, heaters, and process equipment.',
      },
      {
        id: 'fwk_uk_secr_q3',
        orderIndex: 3,
        text: 'Do you have company fleet fuel receipts or business mileage logs for the reporting period?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: false,
        isoClauseReference: 'SECR Scope 1 Mobile Combustion',
        guidanceNotes: 'Fuel expense receipts or business mileage logs for all commercial vehicles, vans, and fleet cars.',
      },
      {
        id: 'fwk_uk_secr_q4',
        orderIndex: 4,
        text: 'What is your official UK annual turnover (£) and average full-time employee headcount?',
        answerType: WorkflowAnswerType.TEXT,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'SECR Mandatory Intensity Ratio Metric',
        guidanceNotes: 'Required for the statutory intensity calculation (tCO2e per £m turnover or per FTE).',
      },
      {
        id: 'fwk_uk_secr_q5',
        orderIndex: 5,
        text: 'Can you provide a written summary of energy efficiency actions taken this reporting year?',
        answerType: WorkflowAnswerType.TEXT,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'SECR Section 19 Narrative Statement',
        guidanceNotes: 'Describe initiatives (e.g. LED retrofitting, insulation, heat pumps, driver training). Minimum 100 words.',
      },
    ],
  },

  {
    id: 'fwk_iso_14064',
    workflowType: WorkflowType.GHG,
    code: 'ISO_14064_1',
    name: 'Corporate Greenhouse Gas Inventories (ISO 14064-1:2018)',
    governingBody: 'International Organization for Standardization (ISO)',
    jurisdiction: 'Global',
    description: 'Specification with guidance at the organization level for quantification and reporting of greenhouse gas emissions and removals.',
    questions: [
      {
        id: 'fwk_iso14064_q1',
        orderIndex: 1,
        text: 'Has your organization formally documented its consolidation approach (Operational Control, Financial Control, or Equity Share)?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'ISO 14064-1:2018 Clause 5.1 & 5.2',
        guidanceNotes: 'Upload your corporate consolidation charter, boundary register, or legal entity hierarchy chart.',
      },
      {
        id: 'fwk_iso14064_q2',
        orderIndex: 2,
        text: 'Have you collected direct Scope 1 combustion and refrigerant gas records for all sources?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'ISO 14064-1:2018 Clause 6.1 (Direct Emissions)',
        guidanceNotes: 'Gas/fuel invoices for heating and generators plus F-gas equipment maintenance logs documenting refrigerant top-ups.',
      },
      {
        id: 'fwk_iso14064_q3',
        orderIndex: 3,
        text: 'Do you have Scope 2 electricity consumption statements for all facilities under operational control?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'ISO 14064-1:2018 Clause 6.2 (Energy Indirect)',
        guidanceNotes: 'Electricity invoices for all physical facilities during the full 12-month reporting period.',
      },
      {
        id: 'fwk_iso14064_q4',
        orderIndex: 4,
        text: 'Are energy meters and measurement devices used for billing calibrated in line with statutory or manufacturer requirements?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: false,
        isoClauseReference: 'ISO 14064-1:2018 Clause 8.3 (Uncertainty & Calibration)',
        guidanceNotes: 'A simple yes/no confirmation is sufficient; calibration certificates are optional at this stage.',
      },
    ],
  },

  {
    id: 'fwk_iso_50001',
    workflowType: WorkflowType.GHG,
    code: 'ISO_50001',
    name: 'Energy Management Systems (ISO 50001:2018)',
    governingBody: 'International Organization for Standardization (ISO)',
    jurisdiction: 'Global',
    description: 'Requirements for establishing, implementing, maintaining, and improving an energy management system (EnMS) with continuous performance indicators.',
    questions: [
      {
        id: 'fwk_iso50001_q1',
        orderIndex: 1,
        text: 'Does your organisation have a board-approved Corporate Energy Policy?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'ISO 50001:2018 Clause 5.2',
        guidanceNotes: 'Upload your executive-signed policy committing the organisation to continuous energy performance improvement.',
      },
      {
        id: 'fwk_iso50001_q2',
        orderIndex: 2,
        text: 'Have you documented your Significant Energy Uses (SEUs) and established an energy baseline?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'ISO 50001:2018 Clause 6.3 & 6.5',
        guidanceNotes: 'Identify major energy-consuming equipment (chillers, boilers, production lines, server halls) and provide baseline performance figures.',
      },
      {
        id: 'fwk_iso50001_q3',
        orderIndex: 3,
        text: 'Do you have current sub-meter calibration and maintenance certificates for SEU measurement points?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: false,
        isoClauseReference: 'ISO 50001:2018 Clause 6.6',
        guidanceNotes: 'Calibration certificates or manufacturer maintenance records for sub-meters measuring Significant Energy Uses.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CARBON PIPELINE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'fwk_uk_ppn006',
    workflowType: WorkflowType.CARBON,
    code: 'UK_PPN_006',
    name: 'Carbon Reduction Plan (Cabinet Office PPN 006)',
    governingBody: 'Cabinet Office / Crown Commercial Service',
    jurisdiction: 'United Kingdom',
    description: 'Mandatory Carbon Reduction Plan for UK public sector suppliers with contracts over £5m. Requires publication of Scope 1, 2, and five mandated Scope 3 categories with a net zero 2050 commitment.',
    questions: [
      {
        id: 'fwk_ppn006_q1',
        orderIndex: 1,
        text: 'Have you confirmed your baseline financial year and total tCO2e baseline figure across Scope 1, Scope 2, and the five mandated Scope 3 categories?',
        answerType: WorkflowAnswerType.TEXT,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'Cabinet Office PPN 006 Technical Guidance Section 2.1',
        guidanceNotes: 'The five mandated Scope 3 subsets are: Business Travel, Employee Commuting, Upstream Transportation, Downstream Transportation, and Waste Generated in Operations.',
      },
      {
        id: 'fwk_ppn006_q2',
        orderIndex: 2,
        text: 'Do you have a board-signed Net Zero commitment statement ready for upload?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'PPN 006 Section 3 Target Commitment',
        guidanceNotes: 'A signed board resolution or policy statement confirming Net Zero by 2050 or earlier. Must be published on the company website.',
      },
      {
        id: 'fwk_ppn006_q3',
        orderIndex: 3,
        text: 'What is the live website URL where your Carbon Reduction Plan is publicly published?',
        answerType: WorkflowAnswerType.TEXT,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'PPN 006 Publication Requirement',
        guidanceNotes: 'Must be publicly accessible without login. Contracting authorities verify this before award.',
      },
      {
        id: 'fwk_ppn006_q4',
        orderIndex: 4,
        text: 'Have you collected activity records for all five mandated Scope 3 categories?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'PPN 006 Scope 3 Five Subsets Standard',
        guidanceNotes: 'Activity logs or calculations for Business Travel, Commuting, Upstream/Downstream Transport, and Waste.',
      },
    ],
  },

  {
    id: 'fwk_uk_green_claims',
    workflowType: WorkflowType.CARBON,
    code: 'UK_GREEN_CLAIMS_CODE',
    name: 'CMA Green Claims Code & DMCC Act 2024',
    governingBody: 'UK Competition and Markets Authority (CMA)',
    jurisdiction: 'United Kingdom',
    description: 'Statutory consumer protection framework prohibiting deceptive environmental marketing and unverified net zero claims. Enforced under the Consumer Protection from Unfair Trading Regulations 2008 and the DMCC Act 2024.',
    questions: [
      {
        id: 'fwk_greenclaims_q1',
        orderIndex: 1,
        text: 'Can you provide an inventory of all public environmental and net zero claims currently in use?',
        answerType: WorkflowAnswerType.TEXT,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'CMA Green Claims Code Principle 1 (Accuracy)',
        guidanceNotes: 'List every green claim on marketing collateral, packaging, website, or press releases (e.g. "Carbon Neutral Deliveries", "Zero Carbon Facility").',
      },
      {
        id: 'fwk_greenclaims_q2',
        orderIndex: 2,
        text: 'Do you have a primary calculation dossier backing each public claim with measured data?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'CMA Principle 2 (Substantiation via Primary Evidence)',
        guidanceNotes: 'Raw utility bills, fuel records, or primary telemetry data proving claims reflect measured reality, not industry averages.',
      },
      {
        id: 'fwk_greenclaims_q3',
        orderIndex: 3,
        text: 'If using carbon offsets, do you hold registry retirement certificates from an approved scheme?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: false,
        isoClauseReference: 'CMA Principle 5 & ASA Climate Advertising Guidance',
        guidanceNotes: 'Verra VCS, Gold Standard, or UK Woodland Carbon Code serial numbers. Only required if offsetting is referenced in public claims.',
      },
    ],
  },

  {
    id: 'fwk_uk_lchs',
    workflowType: WorkflowType.CARBON,
    code: 'UK_LCHS',
    name: 'UK Low Carbon Hydrogen Standard (LCHS)',
    governingBody: 'UK Department for Energy Security and Net Zero (DESNZ) / Ofgem',
    jurisdiction: 'United Kingdom',
    description: 'Statutory certification framework for qualifying low-carbon hydrogen production below 20g CO2e/MJ H2 (LHV). Required for RTFO reporting and Hydrogen Business Model contracts.',
    questions: [
      {
        id: 'fwk_lchs_q1',
        orderIndex: 1,
        text: 'Do you hold a Renewable Power Purchase Agreement (PPA) and corresponding Guarantees of Origin (REGO/GoO) for electricity input?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'UK LCHS Criterion 1 / DESNZ Guidance 2024',
        guidanceNotes: 'PPA documentation and REGO or GoO registry certificates verifying hourly or monthly temporal correlation to renewable generation.',
      },
      {
        id: 'fwk_lchs_q2',
        orderIndex: 2,
        text: 'Do you have continuous fiscal meter logs covering electricity input (kWh) and hydrogen output (kg) for the full LCHS reporting period?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'DESNZ LCHS Metering and Monitoring Requirements / ISO 19880-1',
        guidanceNotes: 'Fiscal telemetry data with active meter calibration certificates. Must cover the full reporting period without gaps.',
      },
      {
        id: 'fwk_lchs_q3',
        orderIndex: 3,
        text: 'Do you have electrolyser feed water consumption and demineralisation log records?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: false,
        isoClauseReference: 'DESNZ LCHS Scope 1 and 2 Balance Boundary',
        guidanceNotes: 'Water consumption volumes and conductivity calibration records for the electrolysis stack.',
      },
      {
        id: 'fwk_lchs_q4',
        orderIndex: 4,
        text: 'Have you completed the well-to-gate lifecycle GHG intensity calculation and does it fall below 20g CO2e/MJ H2?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'DESNZ LCHS GHG Intensity Threshold / ISO 14067 Adaptation',
        guidanceNotes: 'Submit your completed well-to-gate GHG intensity calculation using the DESNZ LCHS methodology spreadsheet.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // JOB PIPELINE
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'fwk_uk_s106',
    workflowType: WorkflowType.JOB,
    code: 'UK_SECTION_106',
    name: 'Section 106 Local Employment & Skills Obligations',
    governingBody: 'Local Planning Authority / DLUHC',
    jurisdiction: 'United Kingdom',
    description: 'Statutory planning obligations under the Town and Country Planning Act 1990 (Section 106) requiring developers to meet local workforce hire quotas, apprenticeship commitments, and skills training duties.',
    questions: [
      {
        id: 'fwk_s106_q1',
        orderIndex: 1,
        text: 'Do you have the executed Section 106 legal agreement with the Local Planning Authority?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'Town and Country Planning Act 1990 Section 106',
        guidanceNotes: 'The executed planning obligation setting out specific local workforce hire quotas, apprenticeship commitments, and training obligations.',
      },
      {
        id: 'fwk_s106_q2',
        orderIndex: 2,
        text: 'Can you provide local workforce postcode verification confirming local resident employment targets are being met?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'Section 106 Local Employment and Training Strategy',
        guidanceNotes: 'Anonymised payroll or subcontractor headcount log with home postcode district (not full address). No personal data required.',
      },
      {
        id: 'fwk_s106_q3',
        orderIndex: 3,
        text: 'Do you have signed apprenticeship agreements and training qualification records to upload?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: false,
        isoClauseReference: 'Section 106 Skills and Training Covenant',
        guidanceNotes: 'Signed apprenticeship agreements, Apprenticeship Service commitment statements, and training completion certificates (e.g. CSCS for construction).',
      },
      {
        id: 'fwk_s106_q4',
        orderIndex: 4,
        text: 'Do you have the completed LPA monthly local labour monitoring return for the reporting period?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'Section 106 Monitoring and Reporting Obligation',
        guidanceNotes: 'LPA monitoring return showing start date, contract type, hours worked, and postcode district for each worker.',
      },
    ],
  },

  {
    id: 'fwk_social_value',
    workflowType: WorkflowType.JOB,
    code: 'SOCIAL_VALUE_JOBS',
    name: 'Social Value Act & PPN 002/026 Employment Obligations',
    governingBody: 'Cabinet Office / HM Government',
    jurisdiction: 'United Kingdom',
    description: 'Public Services (Social Value) Act 2012 and Cabinet Office PPN 002/026 procurement requirements mandating real living wage compliance, local employment, and skills investment by public sector suppliers.',
    questions: [
      {
        id: 'fwk_sv_q1',
        orderIndex: 1,
        text: 'Can you provide an anonymised payroll statement confirming Real Living Wage compliance and local workforce percentage?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'Public Services (Social Value) Act 2012 / PPN 06/20 Theme 2',
        guidanceNotes: 'Payroll summary confirming Real Living Wage and percentage of staff hired from the local economic area.',
      },
      {
        id: 'fwk_sv_q2',
        orderIndex: 2,
        text: 'Do you have evidence of completed apprenticeship hours or formal vocational training delivered during the year?',
        answerType: WorkflowAnswerType.BOOLEAN,
        options: [],
        evidenceRequired: true,
        isoClauseReference: 'Social Value Model MAC 2.1 Skills & Employment',
        guidanceNotes: 'Apprenticeship hours, NVQ/T-Level enrollments, or formal recognised vocational training delivered to staff.',
      },
    ],
  },
];

/** Raised when the seed would change a published version instead of publishing a new one. */
export class PublishedVersionChangedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishedVersionChangedError';
  }
}

/**
 * Publishes each framework's current version. A published version is never edited: if its
 * questions in the database differ from this file, seeding stops. To change a standard, give the
 * framework a new version label and new question ids; earlier versions stay as they are.
 */
export async function seedFrameworks(prisma: PrismaClient, data: FrameworkSeedRecord[] = FRAMEWORK_SEED_DATA): Promise<void> {
  console.log('[SEED] Seeding framework registry...');

  for (const fw of data) {
    const { questions, version: declared, ...frameworkFields } = fw;
    const meta = declared ?? initialVersion(fw);
    const versionId = `${fw.id}_v${meta.version.replace(/[^A-Za-z0-9]/g, '_')}`;
    const seedHash = questionSetHash(questions);

    await prisma.workflowFramework.upsert({
      where: { id: fw.id },
      update: {
        code: frameworkFields.code,
        name: frameworkFields.name,
        governingBody: frameworkFields.governingBody,
        jurisdiction: frameworkFields.jurisdiction,
        description: frameworkFields.description,
      },
      create: frameworkFields,
    });

    const existing = await prisma.workflowFrameworkVersion.findUnique({
      where: { frameworkId_version: { frameworkId: fw.id, version: meta.version } },
      include: { questions: true },
    });

    if (existing) {
      const storedHash = questionSetHash(existing.questions);
      if (storedHash !== seedHash) {
        throw new PublishedVersionChangedError(
          `${fw.code} version ${meta.version} is published and its questions differ from the seed. Publish a new version label with new question ids instead of editing it.`
        );
      }
      if (existing.contentHash && existing.contentHash !== storedHash) {
        throw new PublishedVersionChangedError(`${fw.code} version ${meta.version} no longer matches its sealed content hash.`);
      }
      if (!existing.contentHash) {
        await prisma.workflowFrameworkVersion.update({ where: { id: existing.id }, data: { contentHash: storedHash } });
      }
      console.log(`[SEED]   ${fw.code} ${meta.version}: published, unchanged`);
      continue;
    }

    const reused = await prisma.workflowQuestion.findMany({ where: { id: { in: questions.map((q) => q.id) } }, select: { id: true } });
    if (reused.length > 0) {
      throw new PublishedVersionChangedError(
        `${fw.code} version ${meta.version} reuses question ids from an earlier version (${reused.map((q) => q.id).join(', ')}). New versions need new question ids.`
      );
    }

    await prisma.workflowFrameworkVersion.create({
      data: {
        id: versionId,
        frameworkId: fw.id,
        version: meta.version,
        standardReference: meta.standardReference,
        effectiveFrom: meta.effectiveFrom,
        changeSummary: meta.changeSummary,
        contentHash: seedHash,
        questions: {
          create: questions.map((q) => ({ ...q, frameworkId: fw.id })),
        },
      },
    });
    console.log(`[SEED]   ${fw.code} ${meta.version}: published with ${questions.length} questions`);
  }

  console.log(`[SEED] Framework registry complete: ${data.length} frameworks`);
}
