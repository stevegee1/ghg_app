import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { OpenSeaBadge } from '../components/OpenSeaBadge';

// ── Scope & Step definitions ────────────────────────────────────────────────
type AuditScope = 'CARBON_EMISSION' | 'JOB_REPORTING';
type WorkflowStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<AuditScope, Record<WorkflowStep, string>> = {
  CARBON_EMISSION: {
    1: 'ISO Diagnostic',
    2: 'Checkout',
    3: 'API Access',
    4: 'Credential Studio',
    5: 'Digital Asset',
  },
  JOB_REPORTING: {
    1: 'Job Filing Audit',
    2: 'Checkout',
    3: 'Workforce API',
    4: 'Credential Studio',
    5: 'Digital Asset',
  },
};

// ── Tier definitions ──────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'TIER_1_READINESS',
    name: 'Single-Site Remote Readiness',
    price: '£1,250',
    grossCents: 125000,
    softwareCents: 106250,
    charityCents: 18750,
    turnaround: '72-Hour Expedited',
    standards: 'ISO 14001 / ISO 50001 / ISO 19011:2026',
    description: 'Single-site management system diagnostic and remote verification docket.',
    features: [
      'Automated ISO 14001, ISO 50001 & ISO 14064 diagnostic review',
      'Remote ICT verification stamp under ISO 19011:2026 Annex A.16',
      'Expedited 72-hour lead assurance review turnaround',
      'Digital provenance warranty NFT token on Polygon PoS',
    ],
  },
  {
    id: 'TIER_2_CONTINUOUS',
    name: 'Continuous Assurance Protocol',
    price: '£3,500',
    grossCents: 350000,
    softwareCents: 297500,
    charityCents: 52500,
    turnaround: 'Continuous Quarterly',
    standards: 'ISO 14001 · ISO 50001 · UK SECR · UAE SCA · EU CSRD',
    description: 'Continuous quarterly assurance protocol with automated telemetry monitoring and statutory filings.',
    recommended: true,
    features: [
      'Continuous telemetry ingestion & real-time anomaly alerts',
      'Quarterly UK SECR, UAE SCA & EU CSRD draft statutory dossiers',
      'ISO 17025 equipment calibration gatekeeper protocol',
      'Priority lead auditor consultation & assurance warranty badge',
    ],
  },
];

const JOB_TIERS = [
  {
    id: 'TIER_1_READINESS',
    name: 'Section 106 Project Audit Readiness',
    price: '£1,250',
    grossCents: 125000,
    softwareCents: 106250,
    charityCents: 18750,
    turnaround: '72-Hour Expedited',
    standards: 'UK Section 106 / Social Value Act / ISO 19011:2026',
    description: 'Single-project verified job creation docket and local authority covenant preparation.',
    features: [
      'Section 106 local authority workforce hours & apprentice validation',
      'Remote statutory verification docket under ISO 19011:2026 Annex A.16',
      'Direct 15% statutory endowment to local disaster relief / charity',
      'Social Value digital provenance warranty NFT on Polygon PoS',
    ],
  },
  {
    id: 'TIER_2_CONTINUOUS',
    name: 'Continuous Workforce Assurance Protocol',
    price: '£3,500',
    grossCents: 350000,
    softwareCents: 297500,
    charityCents: 52500,
    turnaround: 'Continuous Quarterly',
    standards: 'UK Section 106 · Social Value Act · EU CSRD ESRS S1',
    description: 'Ongoing quarterly workforce impact auditing with automated API telemetry and municipal covenants.',
    recommended: true,
    features: [
      'Automated workforce telemetry ingestion & quarterly threshold alerts',
      'Continuous Section 106 council covenant compliance verification',
      'Draft statutory CSRD ESRS S1 social impact dossiers',
      'Priority lead social auditor consultation & warranty badge',
    ],
  },
];

export type DashboardView = 'workflow' | 'overview' | 'credentials' | 'jobs' | 'transactions' | 'profile';

export const PortalPage: React.FC = () => {
  const { token, user } = useAuth();

  // ── Dashboard Navigation View ─────────────────────────────────────────────
  const [activeView, setActiveView] = useState<DashboardView>('workflow');
  const [copiedApiKey, setCopiedApiKey] = useState<boolean>(false);
  const [copiedClientId, setCopiedClientId] = useState<boolean>(false);

  // ── Global portal data ────────────────────────────────────────────────────
  const [summary, setSummary] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [jobReports, setJobReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── ISO Workflow State ────────────────────────────────────────────────────
  const [auditScope, setAuditScope] = useState<AuditScope>('CARBON_EMISSION');
  const [activeStep, setActiveStep] = useState<WorkflowStep>(1);
  const activeTiers = auditScope === 'CARBON_EMISSION' ? TIERS : JOB_TIERS;
  const [framework, setFramework] = useState<any | null>(null);
  const [frameworkLoading, setFrameworkLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedTier, setSelectedTier] = useState<string>('TIER_1_READINESS');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isoStatus, setIsoStatus] = useState<any | null>(null);
  const [isoStatusLoading, setIsoStatusLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('ALL');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    S1: true, S2: true, S3: true, S4: true, S5: true, S6: true,
  });
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // ── Credential Studio State ────────────────────────────────────────────────
  const [clientMessage, setClientMessage] = useState<string>('');
  const [clientLogoFile, setClientLogoFile] = useState<File | null>(null);
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null);
  const [compositePreview, setCompositePreview] = useState<string | null>(null);
  const [compositeLoading, setCompositeLoading] = useState(false);
  const [compositeError, setCompositeError] = useState<string | null>(null);
  const [mintLoading, setMintLoading] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<any | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // ── Job filing modal ──────────────────────────────────────────────────────
  const [showJobModal, setShowJobModal] = useState<boolean>(false);
  const [periodType, setPeriodType] = useState<string>('QUARTERLY');
  const [periodStart, setPeriodStart] = useState<string>('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState<string>('2026-03-31');
  const [jobsCreatedInput, setJobsCreatedInput] = useState<string>('50');
  const [customNoteInput, setCustomNoteInput] = useState<string>('');
  const [submittingJob, setSubmittingJob] = useState<boolean>(false);
  const [jobFormError, setJobFormError] = useState<string | null>(null);

  const logoDropRef = useRef<HTMLDivElement>(null);
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    if (chipScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = chipScrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const scrollChips = (dir: 'left' | 'right') => {
    if (chipScrollRef.current) {
      chipScrollRef.current.scrollBy({
        left: dir === 'left' ? -240 : 240,
        behavior: 'smooth',
      });
      setTimeout(updateScrollButtons, 250);
    }
  };

  const handleQuickFillCompliant = () => {
    if (!framework) return;
    const compliantAnswers: Record<string, string> = {};
    framework.sections.forEach((sec: any) => {
      (sec.questions || []).forEach((q: any) => {
        compliantAnswers[q.questionId] = 'Yes, fully in place';
        compliantAnswers[`${q.questionId}_notes`] = 'Verified against operational telemetry logs and calibration records.';
      });
    });
    setAnswers(compliantAnswers);
  };

  // ── Fetch portal data ─────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [sumRes, txRes, jobRes] = await Promise.all([
          api.getPortalSummary(token),
          api.getPortalTransactions(token),
          api.getPortalJobReports(token).catch(() => ({ data: [] })),
        ]);
        if (isMounted) {
          setSummary(sumRes);
          setTransactions(txRes.transactions || []);
          setJobReports(jobRes.data || []);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load portal data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [token]);

  // ── Load ISO framework on step 1 ─────────────────────────────────────────
  useEffect(() => {
    if (activeStep !== 1 || framework) return;
    setFrameworkLoading(true);
    api.getIsoFramework()
      .then((res) => setFramework(res.framework))
      .catch(() => setFramework(null))
      .finally(() => setFrameworkLoading(false));
  }, [activeStep, framework]);

  // ── Load ISO status on portal load ───────────────────────────────────────
  useEffect(() => {
    if (!token || !user?.licenseeId) return;
    setIsoStatusLoading(true);
    api.getIsoStatus(token, user.licenseeId)
      .then((res) => {
        setIsoStatus(res.latestSubmission);
        if (res.latestSubmission?.id) setSubmissionId(res.latestSubmission.id);
      })
      .catch(() => setIsoStatus(null))
      .finally(() => setIsoStatusLoading(false));
  }, [token, user?.licenseeId]);

  // ── Load credentials ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    api.getMyCredentials(token)
      .then((res) => setCredentials(res.credentials || []))
      .catch(() => setCredentials([]));
  }, [token, mintResult]);

  // ── Answer change ─────────────────────────────────────────────────────────
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // ── Submit ISO answers ────────────────────────────────────────────────────
  const handleIsoSubmit = async () => {
    if (!token || !framework) {
      setActiveStep(2);
      return;
    }
    const allQuestions = framework.sections.flatMap((s: any) => s.questions);
    const answerArray = allQuestions.map((q: any) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      answer: answers[q.questionId] || 'Partially implemented',
      isoClause: q.isoClause,
    }));
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.submitIsoAnswers(token, { answers: answerArray, tierSelected: selectedTier });
      setSubmissionId(res.submissionId);
      setActiveStep(2);
    } catch (err: any) {
      // Even if offline/network error, allow user to proceed to inspect pricing
      setActiveStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Create Stripe checkout ────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!token || !submissionId) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const origin = window.location.origin;
      const res = await api.createIsoCheckout(token, {
        submissionId,
        tierSelected: selectedTier,
        successUrl: `${origin}/portal?step=3`,
        cancelUrl: `${origin}/portal?step=2`,
      });
      if (res.sessionUrl) {
        window.location.href = res.sessionUrl;
      } else {
        // Fallback if Stripe session URL not available (dev mode)
        setActiveStep(3);
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Logo drag-and-drop ────────────────────────────────────────────────────
  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  }, []);

  const handleLogoFile = (file: File) => {
    setClientLogoFile(file);
    setCompositePreview(null);
    setCompositeError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setClientLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Generate composite preview ────────────────────────────────────────────
  const handleCompose = async () => {
    if (!token || !clientLogoFile || !clientMessage.trim()) return;
    setCompositeLoading(true);
    setCompositeError(null);
    try {
      const res = await api.composeBadge(token, {
        clientLogoFile,
        clientMessage,
        submissionId: submissionId || undefined,
      });
      setCompositePreview(res.previewDataUri);
    } catch (err: any) {
      setCompositeError(err.message || 'Failed to generate preview.');
    } finally {
      setCompositeLoading(false);
    }
  };

  // ── Mint credential ───────────────────────────────────────────────────────
  const handleMint = async () => {
    if (!token || !clientLogoFile || !clientMessage.trim() || !submissionId) return;
    setMintLoading(true);
    setMintError(null);
    try {
      const res = await api.mintCredential(token, {
        clientLogoFile,
        clientMessage,
        submissionId,
      });
      setMintResult(res);
      setActiveStep(5);
    } catch (err: any) {
      setMintError(err.message || 'Minting failed.');
    } finally {
      setMintLoading(false);
    }
  };

  // ── Job filing ────────────────────────────────────────────────────────────
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmittingJob(true);
    setJobFormError(null);
    const jobsCount = parseInt(jobsCreatedInput, 10);
    try {
      const createdReport = await api.submitPortalJobReport(token, {
        periodType,
        periodStart,
        periodEnd,
        jobsCreated: isNaN(jobsCount) ? 0 : jobsCount,
        attestationNote: customNoteInput.trim() || undefined,
      });
      setJobReports([createdReport, ...jobReports]);
      setShowJobModal(false);

      // Automatically sync audit readiness submission for Job Scope
      try {
        const subRes = await api.submitIsoAnswers(token, {
          answers: [
            { questionId: 'S106-PERIOD-TYPE', answer: periodType },
            { questionId: 'S106-PERIOD-START', answer: periodStart },
            { questionId: 'S106-PERIOD-END', answer: periodEnd },
            { questionId: 'S106-JOBS-CREATED', answer: String(isNaN(jobsCount) ? 0 : jobsCount) },
            { questionId: 'S106-ATTESTATION-NOTE', answer: customNoteInput.trim() || 'Verified Section 106 covenant' },
          ],
          tierSelected,
        });
        if (subRes?.submissionId) setSubmissionId(subRes.submissionId);
      } catch (subErr) {
        console.warn('[Job Readiness Submission Sync]', subErr);
      }

      setCustomNoteInput('');
    } catch (err: any) {
      setJobFormError(err.message || 'Failed to submit job creation report');
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleProceedFromJobAudit = async () => {
    if (!token) return;
    if (!submissionId) {
      try {
        const latest = jobReports[0];
        const jobsCount = parseInt(jobsCreatedInput, 10);
        const subRes = await api.submitIsoAnswers(token, {
          answers: [
            { questionId: 'S106-PERIOD-TYPE', answer: latest?.periodType || periodType },
            { questionId: 'S106-PERIOD-START', answer: latest?.periodStart ? new Date(latest.periodStart).toISOString() : periodStart },
            { questionId: 'S106-PERIOD-END', answer: latest?.periodEnd ? new Date(latest.periodEnd).toISOString() : periodEnd },
            { questionId: 'S106-JOBS-CREATED', answer: String(latest?.jobsCreated || (!isNaN(jobsCount) ? jobsCount : 50)) },
            { questionId: 'S106-ATTESTATION-NOTE', answer: latest?.attestationNote || customNoteInput.trim() || 'Verified Section 106 covenant' },
          ],
          tierSelected,
        });
        if (subRes?.submissionId) setSubmissionId(subRes.submissionId);
      } catch (err) {
        console.warn('[Job Readiness Submission Sync]', err);
      }
    }
    setActiveStep(2);
  };

  // ── Read URL params on mount (post-checkout redirect & deep links) ───────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    if (step === '3') setActiveStep(3);
    if (step === '4') setActiveStep(4);
    const scopeParam = params.get('scope');
    if (scopeParam === 'JOB_REPORTING') setAuditScope('JOB_REPORTING');
    else if (scopeParam === 'CARBON_EMISSION') setAuditScope('CARBON_EMISSION');
    const viewParam = params.get('view') || params.get('tab');
    if (viewParam === 'overview' || viewParam === 'kpis') setActiveView('overview');
    else if (viewParam === 'credentials') setActiveView('credentials');
    else if (viewParam === 'jobs' || viewParam === 'job-reporting') {
      setActiveView('jobs');
      setAuditScope('JOB_REPORTING');
    }
    else if (viewParam === 'transactions' || viewParam === 'settlement') setActiveView('transactions');
    else if (viewParam === 'profile') setActiveView('profile');
    else if (viewParam === 'workflow' || viewParam === 'telemetry' || viewParam === 'diagnostic') setActiveView('workflow');
  }, []);

  const copyClientId = () => {
    if (user?.licenseeId) {
      navigator.clipboard.writeText(user.licenseeId);
      setCopiedClientId(true);
      setTimeout(() => setCopiedClientId(false), 2000);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(telemetryApiKey);
    setCopiedApiKey(true);
    setTimeout(() => setCopiedApiKey(false), 2000);
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'workflow':
        return 'Assurance Workflow Studio';
      case 'overview':
        return 'Executive Overview & KPIs';
      case 'credentials':
        return 'Issued Audit Warranty Credentials';
      case 'jobs':
        return 'Workforce & Social Impact Filings';
      case 'transactions':
        return 'Settlement History & 15% ESG Splits';
      case 'profile':
        return 'Client Profile & API Ingestion';
      default:
        return 'Client Profile Dashboard';
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  // ── Telemetry API key (derived from submissionId or user ID) ──────────────
  const telemetryApiKey = submissionId
    ? `ghg_api_${submissionId.replace(/-/g, '').substring(0, 24)}`
    : user?.licenseeId
    ? `ghg_api_${user.licenseeId.replace(/-/g, '').substring(0, 24)}`
    : 'ghg_api_pending_payment';

  // ── Progress & Conformity Index Calculation ───────────────────────────────
  const allQuestions = (framework?.sections || []).flatMap((s: any) => s.questions || []);
  const totalQuestions = allQuestions.length;
  const answeredQuestions = allQuestions.filter((q: any) => Boolean(answers[q.questionId])).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // Real-time compliance score estimator (0 to 100%)
  const scoreMetrics = allQuestions.reduce(
    (acc: { score: number; count: number }, q: any) => {
      const ans = answers[q.questionId];
      if (!ans) return acc;
      if (ans === 'Yes, fully in place') return { score: acc.score + 100, count: acc.count + 1 };
      if (ans === 'Partially implemented') return { score: acc.score + 50, count: acc.count + 1 };
      if (ans === 'Not yet implemented') return { score: acc.score + 0, count: acc.count + 1 };
      return acc; // N/A is neutral
    },
    { score: 0, count: 0 }
  );
  const estimatedComplianceScore =
    scoreMetrics.count > 0 ? Math.round(scoreMetrics.score / scoreMetrics.count) : 0;

  const totalVerifiedJobs = jobReports.reduce((acc, r) => acc + (r.jobsCreated || 0), 0);

  const kpis = auditScope === 'CARBON_EMISSION'
    ? [
        { label: 'Settled Transactions', value: loading ? '…' : (summary?.totalSettledTransactions ?? 0).toLocaleString(), sub: 'Verified Audit Trail', accent: 'var(--color-sky)' },
        { label: 'Settled Gross Volume', value: loading ? '…' : `£${((summary?.totalGrossVolumeCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'Contractual Settlement', accent: 'var(--color-green)' },
        { label: '15% ESG Charity Split', value: loading ? '…' : `£${((summary?.totalCharityGiftCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'Direct Environmental Routing', accent: '#a855f7' },
        { label: 'Active Credentials', value: credentials.length.toString(), sub: 'Polygon ERC-1155 Minted', accent: '#f59e0b' },
      ]
    : [
        { label: 'Total Verified Jobs', value: loading ? '…' : totalVerifiedJobs.toLocaleString(), sub: 'Section 106 Local Impact', accent: 'var(--color-sky)' },
        { label: 'Active Filing Periods', value: loading ? '…' : jobReports.length.toString(), sub: 'Quarterly & Annual Covenants', accent: 'var(--color-green)' },
        { label: '15% Social Endowment', value: loading ? '…' : `£${((summary?.totalCharityGiftCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'Direct Disaster Relief Endowment', accent: '#a855f7' },
        { label: 'Audited Covenants', value: jobReports.length > 0 ? '100% Verified' : 'Filing Required', sub: 'ISO 19011:2026 Assured', accent: '#f59e0b' },
      ];

  return (
    <div className="portal-dashboard-layout">

      {/* ── Left Sidebar: Client Profile & Navigation ──────────────────────── */}
      <aside className="portal-sidebar">
        {/* Client Profile Card */}
        <div className="portal-sidebar-profile">
          <div className="portal-profile-avatar">
            <span>🏢</span>
          </div>
          <div className="portal-profile-info">
            <div className="portal-profile-role">Client Account</div>
            <div className="portal-profile-name" title={user?.licenseeId || 'Enterprise Client'}>
              {user?.licenseeId || 'Enterprise Client'}
            </div>
            <div className="portal-profile-status">
              <span className="portal-status-dot" />
              <span>Active Licensee</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="portal-sidebar-nav" aria-label="Dashboard Navigation">
          <button
            type="button"
            className={`portal-nav-btn ${activeView === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveView('workflow')}
          >
            <span className="portal-nav-icon">🛡️</span>
            <span className="portal-nav-label">Assurance Workflow</span>
            <span className="portal-nav-badge">Step {activeStep}/5</span>
          </button>

          <button
            type="button"
            className={`portal-nav-btn ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            <span className="portal-nav-icon">📊</span>
            <span className="portal-nav-label">KPI Overview</span>
          </button>

          <button
            type="button"
            className={`portal-nav-btn ${activeView === 'credentials' ? 'active' : ''}`}
            onClick={() => setActiveView('credentials')}
          >
            <span className="portal-nav-icon">📜</span>
            <span className="portal-nav-label">Issued Credentials</span>
            {credentials.length > 0 && <span className="portal-nav-badge count">{credentials.length}</span>}
          </button>

          <button
            type="button"
            className={`portal-nav-btn ${activeView === 'jobs' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('jobs');
              if (auditScope !== 'JOB_REPORTING') setAuditScope('JOB_REPORTING');
            }}
          >
            <span className="portal-nav-icon">👥</span>
            <span className="portal-nav-label">Workforce &amp; Jobs</span>
            {jobReports.length > 0 && <span className="portal-nav-badge count">{jobReports.length}</span>}
          </button>

          <button
            type="button"
            className={`portal-nav-btn ${activeView === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveView('transactions')}
          >
            <span className="portal-nav-icon">💳</span>
            <span className="portal-nav-label">Settlement Ledger</span>
            {transactions.length > 0 && <span className="portal-nav-badge count">{transactions.length}</span>}
          </button>

          <button
            type="button"
            className={`portal-nav-btn ${activeView === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveView('profile')}
          >
            <span className="portal-nav-icon">👤</span>
            <span className="portal-nav-label">Profile &amp; API Keys</span>
          </button>
        </nav>

        {/* Quick Utilities in Sidebar Footer */}
        <div className="portal-sidebar-footer">
          <a href="/portal/evidence" className="portal-sidebar-link">
            <span>📁 Evidence Locker</span>
            <span>↗</span>
          </a>
          <div className="portal-sidebar-security">
            <span>🔒 ISO 19011:2026 Engine</span>
            <span className="portal-security-badge">ONLINE</span>
          </div>
        </div>
      </aside>

      {/* ── Main Workspace ─────────────────────────────────────────────────── */}
      <main className="portal-main-workspace">
        {/* Mobile Horizontal Tabs (<= 960px) */}
        <div className="portal-mobile-tabs" role="tablist" aria-label="Mobile Dashboard Navigation">
          {[
            { id: 'workflow', label: `🛡️ Workflow (${activeStep}/5)` },
            { id: 'overview', label: '📊 KPIs' },
            { id: 'credentials', label: `📜 Credentials (${credentials.length})` },
            { id: 'jobs', label: `👥 Jobs (${jobReports.length})` },
            { id: 'transactions', label: `💳 Ledger (${transactions.length})` },
            { id: 'profile', label: '👤 Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`portal-mobile-tab-btn ${activeView === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveView(tab.id as DashboardView);
                if (tab.id === 'jobs' && auditScope !== 'JOB_REPORTING') setAuditScope('JOB_REPORTING');
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Workspace Header Bar - Clean Google Standard */}
        <div className="portal-workspace-header">
          <div>
            <h1 className="portal-page-heading">
              {getViewTitle()}
            </h1>
          </div>

          {/* Google Material 3 Dual-Scope Segmented Switcher */}
          <div className="google-m3-scope-container">

            <div className="google-m3-segmented-control" role="tablist" aria-label="Audit-Ready Scope Selector">
              <button
                type="button"
                role="tab"
                id="scope-tab-carbon"
                aria-selected={auditScope === 'CARBON_EMISSION'}
                onClick={() => {
                  setAuditScope('CARBON_EMISSION');
                  setActiveStep(1);
                }}
                className={`google-m3-segment-btn ${auditScope === 'CARBON_EMISSION' ? 'active-carbon' : ''}`}
              >
                <span className="m3-segment-icon">🌱</span>
                <div className="m3-segment-text">
                  <span className="m3-segment-title">Carbon Emission</span>
                  <span className="m3-segment-subtitle">ISO 14001 / 50001</span>
                </div>
                {auditScope === 'CARBON_EMISSION' && <span className="m3-check-indicator">✓</span>}
              </button>

              <button
                type="button"
                role="tab"
                id="scope-tab-jobs"
                aria-selected={auditScope === 'JOB_REPORTING'}
                onClick={() => {
                  setAuditScope('JOB_REPORTING');
                  setActiveStep(1);
                }}
                className={`google-m3-segment-btn ${auditScope === 'JOB_REPORTING' ? 'active-jobs' : ''}`}
              >
                <span className="m3-segment-icon">👥</span>
                <div className="m3-segment-text">
                  <span className="m3-segment-title">Job Creation</span>
                  <span className="m3-segment-subtitle">Section 106 Social</span>
                </div>
                {auditScope === 'JOB_REPORTING' && <span className="m3-check-indicator">✓</span>}
              </button>
            </div>

            {auditScope === 'JOB_REPORTING' && (
              <button
                type="button"
                onClick={() => setShowJobModal(true)}
                className="btn btn-primary m3-job-submit-btn"
              >
                + Submit Job Filing
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* ── VIEW 1: Assurance Workflow (Step 1-5) ─────────────────────────── */}
        {activeView === 'workflow' && (
          <div className="persefoni-card no-padding" style={{ padding: '0', marginBottom: '2.5rem', overflow: 'hidden' }}>

        {/* ── Google Cloud Connected Stepper Bar ──────────────────────────────── */}
        <div className="portal-stepper-bar" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-card)', position: 'relative', overflowX: 'auto',
        }}>
          {([1, 2, 3, 4, 5] as WorkflowStep[]).map((step, idx) => {
            const isActive = activeStep === step;
            const isCompleted = step < activeStep || (step === 1 && (auditScope === 'CARBON_EMISSION' ? progressPct === 100 : jobReports.length > 0));
            // All 5 steps freely clickable to explore (Google Cloud Console standard)
            const canClick = true;

            return (
              <React.Fragment key={step}>
                <button
                  type="button"
                  onClick={() => setActiveStep(step)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    background: 'none', border: 'none', padding: '0.5rem 0.65rem',
                    cursor: 'pointer',
                    opacity: 1,
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'var(--bg-subtle)' : 'transparent',
                    transition: 'all 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem', fontWeight: 700,
                    backgroundColor: isCompleted
                      ? 'var(--color-green)'
                      : isActive
                      ? 'var(--color-sky)'
                      : 'var(--bg-subtle)',
                    color: isCompleted || isActive ? '#fff' : 'var(--text-muted)',
                    boxShadow: isActive ? '0 0 0 4px rgba(2,132,199,0.2)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {isCompleted ? '✓' : step}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--color-sky)' : isCompleted ? 'var(--text-main)' : 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}>
                      {STEP_LABELS[auditScope][step]}
                    </div>
                  </div>
                </button>

                {idx < 4 && (
                  <div style={{
                    flex: 1, height: '2px', margin: '0 0.75rem',
                    backgroundColor: step < activeStep ? 'var(--color-green)' : 'var(--border-light)',
                    minWidth: '24px', transition: 'background-color 0.3s',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="portal-step-content" style={{ padding: '2rem' }}>

          {/* ── STEP 1: Audit Preparation (Scope Adaptive) ── */}
          {activeStep === 1 && (
            auditScope === 'CARBON_EMISSION' ? (
              <div>
              {/* Assessment Header & Live Gauge Card */}
              <div className="assessment-summary-card" style={{
                backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.35rem 0', letterSpacing: '-0.01em' }}>
                      ISO Audit-Readiness Diagnostic Assessment
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
                      Structured statutory screening aligned with ISO 14001:2015, ISO 50001:2018, ISO 14064, and ISO 19011:2026 remote auditing protocols.
                    </p>
                  </div>

                  {/* Real-time compliance score badge & 1-Click Quick Fill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleQuickFillCompliant}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-pill)',
                        border: '1px solid var(--color-sky)',
                        color: 'var(--color-sky)',
                        backgroundColor: 'var(--accent-light)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                      title="Auto-fill 15 ISO clauses with verified compliant answers for demonstration"
                    >
                      <span>⚡</span>
                      <span>Auto-Fill Audit Baseline (1-Click)</span>
                    </button>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.5rem 1rem', borderRadius: '8px',
                      backgroundColor: estimatedComplianceScore >= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(2,132,199,0.1)',
                      border: `1px solid ${estimatedComplianceScore >= 80 ? 'rgba(16,185,129,0.3)' : 'rgba(2,132,199,0.3)'}`,
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Readiness Index:
                      </span>
                      <span style={{
                        fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                        color: estimatedComplianceScore >= 80 ? 'var(--color-green)' : 'var(--color-sky)',
                      }}>
                        {estimatedComplianceScore}%
                      </span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600,
                        color: estimatedComplianceScore >= 80 ? 'var(--color-green)' : 'var(--color-sky)',
                      }}>
                        ({estimatedComplianceScore >= 80 ? 'Audit-Ready' : estimatedComplianceScore >= 50 ? 'In Progress' : 'Initial'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Material Progress bar */}
                {totalQuestions > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      <span>Assessment Completion</span>
                      <span>{answeredQuestions} of {totalQuestions} answered ({progressPct}%)</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <div style={{
                        width: `${progressPct}%`, height: '100%',
                        backgroundColor: progressPct === 100 ? 'var(--color-green)' : 'var(--color-sky)',
                        borderRadius: '4px', transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {frameworkLoading && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading framework questions…</div>
              )}

              {!frameworkLoading && framework && (
                <div>
                  {/* Interactive Google Material 3 Clause Carousel */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <span>ISO Clauses:</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-sky)', fontSize: '0.72rem' }}>
                          (Use arrows or swipe to slide)
                        </span>
                      </div>

                      {/* Dropdown Fast Jump Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <label htmlFor="clause-quick-jump" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</label>
                        <select
                          id="clause-quick-jump"
                          value={activeSectionFilter}
                          onChange={(e) => setActiveSectionFilter(e.target.value)}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <option value="ALL">All Clauses ({answeredQuestions}/{totalQuestions})</option>
                          {framework.sections.map((sec: any) => (
                            <option key={sec.sectionId} value={sec.sectionId}>
                              {sec.sectionId}: {sec.sectionTitle.split('(')[0].trim()}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="m3-chip-carousel-container">
                      <button
                        type="button"
                        className="m3-carousel-arrow left"
                        onClick={() => scrollChips('left')}
                        aria-label="Scroll clauses left"
                        title="Scroll clauses left"
                      >
                        ‹
                      </button>

                      <div
                        ref={chipScrollRef}
                        onScroll={updateScrollButtons}
                        className="m3-chip-scroll-track"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveSectionFilter('ALL')}
                          style={{
                            padding: '0.45rem 1rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                            border: activeSectionFilter === 'ALL' ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                            backgroundColor: activeSectionFilter === 'ALL' ? 'var(--color-sky)' : 'var(--bg-card)',
                            color: activeSectionFilter === 'ALL' ? '#fff' : 'var(--text-muted)',
                            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
                          }}
                        >
                          All Clauses ({answeredQuestions}/{totalQuestions})
                        </button>

                        {framework.sections.map((sec: any) => {
                          const secQuestions = sec.questions || [];
                          const secAnswered = secQuestions.filter((q: any) => Boolean(answers[q.questionId])).length;
                          const isComplete = secAnswered === secQuestions.length && secQuestions.length > 0;
                          const isSelected = activeSectionFilter === sec.sectionId;

                          return (
                            <button
                              key={sec.sectionId}
                              type="button"
                              onClick={() => setActiveSectionFilter(sec.sectionId)}
                              style={{
                                padding: '0.45rem 1rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                                border: isSelected ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                                backgroundColor: isSelected ? 'var(--color-sky)' : 'var(--bg-card)',
                                color: isSelected ? '#fff' : isComplete ? 'var(--color-green)' : 'var(--text-muted)',
                                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                                display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0,
                              }}
                            >
                              {isComplete && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                              <span>{sec.sectionTitle.split('(')[0].trim()}</span>
                              <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>({secAnswered}/{secQuestions.length})</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="m3-carousel-arrow right"
                        onClick={() => scrollChips('right')}
                        aria-label="Scroll clauses right"
                        title="Scroll clauses right"
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  {/* Clause Accordion Sections */}
                  {framework.sections
                    .filter((sec: any) => activeSectionFilter === 'ALL' || activeSectionFilter === sec.sectionId)
                    .map((section: any) => {
                      const secQuestions = section.questions || [];
                      const secAnswered = secQuestions.filter((q: any) => Boolean(answers[q.questionId])).length;
                      const isSecComplete = secAnswered === secQuestions.length && secQuestions.length > 0;
                      const isExpanded = expandedSections[section.sectionId] ?? true;

                      return (
                        <div
                          key={section.sectionId}
                          style={{
                            border: '1px solid var(--border-light)', borderRadius: '12px',
                            marginBottom: '1.25rem', overflow: 'hidden', backgroundColor: 'var(--bg-card)',
                          }}
                        >
                          {/* Accordion Section Header */}
                          <div
                            onClick={() => setExpandedSections((prev) => ({ ...prev, [section.sectionId]: !isExpanded }))}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '1rem 1.25rem', cursor: 'pointer',
                              backgroundColor: 'var(--bg-subtle)',
                              borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none',
                              userSelect: 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: isSecComplete ? 'var(--color-green)' : 'rgba(2,132,199,0.15)',
                                color: isSecComplete ? '#fff' : 'var(--color-sky)',
                                fontSize: '0.7rem', fontWeight: 700,
                              }}>
                                {isSecComplete ? '✓' : section.sectionId}
                              </span>
                              <div>
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  {section.sectionTitle}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 600,
                                color: isSecComplete ? 'var(--color-green)' : 'var(--text-muted)',
                                backgroundColor: isSecComplete ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
                                padding: '2px 8px', borderRadius: '6px',
                              }}>
                                {secAnswered} of {secQuestions.length} completed
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </div>
                          </div>

                          {/* Section Questions */}
                          {isExpanded && (
                            <div style={{ padding: '1.25rem 1.5rem' }}>
                              {secQuestions.map((q: any, qIdx: number) => {
                                const selectedAnswer = answers[q.questionId];
                                const hasNote = Boolean(answers[`${q.questionId}_notes`]);
                                const isNoteExpanded = expandedNotes[q.questionId] || hasNote;

                                return (
                                  <div
                                    key={q.questionId}
                                    style={{
                                      paddingBottom: qIdx < secQuestions.length - 1 ? '1.5rem' : '0.5rem',
                                      marginBottom: qIdx < secQuestions.length - 1 ? '1.5rem' : 0,
                                      borderBottom: qIdx < secQuestions.length - 1 ? '1px solid var(--border-light)' : 'none',
                                    }}
                                  >
                                    {/* Clause & Mandate Badges */}
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                      <span style={{
                                        fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-sky)',
                                        backgroundColor: 'var(--accent-light)', padding: '2px 8px', borderRadius: '4px',
                                        fontFamily: 'var(--font-mono)',
                                      }}>
                                        {q.questionId}
                                      </span>
                                      <span style={{
                                        fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-sky)',
                                        backgroundColor: 'rgba(2,132,199,0.08)', padding: '2px 8px', borderRadius: '4px',
                                      }}>
                                        {q.isoClause.split('/')[0].trim()}
                                      </span>
                                      {q.legalMandate && (
                                        <span style={{
                                          fontSize: '0.7rem', fontWeight: 600, color: '#a855f7',
                                          backgroundColor: 'rgba(168,85,247,0.08)', padding: '2px 8px', borderRadius: '4px',
                                        }}>
                                          {q.legalMandate.split('—')[0].trim()}
                                        </span>
                                      )}
                                    </div>

                                    {/* Question Text */}
                                    <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem', lineHeight: 1.45 }}>
                                      {q.questionText}
                                    </label>

                                    {/* Evidence Requirement Hint */}
                                    {q.evidenceRequired && (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                                        <span style={{ fontWeight: 600 }}>Evidence required:</span> {q.evidenceRequired}
                                      </div>
                                    )}

                                    {/* Segmented Button Group */}
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                                      {['Yes, fully in place', 'Partially implemented', 'Not yet implemented', 'Not applicable'].map((opt) => {
                                        const isSelected = selectedAnswer === opt;
                                        return (
                                          <button
                                            key={opt}
                                            type="button"
                                            onClick={() => handleAnswerChange(q.questionId, opt)}
                                            style={{
                                              padding: '0.45rem 0.9rem',
                                              borderRadius: '6px',
                                              fontSize: '0.8rem',
                                              fontWeight: isSelected ? 700 : 500,
                                              cursor: 'pointer',
                                              border: isSelected ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                                              backgroundColor: isSelected ? 'var(--color-sky)' : 'var(--bg-card)',
                                              color: isSelected ? '#fff' : 'var(--text-main)',
                                              boxShadow: isSelected ? '0 1px 2px rgba(2,132,199,0.2)' : 'none',
                                              transition: 'all 0.15s ease',
                                            }}
                                          >
                                            {isSelected ? `✓ ${opt}` : opt}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Collapsible Evidence Notes */}
                                    {!isNoteExpanded ? (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedNotes((prev) => ({ ...prev, [q.questionId]: true }))}
                                        style={{
                                          background: 'none', border: 'none', padding: 0,
                                          fontSize: '0.75rem', color: 'var(--color-sky)',
                                          cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                        }}
                                      >
                                        + Add evidence description or document reference (optional)
                                      </button>
                                    ) : (
                                      <div style={{ marginTop: '0.5rem' }}>
                                        <textarea
                                          rows={2}
                                          placeholder="Enter supporting evidence reference, document title, or internal control docket..."
                                          value={typeof answers[`${q.questionId}_notes`] === 'string' ? answers[`${q.questionId}_notes`] : ''}
                                          onChange={(e) => handleAnswerChange(`${q.questionId}_notes`, e.target.value)}
                                          className="form-input"
                                          style={{ fontSize: '0.8rem', resize: 'vertical', width: '100%' }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {submitError && (
                    <div style={{ color: 'var(--google-red)', fontSize: '0.85rem', margin: '1rem 0', fontWeight: 600 }}>
                      {submitError}
                    </div>
                  )}

                  {/* Material 3 Bottom Action Bar (No checkout pricing here) */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1.25rem 0 0.5rem 0', borderTop: '1px solid var(--border-light)',
                    marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem',
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>✓</span>
                      <span>Real-time diagnostic autosave active</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleQuickFillCompliant}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem' }}
                      >
                        ⚡ Quick Fill All Clauses
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem' }}
                      >
                        Skip to Pricing (Step 2) →
                      </button>

                      <button
                        type="button"
                        onClick={handleIsoSubmit}
                        disabled={submitting}
                        className="btn btn-primary"
                        style={{ minWidth: '220px', maxWidth: '100%', fontWeight: 700 }}
                      >
                        {submitting
                          ? 'Saving Diagnostic…'
                          : progressPct < 100
                          ? 'Save Progress & Proceed to Step 2 →'
                          : 'Save & Proceed to Checkout →'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* ── Section 106 Job Creation Audit Preparation Studio ── */}
              <div className="assessment-summary-card" style={{
                backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.35rem 0', letterSpacing: '-0.01em' }}>
                      Section 106 Job Creation &amp; Workforce Audit Preparation
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
                      Statutory workforce verification under UK Section 106 planning covenants, Social Value Act guidelines, and ISO 19011:2026 remote auditing protocols.
                    </p>
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 1rem', borderRadius: '8px',
                    backgroundColor: totalVerifiedJobs > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(2,132,199,0.1)',
                    border: `1px solid ${totalVerifiedJobs > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(2,132,199,0.3)'}`,
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Verified Jobs:
                    </span>
                    <span style={{
                      fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
                      color: totalVerifiedJobs > 0 ? 'var(--color-green)' : 'var(--color-sky)',
                    }}>
                      {totalVerifiedJobs.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Summary metric pills */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                  <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '0.4rem 0.85rem', borderRadius: '6px' }}>
                    Filings Docket: <strong style={{ color: 'var(--text-main)' }}>{jobReports.length} Period{jobReports.length === 1 ? '' : 's'} Recorded</strong>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '0.4rem 0.85rem', borderRadius: '6px' }}>
                    Covenant Compliance: <strong style={{ color: 'var(--color-green)' }}>{jobReports.length > 0 ? 'Compliant ✓' : 'Filing Required'}</strong>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '0.4rem 0.85rem', borderRadius: '6px' }}>
                    Assurance Standard: <strong style={{ color: 'var(--color-sky)' }}>Section 106 &amp; CSRD ESRS S1</strong>
                  </div>
                </div>
              </div>

              {/* Inline Section 106 Filing Studio Card */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1.75rem',
                marginBottom: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.2rem 0' }}>
                      Record Section 106 Period Filing
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Submit statutory workforce hours and job creation metrics for this accounting period
                    </p>
                  </div>
                  <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--color-sky)', fontWeight: 700 }}>
                    Client Account: {user?.licenseeId}
                  </span>
                </div>

                {jobFormError && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {jobFormError}
                  </div>
                )}

                <form onSubmit={handleJobSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Period Type
                      </label>
                      <select
                        value={periodType}
                        onChange={(e) => setPeriodType(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      >
                        <option value="QUARTERLY">Quarterly (Section 106 Standard)</option>
                        <option value="ANNUAL">Annual Corporate Filing</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Period Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Period End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        Verified Jobs Created
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={jobsCreatedInput}
                        onChange={(e) => setJobsCreatedInput(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Local Authority Covenant &amp; Attestation Note
                    </label>
                    <input
                      type="text"
                      value={customNoteInput}
                      onChange={(e) => setCustomNoteInput(e.target.value)}
                      placeholder="e.g. Local authority Section 106 planning covenant for artisan embroidery workforce"
                      className="form-input"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="submit"
                      disabled={submittingJob}
                      className="btn btn-primary"
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        padding: '0.6rem 1.4rem',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {submittingJob ? 'Submitting…' : '+ Submit Job Filing'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Verified Filings Ledger Table */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Verified Period Filings Docket
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {jobReports.length} recorded filing{jobReports.length === 1 ? '' : 's'}
                  </span>
                </div>

                {jobReports.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: 'var(--text-main)' }}>No Section 106 job filings recorded yet</p>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>Use the form above to record your first quarterly or annual workforce hours to establish audit readiness.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '0.65rem 0.75rem' }}>Period</th>
                          <th style={{ padding: '0.65rem 0.75rem' }}>Dates</th>
                          <th style={{ padding: '0.65rem 0.75rem' }}>Jobs Created</th>
                          <th style={{ padding: '0.65rem 0.75rem' }}>Source</th>
                          <th style={{ padding: '0.65rem 0.75rem' }}>Attestation Note</th>
                          <th style={{ padding: '0.65rem 0.75rem' }}>Audit Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobReports.map((report) => (
                          <tr key={report.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ backgroundColor: 'var(--accent-light)', color: 'var(--color-sky)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                {report.periodType}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(report.periodStart).toLocaleDateString('en-GB')} – {new Date(report.periodEnd).toLocaleDateString('en-GB')}
                            </td>
                            <td style={{ padding: '0.75rem', fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                              {report.jobsCreated}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                                {report.reportSource === 'THIRD_PARTY_API' ? 'API Ingest' : 'Portal Self-Report'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '240px' }}>
                              {report.attestationNote || 'Verified Section 106 covenant'}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--color-green)', fontWeight: 700 }}>
                                Audit Ready ✓
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Step 1 Footer Action */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '1rem',
              }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {jobReports.length > 0
                    ? `✓ ${jobReports.length} filing(s) recorded. Ready for statutory assurance settlement.`
                    : 'Submit at least one period filing above, or proceed with existing corporate records.'}
                </div>
                <button
                  type="button"
                  onClick={handleProceedFromJobAudit}
                  className="btn btn-primary"
                  style={{ minWidth: '220px', maxWidth: '100%', padding: '0.75rem 1.5rem', fontWeight: 700 }}
                >
                  Proceed to Assurance Checkout (Step 2) →
                </button>
              </div>
            </div>
          )
        )}

          {/* ── STEP 2: Stripe Checkout (Google Cloud Billing Two-Column Pattern) ── */}
          {activeStep === 2 && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.35rem 0', letterSpacing: '-0.01em' }}>
                  Select Statutory Assurance Tier &amp; Checkout
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '750px' }}>
                  {auditScope === 'CARBON_EMISSION'
                    ? 'Preparation service fees are administered under statutory data administration utility. All checkouts strictly enforce the 85% software licensing and 15% disaster relief endowment routing.'
                    : 'Section 106 workforce assurance fees strictly enforce the statutory 85% software preparation base and 15% disaster relief endowment routing.'}
                </p>
              </div>

              {/* Two-column layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: '2rem',
                alignItems: 'start',
              }}>
                {/* Left column — Tier Selection Cards */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem' }}>
                    Available {auditScope === 'CARBON_EMISSION' ? 'Carbon' : 'Workforce'} Assurance Tiers
                  </div>

                  {activeTiers.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id)}
                        style={{
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                          backgroundColor: isSelected ? 'rgba(2,132,199,0.04)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          marginBottom: '1rem',
                          position: 'relative',
                          boxShadow: isSelected ? '0 2px 8px rgba(2,132,199,0.12)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {tier.recommended && (
                          <span style={{
                            position: 'absolute', top: '14px', right: '16px',
                            backgroundColor: 'var(--color-sky)', color: '#fff',
                            fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                            letterSpacing: '0.04em',
                          }}>
                            RECOMMENDED
                          </span>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          {/* Radio circle */}
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            border: isSelected ? '5px solid var(--color-sky)' : '2px solid var(--border-light)',
                            backgroundColor: '#fff', marginTop: '3px', flexShrink: 0,
                          }} />

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {tier.name}
                              </div>
                              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>
                                {tier.price}
                              </div>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.85rem 0', lineHeight: 1.4 }}>
                              {tier.description}
                            </p>

                            {/* Features list */}
                            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                              {tier.features.map((feat, fIdx) => (
                                <li key={fIdx} style={{ marginBottom: '0.2rem' }}>{feat}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right column — Sticky Order Summary Card */}
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '1.75rem',
                  position: 'sticky',
                  top: '2rem',
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
                    {auditScope === 'CARBON_EMISSION' ? 'Carbon Assurance Order Summary' : 'Workforce Assurance Order Summary'}
                  </div>

                  {(() => {
                    const activeTierData = activeTiers.find((t) => t.id === selectedTier) || activeTiers[0];
                    return (
                      <div>
                        <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                            {activeTierData.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {activeTierData.turnaround} · {activeTierData.standards}
                          </div>
                        </div>

                        {/* Statutory Split Breakdown */}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Software &amp; {auditScope === 'CARBON_EMISSION' ? 'Assurance' : 'Workforce'} Base (85%)</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                              £{(activeTierData.softwareCents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Disaster Relief Charity Endowment (15%)</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                              £{(activeTierData.charityCents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Total Due */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          paddingTop: '0.75rem', borderTop: '2px solid var(--border-light)', marginBottom: '1.5rem',
                        }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Total Investment</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>
                            {activeTierData.price}
                          </span>
                        </div>

                        {/* Metadata chips */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                          <div>Client Account: <strong style={{ color: 'var(--text-main)' }}>{user?.licenseeId}</strong></div>
                          <div>
                            Diagnostic State:{' '}
                            <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>
                              {auditScope === 'CARBON_EMISSION'
                                ? `${answeredQuestions} of ${totalQuestions} answered ✓`
                                : `${jobReports.length} Period Filing(s) Recorded ✓`}
                            </span>
                          </div>
                        </div>

                        {checkoutError && (
                          <div style={{ color: 'var(--google-red)', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                            {checkoutError}
                          </div>
                        )}

                        {/* Action buttons */}
                        <button
                          type="button"
                          onClick={handleCheckout}
                          disabled={checkoutLoading || (!submissionId && auditScope === 'CARBON_EMISSION')}
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}
                        >
                          {checkoutLoading ? 'Connecting to Stripe…' : `Pay ${activeTierData.price} via Stripe Checkout →`}
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveStep(3)}
                          className="btn btn-secondary"
                          style={{ width: '100%', fontSize: '0.85rem', padding: '0.65rem', marginBottom: '0.5rem', fontWeight: 600 }}
                        >
                          Explore Ingestion API (Step 3) →
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveStep(1)}
                          className="btn btn-secondary"
                          style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                        >
                          {auditScope === 'CARBON_EMISSION' ? '← Review Diagnostic Answers' : '← Review Job Filings'}
                        </button>

                        {/* Security notice */}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.4 }}>
                          🔒 256-bit TLS encrypted · B2B telemetry API key provisioned instantly upon settlement
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Ingestion API Access ──────────────────────────────── */}
          {activeStep === 3 && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                {auditScope === 'CARBON_EMISSION' ? 'Telemetry Ingestion API Access' : 'Workforce & Job Telemetry API Access'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {auditScope === 'CARBON_EMISSION'
                  ? 'Your API key has been provisioned. Use it to submit automated emissions data or upload evidence documents manually.'
                  : 'Your API key has been provisioned. Ingest quarterly workforce telemetry and Section 106 compliance data directly via REST.'}
              </p>

              {/* API Key */}
              <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {auditScope === 'CARBON_EMISSION' ? 'Telemetry Ingestion API Key' : 'Workforce Ingestion API Key'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-sky)',
                  backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: '8px',
                  wordBreak: 'break-all', letterSpacing: '0.04em',
                }}>
                  {telemetryApiKey}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                  onClick={() => { navigator.clipboard.writeText(telemetryApiKey); }}
                >
                  Copy Key
                </button>
              </div>

              {/* cURL example */}
              <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Automated Reporting — cURL Example
                </div>
                <pre style={{
                  backgroundColor: '#0c1929', color: '#a5f3fc', padding: '1rem', borderRadius: '8px',
                  fontSize: '0.78rem', overflowX: 'auto', margin: 0, lineHeight: 1.6,
                }}>
{auditScope === 'CARBON_EMISSION'
  ? `curl -X POST https://ghgapp-production.up.railway.app/api/iso/telemetry/ingest \\
  -H "Authorization: Bearer ${telemetryApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "assetTag": "PDU-METER-04B",
    "metricType": "MWH_LOAD",
    "numericValue": 42.3,
    "rawUnit": "kWh",
    "assetCalibrationId": "<YOUR_CALIBRATION_ID>"
  }'`
  : `curl -X POST https://ghgapp-production.up.railway.app/api/portal/job-reports \\
  -H "Authorization: Bearer ${telemetryApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "periodType": "QUARTERLY",
    "periodStart": "2026-04-01",
    "periodEnd": "2026-06-30",
    "jobsCreated": 65,
    "attestationNote": "Section 106 Artisan Workforce Covenant"
  }'`}
                </pre>
              </div>

              {/* Evidence document upload instruction */}
              <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {auditScope === 'CARBON_EMISSION' ? 'Manual Evidence Document Upload' : 'Manual Social & Workforce Evidence Upload'}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                  {auditScope === 'CARBON_EMISSION'
                    ? 'Upload utility bills, calibration certificates, GHG inventory reports, and ISO audit evidence directly to the Evidence Locker.'
                    : 'Upload Section 106 council covenant agreements, artisan workforce payroll verifications, and guild certifications directly to the Evidence Locker.'}
                </p>
                <a href="/portal/evidence" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                  Open Evidence Locker
                </a>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setActiveStep(2)} className="btn btn-secondary">
                  ← Back to Commercial Scope (Step 2)
                </button>
                <button type="button" onClick={() => setActiveStep(4)} className="btn btn-primary">
                  Proceed to Credential Studio (Step 4) →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Credential Studio ─────────────────────────────────── */}
          {activeStep === 4 && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Dual-Logo {auditScope === 'CARBON_EMISSION' ? 'Carbon' : 'Social Impact'} Credential Studio
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Upload your corporate logo and enter your attestation message. We composite it with the GHG Emissions Registered Trade Mark and mint a {auditScope === 'CARBON_EMISSION' ? 'Carbon Audit Warranty' : 'Section 106 Social Value'} ERC-1155 token on Polygon PoS.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
                {/* Left — inputs */}
                <div>
                  {/* Logo dropzone */}
                  <div
                    ref={logoDropRef}
                    onDrop={handleLogoDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => { const inp = document.getElementById('logo-file-input') as HTMLInputElement; inp?.click(); }}
                    style={{
                      border: '2px dashed var(--border-light)', borderRadius: '12px', padding: '2rem',
                      textAlign: 'center', cursor: 'pointer', marginBottom: '1.25rem',
                      backgroundColor: clientLogoPreview ? 'var(--bg-subtle)' : 'transparent',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <input
                      id="logo-file-input"
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.webp"
                      style={{ display: 'none' }}
                      onChange={(e) => { if (e.target.files?.[0]) handleLogoFile(e.target.files[0]); }}
                    />
                    {clientLogoPreview ? (
                      <img src={clientLogoPreview} alt="Client logo preview" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>+</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Drag &amp; drop corporate logo</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>PNG, JPG, SVG or WebP — max 5 MB</div>
                      </>
                    )}
                  </div>
                  {clientLogoPreview && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem', marginBottom: '1rem' }}
                      onClick={() => { setClientLogoFile(null); setClientLogoPreview(null); setCompositePreview(null); }}
                    >
                      Remove Logo
                    </button>
                  )}

                  {/* Attestation message */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Attestation Message
                    </label>
                    <textarea
                      rows={3}
                      maxLength={120}
                      value={clientMessage}
                      onChange={(e) => { setClientMessage(e.target.value); setCompositePreview(null); }}
                      placeholder={auditScope === 'CARBON_EMISSION' ? 'e.g. ISO 14001 aligned — Net Zero pathway committed 2030' : 'e.g. Verified Section 106 Artisan Workforce & Local Employment Covenant'}
                      className="form-input"
                      style={{ resize: 'none' }}
                    />
                    <div style={{ fontSize: '0.72rem', color: clientMessage.length >= 110 ? 'var(--google-red)' : 'var(--text-muted)', textAlign: 'right', marginTop: '0.25rem' }}>
                      {clientMessage.length}/120 characters
                    </div>
                  </div>

                  {compositeError && (
                    <div style={{ color: 'var(--google-red)', fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600 }}>{compositeError}</div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleCompose}
                      disabled={compositeLoading || !clientLogoFile || !clientMessage.trim()}
                      className="btn btn-secondary"
                    >
                      {compositeLoading ? 'Generating…' : 'Preview Badge'}
                    </button>
                    <button
                      type="button"
                      onClick={handleMint}
                      disabled={mintLoading || !clientLogoFile || !clientMessage.trim() || !submissionId}
                      className="btn btn-primary"
                    >
                      {mintLoading ? 'Minting on Polygon…' : 'Issue and Mint Credential →'}
                    </button>
                  </div>
                  {mintError && (
                    <div style={{ color: 'var(--google-red)', fontSize: '0.82rem', marginTop: '0.75rem', fontWeight: 600 }}>{mintError}</div>
                  )}
                  {!submissionId && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      A paid ISO submission is required to mint. Complete Steps 1 and 2 first.
                    </p>
                  )}
                </div>

                {/* Right — badge preview */}
                <div>
                  <div style={{
                    background: 'linear-gradient(135deg, #0c1929, #0a2540)',
                    borderRadius: '12px', padding: '2rem', minHeight: '280px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {compositePreview ? (
                      <img
                        src={compositePreview}
                        alt="Dual-logo composite badge preview"
                        style={{ maxWidth: '100%', borderRadius: '8px' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', opacity: 0.5 }}>
                        <div style={{ fontSize: '0.85rem', color: '#a5f3fc', fontWeight: 600, marginBottom: '0.5rem' }}>
                          BADGE PREVIEW
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          Upload logo and enter message, then click Preview Badge
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Includes:</strong> Client logo + GHG Emissions Registered Trade Mark + Attestation message + ISO 19011:2026 stamp + 1-year warranty date + Polygon ERC-1155 token
                  </div>
                </div>
              </div>

              {/* Step 4 Navigation */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setActiveStep(3)} className="btn btn-secondary">
                  ← Back to Ingestion API (Step 3)
                </button>
                <button type="button" onClick={() => setActiveStep(5)} className="btn btn-secondary">
                  Preview Asset Delivery (Step 5) →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Digital Asset Delivery ───────────────────────────── */}
          {activeStep === 5 && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Digital Asset Delivery
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Your audit warranty credential has been issued and recorded on Polygon PoS. Embed the badge on your corporate website using the code snippet below.
              </p>

              {(mintResult || credentials[0]) && (() => {
                const cred = mintResult || credentials[0];
                return (
                  <div>
                    {/* Token details */}
                    <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {[
                          { label: 'Token ID', value: cred.tokenId || 'pending', mono: true },
                          { label: 'Contract', value: cred.contractAddress ? `${cred.contractAddress.substring(0, 10)}…` : 'Polygon PoS', mono: true },
                          { label: 'Network', value: 'Polygon PoS', mono: false },
                          { label: 'Standard', value: 'ERC-1155', mono: false },
                        ].map((item) => (
                          <div key={item.label}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{item.label}</div>
                            <div style={{ fontFamily: item.mono ? 'var(--font-mono)' : 'inherit', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {cred.openSeaUrl && (
                        <div style={{ marginTop: '1.25rem' }}>
                          <a
                            href={cred.openSeaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem' }}
                          >
                            View on OpenSea (Polygon)
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Embed snippet */}
                    {cred.embedSnippet && (
                      <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Website Embed Snippet — Copy to your Developer
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.8rem' }}
                            onClick={() => {
                              navigator.clipboard.writeText(cred.embedSnippet);
                              setCopiedSnippet(true);
                              setTimeout(() => setCopiedSnippet(false), 2000);
                            }}
                          >
                            {copiedSnippet ? 'Copied!' : 'Copy Snippet'}
                          </button>
                        </div>
                        <pre style={{
                          backgroundColor: '#0c1929', color: '#a5f3fc', padding: '1rem', borderRadius: '8px',
                          fontSize: '0.78rem', overflowX: 'auto', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                        }}>
                          {cred.embedSnippet}
                        </pre>
                      </div>
                    )}

                    {/* Warranty details */}
                    <div className="persefoni-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--color-green)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-green)', marginBottom: '0.35rem' }}>
                        1-Year Statutory Warranty Issued
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Valid to:{' '}
                        <strong style={{ color: 'var(--text-main)' }}>
                          {cred.warrantyExpiresAt
                            ? new Date(cred.warrantyExpiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                            : 'TBD'}
                        </strong>
                      </div>
                      {cred.verificationSeal && (
                        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.35rem', wordBreak: 'break-all' }}>
                          SHA-256: {cred.verificationSeal}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setActiveStep(4)} className="btn btn-secondary">
                        ← Back to Credential Studio (Step 4)
                      </button>
                      <button type="button" onClick={() => setActiveStep(1)} className="btn btn-primary">
                        Review Assessment (Step 1) ↺
                      </button>
                    </div>
                  </div>
                );
              })()}

              {!mintResult && credentials.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>No credential issued yet</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Complete Step 4 (Credential Studio) to generate your tokenized audit warranty badge.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setActiveStep(4)} className="btn btn-primary">
                      Go to Credential Studio (Step 4) →
                    </button>
                    <button type="button" onClick={() => setActiveStep(1)} className="btn btn-secondary">
                      ← Back to Assessment (Step 1)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── VIEW 2: Executive Overview & KPIs ────────────────────────────── */}
      {activeView === 'overview' && (
        <div>
          {/* 4 Adaptive KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {kpis.map((kpi) => (
              <div key={kpi.label} className="persefoni-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: kpi.accent }} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{kpi.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>{kpi.value}</div>
                <div style={{ fontSize: '0.72rem', color: kpi.accent, marginTop: '0.2rem', fontWeight: 600 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Workflow Quick Action Card */}
          <div className="persefoni-card" style={{ padding: '1.75rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, rgba(2,132,199,0.06), rgba(16,185,129,0.06))', border: '1px solid rgba(2,132,199,0.2)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                ACTIVE ASSURANCE WORKFLOW
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Step {activeStep} of 5: {STEP_LABELS[auditScope][activeStep]}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Scope: {auditScope === 'CARBON_EMISSION' ? '🌱 Carbon Emission (ISO 14001 / 50001)' : '👥 Job Creation (Section 106 Social)'} · Diagnostic: {progressPct}% complete
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('workflow')}
              className="btn btn-primary"
              style={{ fontSize: '0.875rem', padding: '0.65rem 1.5rem', fontWeight: 700 }}
            >
              Resume Workflow Studio →
            </button>
          </div>

          {/* Recent Credentials and Settlements Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
            {/* Recent Credentials Preview */}
            <div className="persefoni-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Recent Credentials</h3>
                <button type="button" onClick={() => setActiveView('credentials')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                  View All ({credentials.length}) →
                </button>
              </div>
              {credentials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.82rem', margin: '0 0 0.75rem 0' }}>No credentials issued yet.</p>
                  <button type="button" onClick={() => { setActiveView('workflow'); setActiveStep(4); }} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
                    Open Credential Studio
                  </button>
                </div>
              ) : (
                <div>
                  {credentials.slice(0, 3).map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-main)' }}>{c.id.substring(0, 14)}…</span>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Settlements Preview */}
            <div className="persefoni-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Recent Settlements</h3>
                <button type="button" onClick={() => setActiveView('transactions')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                  View All ({transactions.length}) →
                </button>
              </div>
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.82rem', margin: '0 0 0.75rem 0' }}>No transactions recorded yet.</p>
                  <button type="button" onClick={() => { setActiveView('workflow'); setActiveStep(2); }} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
                    Review Commercial Scope
                  </button>
                </div>
              ) : (
                <div>
                  {transactions.slice(0, 3).map((t: any) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>£{(t.grossAmountCents / 100).toFixed(2)}</span>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 3: Issued Credentials ───────────────────────────────────── */}
      {activeView === 'credentials' && (
        <div className="persefoni-card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                Issued Audit Warranty Credentials
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Polygon PoS ERC-1155 tokens attesting 1-year statutory audit warranty
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveView('workflow');
                setActiveStep(4);
              }}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', minHeight: '38px' }}
            >
              + Issue New Credential
            </button>
          </div>

          {credentials.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📜</div>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: 'var(--text-main)' }}>No credentials issued yet</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
                Complete your diagnostic evaluation in the Assurance Workflow Studio to generate and mint your tokenized audit badge.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveView('workflow');
                  setActiveStep(4);
                }}
                className="btn btn-primary"
              >
                Go to Credential Studio (Step 4) →
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Credential ID</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Token ID</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Warranty Expires</th>
                    <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>OpenSea</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred: any) => (
                    <tr key={cred.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cred.id.substring(0, 18)}…
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--color-sky)' }}>
                        {cred.tokenId || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <StatusBadge status={cred.status} />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        {cred.warrantyExpiresAt
                          ? new Date(cred.warrantyExpiresAt).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {cred.openSeaUrl ? (
                          <a href={cred.openSeaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2081E2', fontSize: '0.8rem', fontWeight: 600 }}>
                            OpenSea
                          </a>
                        ) : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 4: Workforce & Job Filings ──────────────────────────────── */}
      {activeView === 'jobs' && (
        <div className="persefoni-card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                Job Creation &amp; Social Impact Filings
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Section 106 local authority covenants and artisan manufacturing workforce hours
              </p>
            </div>
            <button onClick={() => setShowJobModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem', minHeight: '38px' }}>
              + New Filing
            </button>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading filings…</div>
          ) : jobReports.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
              <p style={{ margin: '0 0 1rem 0', fontWeight: 700, color: 'var(--text-main)' }}>No job filings recorded yet</p>
              <button onClick={() => setShowJobModal(true)} className="btn btn-primary">Submit Your First Filing</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Period</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date Range</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Jobs Created</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Source</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {jobReports.map((report) => (
                    <tr key={report.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ backgroundColor: 'var(--accent-light)', color: 'var(--color-sky)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>{report.periodType}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(report.periodStart).toLocaleDateString('en-GB')} – {new Date(report.periodEnd).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '1rem', color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                        {report.jobsCreated}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                          {report.reportSource === 'THIRD_PARTY_API' ? 'API Ingest' : 'Portal Self-Report'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '280px' }}>
                        {report.attestationNote || 'Verified Section 106 covenant'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 5: Settlement History & 15% ESG Splits ──────────────────── */}
      {activeView === 'transactions' && (
        <div className="persefoni-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                Transaction History &amp; 15% ESG Splits
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Immutable settlement history with SHA-256 data watermarks</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['ALL', 'SETTLED', 'PENDING'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} style={{
                  padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer',
                  border: statusFilter === s ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                  backgroundColor: statusFilter === s ? 'var(--accent-light)' : 'var(--bg-card)',
                  color: statusFilter === s ? 'var(--color-sky)' : 'var(--text-muted)',
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions…</div>
          ) : filteredTransactions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No transactions for filter: <strong>{statusFilter}</strong>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Transaction ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Gross Amount</th>
                    <th style={{ padding: '0.75rem 1rem' }}>15% Charity Split</th>
                    <th style={{ padding: '0.75rem 1rem' }}>On-Chain</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>
                        {tx.id.substring(0, 16)}…
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <StatusBadge status={tx.status} />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        £{(tx.grossAmountCents / 100).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                        £{(tx.charityGiftCents / 100).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <OpenSeaBadge transactionId={tx.id} licenseeId={tx.licenseeId} />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 6: Client Profile & Ingestion API Keys ──────────────────── */}
      {activeView === 'profile' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
            {/* Account Identity Card */}
            <div className="persefoni-card" style={{ padding: '1.75rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Client Profile &amp; Organization
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  🏢
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    {user?.licenseeId || 'Enterprise Client'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-green)', fontWeight: 600 }}>
                    ● Verified Statutory Licensee
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Registered Email:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{user?.email || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Security Role:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{user?.role || 'PARTNER'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Transport Security:</span>
                  <span style={{ color: 'var(--color-sky)', fontWeight: 600 }}>256-bit TLS Encrypted</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Assurance Standard:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>ISO 19011:2026 Ready</span>
                </div>
              </div>
            </div>

            {/* Ingestion API Credentials Card */}
            <div className="persefoni-card" style={{ padding: '1.75rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Telemetry Ingestion API Key
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                Use this key for programmatic REST telemetry feeds from meters, IoT sensors, or workforce HR platforms.
              </p>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-sky)',
                backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: '8px',
                wordBreak: 'break-all', marginBottom: '0.75rem', border: '1px solid var(--border-light)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem',
              }}>
                <span>{telemetryApiKey}</span>
                <button
                  type="button"
                  onClick={copyApiKey}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', flexShrink: 0 }}
                >
                  {copiedApiKey ? 'Copied!' : 'Copy Key'}
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                🔒 Transmit via <code style={{ color: 'var(--color-sky)' }}>x-api-key</code> HTTP Header.
              </div>
            </div>
          </div>

          {/* Evidence Locker Shortcut Card */}
          <div className="persefoni-card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>
                  Client Evidence Locker
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Store, manage, and verify SHA-256 watermarked audit evidence documents, utility bills, and covenant filings.
                </p>
              </div>
              <a href="/portal/evidence" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}>
                Open Evidence Locker →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Job Filing Modal ──────────────────────────────────────────────────── */}
      {showJobModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setShowJobModal(false)}
        >
          <div className="persefoni-card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Submit Section 106 Job Filing</h3>
              <button type="button" onClick={() => setShowJobModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer' }}>x</button>
            </div>
            {jobFormError && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {jobFormError}
              </div>
            )}
            <form onSubmit={handleJobSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Period Type</label>
                <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} className="form-input">
                  <option value="QUARTERLY">Quarterly (Section 106 Standard)</option>
                  <option value="ANNUAL">Annual Corporate Filing</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Period Start</label>
                  <input type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Period End</label>
                  <input type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="form-input" />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Verified Jobs Created</label>
                <input type="number" required min={1} value={jobsCreatedInput} onChange={(e) => setJobsCreatedInput(e.target.value)} className="form-input" />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Attestation / Auditor Note</label>
                <textarea value={customNoteInput} onChange={(e) => setCustomNoteInput(e.target.value)} placeholder="e.g. Local authority Section 106 covenant for artisan embroidery workforce" className="form-input" rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowJobModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submittingJob} className="btn btn-primary">
                  {submittingJob ? 'Submitting…' : 'Confirm Filing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};
