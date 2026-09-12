import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { OpenSeaBadge } from '../components/OpenSeaBadge';
import { SoftwareEmbedBuilder } from '../components/SoftwareEmbedBuilder';
import { InteractiveAuditStepper } from '../components/InteractiveAuditStepper';

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

// ── Google Material Vector SVGs (Google SaaS Standard) ──────────────────────
const GoogleIcons = {
  Workflow: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Overview: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Credentials: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  Jobs: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Ledger: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Folder: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Building: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="9" y1="6" x2="9.01" y2="6" />
      <line x1="15" y1="6" x2="15.01" y2="6" />
      <line x1="9" y1="10" x2="9.01" y2="10" />
      <line x1="15" y1="10" x2="15.01" y2="10" />
      <line x1="9" y1="14" x2="9.01" y2="14" />
      <line x1="15" y1="14" x2="15.01" y2="14" />
      <path d="M10 22v-4h4v4" />
    </svg>
  ),
  Leaf: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
  AutoFix: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 4.2L5.9 8.1 9.5 11l-1 4.5 3.5-2.5 3.5 2.5-1-4.5 3.6-2.9-4.2-.9z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Code: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Unlock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ),
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

export type DashboardView = 'workflow' | 'overview' | 'credentials' | 'jobs' | 'embed' | 'transactions' | 'legal' | 'profile';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getFormattedDate = () => {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
};

export const PortalPage: React.FC = () => {
  const { token, user, logout } = useAuth();

  // ── Dashboard Navigation View ─────────────────────────────────────────────
  const [activeView, setActiveView] = useState<DashboardView>('workflow');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [copiedApiKey, setCopiedApiKey] = useState<boolean>(false);
  const [copiedClientId, setCopiedClientId] = useState<boolean>(false);

  // ── Global portal data ────────────────────────────────────────────────────
  const [summary, setSummary] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [jobReports, setJobReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── ISO Workflow & Framework State ─────────────────────────────────────────
  const [auditScope, setAuditScope] = useState<AuditScope>('CARBON_EMISSION');
  const [activeStep, setActiveStep] = useState<WorkflowStep>(1);
  const activeTiers = auditScope === 'CARBON_EMISSION' ? TIERS : JOB_TIERS;
  const [framework, setFramework] = useState<any | null>(null);
  const [frameworkLoading, setFrameworkLoading] = useState(false);
  const [availableFrameworks, setAvailableFrameworks] = useState<any[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(['ISO_14064_1', 'UK_SECR']);
  const [diagnosticBundle, setDiagnosticBundle] = useState<any | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [auditorReviewLoading, setAuditorReviewLoading] = useState(false);
  const [auditorReviewSuccess, setAuditorReviewSuccess] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedTier, setSelectedTier] = useState<string>('TIER_1_READINESS');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isoStatus, setIsoStatus] = useState<any | null>(null);
  const [isoStatusLoading, setIsoStatusLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('ALL');
  const [diagnosticViewMode, setDiagnosticViewMode] = useState<'GUIDED' | 'FULL_OVERVIEW'>('GUIDED');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    P1_BOUNDARY: true,
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

  const toggleFramework = (frameworkId: string) => {
    setSelectedFrameworks((prev) => {
      if (prev.includes(frameworkId)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((id) => id !== frameworkId);
      } else {
        return [...prev, frameworkId];
      }
    });
  };


  // ── Listen for global/top app bar drawer toggle ────────────────────────────
  useEffect(() => {
    const handleToggle = () => {
      setMobileSidebarOpen((prev) => !prev);
    };
    window.addEventListener('toggle-portal-sidebar', handleToggle);
    return () => {
      window.removeEventListener('toggle-portal-sidebar', handleToggle);
    };
  }, []);

  // ── Restore in-progress diagnostic answers from localStorage on mount ─────
  useEffect(() => {
    if (!user?.licenseeId) return;
    try {
      const saved = localStorage.getItem(`ghg_draft_answers_${user.licenseeId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setAnswers((prev) => ({ ...parsed, ...prev }));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [user?.licenseeId]);

  // ── Auto-save diagnostic draft answers to localStorage on change ──────────
  useEffect(() => {
    if (!user?.licenseeId || Object.keys(answers).length === 0) return;
    try {
      localStorage.setItem(`ghg_draft_answers_${user.licenseeId}`, JSON.stringify(answers));
    } catch {
      // Ignore quota errors
    }
  }, [answers, user?.licenseeId]);

  // ── Load available compliance frameworks on mount ──────────────────────────
  useEffect(() => {
    let isMounted = true;
    api.getComplianceFrameworks()
      .then((data) => {
        if (isMounted && Array.isArray(data?.frameworks)) {
          setAvailableFrameworks(data.frameworks);
        }
      })
      .catch((err) => {
        console.warn('[Compliance Frameworks Load Error]', err);
      });
    return () => { isMounted = false; };
  }, []);

  // ── Load diagnostic bundle when selectedFrameworks change ──────────────────
  useEffect(() => {
    let isMounted = true;
    if (selectedFrameworks.length === 0) return;
    setBundleLoading(true);
    api.getDiagnosticBundle(selectedFrameworks)
      .then((data) => {
        if (isMounted && data?.bundle) {
          setDiagnosticBundle(data.bundle);
        }
      })
      .catch((err) => {
        console.warn('[Diagnostic Bundle Load Error]', err);
      })
      .finally(() => {
        if (isMounted) setBundleLoading(false);
      });
    return () => { isMounted = false; };
  }, [selectedFrameworks]);

  // ── Fetch portal summary, transactions, jobs ───────────────────────────────
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

  // ── Load ISO framework fallback ───────────────────────────────────────────
  useEffect(() => {
    if (activeStep !== 1 || framework) return;
    setFrameworkLoading(true);
    api.getIsoFramework()
      .then((res) => setFramework(res.framework))
      .catch(() => setFramework(null))
      .finally(() => setFrameworkLoading(false));
  }, [activeStep, framework]);

  // ── Load ISO status with callback ─────────────────────────────────────────
  const fetchIsoStatus = useCallback(async () => {
    if (!token || !user?.licenseeId) return;
    setIsoStatusLoading(true);
    try {
      const res = await api.getIsoStatus(token, user.licenseeId);
      setIsoStatus(res.latestSubmission);
      if (res.latestSubmission?.id) {
        setSubmissionId(res.latestSubmission.id);
        if (res.latestSubmission.selectedFrameworks && res.latestSubmission.selectedFrameworks.length > 0) {
          setSelectedFrameworks(res.latestSubmission.selectedFrameworks);
        }
      }
    } catch {
      setIsoStatus(null);
    } finally {
      setIsoStatusLoading(false);
    }
  }, [token, user?.licenseeId]);

  useEffect(() => {
    fetchIsoStatus();
  }, [fetchIsoStatus]);

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
    if (!token) {
      setActiveStep(2);
      return;
    }
    const questionsToSubmit = diagnosticBundle?.pillars
      ? diagnosticBundle.pillars.flatMap((p: any) => (p.questions || []).map((q: any) => ({
          questionId: q.id,
          questionText: q.text,
          answer: answers[q.id] || 'Partially implemented',
          isoClause: q.applicableStandards?.[0] || 'ISO 14064-1',
        })))
      : (framework?.sections || []).flatMap((s: any) => (s.questions || []).map((q: any) => ({
          questionId: q.questionId,
          questionText: q.questionText,
          answer: answers[q.questionId] || 'Partially implemented',
          isoClause: q.isoClause || 'ISO 14001',
        })));

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.submitIsoAnswers(token, {
        answers: questionsToSubmit,
        tierSelected: selectedTier,
        selectedFrameworks,
      });
      setSubmissionId(res.submissionId);
      await fetchIsoStatus();
      setActiveStep(2);
    } catch (err: any) {
      // Allow proceeding to review pricing
      setActiveStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Lead Auditor Verification Sign-Off (Transition to AUDIT_READY) ────────
  const handleAuditorSignOff = async () => {
    if (!token) return;
    setAuditorReviewLoading(true);
    setSubmitError(null);
    setAuditorReviewSuccess(null);
    try {
      let activeSubId = submissionId;
      const questionsToSubmit = diagnosticBundle?.pillars
        ? diagnosticBundle.pillars.flatMap((p: any) => (p.questions || []).map((q: any) => ({
            questionId: q.id,
            questionText: q.text,
            answer: answers[q.id] || 'Fully compliant & documented',
            isoClause: q.applicableStandards?.[0] || 'ISO 14064-1',
          })))
        : (framework?.sections || []).flatMap((s: any) => (s.questions || []).map((q: any) => ({
            questionId: q.questionId,
            questionText: q.questionText,
            answer: answers[q.questionId] || 'Yes, fully in place',
            isoClause: q.isoClause || 'ISO 14001',
          })));

      // Save latest answers first
      const subRes = await api.submitIsoAnswers(token, {
        answers: questionsToSubmit,
        tierSelected: selectedTier,
        selectedFrameworks,
      });
      activeSubId = subRes.submissionId;
      setSubmissionId(activeSubId);

      // Sign off as AUDIT_READY
      const reviewRes = await api.reviewIsoSubmission(token, {
        submissionId: activeSubId || '',
        targetStatus: 'AUDIT_READY',
        auditorNotes: 'ISO 19011:2026 Annex A remote verification completed. 80%+ conformance threshold verified across selected frameworks.',
      });

      setAuditorReviewSuccess(reviewRes.message || 'Audit readiness confirmed. Gate 1 cleared.');
      await fetchIsoStatus();
    } catch (err: any) {
      setSubmitError(err.message || 'Auditor verification request failed.');
    } finally {
      setAuditorReviewLoading(false);
    }
  };

  // ── Create Stripe checkout ────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!token) return;
    if (auditScope === 'CARBON_EMISSION' && !isAuditReady) {
      setCheckoutError('Gate 1 Enforcement: Lead Auditor sign-off is required before commercial checkout. Return to Step 1 and request auditor review.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      let activeSubId = submissionId;
      if (!activeSubId) {
        const answerPayload = Object.entries(answers).map(([qId, ans]) => ({
          questionId: qId,
          answer: ans,
        }));
        const subRes = await api.submitIsoAnswers(token, {
          answers: answerPayload.length > 0 ? answerPayload : [{ questionId: 'S1-Q1', answer: 'Yes, fully in place' }],
          tierSelected: selectedTier,
        });
        activeSubId = subRes.submissionId;
        setSubmissionId(activeSubId);
      }
      const origin = window.location.origin;
      const res = await api.createIsoCheckout(token, {
        submissionId: activeSubId || '',
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
    if (!isPaid) {
      setCompositeError('Gate 2 Enforcement: Payment settlement is required to access Credential Studio and generate composite badges.');
      return;
    }
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
    if (!isPaid) {
      setMintError('Gate 2 Enforcement: Payment settlement is required before issuing and minting on-chain credentials.');
      return;
    }
    if (auditScope === 'CARBON_EMISSION' && !isAuditReady) {
      setMintError('Gate 3 Enforcement: Lead Auditor AUDIT_READY clearance is required before issuing and minting on-chain credentials.');
      return;
    }
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
          tierSelected: selectedTier,
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
          tierSelected: selectedTier,
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
    if (step === '2') setActiveStep(2);
    if (step === '3') setActiveStep(3);
    if (step === '4') setActiveStep(4);
    if (step === '5') setActiveStep(5);

    const scopeParam = params.get('scope');
    if (scopeParam === 'JOB_REPORTING') setAuditScope('JOB_REPORTING');
    else if (scopeParam === 'CARBON_EMISSION') setAuditScope('CARBON_EMISSION');

    const viewParam = params.get('view') || params.get('tab');
    if (viewParam === 'overview' || viewParam === 'kpis') {
      setActiveView('overview');
    } else if (viewParam === 'credentials' || viewParam === 'nft') {
      setActiveView('credentials');
    } else if (viewParam === 'jobs' || viewParam === 'job-reporting') {
      setActiveView('jobs');
      setAuditScope('JOB_REPORTING');
    } else if (viewParam === 'transactions' || viewParam === 'settlement') {
      setActiveView('transactions');
    } else if (viewParam === 'profile' || viewParam === 'evidence') {
      setActiveView('profile');
    } else if (viewParam === 'telemetry') {
      setActiveView('workflow');
      setActiveStep(3);
    } else if (viewParam === 'studio') {
      setActiveView('workflow');
      setActiveStep(4);
    } else if (viewParam === 'workflow' || viewParam === 'diagnostic') {
      setActiveView('workflow');
      setActiveStep(1);
    }
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

  // Corporate display name resolver (never shows raw licensee ID as greeting)
  const getDisplayName = (): string => {
    if (user?.email) {
      const domain = user.email.split('@')[1];
      if (domain) {
        const base = domain.split('.')[0];
        return base.charAt(0).toUpperCase() + base.slice(1);
      }
    }
    return 'Enterprise Partner';
  };

  const displayName = getDisplayName();

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
      case 'embed':
        return 'Website Trust Seal & HTML Embed Generator';
      case 'transactions':
        return 'Settlement History & 15% ESG Splits';
      case 'legal':
        return 'ISO 19011:2026 Annex A Remote Auditing Guarantee';
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
  const allQuestions = diagnosticBundle?.pillars
    ? diagnosticBundle.pillars.flatMap((p: any) => (p.questions || []).map((q: any) => ({
        questionId: q.id,
        id: q.id,
        questionText: q.text,
        text: q.text,
        applicableStandards: q.applicableStandards,
        isoClause: q.applicableStandards?.[0] || 'ISO 14064-1',
        statutoryMandate: q.statutoryMandate,
        evidenceRequired: q.evidenceRequired,
        options: q.options,
      })))
    : (framework?.sections || []).flatMap((s: any) => (s.questions || []).map((q: any) => ({
        questionId: q.questionId,
        id: q.questionId,
        questionText: q.questionText,
        text: q.questionText,
        applicableStandards: [q.isoClause],
        isoClause: q.isoClause || 'ISO 14001',
        statutoryMandate: q.legalMandate,
        evidenceRequired: q.evidenceRequired,
        options: ['Yes, fully in place', 'Partially implemented', 'Not yet implemented', 'Not applicable'],
      })));

  const formattedPillars = (diagnosticBundle?.pillars || (framework?.sections || []).map((s: any) => ({
    pillarId: s.sectionId,
    pillarTitle: s.sectionTitle,
    description: 'Statutory screening and management systems audit clause',
    questions: (s.questions || []).map((q: any) => ({
      id: q.questionId,
      questionId: q.questionId,
      text: q.questionText,
      questionText: q.questionText,
      applicableStandards: [q.isoClause],
      statutoryMandate: q.legalMandate,
      evidenceRequired: q.evidenceRequired,
      options: ['Fully compliant & documented', 'Partially implemented', 'Planned within 90 days', 'Not applicable'],
    })),
  }))).map((p: any) => ({
    pillarId: p.pillarId,
    pillarTitle: p.pillarTitle,
    description: p.description,
    questions: (p.questions || []).map((q: any) => ({
      id: q.id || q.questionId,
      questionId: q.id || q.questionId,
      text: q.text || q.questionText,
      questionText: q.text || q.questionText,
      applicableStandards: q.applicableStandards || (q.isoClause ? [q.isoClause] : []),
      statutoryMandate: q.statutoryMandate || q.legalMandate,
      evidenceRequired: q.evidenceRequired,
      options: q.options || ['Fully compliant & documented', 'Partially implemented', 'Planned within 90 days', 'Not applicable'],
    })),
  }));

  const totalQuestions = allQuestions.length;
  const answeredQuestions = allQuestions.filter((q: any) => Boolean(answers[q.id || q.questionId])).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // Real-time compliance score estimator (0 to 100%)
  const scoreMetrics = allQuestions.reduce(
    (acc: { score: number; count: number }, q: any) => {
      const qId = q.id || q.questionId;
      const ans = answers[qId];
      if (!ans) return acc;
      if (ans === 'Yes, fully in place' || ans === 'Fully compliant & documented') return { score: acc.score + 100, count: acc.count + 1 };
      if (ans === 'Partially implemented') return { score: acc.score + 50, count: acc.count + 1 };
      if (ans === 'Not yet implemented' || ans === 'Planned within 90 days') return { score: acc.score + 0, count: acc.count + 1 };
      return acc; // N/A is neutral
    },
    { score: 0, count: 0 }
  );
  const estimatedComplianceScore =
    scoreMetrics.count > 0 ? Math.round(scoreMetrics.score / scoreMetrics.count) : 0;

  // ── Status and Gate Enforcement flags ────────────────────────────────────
  const currentSubmissionStatus = isoStatus?.status || (submissionId ? 'SUBMITTED' : 'NOT_STARTED');
  const isAuditReady = currentSubmissionStatus === 'AUDIT_READY' || currentSubmissionStatus === 'APPROVED';
  const isPaid = Boolean(isoStatus?.paidAt || currentSubmissionStatus === 'APPROVED');

  const totalVerifiedJobs = jobReports.reduce((acc, r) => acc + (r.jobsCreated || 0), 0);

  const kpis = auditScope === 'CARBON_EMISSION'
    ? [
        { label: 'Settled Transactions', value: loading ? '...' : (summary?.totalSettledTransactions ?? 0).toLocaleString(), sub: 'Verified Audit Trail', accent: 'var(--color-sky)' },
        { label: 'Settled Gross Volume', value: loading ? '...' : `\u00a3${((summary?.totalGrossVolumeCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'Contractual Settlement', accent: 'var(--color-green)' },
        { label: '15% ESG Charity Split', value: loading ? '...' : `\u00a3${((summary?.totalCharityGiftCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'Direct Environmental Routing', accent: 'var(--color-sky)' },
        { label: 'Active Credentials', value: credentials.length.toString(), sub: 'Polygon ERC-1155 Minted', accent: 'var(--google-amber)' },
      ]
    : [
        { label: 'Total Verified Jobs', value: loading ? '...' : totalVerifiedJobs.toLocaleString(), sub: 'Section 106 Local Impact', accent: 'var(--color-sky)' },
        { label: 'Active Filing Periods', value: loading ? '...' : jobReports.length.toString(), sub: 'Quarterly & Annual Covenants', accent: 'var(--color-green)' },
        { label: '15% Social Endowment', value: loading ? '...' : `\u00a3${((summary?.totalCharityGiftCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'Direct Disaster Relief Endowment', accent: 'var(--color-sky)' },
        { label: 'Audited Covenants', value: jobReports.length > 0 ? '100% Verified' : 'Filing Required', sub: 'ISO 19011:2026 Assured', accent: 'var(--google-amber)' },
      ];

  // ── Sidebar nav items helper (shared desktop + mobile drawer) ───────────
  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      {/* Client Profile Card */}
      <div className="portal-sidebar-profile">
        <div className="portal-profile-avatar">
          <GoogleIcons.Building />
        </div>
        <div className="portal-profile-info">
          <div className="portal-profile-role">Client Account</div>
          <div className="portal-profile-name" title={displayName}>
            {displayName}
          </div>
          {user?.licenseeId && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {user.licenseeId.substring(0, 16)}...
            </div>
          )}
          <div className="portal-profile-status">
            <span className="portal-status-dot" />
            <span>Active Licensee</span>
          </div>
        </div>
        {onNav && (
          <button
            type="button"
            className="portal-mobile-profile-close-btn"
            onClick={onNav}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            ✕
          </button>
        )}
      </div>

      {/* Modern Grouped Sidebar Nav Items */}
      <nav className="portal-sidebar-nav" aria-label="Dashboard Navigation">
        {/* MAIN */}
        <div className="portal-nav-section-title">MAIN</div>
        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => { setActiveView('overview'); onNav?.(); }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Overview /></span>
          <span className="portal-nav-label">KPI Overview</span>
        </button>

        {/* COMPLIANCE */}
        <div className="portal-nav-section-title" style={{ marginTop: '0.65rem' }}>COMPLIANCE</div>
        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'workflow' && auditScope === 'CARBON_EMISSION' ? 'active' : ''}`}
          onClick={() => {
            setActiveView('workflow');
            setAuditScope('CARBON_EMISSION');
            onNav?.();
          }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Workflow /></span>
          <span className="portal-nav-label">ISO Carbon Audit</span>
          <span className="portal-nav-badge">Step {activeStep}/5</span>
        </button>

        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'jobs' ? 'active' : ''}`}
          onClick={() => {
            setActiveView('jobs');
            if (auditScope !== 'JOB_REPORTING') setAuditScope('JOB_REPORTING');
            onNav?.();
          }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Jobs /></span>
          <span className="portal-nav-label">Workforce &amp; S106</span>
          {jobReports.length > 0 && <span className="portal-nav-badge count">{jobReports.length}</span>}
        </button>

        {/* LICENSING & WEB */}
        <div className="portal-nav-section-title" style={{ marginTop: '0.65rem' }}>LICENSING &amp; WEB</div>
        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'workflow' && activeStep === 4 ? 'active' : ''}`}
          onClick={() => {
            setActiveView('workflow');
            setActiveStep(4);
            onNav?.();
          }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Credentials /></span>
          <span className="portal-nav-label">Credential Studio</span>
        </button>

        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'embed' ? 'active' : ''}`}
          onClick={() => { setActiveView('embed'); onNav?.(); }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Code /></span>
          <span className="portal-nav-label">Web Trust Seal</span>
          <span className="portal-nav-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>CDN</span>
        </button>

        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'credentials' ? 'active' : ''}`}
          onClick={() => { setActiveView('credentials'); onNav?.(); }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Shield /></span>
          <span className="portal-nav-label">Issued Credentials</span>
          {credentials.length > 0 && <span className="portal-nav-badge count">{credentials.length}</span>}
        </button>

        {/* FINANCE & LEGAL */}
        <div className="portal-nav-section-title" style={{ marginTop: '0.65rem' }}>FINANCE &amp; LEGAL</div>
        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'transactions' ? 'active' : ''}`}
          onClick={() => { setActiveView('transactions'); onNav?.(); }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Ledger /></span>
          <span className="portal-nav-label">Settlement Ledger</span>
          {transactions.length > 0 && <span className="portal-nav-badge count">{transactions.length}</span>}
        </button>

        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'legal' ? 'active' : ''}`}
          onClick={() => { setActiveView('legal'); onNav?.(); }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Shield /></span>
          <span className="portal-nav-label">ISO 19011 Guarantee</span>
        </button>
      </nav>

      {/* Quick Utilities in Sidebar Footer */}
      <div className="portal-sidebar-footer">
        <button
          type="button"
          onClick={() => { setActiveView('profile'); onNav?.(); }}
          className={`portal-nav-btn ${activeView === 'profile' ? 'active' : ''}`}
          style={{ padding: '0.5rem 0.75rem' }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Profile /></span>
          <span className="portal-nav-label">Settings &amp; API Keys</span>
        </button>

        <button
          type="button"
          onClick={() => { logout(); onNav?.(); }}
          className="portal-nav-btn"
          style={{ padding: '0.5rem 0.75rem', color: 'var(--google-red)' }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Logout /></span>
          <span className="portal-nav-label">Sign out</span>
        </button>

        <div className="portal-sidebar-security">
          <span className="portal-status-dot" />
          <span>ISO 19011:2026 Engine Online</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="portal-dashboard-layout">

      {/* ── Mobile Backdrop Overlay ──────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="portal-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Off-Canvas Sidebar Drawer ─────────────────────────────────── */}
      <aside className={`portal-sidebar-drawer ${mobileSidebarOpen ? 'open' : ''}`} aria-label="Mobile navigation">
        <div className="portal-drawer-topbar">
          <div className="portal-drawer-brand">
            <img
              src="/images/nfty-logs-logo.png"
              alt="GHGEmissionLogs Logo"
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
            />
            <span className="portal-drawer-brand-text">GHGEmissionLogs</span>
          </div>
          <button
            type="button"
            className="portal-drawer-cancel-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <span className="portal-drawer-cancel-x">✕</span>
            <span className="portal-drawer-cancel-label">CLOSE</span>
          </button>
        </div>
        <SidebarContent onNav={() => setMobileSidebarOpen(false)} />
        <div className="portal-drawer-bottom-close">
          <button
            type="button"
            className="portal-drawer-full-close-btn"
            onClick={() => setMobileSidebarOpen(false)}
          >
            ✕ Close Sidebar Menu
          </button>
        </div>
      </aside>

      {/* ── Left Sidebar: Desktop (always visible >= 961px) ───────────────────── */}
      <aside className="portal-sidebar">
        <SidebarContent />
      </aside>

      {/* ── Main Workspace ─────────────────────────────────────────────────── */}
      <main className="portal-main-workspace">

        {/* Top Greeting Banner */}
        <div className="portal-greeting-banner">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 500 }}>
              {getFormattedDate()}
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0', letterSpacing: '-0.01em' }}>
              {getGreeting()}, {displayName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-settled" style={{ fontSize: '0.72rem' }}>
                ACTIVE LICENSEE
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Contractual 85/15 Statutory Split Guaranteed: ISO 19011:2026 Remote Auditing
              </span>
              {user?.licenseeId && (
                <button
                  type="button"
                  onClick={copyClientId}
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-sky)',
                    background: 'var(--accent-light)',
                    border: '1px solid var(--color-sky)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                  title="Click to copy License ID"
                >
                  {copiedClientId ? 'Copied!' : `ID: ${user.licenseeId.substring(0, 14)}...`}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setActiveView('workflow');
                setAuditScope('CARBON_EMISSION');
                if (activeView !== 'workflow') setActiveStep(1);
              }}
              className="btn btn-primary"
            >
              {activeView === 'workflow' && activeStep > 1
                ? `Resume Audit (Step ${activeStep} of 5)`
                : '+ Start Carbon Audit'}
            </button>
          </div>
        </div>

        {/* Workspace Header Bar - Clean Google Standard */}
        <div className="portal-workspace-header">
          <div className="portal-header-left">
            {/* Hamburger: mobile only */}
            <button
              type="button"
              className="portal-hamburger-btn"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileSidebarOpen}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
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
                <span className="m3-segment-icon"><GoogleIcons.Leaf /></span>
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
                <span className="m3-segment-icon"><GoogleIcons.Jobs /></span>
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
        <div className="portal-stepper-container">
          {/* Mobile Stepper Header (visible <= 768px) */}
          <div className="portal-stepper-mobile-bar">
            <div className="portal-mobile-step-status">
              <span className="portal-mobile-step-pill">Step {activeStep} of 5</span>
              <span className="portal-mobile-step-title">{STEP_LABELS[auditScope][activeStep]}</span>
            </div>
            <div className="portal-mobile-step-nav">
              <button
                type="button"
                className="portal-mobile-step-btn"
                disabled={activeStep <= 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1) as WorkflowStep)}
                aria-label="Previous step"
              >
                ← Prev
              </button>
              <button
                type="button"
                className="portal-mobile-step-btn primary"
                disabled={activeStep >= 5}
                onClick={() => setActiveStep((prev) => Math.min(5, prev + 1) as WorkflowStep)}
                aria-label="Next step"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Stepper Steps Track (Desktop + Mobile Horizontal Scroll Snap) */}
          <div className="portal-stepper-bar">
            {([1, 2, 3, 4, 5] as WorkflowStep[]).map((step, idx) => {
              const isActive = activeStep === step;

              // Gate-truthful status resolver
              const getStepStatus = (): 'completed' | 'action-required' | 'locked' | 'active' | 'pending' => {
                if (isActive) return 'active';
                if (auditScope === 'CARBON_EMISSION') {
                  if (step === 1) return isAuditReady ? 'completed' : (activeStep > 1 ? 'action-required' : 'pending');
                  if (step === 2) return isPaid ? 'completed' : (activeStep > 2 ? 'action-required' : 'pending');
                  if (step === 3) return isPaid ? 'completed' : 'locked';
                  if (step === 4) return credentials.length > 0 ? 'completed' : (!isPaid || !isAuditReady) ? 'locked' : 'pending';
                  if (step === 5) return mintResult ? 'completed' : 'locked';
                }
                // JOB_REPORTING scope: positional only (no payment gate)
                return step < activeStep ? 'completed' : 'pending';
              };

              const stepStatus = getStepStatus();
              const isCompleted = stepStatus === 'completed';
              const isLocked = stepStatus === 'locked';
              const isActionRequired = stepStatus === 'action-required';

              const getBadgeContent = () => {
                if (isCompleted) return '\u2713';
                if (isActionRequired) return '!';
                if (isLocked) return '\uD83D\uDD12';
                return step;
              };

              const getConnectorClass = () => {
                if (step >= activeStep) return '';
                const nextStatus = (() => {
                  const nextStep = (step + 1) as WorkflowStep;
                  if (nextStep === activeStep) return 'active-step';
                  if (auditScope === 'CARBON_EMISSION') {
                    if (nextStep === 3 && !isPaid) return 'warning';
                    if (nextStep === 4 && (!isPaid || !isAuditReady)) return 'warning';
                    if (nextStep === 5 && !mintResult) return 'warning';
                  }
                  return 'active';
                })();
                return nextStatus === 'warning' ? 'warning' : 'active';
              };

              return (
                <React.Fragment key={step}>
                  <button
                    type="button"
                    onClick={() => !isLocked && setActiveStep(step)}
                    disabled={isLocked}
                    className={`portal-stepper-step-btn ${stepStatus}`}
                    aria-label={`${STEP_LABELS[auditScope][step]}${isLocked ? ' (locked)' : isActionRequired ? ' (action required)' : ''}`}
                  >
                    <div className="portal-step-badge">
                      {getBadgeContent()}
                    </div>
                    <div className="portal-step-label-box">
                      <div className="portal-step-label">
                        {STEP_LABELS[auditScope][step]}
                      </div>
                      {isActionRequired && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--google-amber)', fontWeight: 700 }}>Action Required</div>
                      )}
                      {isLocked && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Locked</div>
                      )}
                    </div>
                  </button>

                  {idx < 4 && (
                    <div className={`portal-stepper-connector ${getConnectorClass()}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="portal-step-content portal-step-content-box">

          {/* ── STEP 1: Audit Preparation (Scope Adaptive) ── */}
          {activeStep === 1 && (
            auditScope === 'CARBON_EMISSION' ? (
              <div>
              {/* Cerebrium-style Streamlined Assessment Header */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--cerebrium-magenta)', fontSize: '0.72rem', fontWeight: 800, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--cerebrium-magenta)', boxShadow: '0 0 8px var(--cerebrium-magenta)' }} />
                  <span>ISO Audit-Readiness Diagnostic Studio</span>
                </div>
                <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: 'var(--cerebrium-ink-navy)', margin: '0 0 0.4rem 0', letterSpacing: '-0.025em' }}>
                  Statutory Conformance &amp; Screening <span style={{ color: 'var(--cerebrium-magenta)' }}>Engine</span>
                </h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
                  Interactive multi-pillar diagnostic aligned with ISO 14001:2015, ISO 50001:2018, ISO 14064, and ISO 19011:2026 remote auditing protocols.
                </p>
              </div>

              {/* Multi-Framework Harmonisation Selector Bar */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginTop: '1.25rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Target Statutory &amp; Voluntary Frameworks (Multi-Standard Harmonisation)
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Select the international carbon reporting standards applicable to your operations. Questions dynamically deduplicate across all 5 core pillars.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)', backgroundColor: 'var(--accent-light)', padding: '2px 8px', borderRadius: '4px' }}>
                    {selectedFrameworks.length} Frameworks Selected
                  </span>
                </div>

                {/* Framework Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(availableFrameworks.length > 0 ? availableFrameworks : [
                    { id: 'ISO_14064_1', shortTitle: 'ISO 14064-1', title: 'ISO 14064-1:2018 (GHG Inventories)', jurisdiction: 'Global' },
                    { id: 'ISO_50001', shortTitle: 'ISO 50001', title: 'ISO 50001:2018 (Energy Management)', jurisdiction: 'Global' },
                    { id: 'GHG_PROTOCOL', shortTitle: 'GHG Protocol', title: 'GHG Protocol Corporate Standard', jurisdiction: 'Global' },
                    { id: 'UK_SECR', shortTitle: 'UK SECR', title: 'UK SECR (Streamlined Energy & Carbon)', jurisdiction: 'UK' },
                    { id: 'EU_CSRD', shortTitle: 'EU CSRD', title: 'EU CSRD (ESRS E1 Climate Standard)', jurisdiction: 'EU' },
                    { id: 'US_CASB253', shortTitle: 'US CA-SB253', title: 'US California SB 253 Climate Disclosure', jurisdiction: 'US' },
                    { id: 'UK_CMA', shortTitle: 'UK CMA', title: 'UK CMA Green Claims Code', jurisdiction: 'UK' },
                    { id: 'ISO_14067', shortTitle: 'ISO 14067', title: 'ISO 14067 (Product Carbon Footprint)', jurisdiction: 'Global' },
                  ]).map((fw: any) => {
                    const isSelected = selectedFrameworks.includes(fw.id);
                    return (
                      <button
                        key={fw.id}
                        type="button"
                        onClick={() => toggleFramework(fw.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                          backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.1)' : 'var(--bg-subtle)',
                          color: isSelected ? 'var(--color-sky)' : 'var(--text-muted)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{fw.shortTitle || fw.title}</span>
                        <span style={{ fontSize: '0.68rem', opacity: 0.75, padding: '1px 5px', borderRadius: '4px', backgroundColor: isSelected ? 'rgba(2,132,199,0.2)' : 'var(--bg-card)' }}>
                          {fw.jurisdiction}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {bundleLoading && (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Harmonising multi-framework requirements across pillars...
                </div>
              )}

              {/* View Mode Switcher: Guided Animated Wizard vs Full Inspection Grid */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.25rem 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Assessment Experience:
                  </span>
                  <span className="badge badge-settled" style={{ fontSize: '0.72rem' }}>
                    {diagnosticViewMode === 'GUIDED' ? '⚡ Guided Animated Wizard' : '📋 Full Inspection Grid'}
                  </span>
                </div>

                <div style={{
                  display: 'inline-flex',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '3px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                }}>
                  <button
                    type="button"
                    onClick={() => setDiagnosticViewMode('GUIDED')}
                    style={{
                      border: 'none',
                      backgroundColor: diagnosticViewMode === 'GUIDED' ? 'var(--bg-card)' : 'transparent',
                      color: diagnosticViewMode === 'GUIDED' ? 'var(--color-sky)' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      padding: '5px 14px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: diagnosticViewMode === 'GUIDED' ? 'var(--shadow-xs)' : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    ⚡ Guided Step-by-Step
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagnosticViewMode('FULL_OVERVIEW')}
                    style={{
                      border: 'none',
                      backgroundColor: diagnosticViewMode === 'FULL_OVERVIEW' ? 'var(--bg-card)' : 'transparent',
                      color: diagnosticViewMode === 'FULL_OVERVIEW' ? 'var(--color-sky)' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      padding: '5px 14px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: diagnosticViewMode === 'FULL_OVERVIEW' ? 'var(--shadow-xs)' : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    📋 Full Overview Grid
                  </button>
                </div>
              </div>

              {/* Guided Mode: Interactive Audit Stepper with animated slides & next button */}
              {!bundleLoading && diagnosticViewMode === 'GUIDED' && (
                <InteractiveAuditStepper
                  pillars={formattedPillars}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                  isAuditReady={isAuditReady}
                  onProceedToCheckout={() => setActiveStep(2)}
                  estimatedScore={estimatedComplianceScore}
                />
              )}

              {/* Full Overview Mode: 5-Pillars Inspection Accordion */}
              {!bundleLoading && diagnosticViewMode === 'FULL_OVERVIEW' && (
                <div>
                  {formattedPillars.map((pillar: any, pIdx: number) => {
                    const isExpanded = expandedSections[pillar.pillarId] ?? (pIdx === 0);
                    const pillarQuestions = pillar.questions || [];
                    const answeredCount = pillarQuestions.filter((q: any) => Boolean(answers[q.id || q.questionId])).length;
                    const isPillarComplete = pillarQuestions.length > 0 && answeredCount === pillarQuestions.length;

                    return (
                      <div
                        key={pillar.pillarId}
                        style={{
                          border: '1px solid var(--border-light)',
                          borderRadius: '12px',
                          marginBottom: '1.25rem',
                          overflow: 'hidden',
                          backgroundColor: 'var(--bg-card)',
                        }}
                      >
                        {/* Pillar Header */}
                        <div
                          onClick={() => setExpandedSections((prev) => ({ ...prev, [pillar.pillarId]: !isExpanded }))}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem 1.25rem',
                            cursor: 'pointer',
                            backgroundColor: 'var(--bg-subtle)',
                            borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              backgroundColor: isPillarComplete ? 'var(--color-green)' : 'rgba(2,132,199,0.15)',
                              color: isPillarComplete ? '#fff' : 'var(--color-sky)',
                              fontSize: '0.72rem', fontWeight: 700,
                            }}>
                              {isPillarComplete ? '✓' : pIdx + 1}
                            </span>
                            <div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {pillar.pillarTitle}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {pillar.description}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 600,
                              color: isPillarComplete ? 'var(--color-green)' : 'var(--text-muted)',
                              backgroundColor: isPillarComplete ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
                              padding: '2px 8px', borderRadius: '6px',
                            }}>
                              {answeredCount} of {pillarQuestions.length} answered
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                        </div>

                        {/* Pillar Questions */}
                        {isExpanded && (
                          <div className="portal-section-questions-container" style={{ padding: '1.25rem' }}>
                            {pillarQuestions.map((q: any, qIdx: number) => {
                              const qId = q.id || q.questionId;
                              const selectedAnswer = answers[qId];
                              const isLast = qIdx === pillarQuestions.length - 1;
                              const hasNote = Boolean(answers[`${qId}_notes`]);
                              const isNoteExpanded = expandedNotes[qId] || hasNote;

                              return (
                                <div
                                  key={qId}
                                  style={{
                                    paddingBottom: isLast ? '0.5rem' : '1.25rem',
                                    marginBottom: isLast ? 0 : '1.25rem',
                                    borderBottom: isLast ? 'none' : '1px solid var(--border-light)',
                                  }}
                                >
                                  {/* Badges */}
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                    <span style={{
                                      fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-sky)',
                                      backgroundColor: 'var(--accent-light)', padding: '2px 8px', borderRadius: '4px',
                                      fontFamily: 'var(--font-mono)',
                                    }}>
                                      {qId}
                                    </span>
                                    {(q.applicableStandards || []).map((std: string, sIdx: number) => (
                                      <span key={sIdx} style={{
                                        fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-sky)',
                                        backgroundColor: 'rgba(2,132,199,0.08)', padding: '2px 8px', borderRadius: '4px',
                                      }}>
                                        {std}
                                      </span>
                                    ))}
                                    {q.statutoryMandate && (
                                      <span style={{
                                        fontSize: '0.7rem', fontWeight: 600, color: '#a855f7',
                                        backgroundColor: 'rgba(168,85,247,0.08)', padding: '2px 8px', borderRadius: '4px',
                                      }}>
                                        {q.statutoryMandate}
                                      </span>
                                    )}
                                  </div>

                                  {/* Question Text */}
                                  <label style={{ display: 'block', fontSize: '0.91rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem', lineHeight: 1.45 }}>
                                    {q.text || q.questionText}
                                  </label>

                                  {/* Evidence Required */}
                                  {q.evidenceRequired && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                                      <span style={{ fontWeight: 600 }}>Evidence required:</span> {q.evidenceRequired}
                                    </div>
                                  )}

                                  {/* Answer Options */}
                                  <div className="portal-answer-btn-group">
                                    {(q.options || ['Fully compliant & documented', 'Partially implemented', 'Planned within 90 days', 'Not applicable']).map((opt: string) => {
                                      const isSelected = selectedAnswer === opt;
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => handleAnswerChange(qId, opt)}
                                          className={`portal-answer-option-btn ${isSelected ? 'selected' : ''}`}
                                        >
                                          <span className="portal-answer-indicator">{isSelected ? '✓' : '○'}</span>
                                          <span className="portal-answer-text">{opt}</span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Evidence Notes */}
                                  {!isNoteExpanded ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedNotes((prev) => ({ ...prev, [qId]: true }))}
                                      style={{
                                        background: 'none', border: 'none', padding: 0,
                                        fontSize: '0.75rem', color: 'var(--color-sky)',
                                        cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                        marginTop: '0.4rem',
                                      }}
                                    >
                                      + Add evidence description or document reference (optional)
                                    </button>
                                  ) : (
                                    <div style={{ marginTop: '0.5rem' }}>
                                      <textarea
                                        rows={2}
                                        placeholder="Enter supporting evidence reference, document title, or internal control docket..."
                                        value={typeof answers[`${qId}_notes`] === 'string' ? answers[`${qId}_notes`] : ''}
                                        onChange={(e) => handleAnswerChange(`${qId}_notes`, e.target.value)}
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

                  {/* Conformance Verification & Auditor Sign-Off Card */}
                  <div style={{
                    backgroundColor: isAuditReady ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle)',
                    border: `1px solid ${isAuditReady ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-light)'}`,
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    marginTop: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          ISO 19011:2026 Conformance Verification (Gate 1)
                        </span>
                        <span className={isAuditReady ? 'badge badge-settled' : 'badge badge-pending'}>
                          {isAuditReady ? 'AUDIT_READY APPROVED' : 'SIGN-OFF PENDING'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '620px' }}>
                        {isAuditReady
                          ? 'Lead Auditor has signed off on the diagnostic. Gate 1 is cleared: Proceed to Step 2 to initiate statutory checkout.'
                          : 'Under ISO 19011:2026 Annex A, audit readiness requires at least 80% conformance before licensing payment can be initiated.'}
                      </div>
                      {auditorReviewSuccess && (
                        <div style={{ color: 'var(--color-green)', fontSize: '0.78rem', fontWeight: 700, marginTop: '0.35rem' }}>
                          ✓ {auditorReviewSuccess}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {!isAuditReady && (
                        <button
                          type="button"
                          onClick={handleAuditorSignOff}
                          disabled={auditorReviewLoading || estimatedComplianceScore < 80}
                          className="btn btn-primary"
                          style={{
                            fontSize: '0.82rem', fontWeight: 700,
                            opacity: estimatedComplianceScore < 80 ? 0.5 : 1,
                            cursor: estimatedComplianceScore < 80 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {auditorReviewLoading
                            ? 'Verifying Conformance...'
                            : estimatedComplianceScore >= 80
                            ? 'Request Auditor Sign-off (AUDIT_READY)'
                            : 'Reach 80% Readiness for Sign-off'}
                        </button>
                      )}
                      {isAuditReady && (
                        <button
                          type="button"
                          onClick={() => setActiveStep(2)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.82rem', fontWeight: 700 }}
                        >
                          Proceed to Checkout (Step 2) →
                        </button>
                      )}
                    </div>
                  </div>

                  {submitError && (
                    <div style={{ color: 'var(--google-red)', fontSize: '0.85rem', margin: '1rem 0', fontWeight: 600 }}>
                      {submitError}
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1.25rem 0 0.5rem 0', borderTop: '1px solid var(--border-light)',
                    marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem',
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>✓</span>
                      <span>Real-time multi-framework diagnostic autosave active</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>

                      <button
                        type="button"
                        onClick={handleIsoSubmit}
                        disabled={submitting}
                        className="btn btn-primary"
                        style={{ minWidth: '220px', maxWidth: '100%', fontWeight: 700 }}
                      >
                        {submitting
                          ? 'Saving Diagnostic...'
                          : isAuditReady
                          ? 'Save & Proceed to Checkout (Step 2) →'
                          : 'Save Diagnostic Progress →'}
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
                    const activeTierData = activeTiers.find((t) => t.id === selectedTier) || activeTiers[0] || TIERS[0];
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

                        {!isAuditReady && auditScope === 'CARBON_EMISSION' && (
                          <div className="portal-gate-alert danger">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--google-red)', fontWeight: 700, fontSize: '0.82rem' }}>
                              <GoogleIcons.Lock /> Gate 1: Lead Auditor Sign-Off Required
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                              Commercial fee checkout is restricted until your diagnostic assessment achieves AUDIT_READY status. Return to Step 1 to review answers and request auditor review.
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveStep(1)}
                              className="btn btn-secondary"
                              style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}
                            >
                              Return to Step 1 for Sign-Off
                            </button>
                          </div>
                        )}

                        {/* Action buttons */}
                        <button
                          type="button"
                          onClick={handleCheckout}
                          disabled={checkoutLoading || (!isAuditReady && auditScope === 'CARBON_EMISSION')}
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '0.85rem',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            marginBottom: '0.75rem',
                            opacity: (!isAuditReady && auditScope === 'CARBON_EMISSION') ? 0.6 : 1,
                            cursor: (!isAuditReady && auditScope === 'CARBON_EMISSION') ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {checkoutLoading
                            ? 'Connecting to Stripe…'
                            : (!isAuditReady && auditScope === 'CARBON_EMISSION')
                              ? 'Sign-Off Required for Checkout (Gate 1)'
                              : `Pay ${activeTierData.price} via Stripe Checkout →`}
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
                  ? 'Your API key is provisioned upon license settlement. Use it to submit automated emissions data or upload evidence documents manually.'
                  : 'Your API key is provisioned upon license settlement. Ingest quarterly workforce telemetry and Section 106 compliance data directly via REST.'}
              </p>

              {!isPaid && (
                <div className="portal-gate-alert">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--google-amber)', fontWeight: 700, fontSize: '0.88rem' }}>
                    <GoogleIcons.Lock /> Gate 2 Notice: Commercial Fee Settlement Required
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.85rem 0', lineHeight: 1.5 }}>
                    Real-time B2B telemetry ingestion and live API feeds are activated once your commercial license is settled. In preview mode, API keys remain masked.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="btn btn-primary"
                  >
                    Proceed to Step 2 Commercial Settlement →
                  </button>
                </div>
              )}

              {/* API Key */}
              <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {auditScope === 'CARBON_EMISSION' ? 'Telemetry Ingestion API Key' : 'Workforce Ingestion API Key'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: isPaid ? 'var(--color-sky)' : 'var(--text-muted)',
                  backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: '8px',
                  wordBreak: 'break-all', letterSpacing: '0.04em',
                }}>
                  {isPaid ? telemetryApiKey : `${telemetryApiKey.substring(0, 8)}••••••••••••••••••••••••••••••••`}
                </div>
                <button
                  type="button"
                  disabled={!isPaid}
                  className="btn btn-secondary"
                  style={{
                    marginTop: '0.75rem',
                    fontSize: '0.8rem',
                    padding: '0.4rem 1rem',
                    opacity: isPaid ? 1 : 0.6,
                    cursor: isPaid ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => { if (isPaid) navigator.clipboard.writeText(telemetryApiKey); }}
                >
                  {isPaid ? 'Copy Key' : 'Locked (Payment Required)'}
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
                <button
                  type="button"
                  onClick={() => setActiveView('profile')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Open Evidence Locker
                </button>
              </div>

              <div className="portal-action-row">
                <button type="button" onClick={() => setActiveStep(2)} className="btn btn-secondary">
                  Back to Commercial Scope (Step 2)
                </button>
                <button type="button" onClick={() => setActiveStep(4)} className="btn btn-primary">
                  Proceed to Credential Studio (Step 4)
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

              {(!isPaid || (!isAuditReady && auditScope === 'CARBON_EMISSION')) && (
                <div className="portal-gate-alert">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--google-amber)', fontWeight: 700, fontSize: '0.88rem' }}>
                    <GoogleIcons.Lock /> Gate 2 &amp; 3 Verification Requirements
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.5rem 0 0.85rem 0', lineHeight: 1.5 }}>
                    {!isPaid
                      ? 'Payment settlement (Step 2) is required before compositing and minting on-chain credentials.'
                      : 'Lead Auditor AUDIT_READY clearance (Step 1) is required before minting your tokenized warranty.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveStep(!isPaid ? 2 : 1)}
                    className="btn btn-primary"
                  >
                    {!isPaid ? 'Go to Step 2 Settlement →' : 'Go to Step 1 Auditor Review →'}
                  </button>
                </div>
              )}

              <div className="portal-credential-studio-grid">
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
                      Attestation Message (Max 200 Characters)
                    </label>
                    <textarea
                      rows={3}
                      maxLength={200}
                      value={clientMessage}
                      onChange={(e) => { setClientMessage(e.target.value); setCompositePreview(null); }}
                      placeholder={auditScope === 'CARBON_EMISSION' ? 'e.g. ISO 14001 aligned — Net Zero pathway committed 2030' : 'e.g. Verified Section 106 Artisan Workforce & Local Employment Covenant'}
                      className="form-input"
                      style={{ resize: 'none' }}
                    />
                    <div style={{ fontSize: '0.72rem', color: clientMessage.length >= 190 ? 'var(--google-red)' : 'var(--text-muted)', textAlign: 'right', marginTop: '0.25rem' }}>
                      {clientMessage.length}/200 characters
                    </div>
                  </div>

                  {compositeError && (
                    <div style={{ color: 'var(--google-red)', fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600 }}>{compositeError}</div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleCompose}
                      disabled={compositeLoading || !clientLogoFile || !clientMessage.trim() || !isPaid}
                      className="btn btn-secondary"
                      style={{
                        opacity: (!isPaid) ? 0.6 : 1,
                        cursor: (!isPaid) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {compositeLoading ? 'Generating…' : 'Preview Badge'}
                    </button>
                    <button
                      type="button"
                      onClick={handleMint}
                      disabled={mintLoading || !clientLogoFile || !clientMessage.trim() || !submissionId || !isPaid || (!isAuditReady && auditScope === 'CARBON_EMISSION')}
                      className="btn btn-primary"
                      style={{
                        opacity: (!isPaid || (!isAuditReady && auditScope === 'CARBON_EMISSION')) ? 0.6 : 1,
                        cursor: (!isPaid || (!isAuditReady && auditScope === 'CARBON_EMISSION')) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {mintLoading ? 'Minting on Polygon…' : 'Issue and Mint Credential →'}
                    </button>
                  </div>
                  {mintError && (
                    <div style={{ color: 'var(--google-red)', fontSize: '0.82rem', marginTop: '0.75rem', fontWeight: 600 }}>{mintError}</div>
                  )}
                  {(!submissionId || !isPaid) && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      A settled statutory license (Steps 1 &amp; 2) is required to mint tokenized credentials.
                    </p>
                  )}
                </div>

                {/* Right -- badge preview */}
                <div>
                  <div className="portal-preview-canvas">
                    {compositePreview ? (
                      <img
                        src={compositePreview}
                        alt="Dual-logo composite badge preview"
                      />
                    ) : (
                      <div className="portal-preview-placeholder">
                        <div className="portal-preview-placeholder-title">
                          Badge Preview
                        </div>
                        <div className="portal-preview-placeholder-sub">
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
              <div className="portal-action-row">
                <button type="button" onClick={() => setActiveStep(3)} className="btn btn-secondary">
                  Back to Ingestion API (Step 3)
                </button>
                <button type="button" onClick={() => setActiveStep(5)} className="btn btn-secondary">
                  Preview Asset Delivery (Step 5)
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
                      <div className="portal-token-grid">
                        {[
                          { label: 'Token ID', value: cred.tokenId || 'pending', mono: true },
                          { label: 'Contract', value: cred.contractAddress ? `${cred.contractAddress.substring(0, 10)}...` : 'Polygon PoS', mono: true },
                          { label: 'Network', value: 'Polygon PoS', mono: false },
                          { label: 'Standard', value: 'ERC-1155', mono: false },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="portal-metadata-label">{item.label}</div>
                            <div className={`portal-metadata-value${item.mono ? ' mono' : ''}`}>{item.value}</div>
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

                    {/* Software Embed Builder */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <SoftwareEmbedBuilder licenseeId={user?.licenseeId || 'client-licensee'} allowedOrigins={cred.allowedOrigins || ['*']} />
                    </div>

                    <div className="portal-action-row">
                      <button type="button" onClick={() => setActiveStep(4)} className="btn btn-secondary">
                        Back to Credential Studio (Step 4)
                      </button>
                      <button type="button" onClick={() => setActiveStep(1)} className="btn btn-primary">
                        Review Assessment (Step 1)
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
                  <div className="portal-action-row" style={{ justifyContent: 'center' }}>
                    <button type="button" onClick={() => setActiveStep(4)} className="btn btn-primary">
                      Go to Credential Studio (Step 4)
                    </button>
                    <button type="button" onClick={() => setActiveStep(1)} className="btn btn-secondary">
                      Back to Assessment (Step 1)
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
          <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                Active Assurance Workflow
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Step {activeStep} of 5: {STEP_LABELS[auditScope][activeStep]}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Scope: {auditScope === 'CARBON_EMISSION' ? 'Carbon Emission (ISO 14001 / 50001)' : 'Job Creation (Section 106 Social)'} · Diagnostic: {progressPct}% complete
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('workflow')}
              className="btn btn-primary"
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
        <div className="persefoni-card portal-card-pad" style={{ marginBottom: '2.5rem' }}>
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
        <div className="persefoni-card portal-card-pad" style={{ marginBottom: '2.5rem' }}>
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
        <div className="persefoni-card portal-card-pad">
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
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--color-sky)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  <GoogleIcons.Building />
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {displayName}
                  </div>
                  {user?.licenseeId && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      ID: {user.licenseeId}
                    </div>
                  )}
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-green)', fontWeight: 600, marginTop: '2px' }}>
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
              <button
                type="button"
                onClick={() => setActiveView('profile')}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}
              >
                Open Evidence Locker →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 7: Software Embed & Live Trust Seal ──────────────────────── */}
      {activeView === 'embed' && (
        <div>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
              Live Trust Seal &amp; Web Embed Builder
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '720px' }}>
              Generate lightweight CDN embed snippets pointing to <code style={{ color: 'var(--color-sky)' }}>/embed/seal.js</code> to display your verified audit warranty badge on corporate websites, investor relations portals, and public disclosure pages.
            </p>
          </div>
          <SoftwareEmbedBuilder licenseeId={user?.licenseeId || 'client-licensee'} allowedOrigins={['*']} />
        </div>
      )}

      {/* ── VIEW 8: Legal & Statutory Covenants ───────────────────────────── */}
      {activeView === 'legal' && (
        <div>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
              Statutory Covenants &amp; Legal Framework
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '720px' }}>
              Binding regulatory disclosures, ISO 19011:2026 remote auditing assurance terms, and statutory fee allocation agreements.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="persefoni-card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--color-sky)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Assurance Standard
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-main)' }}>
                ISO 19011:2026 Annex A Remote Verification
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Audits are conducted in strict alignment with ISO 19011:2026 Annex A remote auditing guidelines. Cryptographic evidence watermarking guarantees chain-of-custody for all utility files, telemetry sensor logs, and statutory carbon accounting disclosures.
              </p>
            </div>

            <div className="persefoni-card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--color-green)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-green)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Statutory Division
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-main)' }}>
                85% Core Operations / 15% ESG Endowment
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Every transaction automatically splits 15% of gross fees directly to verified UK/EU environmental disaster relief charities and registered social foundation partners under transparent on-chain accounting.
              </p>
            </div>

            <div className="persefoni-card" style={{ padding: '1.75rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Warranty Validity
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-main)' }}>
                Bi-Temporal Warranty &amp; Operational Health
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Licenses carry a 365-day statutory epoch tied to continuous operational telemetry. Annual recalibration requires ISO/IEC 17025 certified lab testing. Telemetry drift exceeding 15% automatically suspends public trust seal verification.
              </p>
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-main)' }}>
              Full Regulatory Cross-Walk &amp; Disclosure Compliance
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Regulation / Standard</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Jurisdiction</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Statutory Threshold</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Audit Readiness Level</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { std: 'ISO 14064-1:2018', jur: 'Global / BSI', req: 'Scope 1, 2 & Category 3-6 Value Chain', status: 'Full System Readiness' },
                    { std: 'ISO 50001:2018', jur: 'Global / EnMS', req: 'Energy Review & Measurement Plan', status: 'Full System Readiness' },
                    { std: 'UK SECR (Companies Act 2006)', jur: 'United Kingdom', req: 'Quoted / Large Unquoted Companies', status: 'Statutory Direct Aligned' },
                    { std: 'EU CSRD (ESRS E1)', jur: 'European Union', req: 'Double Materiality & 1.5C Transition', status: 'High Assurance Aligned' },
                    { std: 'US CA-SB 253 (CCDRA)', jur: 'California / US', req: 'Revenue > $1B with Scope 1-3 Disclosures', status: 'SEC / CARB Standard Aligned' },
                    { std: 'UK CMA Green Claims Code', jur: 'United Kingdom', req: 'Substantiated Marketing & Anti-Greenwash', status: 'Consumer Protection Assured' },
                  ].map((row) => (
                    <tr key={row.std} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{row.std}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{row.jur}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{row.req}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-green)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div className="persefoni-card portal-card-pad" style={{ maxWidth: '520px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
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
