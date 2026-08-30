import { PrismaClient } from '@prisma/client';

export interface Class35FeeValidationInput {
  billingModel: 'FIXED_SOFTWARE_LICENSE' | 'PER_TRANSACTION_DROP_FEE' | 'PER_AUDIT_ASSURANCE_FEE' | 'CARBON_CREDIT_BROKERAGE_COMMISSION' | 'OFFSET_TRADING_MARGIN';
  feeCents: number;
  description: string;
}

export interface AddendumBGeneratorInput {
  licenseeId: string;
  clientLegalName: string;
  authorizedSignatoryName: string;
  effectiveDate?: Date;
}

export class LegalContractsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Enforces the Class 35 vs Class 36 Financial Separation Firewall.
   * Rejects any transaction or billing model attempted as carbon credit brokerage or offset trading margins.
   */
  validateClass35FeeStructure(input: Class35FeeValidationInput): { isApproved: boolean; classification: string } {
    const { billingModel, description } = input;

    if (
      billingModel === 'CARBON_CREDIT_BROKERAGE_COMMISSION' ||
      billingModel === 'OFFSET_TRADING_MARGIN' ||
      description.toLowerCase().includes('brokerage commission on carbon credit') ||
      description.toLowerCase().includes('carbon offset trading fee')
    ) {
      throw new Error(
        'CLASS 36 FIREWALL VIOLATION: The GHG Logo Drop platform operates strictly under Nice Classification Class 35 (Data Management & Software Assurance). Percentage-based carbon credit brokerage or offset trading margins are strictly prohibited.'
      );
    }

    return {
      isApproved: true,
      classification: 'NICE_CLASS_35_BUSINESS_MANAGEMENT_AND_DATA_PROCESSING',
    };
  }

  /**
   * Generates customized Addendum B (Technical Clarification of Class 35 Compliance Data Processes)
   * for Master Services Agreements (MSAs).
   */
  generateAddendumB(input: AddendumBGeneratorInput) {
    const { licenseeId, clientLegalName, authorizedSignatoryName, effectiveDate = new Date() } = input;
    const dateStr = effectiveDate.toISOString().split('T')[0];

    const contractMarkdown = `
# ADDENDUM B: TECHNICAL CLARIFICATION OF CLASS 35 COMPLIANCE DATA PROCESSES
**Attachment to Master Services Agreement (MSA)**
**Client Legal Entity:** ${clientLegalName} (Licensee ID: \`${licenseeId}\`)  
**Effective Date:** ${dateStr}  
**Authorized Signatory:** ${authorizedSignatoryName}

---

### SECTION 1: STATUTORY TRADEMARK & SERVICE SCOPE
1.1 **Nice Classification Class 35 Boundary**: The Client explicitly acknowledges and covenants that GHG Logo Drop (NFTY LOGS®) operates strictly as an administrative data aggregator, telemetry validation software provider, and continuous assurance engine under **Nice Classification Class 35** (Business Management, Administration, and Data Processing Services).
1.2 **Class 36 Financial Firewall**: The Service Provider does not act as a financial broker, dealer, carbon credit exchange, or custodian of financial securities under Class 36. All fees payable hereunder are fixed software subscription fees and transaction assurance fees.

---

### SECTION 2: ISO MANAGEMENT SYSTEM READINESS (ISO 14065 ALIGNMENT)
2.1 **Continuous Assurance vs. Statutory Certification**: The platform prepares, validates, and hashes Operational Technology (OT) telemetry and audit matrices to achieve continuous **Audit-Readiness** under ISO 14001:2015, ISO 50001:2018, ISO 14064-1/2:2018, and ISO 14067:2018.
2.2 **Third-Party Registrar Distinction**: Formal statutory certification remains the exclusive prerogative of accredited third-party registrars (e.g., BSI, TÜV, DNV) operating under **ISO 14065**. The platform acts as the immutable evidentiary source of truth and digital chain of custody.

---

### SECTION 3: CALIBRATION GATEKEEPER & 15% ANOMALY COVENANT
3.1 **Mandatory Sensor Calibration**: In accordance with ISO 50001 Clause 6.6 and ISO 14001 Clause 9.1, all sensor telemetry feeds require active, unexpired third-party Certificates of Calibration registered with cryptographic SHA-256 integrity hashes.
3.2 **Automatic Export Lock**: In the event of a baseline variance exceeding **fifteen percent (15%)**, downstream data exports and PDF certificate issuance shall automatically enter a **"Pending Verification"** state (HTTP 423 Resource Locked) until supervisor root-cause analysis is completed under ISO Clause 10.2.

---

### SECTION 4: UK CMA GREEN CLAIMS CODE COMPLIANCE
4.1 **Truthful & Substantiated Claims**: The Client agrees to submit all public-facing environmental claims, product descriptions, and souvenir keepsake inscriptions through the platform's CMA Green Claims Code Validator prior to publication.
4.2 **Prohibited Representations**: No absolute or unverified claims (such as *"100% Green"*, *"Carbon Neutral Event"*, or *"Zero Carbon"*) may be made without primary ISO 14064-1/2 telemetry evidence.

---

### SECTION 5: DUAL-IMPACT GOVERNANCE & 15% ESG CHARITABLE SPLIT
5.1 **Mandatory ESG Allocation**: The platform automatically routes exactly **fifteen percent (15%)** of gross drop volumes to verified charitable environmental funds.
5.2 **Job Creation Reporting**: The Client shall submit quarterly job creation filings under Section 106 covenants to substantiate local clean tech manufacturing and artisan labor.

---

**EXECUTED AND AGREED BY:**

For **GHG Logo Drop Ltd**  
*Lead Assurance Officer, GMC, LL.B.*  
Date: ${dateStr}

For **${clientLegalName}**  
*${authorizedSignatoryName}*  
Date: ${dateStr}
    `.trim();

    return {
      licenseeId,
      clientLegalName,
      authorizedSignatoryName,
      effectiveDate: dateStr,
      contractMarkdown,
    };
  }

  /**
   * Generates the structured 30-60-90 Day Consultant Onboarding Roadmap.
   */
  generateOnboardingRoadmap(licenseeId: string) {
    return {
      licenseeId,
      framework: 'ISO 14001 / 50001 Continuous Assurance Roadmap',
      totalDurationDays: 90,
      phases: [
        {
          phaseNumber: 1,
          phaseName: 'Phase 1 (Days 1–30): Asset & Meter Calibration Mapping',
          focus: 'Physical Operational Technology (OT) & Instrumentation Discovery',
          deliverables: [
            'Physical plant sensor audit (PDU sub-meters, water flow meters, gas chromatographs)',
            'Registration of third-party Calibration Certificates with SHA-256 integrity hashing (Milestone ISO-1)',
            'Enforcement of PostgreSQL Mandatory Calibration Database Trigger',
            'Establishment of initial rolling 30-day baseline telemetry models',
          ],
          isoClauses: ['ISO 50001:2018 Clause 6.6', 'ISO 14001:2015 Clause 9.1'],
          status: 'COMPLETED_OR_ACTIVE',
        },
        {
          phaseNumber: 2,
          phaseName: 'Phase 2 (Days 31–60): Supply Chain Vetting & 15% Anomaly Baseline Calibration',
          focus: 'Automated Anomaly Detection & Supplier Due Diligence',
          deliverables: [
            'Activation of 15% Baseline Anomaly Lock Engine with HTTP 423 export gating (Milestone ISO-2)',
            'Implementation of ISO Clause 10.2 Non-Conformance Incident Tracking & Supervisor Remediation Drawer',
            '5-Pillar Supplier Vetting Scorecards across CleanTech, EV Fleet, and Event Drops (Milestone ISO-3)',
            'Multi-Tenant Evidence Locker activation for SCADA CSVs and trade effluent permits (Milestone ISO-4)',
          ],
          isoClauses: ['ISO 14001:2015 Clause 10.2', 'ISO 50001:2018 Clause 9.1.1', 'ISO 14067:2018'],
          status: 'IN_PROGRESS',
        },
        {
          phaseNumber: 3,
          phaseName: 'Phase 3 (Days 61–90): Executive Boardroom Assurance & External Registrar Handover',
          focus: 'Continuous Assurance Certification & External Audit Handover',
          deliverables: [
            'Execution of Master Services Agreement (MSA) Addendum B Class 35 Legal Clarification',
            'Enforcement of UK CMA Green Claims Code Copy Validator on all public product copy (Milestone ISO-5)',
            'Generation of Boardroom-Grade ISO 14001 / 50001 Integrated Audit Reports with SHA-256 watermarks',
            'Formal data package handover to third-party accredited registrar (ISO 14065) and Section 106 planning authorities',
          ],
          isoClauses: ['ISO 14065:2020', 'ISO 14025:2006', 'UK CMA Green Claims Code'],
          status: 'READY_FOR_COMMISSIONING',
        },
      ],
    };
  }
}
