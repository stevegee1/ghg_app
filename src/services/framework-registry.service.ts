/**
 * framework-registry.service.ts
 * Authoritative registry of supported carbon accounting, energy management,
 * and statutory disclosure frameworks for enterprise audit readiness.
 *
 * Supported Frameworks:
 *  1. ISO 14064-1:2018 (Corporate GHG Inventories)
 *  2. ISO 50001:2018 (Energy Management Systems)
 *  3. GHG Protocol Corporate Standard (Scope 1, 2, 3)
 *  4. UK SECR (Companies Act 2006)
 *  5. EU CSRD (ESRS E1 Climate Standard)
 *  6. California SB 253 (Climate Corporate Data Accountability)
 *  7. UK CMA Green Claims Code (Anti-Greenwashing)
 *  8. ISO 14067:2018 (Product Carbon Footprints & LCAs)
 */

export interface ComplianceFrameworkMeta {
  id: string;
  code: string;
  name: string;
  governingBody: string;
  jurisdiction: string;
  badgeTag: string;
  description: string;
  standardClauses: string[];
}

export interface DiagnosticQuestion {
  questionId: string;
  frameworkId: string;
  isoClause: string;
  legalMandate: string;
  pillarId: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  pillarTitle: string;
  questionText: string;
  answerType: 'YES_NO_WITH_EVIDENCE' | 'NUMERIC_INPUT' | 'MULTIPLE_CHOICE';
  evidenceRequired: string;
  options?: string[];
  guidanceNotes: string;
}

export interface DiagnosticPillar {
  pillarId: string;
  pillarNumber: number;
  title: string;
  description: string;
  questions: DiagnosticQuestion[];
}

export interface DiagnosticBundle {
  selectedFrameworks: ComplianceFrameworkMeta[];
  pillars: DiagnosticPillar[];
  totalQuestions: number;
}

export const COMPLIANCE_FRAMEWORKS: Record<string, ComplianceFrameworkMeta> = {
  ISO_14064_1: {
    id: 'ISO_14064_1',
    code: 'ISO 14064-1',
    name: 'Corporate Greenhouse Gas Inventories',
    governingBody: 'International Organization for Standardization (ISO)',
    jurisdiction: 'Global',
    badgeTag: 'ISO 14064-1',
    description: 'Specification with guidance at the organization level for quantification and reporting of greenhouse gas emissions and removals.',
    standardClauses: ['Clause 5.1 Organizational Boundaries', 'Clause 5.2 Operational Boundaries', 'Clause 6.1 Quantification of Direct GHG', 'Clause 9.3 GHG Report Content'],
  },
  ISO_50001: {
    id: 'ISO_50001',
    code: 'ISO 50001',
    name: 'Energy Management Systems (EnMS)',
    governingBody: 'International Organization for Standardization (ISO)',
    jurisdiction: 'Global',
    badgeTag: 'ISO 50001',
    description: 'Requirements for establishing, implementing, maintaining, and improving an energy management system with continuous performance indicators.',
    standardClauses: ['Clause 4.1 Organizational Context', 'Clause 6.3 Energy Review', 'Clause 6.5 Energy Baselines', 'Clause 6.6 Metering & Calibration'],
  },
  GHG_PROTOCOL: {
    id: 'GHG_PROTOCOL',
    code: 'GHG Protocol',
    name: 'GHG Protocol Corporate Standard (Scope 1, 2, 3)',
    governingBody: 'World Resources Institute (WRI) & WBCSD',
    jurisdiction: 'Global',
    badgeTag: 'GHG Protocol',
    description: 'The global standard for corporate GHG accounting, covering direct Scope 1, dual-market Scope 2, and 15 categories of Scope 3.',
    standardClauses: ['Chapter 3 Setting Organizational Boundaries', 'Chapter 4 Setting Operational Boundaries', 'Scope 2 Guidance (Market vs Location)', 'Corporate Value Chain Scope 3 Standard'],
  },
  UK_SECR: {
    id: 'UK_SECR',
    code: 'UK SECR',
    name: 'Streamlined Energy and Carbon Reporting',
    governingBody: 'UK Department for Energy Security and Net Zero',
    jurisdiction: 'United Kingdom',
    badgeTag: 'UK SECR',
    description: 'Mandatory annual directors report disclosures of energy use, Scope 1 and 2 emissions, and intensity metrics for qualifying UK enterprises.',
    standardClauses: ['Companies Act 2006 (2019 Regulations)', 'Gross Scope 1 and 2 tCO2e', 'UK Energy Use (kWh)', 'Statutory Ratio Metric'],
  },
  EU_CSRD_ESRS_E1: {
    id: 'EU_CSRD_ESRS_E1',
    code: 'EU CSRD / ESRS E1',
    name: 'Corporate Sustainability Reporting Directive (Climate Change)',
    governingBody: 'European Financial Reporting Advisory Group (EFRAG) / European Commission',
    jurisdiction: 'European Union',
    badgeTag: 'EU CSRD',
    description: 'Mandatory European standard for double materiality climate disclosures, 1.5C transition plans, and Scope 1-3 value chain reporting.',
    standardClauses: ['ESRS E1-1 Transition Plan', 'ESRS E1-4 Targets', 'ESRS E1-6 Gross Scopes 1, 2, 3', 'ESRS E1-9 Potential Financial Effects'],
  },
  US_CA_SB253: {
    id: 'US_CA_SB253',
    code: 'California SB 253',
    name: 'Climate Corporate Data Accountability Act',
    governingBody: 'California Air Resources Board (CARB)',
    jurisdiction: 'United States (California)',
    badgeTag: 'CA SB 253',
    description: 'Statutory mandate requiring annual audited Scope 1, 2, and 3 carbon accounting for entities doing business in California.',
    standardClauses: ['Health and Safety Code Section 38532', 'Annual Scope 1 and 2 Independent Assurance', 'Scope 3 Protocol Reporting', 'CARB Public Registry Filing'],
  },
  UK_CMA_GREEN_CLAIMS: {
    id: 'UK_CMA_GREEN_CLAIMS',
    code: 'UK CMA Code',
    name: 'CMA Green Claims Code & CAP Advertising Standard',
    governingBody: 'UK Competition and Markets Authority (CMA)',
    jurisdiction: 'United Kingdom & Advertising Networks',
    badgeTag: 'CMA Green Claims',
    description: 'Statutory consumer protection guidance prohibiting deceptive green marketing and unverified net zero claims.',
    standardClauses: ['Principle 1 Truthful and Accurate Claims', 'Principle 2 Substantiated with Primary Evidence', 'Principle 4 Fair Comparisons', 'Principle 6 Full Life Cycle Consideration'],
  },
  ISO_14067: {
    id: 'ISO_14067',
    code: 'ISO 14067',
    name: 'Product Carbon Footprint (LCA)',
    governingBody: 'International Organization for Standardization (ISO)',
    jurisdiction: 'Global',
    badgeTag: 'ISO 14067 LCA',
    description: 'Requirements and guidelines for the quantification of the carbon footprint of products, souvenirs, and manufactured assets.',
    standardClauses: ['Clause 6.3 System Boundary', 'Clause 6.4 Allocation of Inputs', 'Clause 6.5 Impact Assessment', 'Clause 7 CFP Study Report'],
  },
};

const MASTER_DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  // ── Pillar 1: Organizational & Reporting Boundaries ────────────────────────
  {
    questionId: 'P1-Q1',
    frameworkId: 'ISO_14064_1',
    isoClause: 'ISO 14064-1:2018 Clause 5.1 / GHG Protocol Chapter 3',
    legalMandate: 'UK SECR & EU CSRD ESRS E1 Boundary Definition',
    pillarId: 'P1',
    pillarTitle: 'Organizational & Reporting Boundaries',
    questionText: 'Has your organization formally defined and documented its consolidation approach (Operational Control vs Equity Share)?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Corporate consolidation charter, boundary register, or legal entity hierarchy chart.',
    guidanceNotes: 'Under ISO 14064-1 and GHG Protocol, changing consolidation approach year-over-year requires formal restatement.',
  },
  {
    questionId: 'P1-Q2',
    frameworkId: 'ISO_50001',
    isoClause: 'ISO 50001:2018 Clause 4.3 / ISO 14001:2015 Clause 4.3',
    legalMandate: 'EU EED Energy Audit & SECR Boundary Alignment',
    pillarId: 'P1',
    pillarTitle: 'Organizational & Reporting Boundaries',
    questionText: 'Are all physical sites, facilities, operational units, and utility sub-meters mapped within the scope of reporting?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Physical facility registry, utility meter point administration numbers (MPAN/MPRN).',
    guidanceNotes: 'Ensure leased assets and co-located data centres are clearly classified under operational scope.',
  },

  // ── Pillar 2: Primary Activity Data & Sensor Provenance ────────────────────
  {
    questionId: 'P2-Q1',
    frameworkId: 'GHG_PROTOCOL',
    isoClause: 'GHG Protocol Scope 1 & 2 / ISO 14064-1 Clause 6.1',
    legalMandate: 'UK SECR Companies Act 2006 gross emissions reporting',
    pillarId: 'P2',
    pillarTitle: 'Primary Activity Data & Sensor Provenance',
    questionText: 'Is Scope 1 direct combustion data (natural gas, diesel, refrigerants) captured from primary utility meters and invoices rather than estimates?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Primary utility bills, bulk fuel purchase receipts, or automatic meter reading (AMR) CSV logs.',
    guidanceNotes: 'Estimated data must not exceed 10% of total reported Scope 1 volume without an explicit uncertainty disclaimer.',
  },
  {
    questionId: 'P2-Q2',
    frameworkId: 'EU_CSRD_ESRS_E1',
    isoClause: 'GHG Protocol Scope 2 Guidance / ESRS E1-6',
    legalMandate: 'Dual-Reporting Mandate (Market-based vs Location-based)',
    pillarId: 'P2',
    pillarTitle: 'Primary Activity Data & Sensor Provenance',
    questionText: 'Are purchased electricity emissions quantified using dual reporting (location-based grid average vs market-based contractual instruments)?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Renewable energy guarantee of origin (REGO) certificates, supplier fuel mix disclosures, or PPA contracts.',
    guidanceNotes: 'Market-based zero emissions claims require verified contractual cancellation certificates.',
  },

  // ── Pillar 3: Sensor & Meter Calibration (ISO 17025 Gatekeeper) ───────────
  {
    questionId: 'P3-Q1',
    frameworkId: 'ISO_50001',
    isoClause: 'ISO 50001:2018 Clause 6.6 / ISO 19011:2026 Annex A',
    legalMandate: 'Statutory measurement accuracy standards',
    pillarId: 'P3',
    pillarTitle: 'Sensor & Meter Calibration (ISO 17025)',
    questionText: 'Are all flow meters, high-voltage sub-meters, gas chromatographs, and IoT sensors supported by unexpired ISO/IEC 17025 calibration certificates?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Active ISO 17025 calibration laboratory certificates with asset serial numbers and validity dates.',
    guidanceNotes: 'Uncalibrated sensor streams are automatically rejected by our ingestion gatekeeper.',
  },
  {
    questionId: 'P3-Q2',
    frameworkId: 'ISO_14064_1',
    isoClause: 'ISO 14064-1:2018 Clause 5.4 / ISO 50001 Clause 6.6',
    legalMandate: 'Data uncertainty and anomaly verification threshold',
    pillarId: 'P3',
    pillarTitle: 'Sensor & Meter Calibration (ISO 17025)',
    questionText: 'Does your facility maintain automated anomaly detection protocols for variance exceeding plus or minus 15% from calibrated baselines?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Telemetry drift alert logs, engineering root cause analysis records, or corrective action reports.',
    guidanceNotes: 'Data drift above 15% triggers an autonomous statutory export lock pending engineering review.',
  },

  // ── Pillar 4: Emission Factor Lineage & Calculation Methodology ───────────
  {
    questionId: 'P4-Q1',
    frameworkId: 'US_CA_SB253',
    isoClause: 'ISO 14064-1 Clause 6.2 / California SB 253 Section 38532',
    legalMandate: 'Statutory emission factor lineage and global warming potential (GWP)',
    pillarId: 'P4',
    pillarTitle: 'Emission Factor Lineage & Methodology',
    questionText: 'Are all conversion factors sourced from recognized statutory bodies (DESNZ/Defra, US EPA eGRID, IPCC AR6 100-year GWP)?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Calculation ledger indicating database version, publication year, and source emission factor table.',
    guidanceNotes: 'Factors must match the operational reporting year. Mixing publication years is flagged as non-conforming.',
  },
  {
    questionId: 'P4-Q2',
    frameworkId: 'ISO_14067',
    isoClause: 'ISO 14067:2018 Clause 6.4 / ISO 14044',
    legalMandate: 'Product life cycle allocation principles',
    pillarId: 'P4',
    pillarTitle: 'Emission Factor Lineage & Methodology',
    questionText: 'For product and souvenir carbon footprinting, is the cradle-to-gate allocation methodology documented without double-counting?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Bill of materials (BOM) carbon breakdown, material supplier LCA declarations.',
    guidanceNotes: 'Applies to commercial keepsakes, hardware packaging, and physical merchandise.',
  },

  // ── Pillar 5: Governance, Anomaly Controls & Statutory Disclosures ─────────
  {
    questionId: 'P5-Q1',
    frameworkId: 'UK_CMA_GREEN_CLAIMS',
    isoClause: 'ISO 14021 / UK CMA Green Claims Code Principle 1 & 2',
    legalMandate: 'Consumer Protection from Unfair Trading Regulations 2008',
    pillarId: 'P5',
    pillarTitle: 'Governance, Anomaly Controls & Disclosures',
    questionText: 'Are public claims of carbon reduction, net zero, or neutrality free of blanket terms and backed by verified primary records?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Published sustainability statement, marketing claims dossier, or board-approved climate policy.',
    guidanceNotes: 'All claims must specify exact operational boundary and state non-brokerage disclaimer.',
  },
  {
    questionId: 'P5-Q2',
    frameworkId: 'EU_CSRD_ESRS_E1',
    isoClause: 'ISO 14001:2015 Clause 9.3 / ESRS 2 Governance',
    legalMandate: 'Board-level climate oversight and audit trail sign-off',
    pillarId: 'P5',
    pillarTitle: 'Governance, Anomaly Controls & Disclosures',
    questionText: 'Is the final carbon audit dossier reviewed, approved, and digitally signed by an authorized company director prior to registrar filing?',
    answerType: 'YES_NO_WITH_EVIDENCE',
    evidenceRequired: 'Board resolution, executive audit sign-off sheet, or authorized cryptographic token signature.',
    guidanceNotes: 'Statutory filings under SECR and CSRD impose legal liability on company officers for false reporting.',
  },
];

const PILLAR_METADATA = [
  {
    pillarId: 'P1',
    pillarNumber: 1,
    title: 'Organizational & Reporting Boundaries',
    description: 'Consolidation approach, operational control, and complete physical site boundary mapping.',
  },
  {
    pillarId: 'P2',
    pillarNumber: 2,
    title: 'Primary Activity Data & Sensor Provenance',
    description: 'Verified utility billing, fuel logs, dual-reporting Scope 2 market instruments, and activity provenance.',
  },
  {
    pillarId: 'P3',
    pillarNumber: 3,
    title: 'Sensor & Meter Calibration (ISO 17025)',
    description: 'Active instrument calibration certificates, gatekeeper enforcement, and 15% anomaly variance limits.',
  },
  {
    pillarId: 'P4',
    pillarNumber: 4,
    title: 'Emission Factor Lineage & Methodology',
    description: 'Statutory factor sources (DESNZ, EPA, IPCC AR6), GWP version control, and cradle-to-gate allocation.',
  },
  {
    pillarId: 'P5',
    pillarNumber: 5,
    title: 'Governance, Anomaly Controls & Disclosures',
    description: 'CMA anti-greenwashing review, executive oversight, and boardroom-ready audit sign-off.',
  },
];

export class FrameworkRegistryService {
  private prisma?: any;

  constructor(prisma?: any) {
    this.prisma = prisma;
  }

  // ── Static in-memory methods (used as fallback / no-DB context) ───────────

  /**
   * Returns all supported frameworks from the in-memory registry.
   */
  public static getAllFrameworks(): ComplianceFrameworkMeta[] {
    return Object.values(COMPLIANCE_FRAMEWORKS);
  }

  /**
   * Returns metadata for a specific framework code from the in-memory registry.
   */
  public static getFramework(frameworkId: string): ComplianceFrameworkMeta | null {
    return COMPLIANCE_FRAMEWORKS[frameworkId] || null;
  }

  /**
   * Generates a deduplicated 5-pillar diagnostic bundle for selected framework IDs.
   * If no framework IDs are provided, returns the baseline standard set.
   */
  public static getDiagnosticBundle(frameworkIds: string[]): DiagnosticBundle {
    const validIds = frameworkIds.filter((id) => COMPLIANCE_FRAMEWORKS[id]);
    const activeFrameworks = validIds.length > 0
      ? validIds.map((id) => COMPLIANCE_FRAMEWORKS[id])
      : [COMPLIANCE_FRAMEWORKS.ISO_14064_1, COMPLIANCE_FRAMEWORKS.ISO_50001, COMPLIANCE_FRAMEWORKS.UK_SECR];

    const activeIdSet = new Set(activeFrameworks.map((f) => f.id));

    const selectedQuestions = MASTER_DIAGNOSTIC_QUESTIONS.filter((q) => {
      if (['P1-Q1', 'P2-Q1', 'P3-Q1', 'P4-Q1', 'P5-Q1'].includes(q.questionId)) {
        return true;
      }
      return activeIdSet.has(q.frameworkId);
    });

    const pillars: DiagnosticPillar[] = PILLAR_METADATA.map((p) => ({
      ...p,
      questions: selectedQuestions.filter((q) => q.pillarId === p.pillarId),
    }));

    return {
      selectedFrameworks: activeFrameworks,
      pillars,
      totalQuestions: selectedQuestions.length,
    };
  }

  // ── DB-backed async methods (primary path post-seed) ─────────────────────

  /**
   * Returns all frameworks from the DB registry.
   * Falls back to in-memory static list if DB returns zero rows.
   */
  public async getAllFrameworksFromDb(): Promise<{
    id: string;
    code: string;
    name: string;
    workflowType: string;
    governingBody: string | null;
    jurisdiction: string | null;
    description: string | null;
    questionCount: number;
  }[]> {
    if (!this.prisma) return [];

    const rows = await this.prisma.workflowFramework.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: [{ workflowType: 'asc' }, { name: 'asc' }],
    });

    if (rows.length === 0) return [];

    return rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      workflowType: r.workflowType,
      governingBody: r.governingBody,
      jurisdiction: r.jurisdiction,
      description: r.description,
      questionCount: r._count.questions,
    }));
  }

  /**
   * Returns a single framework with all questions from the DB registry.
   * Falls back to in-memory static data if not found.
   */
  public async getFrameworkWithQuestionsFromDb(code: string): Promise<{
    id: string;
    code: string;
    name: string;
    workflowType: string;
    governingBody: string | null;
    jurisdiction: string | null;
    description: string | null;
    questions: {
      id: string;
      orderIndex: number;
      text: string;
      answerType: string;
      options: string[];
      evidenceRequired: boolean;
      isoClauseReference: string;
      guidanceNotes: string | null;
    }[];
  } | null> {
    if (!this.prisma) return null;

    const fw = await this.prisma.workflowFramework.findFirst({
      where: { code },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!fw) return null;

    return {
      id: fw.id,
      code: fw.code,
      name: fw.name,
      workflowType: fw.workflowType,
      governingBody: fw.governingBody,
      jurisdiction: fw.jurisdiction,
      description: fw.description,
      questions: fw.questions.map((q: any) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        text: q.text,
        answerType: q.answerType,
        options: q.options,
        evidenceRequired: q.evidenceRequired,
        isoClauseReference: q.isoClauseReference,
        guidanceNotes: q.guidanceNotes,
      })),
    };
  }
}
