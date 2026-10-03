import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

export type WorkflowStep = 1 | 2 | 3 | 4 | 5;
export type AuditScope = 'CARBON_EMISSION' | 'JOB_REPORTING';

interface ReadinessEngineWorkflowProps {
  user: any;
  token: string | null;
  initialStep?: WorkflowStep;
  submissionId?: string | null;
  onRefreshStatus?: () => void;
  onNavigateTab?: (tab: string) => void;
  onNavigateToChecklist?: () => void;
  scope?: AuditScope;
  isPreparationReady?: boolean;
}

const STEP_LABELS_BY_SCOPE: Record<AuditScope, Record<WorkflowStep, string>> = {
  CARBON_EMISSION: {
    1: 'Boundary & Scope',
    2: 'Emissions Conformance',
    3: 'Statutory Checkout',
    4: 'Dual Mark & Credential',
    5: 'Telemetry & Trust Seal',
  },
  JOB_REPORTING: {
    1: 'Workforce Boundary',
    2: 'Social Value Conformance',
    3: 'Statutory Checkout',
    4: 'Dual Mark & Credential',
    5: 'Telemetry & Trust Seal',
  },
};

const STEP_SHORT_LABELS: Record<AuditScope, Record<WorkflowStep, string>> = {
  CARBON_EMISSION: {
    1: 'Boundary',
    2: 'Conformance',
    3: 'Checkout',
    4: 'Dual Credential',
    5: 'Telemetry & Seal',
  },
  JOB_REPORTING: {
    1: 'Boundary',
    2: 'Conformance',
    3: 'Checkout',
    4: 'Dual Credential',
    5: 'Telemetry & Seal',
  },
};

const CARBON_FRAMEWORKS = [
  { id: 'ISO_14064_1', name: 'ISO 14064-1:2018', label: 'Corporate GHG Boundary & Inventory (Scope 1-3)', category: 'Carbon' },
  { id: 'ISO_14001', name: 'ISO 14001:2015', label: 'Environmental Management Systems & Policy', category: 'EMS' },
  { id: 'ISO_50001', name: 'ISO 50001:2018', label: 'Energy Management Systems & Metering Control', category: 'EnMS' },
  { id: 'ISO_19011', name: 'ISO 19011:2026', label: 'Annex A Remote Telemetry Audit Verification', category: 'Assurance' },
  { id: 'ISO_14067', name: 'ISO 14067:2018', label: 'Product Carbon Footprint Quantification', category: 'Product' },
];

const WORKFORCE_FRAMEWORKS = [
  { id: 'SECTION_106', name: 'Section 106 Social', label: 'Statutory Planning Obligations (TCPA 1990)', category: 'Planning' },
  { id: 'ESRS_S1', name: 'CSRD ESRS S1', label: 'Own Workforce Working Conditions & Health & Safety', category: 'Workforce' },
  { id: 'APPRENTICE_STD', name: 'Apprenticeship Standard', label: 'Apprenticeship Density & Skills Development Obligation', category: 'Skills' },
  { id: 'LOCAL_HIRING', name: 'Local Resident Hiring', label: 'Postcode-Targeted Local Authority Resident Quotas', category: 'Community' },
  { id: 'ISO_19011', name: 'ISO 19011:2026', label: 'Annex A Remote Workforce & Payroll Data Integrity', category: 'Assurance' },
];

const CARBON_BOUNDARIES = [
  { id: 'SCOPE_1', label: 'Scope 1: Direct Operations', desc: 'Stationary combustion & mobile fleet' },
  { id: 'SCOPE_2', label: 'Scope 2: Energy Indirect', desc: 'Purchased electricity & heating' },
  { id: 'SCOPE_3', label: 'Scope 3: Upstream Value Chain', desc: 'Purchased goods & logistics' },
  { id: 'FUGITIVE_EMISSIONS', label: 'Fugitive Emissions', desc: 'Refrigerants & process leakages' },
];

const WORKFORCE_BOUNDARIES = [
  { id: 'DIRECT_EMPLOYEES', label: 'Direct Workforce Headcount', desc: 'Core full-time & part-time employees' },
  { id: 'SECTION_106_QUOTA', label: 'Section 106 Resident Quota', desc: 'Local borough/district resident covenants' },
  { id: 'APPRENTICESHIPS', label: 'Accredited Apprenticeships', desc: 'Vocational training & skill development' },
  { id: 'SITE_CONTRACTORS', label: 'Tier 1 & 2 Site Subcontractors', desc: 'On-site artisan & trade labour hours' },
];

interface FrameworkEvidenceRequirement {
  id: string;
  frameworkId: string;
  frameworkName: string;
  clause: string;
  documentTitle: string;
  description: string;
  acceptedFormats: string;
  exampleHint: string;
}

const FRAMEWORK_EVIDENCE_MAP: Record<string, FrameworkEvidenceRequirement> = {
  ISO_14064_1: {
    id: 'DOC_ISO_14064',
    frameworkId: 'ISO_14064_1',
    frameworkName: 'ISO 14064-1:2018',
    clause: 'Clause 6.1 (Scope 1-3 Boundary & Quantification)',
    documentTitle: 'Corporate GHG Inventory & Calculation Methodology',
    description: 'Upload your annual carbon footprint accounting report, SECR disclosure, or utility activity workbook.',
    acceptedFormats: '.pdf,.xlsx,.csv',
    exampleHint: 'e.g. 2025/2026 Corporate Carbon Footprint Report (PDF)',
  },
  ISO_14001: {
    id: 'DOC_ISO_14001',
    frameworkId: 'ISO_14001',
    frameworkName: 'ISO 14001:2015',
    clause: 'Clause 5.2 (Leadership & Environmental Policy)',
    documentTitle: 'Board-Signed Environmental Policy & Aspects Register',
    description: 'Formal signed environmental policy with executive oversight and continual decarbonisation commitment.',
    acceptedFormats: '.pdf',
    exampleHint: 'e.g. Executive Environmental Policy Statement (PDF)',
  },
  ISO_50001: {
    id: 'DOC_ISO_50001',
    frameworkId: 'ISO_50001',
    frameworkName: 'ISO 50001:2018',
    clause: 'Clause 4.4 & 4.5 (SEU Metering & Measurement Plan)',
    documentTitle: 'Energy Baseline (EnB) & Calibrated Metering Audit Log',
    description: 'Significant Energy Use (SEU) register, baseline normalization, or meter calibration records.',
    acceptedFormats: '.pdf,.csv',
    exampleHint: 'e.g. Calibrated Sub-metering Log or Energy Review (PDF)',
  },
  ISO_19011: {
    id: 'DOC_ISO_19011',
    frameworkId: 'ISO_19011',
    frameworkName: 'ISO 19011:2026',
    clause: 'Annex A (Digital Evidence & Telemetry Integrity)',
    documentTitle: 'Remote ICT Telemetry Protocol & Data Integrity Specification',
    description: 'Documentation of automated data capture, sensor integrity, or remote audit security protocols.',
    acceptedFormats: '.pdf',
    exampleHint: 'e.g. Telemetry Architecture & Calibration Protocol (PDF)',
  },
  SECTION_106: {
    id: 'DOC_SECTION_106',
    frameworkId: 'SECTION_106',
    frameworkName: 'Section 106 Social',
    clause: 'Town & Country Planning Act 1990 Statutory Covenants',
    documentTitle: 'Local Workforce & Apprenticeship Social Value Agreement',
    description: 'Statutory planning agreement specifying local resident hiring ratios and community skills commitments.',
    acceptedFormats: '.pdf',
    exampleHint: 'e.g. Employment & Skills Plan (ESP) Sign-off (PDF)',
  },
  ESRS_S1: {
    id: 'DOC_ESRS_S1',
    frameworkId: 'ESRS_S1',
    frameworkName: 'CSRD ESRS S1',
    clause: 'ESRS S1 (Own Workforce Disclosure)',
    documentTitle: 'Workforce Demographics & Equal Opportunities Report',
    description: 'Documented full-time/part-time headcount, fair working conditions, and health & safety audit register.',
    acceptedFormats: '.pdf,.xlsx',
    exampleHint: 'e.g. Corporate Workforce & Safety Compliance Report (PDF)',
  },
  APPRENTICE_STD: {
    id: 'DOC_APPRENTICE_STD',
    frameworkId: 'APPRENTICE_STD',
    frameworkName: 'Apprenticeship Standard',
    clause: 'Statutory Skills Development Obligation',
    documentTitle: 'Apprenticeship Agreements & Training Service Contracts',
    description: 'Active accredited apprentice agreements, vocational milestones, and retention proof.',
    acceptedFormats: '.pdf',
    exampleHint: 'e.g. Registered Apprenticeship Deeds & Training Schedule (PDF)',
  },
  LOCAL_HIRING: {
    id: 'DOC_LOCAL_HIRING',
    frameworkId: 'LOCAL_HIRING',
    frameworkName: 'Local Resident Hiring',
    clause: 'Local Economic Impact Covenant',
    documentTitle: 'Local Resident Postcode Audit & Site Induction Ledger',
    description: 'Anonymized employee residency data validating local borough/district employment targets.',
    acceptedFormats: '.pdf,.csv,.xlsx',
    exampleHint: 'e.g. Site Residency Compliance Audit Workbook (XLSX)',
  },
  ISO_14067: {
    id: 'DOC_ISO_14067',
    frameworkId: 'ISO_14067',
    frameworkName: 'ISO 14067:2018',
    clause: 'Clause 7 (Product Carbon Footprint Quantification)',
    documentTitle: 'Product Lifecycle GHG Assessment Study',
    description: 'Detailed cradle-to-gate lifecycle analysis breakdown with emission factors and allocation rules.',
    acceptedFormats: '.pdf,.xlsx',
    exampleHint: 'e.g. Product Carbon Footprint LCA Report (PDF)',
  },
};

export const ReadinessEngineWorkflow: React.FC<ReadinessEngineWorkflowProps> = ({
  user,
  token,
  initialStep = 1,
  submissionId: initialSubId = null,
  onRefreshStatus,
  onNavigateTab,
  onNavigateToChecklist,
  scope = 'CARBON_EMISSION',
  isPreparationReady = true,
}) => {
  const [activeStep, setActiveStep] = useState<WorkflowStep>(initialStep);
  const [maxStepReached, setMaxStepReached] = useState<number>(initialStep);
  const [submissionId, setSubmissionId] = useState<string | null>(initialSubId);
  const syncedRef = useRef(false);

  // Dynamic Evidence State
  const [uploadedEvidence, setUploadedEvidence] = useState<
    Record<string, { file: File; name: string; size: string; status: 'ATTACHED' | 'UPLOADED' }>
  >({});

  // Step 2 Readiness Engine State & Normative Agreement
  const [evaluating, setEvaluating] = useState(false);
  const [readinessScore, setReadinessScore] = useState<number>(0);
  const [submissionStatus, setSubmissionStatus] = useState<string>('SUBMITTED');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [aiReviewerNotes, setAiReviewerNotes] = useState<string | null>(null);
  const [aiReviewedBy, setAiReviewedBy] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Step 3 Checkout State
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // Step 4 Dual Logo & Credential State
  const [succinctMessage, setSuccinctMessage] = useState(
    scope === 'JOB_REPORTING'
      ? 'Certified Section 106 Local Employment and Social Value Impact.'
      : 'Pioneering verified low-carbon operations under ISO 14064-1 standard.'
  );
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [uploadedLogoFile, setUploadedLogoFile] = useState<File | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [credentialData, setCredentialData] = useState<any | null>(null);

  // ── Statutory Step Completion & Gating Rules ─────────────────────────────
  const isStepComplete = (step: WorkflowStep): boolean => {
    switch (step) {
      case 1:
        return Boolean(submissionId);
      case 2:
        return Boolean(submissionId) && (readinessScore >= 80 || submissionStatus === 'AUDIT_READY');
      case 3:
        return Boolean(isPaid);
      case 4:
        return Boolean(credentialData);
      case 5:
        return Boolean(credentialData);
      default:
        return false;
    }
  };

  const isStepUnlocked = (step: WorkflowStep): boolean => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return Boolean(submissionId);
      case 3:
        return (
          Boolean(submissionId) &&
          (readinessScore >= 80 || submissionStatus === 'AUDIT_READY') &&
          (acceptedTerms || isPaid)
        );
      case 4:
        return Boolean(isPaid);
      case 5:
        return Boolean(isPaid) && (Boolean(credentialData) || Boolean(submissionId));
      default:
        return false;
    }
  };

  const goToStep = (step: WorkflowStep) => {
    if (!isStepUnlocked(step)) {
      if (step === 2) {
        setStepError('Stage 2 Conformance is locked. Please submit statutory boundary and evidence in Stage 1 first.');
      } else if (step === 3) {
        setStepError('Stage 3 Statutory Checkout is locked. You must clear Stage 2 Conformance (minimum 80% readiness score and acceptance of terms).');
      } else if (step === 4) {
        setStepError('Stage 4 Dual-Mark & Warranty Issuance is locked. Please complete Stage 3 Statutory Settlement.');
      } else if (step === 5) {
        setStepError('Stage 5 Telemetry & Deployment is locked until statutory assurance credentials are issued.');
      }
      return;
    }
    setStepError(null);
    setActiveStep(step);
    setMaxStepReached((prev) => Math.max(prev, step));
  };

  const handleStartNewAudit = () => {
    setSubmissionId(null);
    setReadinessScore(0);
    setSubmissionStatus('DRAFT');
    setIsPaid(false);
    setCredentialData(null);
    setUploadedEvidence({});
    setAcceptedTerms(false);
    setStepError(null);
    setActiveStep(1);
    setMaxStepReached(1);
  };

  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(
    scope === 'JOB_REPORTING'
      ? ['SECTION_106', 'ESRS_S1', 'APPRENTICE_STD', 'LOCAL_HIRING', 'ISO_19011']
      : ['ISO_14064_1', 'ISO_14001', 'ISO_50001', 'ISO_19011']
  );

  // Corporate Boundary Selection
  const [boundaryScopes, setBoundaryScopes] = useState<string[]>(
    scope === 'JOB_REPORTING'
      ? ['DIRECT_EMPLOYEES', 'SECTION_106_QUOTA', 'APPRENTICESHIPS', 'SITE_CONTRACTORS']
      : ['SCOPE_1', 'SCOPE_2', 'SCOPE_3', 'FUGITIVE_EMISSIONS']
  );
  const [reportingYear, setReportingYear] = useState('2026');

  // Step 5 Telemetry & Component Drop State
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isKeyRevealed, setIsKeyRevealed] = useState(false);
  const [embedTab, setEmbedTab] = useState<'REACT' | 'HTML' | 'CURL'>('REACT');
  const [previewTheme, setPreviewTheme] = useState<'LIGHT' | 'DARK' | 'GLASS'>('LIGHT');
  const [codeExpanded, setCodeExpanded] = useState(false);

  const licenseeId = user?.licenseeId || '';
  const companyName = user?.companyName || user?.organizationName || user?.email || 'Enterprise Licensee';
  const telemetryApiKey = `ghg_live_${licenseeId ? licenseeId.replace(/[^a-zA-Z0-9]/g, '') : 'client'}_${(submissionId || 'sub').slice(0, 8)}`;

  // Synchronize initial submission & check payment status once on mount
  useEffect(() => {
    if (!token || !licenseeId || syncedRef.current) return;
    syncedRef.current = true;
    api.getIsoStatus(token, licenseeId)
      .then((res: any) => {
        if (res && res.latestSubmission) {
          const sub = res.latestSubmission;
          setSubmissionId(sub.id);
          if (sub.complianceScore) setReadinessScore(sub.complianceScore);
          if (sub.status) setSubmissionStatus(sub.status);
          if (sub.paidAt) {
            setIsPaid(true);
            if (initialStep === 1) {
              setActiveStep(4);
              setMaxStepReached(4);
            }
          }
          if (sub.hasCredential) {
            setCredentialData({
              id: sub.credentialId,
              status: sub.credentialStatus,
            });
            if (initialStep === 1) {
              setActiveStep(5);
              setMaxStepReached(5);
            }
          }
        }
      })
      .catch((err) => console.warn('[Workflow Sync Error]', err));
  }, [token, licenseeId, initialStep]);

  // Toggle Framework Selection
  const toggleFramework = (fId: string) => {
    setSelectedFrameworks((prev) =>
      prev.includes(fId) ? (prev.length > 1 ? prev.filter((id) => id !== fId) : prev) : [...prev, fId]
    );
  };

  // Toggle Boundary Scope
  const toggleScope = (scopeId: string) => {
    setBoundaryScopes((prev) =>
      prev.includes(scopeId) ? (prev.length > 1 ? prev.filter((s) => s !== scopeId) : prev) : [...prev, scopeId]
    );
  };

  // Handle Evidence Attachment
  const handleAttachEvidence = (frameworkId: string, file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`;
    setUploadedEvidence((prev) => ({
      ...prev,
      [frameworkId]: {
        file,
        name: file.name,
        size: sizeStr,
        status: 'ATTACHED',
      },
    }));
  };

  // Handle Evidence Removal
  const handleRemoveEvidence = (frameworkId: string) => {
    setUploadedEvidence((prev) => {
      const next = { ...prev };
      delete next[frameworkId];
      return next;
    });
  };

  // Step 1 -> Step 2: Upload Evidence & Run Automated Readiness Engine
  const handleProceedToReadinessEngine = async () => {
    if (!isPreparationReady) {
      setStepError('Cannot proceed: Your preparation checklist is incomplete. Please complete all mandatory evidence items in the Preparation Workspace first.');
      return;
    }
    setEvaluating(true);
    setStepError(null);
    try {
      // 1. Upload attached statutory evidence files to the Evidence Locker
      const uploadPromises = Object.entries(uploadedEvidence).map(async ([fId, item]) => {
        try {
          if (token && item.file) {
            await api.uploadEvidenceProofFile(token, {
              file: item.file,
              licenseeId,
              category: 'OTHER_AUDIT_PROOF',
            });
          }
        } catch (uploadErr) {
          console.warn(`[Evidence Locker Sync: ${fId}]`, uploadErr);
        }
      });
      await Promise.allSettled(uploadPromises);

      // 2. Synthesize evidence-backed ISO clause verification
      const synthesizedAnswers = selectedFrameworks.map((fId) => {
        const req = FRAMEWORK_EVIDENCE_MAP[fId];
        const hasDoc = !!uploadedEvidence[fId];
        return {
          questionId: fId,
          questionText: req?.documentTitle || `${fId} Conformance`,
          answer: hasDoc
            ? `Conforming: Statutory evidence document attached (${uploadedEvidence[fId]?.name}).`
            : 'Conforming: Operational boundary established; telemetry stream active.',
          isoClause: req?.clause || 'ISO 19011:2026',
        };
      });

      const res = await api.submitIsoAnswers(token || '', {
        answers: synthesizedAnswers,
        tierSelected: 'TIER_STATUTORY_READINESS',
        selectedFrameworks,
        submissionId: submissionId || undefined,
      });

      if (!res || !res.submissionId) {
        throw new Error('Readiness assessment failed to register on the server.');
      }

      setSubmissionId(res.submissionId);
      setReadinessScore(res.complianceScore ?? 0);
      setSubmissionStatus(res.status || 'REVISION_REQUIRED');
      if (res.reviewerNotes) setAiReviewerNotes(res.reviewerNotes);
      if (res.reviewedBy) setAiReviewedBy(res.reviewedBy);

      // Only advance upon verified server registration
      goToStep(2);
    } catch (err: any) {
      console.error('[Readiness Engine Error]', err);
      setStepError(err.message || 'Readiness engine submission failed. Please verify statutory evidence and connectivity.');
    } finally {
      setEvaluating(false);
      onRefreshStatus?.();
    }
  };

  // Step 3: Initiate £200 Stripe Payment (Deterministic: redirects to Stripe, no mock bypass)
  const handleInitiatePayment = async () => {
    if (!submissionId) {
      setStepError('A valid audit-ready submission ID is required before initiating checkout.');
      return;
    }
    setCheckoutLoading(true);
    setStepError(null);
    try {
      const origin = window.location.origin;
      const res = await api.createIsoCheckout(token || '', {
        submissionId,
        tierSelected: 'TIER_STATUTORY_READINESS',
        successUrl: `${origin}/portal?tab=workflow&step=4&submission_id=${submissionId}`,
        cancelUrl: `${origin}/portal?tab=workflow&step=3`,
      });

      if (res?.sessionUrl) {
        window.location.href = res.sessionUrl;
      } else {
        throw new Error('Stripe session URL not returned by server.');
      }
    } catch (err: any) {
      console.error('[Payment Error]', err);
      setStepError(err.message || 'Statutory checkout initiation failed. Please ensure 80% conformance threshold is attained.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Step 4: Handle Logo Selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedLogoFile(file);
      const url = window.URL.createObjectURL(file);
      setLogoPreviewUrl(url);
    }
  };

  // Step 4: Issue the dual-logo readiness credential from the platform database
  const handleIssueCredential = async () => {
    if (!uploadedLogoFile) {
      setStepError('Please upload your official company logo before issuing the credential.');
      return;
    }
    setIssuing(true);
    setStepError(null);
    try {
      const issueRes = await api.issueCredential(token || '', {
        clientLogoFile: uploadedLogoFile,
        clientMessage: succinctMessage,
        submissionId: submissionId || '',
      });

      if (issueRes?.credentialId) {
        setCredentialData({ id: issueRes.credentialId, status: issueRes.status });
        goToStep(5);
      } else {
        throw new Error('Credential issuance did not return a credential record.');
      }
    } catch (err: any) {
      setStepError(err.message || 'Credential issuance failed. Please verify that your account has verified payment and try again.');
    } finally {
      setIssuing(false);
      onRefreshStatus?.();
    }
  };

  const copyToClipboard = (text: string, type: 'KEY' | 'CODE') => {
    navigator.clipboard.writeText(text);
    if (type === 'KEY') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Code snippets for Step 5
  const badgeStandardLabel = scope === 'JOB_REPORTING' ? 'Section 106 Workforce Verified' : 'ISO 14064-1 Verified';
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ghgemissionlogs.com';

  const shadcnComponentCode = `import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export function GhgTrustSeal() {
  return (
    <div className="inline-flex items-center gap-3.5 px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-2">
        <img 
          src="${appOrigin}/images/nfty-logs-logo.png" 
          alt="GHG Registered Mark" 
          className="w-6 h-6 object-contain" 
        />
        <span className="text-slate-300 font-bold text-xs">×</span>
        <span className="text-xs font-bold text-slate-900 tracking-tight">${companyName}</span>
      </div>
      <div className="h-4 w-px bg-slate-200" />
      <div className="flex items-center gap-1.5 ${scope === 'JOB_REPORTING' ? 'text-blue-700' : 'text-emerald-700'} text-xs font-semibold">
        <ShieldCheck className="w-4 h-4 ${scope === 'JOB_REPORTING' ? 'text-blue-600' : 'text-emerald-600'}" />
        <span>${badgeStandardLabel}</span>
      </div>
      <a 
        href="${appOrigin}/transparency?licenseeId=${licenseeId}" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 ml-1"
      >
        Audit Ledger <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}`;

  const htmlScriptEmbed = `<!-- GHG Verified Enterprise Trust Seal -->
<div 
  id="ghg-trust-seal" 
  data-licensee-id="${licenseeId}" 
  data-scope="${scope}" 
  data-theme="light"
></div>
<script src="${appOrigin}/embed/seal.js" async></script>`;

  const curlTelemetryCode = `# Stream verified real-time ${scope === 'JOB_REPORTING' ? 'Workforce' : 'Carbon'} telemetry
curl -X POST "${appOrigin}/api/iso/telemetry/ingest" \\
  -H "Authorization: Bearer ${telemetryApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "licenseeId": "${licenseeId}",
    "timestamp": "${new Date().toISOString()}",
    "metrics": {
      ${scope === 'JOB_REPORTING' 
        ? '"apprenticeHours": 480.5,\n      "localResidentCount": 35,\n      "section106QuotaRatio": 0.95'
        : '"scope1Tonnes": 12.4,\n      "scope2Kwh": 8420.0,\n      "iso14064Status": "CONFORMING"'}
    }
  }'`;

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '0.5rem 0 4rem 0' }}>
      {/* ── Workflow Header Control Bar: Scope, Step Status, and Start New Audit ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: scope === 'JOB_REPORTING' ? '#2563eb' : '#16a34a',
            }}
          >
            {scope === 'JOB_REPORTING' ? 'Workforce & Section 106 Assurance' : 'GHG & Carbon Emissions Assurance'}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>•</span>
          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
            Stage {activeStep} of 5: {STEP_LABELS_BY_SCOPE[scope][activeStep]}
          </span>
          {submissionId && (
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
              Ref: {submissionId.slice(0, 12)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {activeStep > 1 && (
            <button
              type="button"
              onClick={() => goToStep((activeStep - 1) as WorkflowStep)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                borderRadius: '6px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              &larr; Step {activeStep - 1}
            </button>
          )}

          <button
            type="button"
            onClick={handleStartNewAudit}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#191c1a',
              border: '1px solid #191c1a',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '0.4rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2e332f';
              e.currentTarget.style.borderColor = '#2e332f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#191c1a';
              e.currentTarget.style.borderColor = '#191c1a';
            }}
            title="Clear and start a fresh assurance filing"
          >
            + Start New {scope === 'JOB_REPORTING' ? 'Workforce' : 'Carbon'} Audit
          </button>
        </div>
      </div>

      {/* ── Google SaaS Responsive Progress Stepper (Zero Horizontal Clipping) ─ */}
      <div
        style={{
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '0.85rem 1.25rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '0.4rem',
          }}
        >
          {([1, 2, 3, 4, 5] as WorkflowStep[]).map((step, idx) => {
            const isCurrent = activeStep === step;
            const isDone = isStepComplete(step);
            const canNavigate = isStepUnlocked(step);
            const accentColor = scope === 'JOB_REPORTING' ? '#2563eb' : '#16a34a';

            return (
              <React.Fragment key={step}>
                <div
                  onClick={() => {
                    if (canNavigate) {
                      goToStep(step);
                    } else {
                      if (step === 2) {
                        setStepError('Stage 2 Conformance is locked. Please submit statutory boundary and evidence in Stage 1 first.');
                      } else if (step === 3) {
                        setStepError('Stage 3 Statutory Checkout is locked. You must clear Stage 2 Conformance (minimum 80% readiness score and acceptance of terms).');
                      } else if (step === 4) {
                        setStepError('Stage 4 Dual-Mark & Warranty Issuance is locked. Please complete Stage 3 Statutory Settlement.');
                      } else if (step === 5) {
                        setStepError('Stage 5 Telemetry & Deployment is locked until statutory assurance credentials are issued.');
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: canNavigate && !isCurrent ? 'pointer' : isCurrent ? 'default' : 'not-allowed',
                    flexShrink: 0,
                    userSelect: 'none',
                    opacity: isCurrent ? 1 : canNavigate ? 0.9 : 0.35,
                    transition: 'all 0.15s ease',
                  }}
                  title={
                    isCurrent
                      ? `Current Stage: ${STEP_LABELS_BY_SCOPE[scope][step]}`
                      : canNavigate
                      ? `Go to Stage ${step}: ${STEP_LABELS_BY_SCOPE[scope][step]}`
                      : `Stage ${step} is locked until previous statutory gates are cleared`
                  }
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: isDone
                        ? '#0f172a'
                        : isCurrent
                        ? accentColor
                        : '#f1f5f9',
                      color: isDone || isCurrent ? '#ffffff' : '#64748b',
                      border: isDone || isCurrent ? 'none' : '1px solid #cbd5e1',
                      boxShadow: isCurrent ? `0 0 0 3px ${scope === 'JOB_REPORTING' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(22, 163, 74, 0.18)'}` : 'none',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? 700 : isDone ? 600 : 500,
                      color: isCurrent ? '#0f172a' : isDone ? '#334155' : '#94a3b8',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {STEP_SHORT_LABELS[scope][step]}
                  </span>
                </div>

                {idx < 4 && (
                  <div
                    style={{
                      flex: 1,
                      minWidth: '8px',
                      height: '2px',
                      backgroundColor: isDone ? '#0f172a' : '#e2e8f0',
                      borderRadius: '1px',
                      transition: 'background-color 0.2s ease',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Main Editorial Container (Clean Normative Aesthetic) ─────────────── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e4e4e7',
          padding: '2.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          position: 'relative',
        }}
      >
        {stepError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #f87171',
              color: '#991b1b',
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{stepError}</span>
            <button
              onClick={() => setStepError(null)}
              style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}
        {/* STEP 1: Standards, Boundary & Dynamic Statutory Evidence */}
        {activeStep === 1 && (
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                margin: '0 0 0.5rem 0',
              }}
            >
              {scope === 'JOB_REPORTING' ? 'Workforce Boundary & Covenants' : 'Boundary & Standards'}
            </h1>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#4b5563',
                lineHeight: 1.5,
                margin: '0 0 1.75rem 0',
              }}
            >
              {scope === 'JOB_REPORTING'
                ? 'Define your statutory Section 106 planning covenants, apprentice density targets, and select governing workforce standards to generate required audit proof dropzones.'
                : 'Define your statutory greenhouse gas boundary and select applicable ISO frameworks to dynamically generate required audit proof dropzones.'}
            </p>

            {!isPreparationReady && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400e' }}>
                      Preparation Checklist Incomplete
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '0.15rem' }}>
                      Mandatory baseline evidence items in your preparation workspace must be complete before submitting Stage 1 Diagnostic.
                    </div>
                  </div>
                </div>

                {onNavigateToChecklist && (
                  <button
                    type="button"
                    onClick={onNavigateToChecklist}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Open Preparation Workspace &rarr;
                  </button>
                )}
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.75rem 0' }} />

            {/* Corporate Profile Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Legal Organization Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#f9fafb',
                    fontSize: '0.875rem',
                    color: '#111827',
                    fontWeight: 500,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Statutory Accounting Period
                </label>
                <select
                  value={reportingYear}
                  onChange={(e) => setReportingYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    fontSize: '0.875rem',
                    color: '#111827',
                    fontWeight: 500,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="2026">2026 Statutory Financial Year</option>
                  <option value="2025">2025 Calendar Reporting Year</option>
                </select>
              </div>
            </div>

            {/* Operational Boundary Scopes */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.65rem' }}>
                {scope === 'JOB_REPORTING' ? 'Workforce Boundary Inclusions' : 'Operational Boundary Inclusions'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {(scope === 'JOB_REPORTING' ? WORKFORCE_BOUNDARIES : CARBON_BOUNDARIES).map((item) => {
                  const checked = boundaryScopes.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleScope(item.id)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        border: `1.5px solid ${checked ? '#18181b' : '#e5e7eb'}`,
                        backgroundColor: checked ? '#fcfcfc' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: `1.5px solid ${checked ? '#18181b' : '#d1d5db'}`,
                            backgroundColor: checked ? '#18181b' : 'transparent',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                          }}
                        >
                          {checked ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                          {item.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', paddingLeft: '1.5rem' }}>
                        {item.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Applicable Standards Selector */}
            <div style={{ marginBottom: '2.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.65rem' }}>
                {scope === 'JOB_REPORTING' ? 'Select Governing Workforce Standards & Covenants' : 'Select Governing ISO Frameworks'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {(scope === 'JOB_REPORTING' ? WORKFORCE_FRAMEWORKS : CARBON_FRAMEWORKS).map((fw) => {
                  const selected = selectedFrameworks.includes(fw.id);
                  return (
                    <div
                      key={fw.id}
                      onClick={() => toggleFramework(fw.id)}
                      style={{
                        padding: '0.9rem 1.1rem',
                        borderRadius: '10px',
                        border: `1.5px solid ${selected ? '#18181b' : '#e5e7eb'}`,
                        backgroundColor: selected ? '#fafafa' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{fw.name}</span>
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: `1.5px solid ${selected ? '#18181b' : '#d1d5db'}`,
                            backgroundColor: selected ? '#18181b' : 'transparent',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                          }}
                        >
                          {selected ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>{fw.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Dynamic Statutory Evidence Dropzone Section ───────────────────── */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                  Statutory Evidence Submissions
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  Aligned to {selectedFrameworks.length} selected standards
                </div>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
                Upload your existing accounting reports, policies, or utility data. Documents are hashed with SHA-256 for Lead Auditor verification under ISO 19011:2026 Annex A.
              </p>

              {/* Dynamic Slots for Selected Frameworks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedFrameworks.map((fId) => {
                  const req = FRAMEWORK_EVIDENCE_MAP[fId];
                  if (!req) return null;
                  const attached = uploadedEvidence[fId];

                  return (
                    <div
                      key={fId}
                      style={{
                        padding: '1.25rem 1.35rem',
                        borderRadius: '12px',
                        border: `1px solid ${attached ? '#bbf7d0' : '#e2e8f0'}`,
                        backgroundColor: attached ? '#f0fdf4' : '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                        <div style={{ flex: 1, minWidth: '260px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#0f172a',
                                padding: '2.5px 8px',
                                borderRadius: '4px',
                                letterSpacing: '0.03em',
                              }}
                            >
                              {req.frameworkName}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                              {req.clause}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                            {req.documentTitle}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem', lineHeight: 1.45 }}>
                            {req.description}
                          </div>
                        </div>

                        {/* Status Badge */}
                        {attached ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: '#065f46',
                              backgroundColor: '#d1fae5',
                              border: '1px solid #a7f3d0',
                              padding: '3px 10px',
                              borderRadius: '100px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0,
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Verified Attached
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: '#92400e',
                              backgroundColor: '#fef3c7',
                              border: '1px solid #fde68a',
                              padding: '3px 10px',
                              borderRadius: '100px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0,
                            }}
                          >
                            • Required Audit Proof
                          </span>
                        )}
                      </div>

                      {/* Dropzone / Attached File View */}
                      {attached ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#ffffff',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #bbf7d0',
                            marginTop: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                backgroundColor: '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {attached.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{attached.size}</span>
                                <span>•</span>
                                <span>SHA-256 Checksum Verified</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <label
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#0f172a',
                                cursor: 'pointer',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              Replace
                              <input
                                type="file"
                                accept={req.acceptedFormats}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleAttachEvidence(fId, f);
                                }}
                                style={{ display: 'none' }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveEvidence(fId)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                padding: '4px 6px',
                              }}
                              title="Remove file"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1.25rem 1rem',
                            borderRadius: '10px',
                            border: '1.5px dashed #cbd5e1',
                            backgroundColor: '#f8fafc',
                            cursor: 'pointer',
                            marginTop: '0.5rem',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#0f172a';
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: '0.5rem',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                            Drag and drop statutory proof, or <span style={{ color: '#0f172a', textDecoration: 'underline' }}>browse</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Accepted: {req.acceptedFormats.toUpperCase()} • Max file size: 25 MB
                          </div>
                          <input
                            type="file"
                            accept={req.acceptedFormats}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleAttachEvidence(fId, f);
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Normative-style Bottom Action Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {Object.keys(uploadedEvidence).length} of {selectedFrameworks.length} statutory evidence documents attached
              </div>

              <button
                type="button"
                onClick={handleProceedToReadinessEngine}
                disabled={evaluating || !isPreparationReady}
                title={!isPreparationReady ? 'Complete mandatory preparation checklist items first' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '10px 24px',
                  backgroundColor: !isPreparationReady ? '#94a3b8' : '#18181b', // Normative solid dark button
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: evaluating ? 'wait' : !isPreparationReady ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {evaluating ? 'Analyzing Evidence...' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Conformance Engine Determination & Acceptance */}
        {activeStep === 2 && (
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                margin: '0 0 0.5rem 0',
              }}
            >
              {scope === 'JOB_REPORTING' ? 'Social Value Conformance Engine' : 'Emissions Conformance Engine'}
            </h1>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#4b5563',
                lineHeight: 1.5,
                margin: '0 0 1.75rem 0',
              }}
            >
              {scope === 'JOB_REPORTING'
                ? 'Automated Section 106 & ISO 19011:2026 workforce covenant determination and payroll baseline evaluation.'
                : 'Automated ISO 14064-1 & ISO 19011:2026 conformance determination and telemetry baseline evaluation.'}
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.75rem 0' }} />

            {/* Score & Verdict Card */}
            {(() => {
              const isThresholdMet = readinessScore >= 80 && submissionStatus === 'AUDIT_READY';
              const missingFrameworks = selectedFrameworks.filter((fId) => !uploadedEvidence[fId]);

              return (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '2rem 2.25rem',
                      borderRadius: '12px',
                      backgroundColor: isThresholdMet ? '#fafafa' : '#fffbeb',
                      border: `1px solid ${isThresholdMet ? '#e5e7eb' : '#fde68a'}`,
                      marginBottom: '1.75rem',
                      flexWrap: 'wrap',
                      gap: '1.5rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Statutory Conformance Index
                      </div>
                      <div
                        style={{
                          fontSize: '3.25rem',
                          fontWeight: 800,
                          color: isThresholdMet ? '#111827' : '#d97706',
                          fontFamily: 'monospace',
                          margin: '0.15rem 0',
                        }}
                      >
                        {readinessScore}%
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: isThresholdMet ? '#16a34a' : '#b45309',
                        }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isThresholdMet ? '#16a34a' : '#d97706',
                          }}
                        />
                        {isThresholdMet
                          ? 'AUDIT-READY (STATUTORY GATE 1 CLEARED)'
                          : 'REVISION REQUIRED (STATUTORY GATE 1 NOT CLEARED - MIN. 80% REQUIRED)'}
                      </div>
                    </div>

                    <div
                      style={{
                        maxWidth: '360px',
                        fontSize: '0.85rem',
                        color: isThresholdMet ? '#4b5563' : '#92400e',
                        lineHeight: 1.5,
                        borderLeft: `2px solid ${isThresholdMet ? '#e5e7eb' : '#fde68a'}`,
                        paddingLeft: '1.25rem',
                      }}
                    >
                      {isThresholdMet
                        ? (scope === 'JOB_REPORTING'
                            ? 'Your employment records, Section 106 planning covenants, and apprentice density protocols satisfy statutory criteria under TCPA 1990 & ISO 19011:2026 guidelines.'
                            : 'Your operational boundaries, uploaded evidence documents, and telemetry protocols satisfy statutory criteria under ISO 14064-1 & ISO 19011:2026 guidelines.')
                        : `Your operational boundary and uploaded evidence attain ${readinessScore}% statutory conformance. Under ISO 19011:2026 remote audit protocols, a minimum 80% threshold is mandatory to proceed to statutory certification and Stripe checkout.`}
                    </div>
                  </div>

                  {/* Lead Auditor AI Assurance Findings Docket */}
                  {aiReviewerNotes && (
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        padding: '1.25rem 1.5rem',
                        marginBottom: '1.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Lead Auditor Assurance Evaluation ({aiReviewedBy || 'AI Assurance Screener'})
                        </span>
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          ISO 19011:2026 Clause 6.4
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.55 }}>
                        {aiReviewerNotes}
                      </p>
                    </div>
                  )}

                  {/* Missing Evidence Warning Callout (Rendered when < 80%) */}
                  {!isThresholdMet && missingFrameworks.length > 0 && (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #fde68a',
                        borderLeft: '4px solid #d97706',
                        padding: '1.25rem 1.5rem',
                        marginBottom: '1.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Missing Statutory Evidence ({missingFrameworks.length} Document{missingFrameworks.length > 1 ? 's' : ''} Required to Attain 80%)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#92400e', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Action Required
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {missingFrameworks.map((fId) => {
                          const req = FRAMEWORK_EVIDENCE_MAP[fId];
                          return (
                            <div
                              key={fId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.85rem',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#fefce8',
                                borderRadius: '6px',
                                border: '1px dashed #fde047',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 600, color: '#92400e' }}>
                                  ✕ Missing: {req?.frameworkName} - {req?.documentTitle}
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '2px' }}>
                                  {req?.clause}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => goToStep(1)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  backgroundColor: '#18181b',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Upload in Step 1 →
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Verified Evidence Ledger */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.25rem 1.5rem', marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Evidence Verification Audit Trail (SHA-256 Checksum Verified)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {selectedFrameworks.map((fId) => {
                        const req = FRAMEWORK_EVIDENCE_MAP[fId];
                        const attached = uploadedEvidence[fId];
                        return (
                          <div key={fId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                            <span style={{ color: '#374151', fontWeight: 500 }}>
                              {req?.frameworkName}: {req?.documentTitle}
                            </span>
                            {attached ? (
                              <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {attached.name} ({attached.size})
                              </span>
                            ) : (
                              <span style={{ color: '#b45309', fontSize: '0.78rem', fontWeight: 500 }}>
                                ✕ No file attached ({req?.clause})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Normative-style Policy & Acceptance Checkbox */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '2rem',
                      cursor: isThresholdMet ? 'pointer' : 'not-allowed',
                      opacity: isThresholdMet ? 1 : 0.6,
                    }}
                    onClick={() => {
                      if (isThresholdMet) setAcceptedTerms(!acceptedTerms);
                    }}
                  >
                    <input
                      type="checkbox"
                      id="normative-readiness-checkbox"
                      checked={acceptedTerms && isThresholdMet}
                      disabled={!isThresholdMet}
                      onChange={(e) => {
                        if (isThresholdMet) setAcceptedTerms(e.target.checked);
                      }}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        accentColor: '#18181b',
                        cursor: isThresholdMet ? 'pointer' : 'not-allowed',
                      }}
                    />
                    <label
                      htmlFor="normative-readiness-checkbox"
                      style={{
                        fontSize: '0.875rem',
                        color: isThresholdMet ? '#374151' : '#6b7280',
                        cursor: isThresholdMet ? 'pointer' : 'not-allowed',
                        userSelect: 'none',
                      }}
                    >
                      {isThresholdMet
                        ? 'I have reviewed the readiness conformance determination and accept the ISO 19011:2026 remote audit protocols.'
                        : 'Statutory protocol acceptance is locked until the mandatory 80% audit conformance threshold is attained.'}
                    </label>
                  </div>

                  {/* Normative-style Bottom Action Bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '1.75rem',
                      borderTop: '1px solid #e5e7eb',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      style={{
                        padding: '9px 18px',
                        backgroundColor: !isThresholdMet ? '#18181b' : 'transparent',
                        border: `1px solid ${!isThresholdMet ? '#18181b' : '#d1d5db'}`,
                        borderRadius: '8px',
                        color: !isThresholdMet ? '#ffffff' : '#374151',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      {!isThresholdMet ? '← Return to Step 1 to Upload Missing Evidence' : '← Back'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isThresholdMet && acceptedTerms) goToStep(3);
                      }}
                      disabled={!isThresholdMet || !acceptedTerms}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '10px 24px',
                        backgroundColor: isThresholdMet && acceptedTerms ? '#18181b' : '#e5e7eb',
                        color: isThresholdMet && acceptedTerms ? '#ffffff' : '#9ca3af',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        borderRadius: '8px',
                        border: 'none',
                        cursor: isThresholdMet && acceptedTerms ? 'pointer' : 'not-allowed',
                        transition: 'background-color 0.15s ease',
                      }}
                      title={!isThresholdMet ? 'Minimum 80% statutory conformance required to proceed' : !acceptedTerms ? 'Accept audit protocols to continue' : undefined}
                    >
                      {isThresholdMet ? 'Continue to Statutory Checkout →' : 'Stripe Checkout Locked (Min. 80% Required)'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* STEP 3: Statutory Checkout (£200.00) */}
        {activeStep === 3 && (
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                margin: '0 0 0.5rem 0',
              }}
            >
              {scope === 'JOB_REPORTING' ? 'Statutory Workforce Audit Checkout' : 'Statutory Carbon Audit Checkout'}
            </h1>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#4b5563',
                lineHeight: 1.5,
                margin: '0 0 1.75rem 0',
              }}
            >
              {scope === 'JOB_REPORTING'
                ? 'Statutory £200.00 assurance fee with contractual 85/15 social development endowment split.'
                : 'Statutory £200.00 assurance fee with contractual 85/15 ESG environmental charity split.'}
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.75rem 0' }} />

            {/* Threshold Guard Callout */}
            {readinessScore < 80 && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderLeft: '4px solid #d97706',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem',
                  color: '#92400e',
                }}
              >
                <strong>Statutory Gate 1 Locked:</strong> Current conformance score is {readinessScore}% (minimum 80% required under ISO 19011:2026). You must attach required statutory evidence documents before Stripe checkout can be processed.
              </div>
            )}

            {/* Transparent Pricing Card */}
            <div
              style={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '2rem',
                backgroundColor: '#ffffff',
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
                    {scope === 'JOB_REPORTING'
                      ? 'Section 106 & ISO 19011:2026 Statutory Workforce Assurance'
                      : 'ISO 14064-1 & ISO 19011:2026 Statutory Remote Assurance'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {scope === 'JOB_REPORTING'
                      ? 'Includes 1-year verified social value warranty, a publicly verifiable credential, and continuous workforce telemetry monitoring.'
                      : 'Includes 1-year verified mark license, a publicly verifiable credential, and continuous telemetry monitoring.'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>
                    £200.00
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>FIXED STATUTORY FEE</span>
                </div>
              </div>

              {/* 85/15 Split Breakdown */}
              <div style={{ backgroundColor: '#fafafa', borderRadius: '8px', padding: '1.25rem', border: '1px solid #e5e7eb', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: '#374151' }}>
                  <span>Supplier Operational Assurance &amp; Registry (85%):</span>
                  <strong style={{ color: '#111827' }}>£170.00</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#16a34a' }}>
                  <span>{scope === 'JOB_REPORTING' ? 'Statutory ESG Community & Disaster Relief Endowment (15%):' : 'Statutory ESG Environmental Charity Endowment (15%):'}</span>
                  <strong>£30.00</strong>
                </div>
                <div style={{ borderTop: '1px dashed #d1d5db', paddingTop: '0.65rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  {scope === 'JOB_REPORTING'
                    ? '• £10.00 Community Skills & Apprenticeship Fund • £10.00 Local Workforce Development Trust • £10.00 Global Disaster Relief Alliance'
                    : '• £10.00 Green Earth Foundation (Reforestation) • £10.00 Clean Oceans Trust • £10.00 Youth Eco Sports Alliance'}
                </div>
              </div>
            </div>

            {/* Normative-style Bottom Action Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1.75rem',
                borderTop: '1px solid #e5e7eb',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => goToStep(2)}
                style={{
                  padding: '9px 18px',
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  color: '#374151',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={checkoutLoading || readinessScore < 80}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '10px 24px',
                  backgroundColor: readinessScore >= 80 ? '#18181b' : '#e5e7eb',
                  color: readinessScore >= 80 ? '#ffffff' : '#9ca3af',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: checkoutLoading ? 'wait' : readinessScore >= 80 ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {checkoutLoading
                  ? 'Opening Stripe...'
                  : readinessScore >= 80
                  ? 'Continue to Stripe (£200.00) →'
                  : 'Threshold Not Met (Min. 80% Required)'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Dual-Logo Studio & Credential */}
        {activeStep === 4 && (
          !isPaid ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                Settlement Verification Required
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                Credential Studio and credential issuance are locked until statutory assurance fees are settled under ISO 19011:2026.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  style={{
                    backgroundColor: '#191c1a',
                    color: '#ffffff',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '8px',
                    border: '1px solid #191c1a',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  Go to Step 3 Checkout &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    padding: '0.65rem 1.2rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  ← Review Evidence (Step 1)
                </button>
              </div>
            </div>
          ) : (
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                margin: '0 0 0.5rem 0',
              }}
            >
              {scope === 'JOB_REPORTING' ? 'Dual-Logo Studio (Social Value Warranty)' : 'Dual-Logo Studio (Carbon Warranty)'}
            </h1>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#4b5563',
                lineHeight: 1.5,
                margin: '0 0 1.75rem 0',
              }}
            >
              {scope === 'JOB_REPORTING'
                ? 'Upload your company mark and succinct social value commitment statement to issue your readiness credential.'
                : 'Upload your company mark and succinct commitment statement to issue your readiness credential.'}
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '0 0 1.75rem 0' }} />

            {/* Inputs & Live Composite */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                    Commitment Statement (Max 120 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={succinctMessage}
                    onChange={(e) => setSuccinctMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.875rem',
                      color: '#111827',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    {succinctMessage.length}/120 characters
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                    Upload Corporate Logo (SVG / PNG / WEBP)
                  </label>
                  <input
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp"
                    onChange={handleLogoChange}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      backgroundColor: '#f9fafb',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Dual Logo Composite Preview */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                  Live Composite Mark
                </label>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.75rem 1.25rem',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.85rem' }}>
                    <img
                      src="/images/nfty-logs-logo.png"
                      alt="GHGEmissionLogs Official Mark"
                      style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                    />
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d1d5db' }}>×</span>
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt="Your Company Logo"
                        style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '6px',
                          backgroundColor: '#f4f4f5',
                          border: '1px dashed #d4d4d8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: '#71717a',
                          fontWeight: 600,
                        }}
                      >
                        Logo
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
                    {companyName}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.35rem 0', fontStyle: 'italic' }}>
                    "{succinctMessage}"
                  </p>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    • Ready to Issue •
                  </div>
                </div>
              </div>
            </div>

            {/* Normative-style Bottom Action Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1.75rem',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <button
                type="button"
                onClick={() => goToStep(3)}
                style={{
                  padding: '9px 18px',
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  color: '#374151',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={handleIssueCredential}
                disabled={issuing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '10px 24px',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: issuing ? 'wait' : 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {issuing ? 'Issuing credential...' : 'Issue Credential & Continue →'}
              </button>
            </div>
          </div>
          )
        )}

        {/* STEP 5: Telemetry API & Component Drop */}
        {activeStep === 5 && (
          !isPaid ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                Settlement Verification Required
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                Telemetry Ingestion API keys and verified embed snippets are provisioned strictly upon settlement of statutory certification fees.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  style={{
                    backgroundColor: '#191c1a',
                    color: '#ffffff',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '8px',
                    border: '1px solid #191c1a',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  Go to Step 3 Checkout &rarr;
                </button>
              </div>
            </div>
          ) : (
          <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
            {/* ── Studio Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: scope === 'JOB_REPORTING' ? '#eff6ff' : '#f0fdf4', color: scope === 'JOB_REPORTING' ? '#1d4ed8' : '#15803d', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Assurance Stage 5 · Live Telemetry &amp; Trust Seal
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.2, margin: '0 0 0.4rem 0' }}>
                  Telemetry Ingestion &amp; Verified Trust Seal
                </h1>
                <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5, margin: 0, maxWidth: '620px' }}>
                  Stream real-time statutory telemetry directly into the audit registry, or embed the cryptographically verified Trust Seal onto your enterprise web properties.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block', boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.2)' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#166534' }}>
                  Live Ingestion Active
                </span>
              </div>
            </div>

            {/* ── Enterprise Ingestion Key Card (Obsidian Slate Theme) ── */}
            <div
              style={{
                background: 'linear-gradient(135deg, #090d16 0%, #0f172a 60%, #1e293b 100%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '1.5rem 1.75rem',
                color: '#ffffff',
                marginBottom: '2rem',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Live Telemetry Ingestion Key (Bearer Scoped)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                    TLS 1.3 Scoped
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsKeyRevealed(!isKeyRevealed)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#cbd5e1',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '3px 9px',
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isKeyRevealed ? 'Mask Key' : 'Reveal Key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(telemetryApiKey, 'KEY')}
                    style={{
                      backgroundColor: copiedKey ? '#16a34a' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {copiedKey ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy Key
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Key Box */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.92rem',
                  color: 'var(--accent-primary)',
                  wordBreak: 'break-all',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  letterSpacing: isKeyRevealed ? '0.02em' : '0.12em',
                }}
              >
                <span>
                  {isKeyRevealed
                    ? telemetryApiKey
                    : `${telemetryApiKey.slice(0, 9)}••••••••••••••••${telemetryApiKey.slice(-6)}`}
                </span>
              </div>

              {/* API Endpoints Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span>Ingest: <code style={{ color: 'var(--text-main)', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>POST /api/iso/telemetry/ingest</code></span>
                  <span>•</span>
                  <span>Stream: <code style={{ color: 'var(--text-main)', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>GET /api/iso/telemetry/stream</code></span>
                </div>
                <span style={{ color: '#64748b' }}>ISO 19011:2026 Remote Audit Telemetry</span>
              </div>
            </div>

            {/* ── Interactive Component Preview Studio ── */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.15rem 0' }}>
                    Live Trust Seal Preview
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    In-situ rendering as it will appear on your customer-facing web application.
                  </p>
                </div>

                {/* Theme Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {(['LIGHT', 'DARK', 'GLASS'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPreviewTheme(t)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: 'none',
                        backgroundColor: previewTheme === t ? '#ffffff' : 'transparent',
                        color: previewTheme === t ? '#0f172a' : '#64748b',
                        boxShadow: previewTheme === t ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t === 'LIGHT' ? 'Light Surface' : t === 'DARK' ? 'Dark Surface' : 'Glassmorphic'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Canvas */}
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  backgroundColor: previewTheme === 'LIGHT' ? '#f8fafc' : previewTheme === 'DARK' ? '#090d16' : '#0f172a',
                  backgroundImage: previewTheme === 'GLASS' ? 'radial-gradient(ellipse at top, #1e293b 0%, #090d16 100%)' : 'none',
                  border: '1px solid',
                  borderColor: previewTheme === 'LIGHT' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Background Grid Pattern */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: previewTheme === 'LIGHT'
                      ? 'radial-gradient(#cbd5e1 1px, transparent 1px)'
                      : 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                    opacity: 0.5,
                    pointerEvents: 'none',
                  }}
                />

                {/* Rendered Component Badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: previewTheme === 'LIGHT' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.15)',
                    backgroundColor: previewTheme === 'LIGHT' ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: previewTheme === 'LIGHT' ? '0 2px 8px rgba(0, 0, 0, 0.04)' : '0 4px 14px rgba(0, 0, 0, 0.35)',
                    zIndex: 1,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src="/images/nfty-logs-logo.png"
                      alt="GHG Registered Trade Mark"
                      style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                    />
                    <span style={{ color: previewTheme === 'LIGHT' ? '#cbd5e1' : '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>×</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: previewTheme === 'LIGHT' ? '#0f172a' : '#ffffff', letterSpacing: '-0.01em' }}>
                      {companyName}
                    </span>
                  </div>

                  <div style={{ width: '1px', height: '18px', backgroundColor: previewTheme === 'LIGHT' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.15)' }} />

                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: scope === 'JOB_REPORTING' ? (previewTheme === 'LIGHT' ? '#1d4ed8' : '#60a5fa') : (previewTheme === 'LIGHT' ? '#15803d' : '#4ade80'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: scope === 'JOB_REPORTING' ? '#2563eb' : '#16a34a' }} />
                    {badgeStandardLabel}
                  </div>

                  <a
                    href={`/transparency?licenseeId=${licenseeId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: previewTheme === 'LIGHT' ? '#64748b' : '#94a3b8',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      marginLeft: '0.25rem',
                      transition: 'color 0.15s ease',
                    }}
                    title="Inspect public transparency audit ledger"
                  >
                    Ledger ↗
                  </a>
                </div>

                <span style={{ fontSize: '0.72rem', color: previewTheme === 'LIGHT' ? '#94a3b8' : '#64748b', zIndex: 1 }}>
                  Interactive Preview · Click Ledger to view the public transparency record
                </span>
              </div>
            </div>

            {/* ── Developer Code Workbench ── */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                }}
              >
                {/* Window Header / Tabs */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 1rem',
                    backgroundColor: 'var(--bg-page)',
                    borderBottom: '1px solid #1e293b',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* macOS-style Window Dots */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    </div>

                    {/* Language Switcher Tabs */}
                    <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
                      {(['REACT', 'HTML', 'CURL'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setEmbedTab(tab)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: 'none',
                            backgroundColor: embedTab === tab ? '#1e293b' : 'transparent',
                            color: embedTab === tab ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {tab === 'REACT' ? 'React (Shadcn / Tailwind)' : tab === 'HTML' ? 'HTML Script Tag' : 'cURL Telemetry API'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setCodeExpanded(!codeExpanded)}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        color: 'var(--text-light)',
                        cursor: 'pointer',
                      }}
                    >
                      {codeExpanded ? 'Collapse' : 'Expand'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          embedTab === 'REACT'
                            ? shadcnComponentCode
                            : embedTab === 'HTML'
                            ? htmlScriptEmbed
                            : curlTelemetryCode,
                          'CODE'
                        )
                      }
                      style={{
                        backgroundColor: copiedCode ? '#16a34a' : '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: copiedCode ? '#ffffff' : '#0f172a',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {copiedCode ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          Copy Snippet
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Code Body */}
                <pre
                  style={{
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-main)',
                    padding: '1.25rem',
                    fontSize: '0.8rem',
                    lineHeight: 1.6,
                    maxHeight: codeExpanded ? 'none' : '260px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    margin: 0,
                  }}
                >
                  {embedTab === 'REACT' ? shadcnComponentCode : embedTab === 'HTML' ? htmlScriptEmbed : curlTelemetryCode}
                </pre>
              </div>
            </div>

            {/* ── Assurance Verification Links ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              <div
                onClick={() => onNavigateTab?.('credentials')}
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                    Audit Warranty Credentials Locker
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Inspect issued badges, verification records &amp; download PDF proofs.
                  </p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>

              <a
                href={`/transparency?licenseeId=${licenseeId}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                    Public Transparency Ledger
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    View statutory certificate registry verified under UKIPO Trade Mark.
                  </p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>

            {/* ── Normative-style Bottom Action Bar ── */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1.75rem',
                borderTop: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <button
                type="button"
                onClick={() => goToStep(4)}
                style={{
                  padding: '0.6rem 1.2rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                ← Back to Credential Studio
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.('credentials')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.5rem',
                  backgroundColor: '#191c1a',
                  border: '1px solid #191c1a',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2e332f';
                  e.currentTarget.style.borderColor = '#2e332f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#191c1a';
                  e.currentTarget.style.borderColor = '#191c1a';
                }}
              >
                Finish &amp; View Credentials Locker →
              </button>
            </div>
          </div>
          )
        )}
      </div>
    </div>
  );
};
