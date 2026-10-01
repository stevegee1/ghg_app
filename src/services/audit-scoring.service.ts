import { PrismaClient, ConformanceGrade, RiskLevel } from '@prisma/client';
import { runWithRls, UserAuthScope } from '../db/rls';

export interface AuditMatrixRowInput {
  pillarIndex: number;
  pillarName: string;
  isoClauseLink: string;
  legalMandate: string;
  targetDepartment: string;
  questionText: string;
  objectiveEvidenceTypes: string;
  auditorFindings?: string;
  scorePoints: number; // 0.0 to 5.0
  complianceGrading: ConformanceGrade;
  weight: number; // e.g. 0.25
  rootCause?: string;
  mandatoryCorrectiveAction?: string;
  assignedOwner?: string;
  targetClosureDate?: Date;
  verifiedBy?: string;
  verificationDate?: Date;
}

export interface EvaluateAuditReportInput {
  licenseeId: string;
  auditRefId: string;
  facilityType: string;
  leadAuditorName: string;
  evaluationDate: Date;
  summaryNotes?: string;
  rows: AuditMatrixRowInput[];
}

export class AuditScoringService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Returns pre-configured questionnaire template rows for industrial verticals and event milestones.
   */
  static getTemplateRowsForFacility(facilityType: string): AuditMatrixRowInput[] {
    switch (facilityType.toUpperCase()) {
      case 'COMMERCIAL_FLEET':
        return [
          {
            pillarIndex: 1,
            pillarName: 'Lithium-Ion Battery Integrity & High-Voltage Safety',
            isoClauseLink: 'ISO 6469-1/-3 (High-Voltage Safety) and ISO 12405-4 (Test Protocols)',
            legalMandate: 'EU Battery Regulation 2023 / UK Green Claims Code',
            targetDepartment: 'Automotive Powertrain / High-Voltage Engineering',
            questionText: 'Are crash-testing logs and third-party certified ISO 12405-4 test logs present proving cell-to-cell thermal runaway isolation?',
            objectiveEvidenceTypes: 'ISO 12405-4 Test Certificates, Automated Hi-Pot Test Logs',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.25,
          },
          {
            pillarIndex: 2,
            pillarName: 'Gaseous Hydrogen Pressure Boundary & Fuel Systems',
            isoClauseLink: 'ISO 19880-8 (Fueling Quality) and ISO 23273 (Fuel Cell Safety)',
            legalMandate: 'COMAH Regulations / Pressure Equipment Directives',
            targetDepartment: 'Fuel Cell Engineering / Hydrogen Safety Division',
            questionText: 'What pneumatic/hydraulic testing certificates verify onboard 700-bar carbon-fibre tank shells and <10ms leak containment?',
            objectiveEvidenceTypes: 'Type-Approval Certificates, Leak Isolation Logs',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.20,
          },
          {
            pillarIndex: 3,
            pillarName: 'Powertrain Chemical Compatibility & Exhaust Purity',
            isoClauseLink: 'ISO 22241-1 (Selective Catalytic Reduction) and ISO 14044 (Lifecycle)',
            legalMandate: 'UK Road Vehicles (Approval) Regulations / Clean Air Strategy',
            targetDepartment: 'Emissions Testing / Mechanical Engineering',
            questionText: 'What lab accelerated-aging metrics verify fuel line polymer compatibility with E85/B100 fuels over 150k miles?',
            objectiveEvidenceTypes: 'Accelerated Aging Reports, Gas Chromatography Logs',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.15,
          },
          {
            pillarIndex: 4,
            pillarName: 'Connected Vehicle Cybersecurity & Powertrain OTA Safety',
            isoClauseLink: 'ISO/SAE 21434:2021 (Cybersecurity) and ISO/IEC 27001 (InfoSec)',
            legalMandate: 'UN ECE R155 / R156 Cyber Security Directives',
            targetDepartment: 'Vehicle Software / Telematics Architecture',
            questionText: 'Are cryptographic verification and penetration test summaries present for central CAN bus and BMS gateways?',
            objectiveEvidenceTypes: 'Penetration Testing Audit, Cryptographic Signing Logs',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.20,
          },
          {
            pillarIndex: 5,
            pillarName: 'Vehicle Recyclability Rate & Circularity',
            isoClauseLink: 'ISO 22628:2002 (Road Vehicles: Recyclability and Recoverability)',
            legalMandate: 'End-of-Life Vehicles (ELV) Directive / Waste Regulations',
            targetDepartment: 'Materials Engineering / Sustainability Directorate',
            questionText: 'What certified material tracking proves the chassis achieves minimum 85% recyclability and 95% recoverability?',
            objectiveEvidenceTypes: 'ISO 22628 Type-Approval Sheets, Second-Life Battery Deeds',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.20,
          },
        ];

      case 'EVENT_MILESTONE':
      case 'CUSTOM_KEEPSAKE':
        return [
          {
            pillarIndex: 1,
            pillarName: 'Event Power & Venue Grid Decarbonisation',
            isoClauseLink: 'ISO 14064-2:2019 (Project-Level GHG Reductions)',
            legalMandate: 'Local Event Licensing Conditions / Town Planning Mandates',
            targetDepartment: 'Venue Operations / Power Logistics',
            questionText: 'How is venue temporary generator power verified to utilize 100% green hydrogen or renewable PPAs?',
            objectiveEvidenceTypes: 'Half-Hourly Settlement Sheets, Fuel Guarantees of Origin',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.25,
          },
          {
            pillarIndex: 2,
            pillarName: 'Merchandise & Souvenir Product Carbon Footprint (PCF)',
            isoClauseLink: 'ISO 14067:2018 (Carbon Footprint of Products) & ISO 14044',
            legalMandate: 'UK CMA Green Claims Code / Textile Sustainability Standards',
            targetDepartment: 'Merchandise Procurement / Supply Chain',
            questionText: 'Is the cradle-to-gate lifecycle assessment of event garments (organic cotton, non-toxic embroidery) third-party verified?',
            objectiveEvidenceTypes: 'Environmental Product Declarations (EPDs), Organic Certs',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.25,
          },
          {
            pillarIndex: 3,
            pillarName: 'Verified Local Employment & Artisan Job Creation',
            isoClauseLink: 'ISO 26000 (Social Responsibility) & UK SECR Employment Rules',
            legalMandate: 'Section 106 Local Authority Employment Covenants',
            targetDepartment: 'HR / Staging Logistics',
            questionText: 'What employment registers substantiate local event staging crew and embroidery artisan labor hours?',
            objectiveEvidenceTypes: 'Signed Employment Registers, Verified Payroll Manifests',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.20,
          },
          {
            pillarIndex: 4,
            pillarName: 'Trade Effluent & Zero-Waste Water Management',
            isoClauseLink: 'ISO 14001:2015 Clause 8.1 (Operational Planning and Control)',
            legalMandate: 'Water Industry Act 1991 / Local Water Authority Permits',
            targetDepartment: 'Facilities Management / Environmental Health',
            questionText: 'Are wastewater and wash-down containment receipts verified against local water authority discharge limits?',
            objectiveEvidenceTypes: 'Trade Effluent Permits, Municipal Discharge Slates',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.15,
          },
          {
            pillarIndex: 5,
            pillarName: 'Anti-Greenwashing & Consumer Transparency Lineage',
            isoClauseLink: 'ISO 14025:2006 (Type III Eco-Labels) and ISO 14065',
            legalMandate: 'UK Consumer Protection from Unfair Trading Regulations',
            targetDepartment: 'Marketing / Corporate Legal Compliance',
            questionText: 'Do all attendee-facing souvenir claims link directly to the immutable GHG Logo Drop ledger with on-chain OpenSea verification?',
            objectiveEvidenceTypes: 'OpenSea On-Chain Metadata, SHA-256 Ledger Manifests',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.15,
          },
        ];

      default:
        // Standard Data Centre / Heavy Industrial Matrix
        return [
          {
            pillarIndex: 1,
            pillarName: 'Power Usage Effectiveness (PUE) & IT Load Isolation',
            isoClauseLink: 'ISO 50001:2018 Clause 9.1.1 (Energy Performance) & Clause 6.3',
            legalMandate: 'UK Streamlined Energy and Carbon Reporting (SECR)',
            targetDepartment: 'IT Infrastructure / Facilities Engineering',
            questionText: 'How is PDU-level IT load isolated from total facility draw to guarantee an unmanipulated PUE metric?',
            objectiveEvidenceTypes: 'SCADA Dashboard, Sub-Meter Calibration Certs',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.25,
          },
          {
            pillarIndex: 2,
            pillarName: 'Water Usage Effectiveness (WUE) & Cooling Loops',
            isoClauseLink: 'ISO 14001:2015 Clause 8.1 (Operational Planning & Control)',
            legalMandate: 'Water Resources Act 1991 / Trade Effluent Discharge Permits',
            targetDepartment: 'Facilities Management / HSE Coordination',
            questionText: 'Are continuous telemetry logs present proving evaporative cooling tower blowdown stays within chemical limits?',
            objectiveEvidenceTypes: 'Automated Water Meter Logs, Utility Discharge Receipts',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.20,
          },
          {
            pillarIndex: 3,
            pillarName: 'Community Waste Heat Re-Use & Export Infrastructure',
            isoClauseLink: 'ISO 55001:2014 Clause 8.1 & ISO 50001 Clause 8.2',
            legalMandate: 'Section 106 Town and Country Planning Act 1990 Covenants',
            targetDepartment: 'Mechanical Engineering / Commercial Legal',
            questionText: 'What thermal telemetry logs verify that waste heat exported to the municipal district heating grid meets contract baseline?',
            objectiveEvidenceTypes: 'Inline Flow-Meter Logs, Signed Council Delivery Sheets',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.20,
          },
          {
            pillarIndex: 4,
            pillarName: 'Green Hydrogen DRI & Industrial Fuel Integrity',
            isoClauseLink: 'ISO 14001:2015 Clause 6.1.3 & ISO 50001 Clause 8.3',
            legalMandate: 'COMAH Regulations / Ofgem Co-Location Generation Guidelines',
            targetDepartment: 'Chemical Engineering / Procurement',
            questionText: 'What traceability documentation ensures hydrogen utilized in production is 99.97% pure and 100% renewable-derived?',
            objectiveEvidenceTypes: 'Guarantees of Origin (GoOs), Gas Chromatograph Telemetry',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.20,
          },
          {
            pillarIndex: 5,
            pillarName: 'Microgrid Metering Separation & Battery Storage (BESS)',
            isoClauseLink: 'ISO 50001:2018 Clause 6.6 & ISO 14064-1:2018',
            legalMandate: 'Electricity Act 1989 / Grid Code Compliance',
            targetDepartment: 'High-Voltage Engineering / Analytics',
            questionText: 'How does the bi-directional metering system mathematically separate on-site solar generation from grid-charging cycles?',
            objectiveEvidenceTypes: 'Half-Hourly Settlement Slates, BMS Software Logs',
            scorePoints: 5.0,
            complianceGrading: ConformanceGrade.CONFORMANT,
            weight: 0.15,
          },
        ];
    }
  }

  /**
   * Submits an evaluation report, computes weighted scoring, determines Greenwashing Risk Level,
   * and persists the complete audit matrix atomically.
   */
  async evaluateAuditReport(input: EvaluateAuditReportInput) {
    const {
      licenseeId,
      auditRefId,
      facilityType,
      leadAuditorName,
      evaluationDate,
      summaryNotes,
      rows,
    } = input;

    if (!rows || rows.length === 0) {
      throw new Error('Invalid input: Audit report must contain at least 1 matrix row.');
    }

    // 1. Calculate Weighted Composite Score
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let hasZeroScore = false;

    for (const row of rows) {
      if (typeof row.scorePoints !== 'number' || isNaN(row.scorePoints)) {
        throw new Error(`Invalid scorePoints for pillar '${row.pillarName}'`);
      }
      if (row.scorePoints === 0) {
        hasZeroScore = true;
      }
      totalWeightedScore += row.scorePoints * row.weight;
      totalWeight += row.weight;
    }

    const normalizedScore = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;

    // 2. Determine Risk Level & Conformance Grade
    let greenwashingRiskLevel: RiskLevel;
    let overallGrade: ConformanceGrade;

    if (hasZeroScore || normalizedScore < 2.8) {
      greenwashingRiskLevel = RiskLevel.HIGH_RISK_GREENWASHING_EXPOSURE;
      overallGrade = ConformanceGrade.MAJOR_NON_CONFORMANCE_GREENWASHING_RISK;
    } else if (normalizedScore < 4.2) {
      greenwashingRiskLevel = RiskLevel.MEDIUM_RISK_OFI;
      overallGrade = ConformanceGrade.OPPORTUNITY_FOR_IMPROVEMENT;
    } else {
      greenwashingRiskLevel = RiskLevel.LOW_RISK_CONFORMANT;
      overallGrade = ConformanceGrade.CONFORMANT;
    }

    // 3. Persist Report and Matrix Rows atomically
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.auditInspectionReport.create({
        data: {
          licenseeId,
          auditRefId: auditRefId.trim(),
          facilityType: facilityType.toUpperCase().trim(),
          leadAuditorName: leadAuditorName.trim(),
          evaluationDate,
          weightedScore: normalizedScore,
          overallGrade,
          greenwashingRiskLevel,
          summaryNotes: summaryNotes || null,
          matrixRows: {
            create: rows.map((r) => ({
              pillarIndex: r.pillarIndex,
              pillarName: r.pillarName,
              isoClauseLink: r.isoClauseLink,
              legalMandate: r.legalMandate,
              targetDepartment: r.targetDepartment,
              questionText: r.questionText,
              objectiveEvidenceTypes: r.objectiveEvidenceTypes,
              auditorFindings: r.auditorFindings || null,
              scorePoints: r.scorePoints,
              complianceGrading: r.complianceGrading,
              weight: r.weight,
              rootCause: r.rootCause || null,
              mandatoryCorrectiveAction: r.mandatoryCorrectiveAction || null,
              assignedOwner: r.assignedOwner || null,
              targetClosureDate: r.targetClosureDate || null,
              verifiedBy: r.verifiedBy || leadAuditorName,
              verificationDate: r.verificationDate || evaluationDate,
            })),
          },
        },
        include: {
          matrixRows: {
            orderBy: { pillarIndex: 'asc' },
          },
        },
      });

      return report;
    });
  }

  /**
   * Retrieves an audit report by ID with RLS tenant isolation.
   */
  async getAuditReportById(reportId: string, user: UserAuthScope) {
    return runWithRls(this.prisma, user, async (tx) => {
      const report = await tx.auditInspectionReport.findUnique({
        where: { id: reportId },
        include: {
          matrixRows: { orderBy: { pillarIndex: 'asc' } },
          licensee: { select: { id: true, name: true, vertical: true } },
        },
      });

      if (!report) {
        throw new Error(`Audit inspection report '${reportId}' not found.`);
      }

      return report;
    });
  }

  /**
   * Lists audit reports for a licensee with RLS tenant isolation.
   */
  async listAuditReports(licenseeId: string, user: UserAuthScope) {
    return runWithRls(this.prisma, user, async (tx) => {
      return tx.auditInspectionReport.findMany({
        where: { licenseeId },
        include: {
          matrixRows: { orderBy: { pillarIndex: 'asc' } },
        },
        orderBy: { evaluationDate: 'desc' },
      });
    });
  }
}
