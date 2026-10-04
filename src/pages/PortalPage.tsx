import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { SoftwareEmbedBuilder } from '../components/SoftwareEmbedBuilder';
import { WorkflowWizard } from '../components/workflow/WorkflowWizard';
import { PreparationChecklistConsole } from '../components/checklist/PreparationChecklistConsole';
import { PortalOverviewView } from '../components/portal/PortalOverviewView';
import { PortalWorkflowContainer } from '../components/portal/PortalWorkflowContainer';
import { FleetWorkspace } from '../components/fleet/FleetWorkspace';
import { PortalCredentialsView } from '../components/portal/PortalCredentialsView';
import { PortalJobsView } from '../components/portal/PortalJobsView';
import { PortalTransactionsView } from '../components/portal/PortalTransactionsView';
import { PortalProfileView } from '../components/portal/PortalProfileView';
import { PortalLegalView } from '../components/portal/PortalLegalView';
import { JobFilingModal } from '../components/portal/JobFilingModal';
import { LeadAuditorSubmissionModal } from '../components/portal/LeadAuditorSubmissionModal';

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
      'Dual-logo readiness credential with public verification record',
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
      'Social Value readiness credential with public verification record',
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

export type DashboardView = 'checklist' | 'workflow' | 'overview' | 'credentials' | 'jobs' | 'embed' | 'transactions' | 'legal' | 'profile' | 'assurance-wizard' | 'fleet';

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
  const { token, user, logout, isAdmin, updateUser } = useAuth();
  const navigate = useNavigate();

  // Defense-in-depth: Administrators must never view client-facing licensee portals
  if (isAdmin || user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  // ── Dashboard Navigation View (URL-driven) ─────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeView, setActiveViewState] = useState<DashboardView>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || params.get('view');
    if (tab === 'checklist' || tab === 'preparation') return 'checklist';
    if (tab === 'workflow' || tab === 'diagnostic') return 'workflow';
    if (tab === 'credentials') return 'credentials';
    if (tab === 'transactions' || tab === 'settlement') return 'transactions';
    if (tab === 'profile' || tab === 'evidence') return 'profile';
    if (tab === 'legal') return 'legal';
    if (tab === 'jobs' || tab === 'job-reporting') return 'jobs';
    if (tab === 'embed') return 'embed';
    if (tab === 'fleet') return 'fleet';
    return 'overview';
  });

  const [auditScope, setAuditScope] = useState<AuditScope>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('scope') === 'JOB_REPORTING' ? 'JOB_REPORTING' : 'CARBON_EMISSION';
  });
  const [workflowWizardType, setWorkflowWizardType] = useState<'CARBON' | 'JOB'>('CARBON');
  const [workflowWizardSubmissionId, setWorkflowWizardSubmissionId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [copiedApiKey, setCopiedApiKey] = useState<boolean>(false);
  const [copiedClientId, setCopiedClientId] = useState<boolean>(false);

  // ── Email verification state ──────────────────────────────────────────────
  const [resendingEmail, setResendingEmail] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendPortalVerification = async () => {
    if (!token && !user?.email) return;
    setResendingEmail(true);
    setResendStatus(null);
    setResendError(null);
    try {
      const res = await api.resendVerificationEmail(user?.email || undefined, token || undefined);
      setResendStatus(res.message || 'Fresh verification link has been dispatched to your corporate email.');
      setResendCooldown(30);
    } catch (err: any) {
      setResendError(err.message || 'Failed to dispatch verification email. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };

  // ── Profile Settings Form State ───────────────────────────────────────────
  const [profileFirstName, setProfileFirstName] = useState(user?.firstName || '');
  const [profileLastName, setProfileLastName] = useState(user?.lastName || '');
  const [profileCompanyName, setProfileCompanyName] = useState(user?.companyName || '');
  const [profileJobTitle, setProfileJobTitle] = useState(user?.jobTitle || '');
  const [profilePrimaryRole, setProfilePrimaryRole] = useState(user?.primaryRole || 'COMPLIANCE_OFFICER');
  const [profileCountry, setProfileCountry] = useState(user?.organisationCountry || 'GB');
  const [profileIndustry, setProfileIndustry] = useState(user?.industrySector || 'MANUFACTURING');
  const [profileWebsiteUrl, setProfileWebsiteUrl] = useState(user?.websiteUrl || '');
  const [profileRegNo, setProfileRegNo] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.firstName) setProfileFirstName(user.firstName);
      if (user.lastName) setProfileLastName(user.lastName);
      if (user.companyName) setProfileCompanyName(user.companyName);
      if (user.jobTitle) setProfileJobTitle(user.jobTitle);
      if (user.primaryRole) setProfilePrimaryRole(user.primaryRole);
      if (user.organisationCountry) setProfileCountry(user.organisationCountry);
      if (user.industrySector) setProfileIndustry(user.industrySector);
      if (user.websiteUrl) setProfileWebsiteUrl(user.websiteUrl);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileSaving(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      const res = await api.updateProfile(token, {
        firstName: profileFirstName.trim(),
        lastName: profileLastName.trim(),
        companyName: profileCompanyName.trim(),
        jobTitle: profileJobTitle.trim() || undefined,
        primaryRole: profilePrimaryRole,
        organisationCountry: profileCountry,
        industrySector: profileIndustry,
        websiteUrl: profileWebsiteUrl.trim() || undefined,
        companyRegistrationNo: profileRegNo.trim() || undefined,
      });
      if (res.user && updateUser) {
        updateUser(res.user);
      }
      setProfileSuccess('Corporate profile and entity settings updated successfully.');
      setTimeout(() => setProfileSuccess(null), 5000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile settings.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Global portal data ────────────────────────────────────────────────────
  const [summary, setSummary] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [jobReports, setJobReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Preparation Checklists State & Gating ────────────────────────────────
  const [checklists, setChecklists] = useState<any[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState<boolean>(true);

  const refreshChecklists = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.getChecklists(token);
      setChecklists(res.checklists || []);
    } catch (err) {
      console.warn('[Checklists refresh error]', err);
    }
  }, [token]);

  const carbonChecklists = checklists.filter(
    (c) => c?.recommendation?.workflowType === 'CARBON'
  );
  const jobChecklists = checklists.filter(
    (c) => c?.recommendation?.workflowType === 'JOB'
  );

  const mandatoryCarbonChecklists = carbonChecklists.filter(
    (c) => c?.recommendation?.isLegallyMandatory && c?.recommendation?.clientAccepted !== false
  );
  const relevantCarbonChecklists =
    mandatoryCarbonChecklists.length > 0 ? mandatoryCarbonChecklists : carbonChecklists;
  const isCarbonPrepReady =
    Boolean(user?.hasCompletedAssessment) &&
    relevantCarbonChecklists.length > 0 &&
    relevantCarbonChecklists.every((c) => Boolean(c?.isReadyToIngest));

  const mandatoryJobChecklists = jobChecklists.filter(
    (c) => c?.recommendation?.isLegallyMandatory && c?.recommendation?.clientAccepted !== false
  );
  const relevantJobChecklists =
    mandatoryJobChecklists.length > 0 ? mandatoryJobChecklists : jobChecklists;
  const isJobPrepReady =
    Boolean(user?.hasCompletedAssessment) &&
    relevantJobChecklists.length > 0 &&
    relevantJobChecklists.every((c) => Boolean(c?.isReadyToIngest));

  const isCurrentScopePrepReady =
    auditScope === 'JOB_REPORTING' ? isJobPrepReady : isCarbonPrepReady;

  const isCarbonActive =
    user?.assuranceIntent === 'CARBON' ||
    user?.assuranceIntent === 'DUAL' ||
    carbonChecklists.length > 0 ||
    !user?.assuranceIntent;
  const isJobActive =
    user?.assuranceIntent === 'JOB' ||
    user?.assuranceIntent === 'DUAL' ||
    jobChecklists.length > 0;

  // ── ISO Workflow & Framework State ─────────────────────────────────────────
  const [activeStep, setActiveStep] = useState<WorkflowStep>(1);
  const [activatingPipeline, setActivatingPipeline] = useState<boolean>(false);

  const navigateToView = useCallback(
    (
      targetView: DashboardView,
      options?: { scope?: AuditScope; step?: WorkflowStep; submissionId?: string }
    ) => {
      let resolvedView = targetView;
      const nextScope = options?.scope || auditScope;
      const nextStep = options?.step || activeStep;

      // Statutory Lifecycle Router Guard
      if (resolvedView === 'workflow') {
        if (!user?.hasCompletedAssessment) {
          navigate('/portal/onboarding');
          return;
        }
        const isPrepReady = nextScope === 'JOB_REPORTING' ? isJobPrepReady : isCarbonPrepReady;
        if (!isPrepReady) {
          resolvedView = 'checklist';
        }
      }

      setActiveViewState(resolvedView);
      if (options?.scope) setAuditScope(options.scope);
      if (options?.step) setActiveStep(options.step);
      if (options?.submissionId) setSubmissionId(options.submissionId);

      // Persist to URL query parameters so page refresh preserves view, scope, and step
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', resolvedView);
          if (resolvedView === 'workflow') {
            next.set('scope', nextScope);
            next.set('step', String(nextStep));
            if (options?.submissionId) next.set('submission_id', options.submissionId);
          } else if (resolvedView === 'checklist') {
            next.set('scope', nextScope);
            next.delete('step');
            next.delete('submission_id');
          } else {
            next.delete('scope');
            next.delete('step');
            next.delete('submission_id');
          }
          return next;
        },
        { replace: true }
      );
    },
    [auditScope, activeStep, user?.hasCompletedAssessment, isJobPrepReady, isCarbonPrepReady, setSearchParams, navigate]
  );

  const setActiveView = useCallback(
    (view: DashboardView) => {
      navigateToView(view);
    },
    [navigateToView]
  );

  const handleNavigateWorkflow = useCallback(
    (targetStep: WorkflowStep = 1, targetScope: AuditScope = auditScope) => {
      navigateToView('workflow', { scope: targetScope, step: targetStep });
    },
    [navigateToView, auditScope]
  );

  const handleActivatePipeline = useCallback(
    async (targetPipeline: 'CARBON' | 'JOB' | 'DUAL') => {
      if (!token) return;
      try {
        setActivatingPipeline(true);
        await api.activatePipeline(token, targetPipeline);
        if (user && updateUser) {
          updateUser({ ...user, assuranceIntent: targetPipeline });
        }
        await refreshChecklists();
        if (targetPipeline === 'DUAL' || targetPipeline === 'JOB') {
          navigateToView('checklist', { scope: 'JOB_REPORTING' });
        } else {
          navigateToView('checklist', { scope: 'CARBON_EMISSION' });
        }
      } catch (err: any) {
        console.error('Failed to activate pipeline:', err);
      } finally {
        setActivatingPipeline(false);
      }
    },
    [token, user, updateUser, refreshChecklists, navigateToView]
  );
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
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [showRecentAudits, setShowRecentAudits] = useState<boolean>(true);
  const [isoStatusLoading, setIsoStatusLoading] = useState(false);
  const [evidenceByQuestion, setEvidenceByQuestion] = useState<Record<string, Array<{ fileName: string; sha256Hash: string; fileUrl: string; fileSizeBytes?: number }>>>({});
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
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // ── Job filing modal ──────────────────────────────────────────────────────
  const [showJobModal, setShowJobModal] = useState<boolean>(false);
  const [showSubmissionSuccessModal, setShowSubmissionSuccessModal] = useState<boolean>(false);
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
    try {
      const key = user?.licenseeId ? `ghg_draft_answers_${user.licenseeId}` : 'ghg_draft_answers_latest';
      const saved = localStorage.getItem(key) || localStorage.getItem('ghg_draft_answers_latest');
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
    if (Object.keys(answers).length === 0) return;
    try {
      if (user?.licenseeId) {
        localStorage.setItem(`ghg_draft_answers_${user.licenseeId}`, JSON.stringify(answers));
      }
      localStorage.setItem('ghg_draft_answers_latest', JSON.stringify(answers));
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
        const [sumRes, txRes, jobRes, evRes, checkRes] = await Promise.all([
          api.getPortalSummary(token),
          api.getPortalTransactions(token),
          api.getPortalJobReports(token).catch(() => ({ data: [] })),
          api.getEvidenceDocuments(token, user?.licenseeId || undefined).catch(() => ({ documents: [] })),
          api.getChecklists(token).catch(() => ({ checklists: [] })),
        ]);
        if (isMounted) {
          setSummary(sumRes);
          setTransactions(txRes?.transactions || txRes?.data || []);
          setJobReports(jobRes?.data || jobRes?.reports || []);
          setChecklists(checkRes?.checklists || []);
          setChecklistsLoading(false);
          if (Array.isArray(evRes?.documents)) {
            const mapped: Record<string, any[]> = {};
            for (const doc of evRes.documents) {
              const qId = doc.matrixRowId || 'general';
              if (!mapped[qId]) mapped[qId] = [];
              mapped[qId].push(doc);
            }
            setEvidenceByQuestion((prev) => ({ ...mapped, ...prev }));
          }
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
      setRecentSubmissions(res.recentSubmissions || []);
      if (res.latestSubmission?.id) {
        setSubmissionId(res.latestSubmission.id);
        if (res.latestSubmission.selectedFrameworks && res.latestSubmission.selectedFrameworks.length > 0) {
          setSelectedFrameworks(res.latestSubmission.selectedFrameworks);
        }
      }
    } catch {
      setIsoStatus(null);
      setRecentSubmissions([]);
    } finally {
      setIsoStatusLoading(false);
    }
  }, [token, user?.licenseeId]);

  useEffect(() => {
    fetchIsoStatus();
  }, [fetchIsoStatus]);

  // Synchronize state when URL search parameters change (back/forward navigation or Stripe checkout return)
  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('view');
    if (tabParam) {
      const validViews: DashboardView[] = ['overview', 'checklist', 'workflow', 'credentials', 'jobs', 'transactions', 'profile', 'embed', 'legal', 'fleet'];
      if (validViews.includes(tabParam as DashboardView)) {
        setActiveViewState(tabParam as DashboardView);
      }
    }
    const scopeParam = searchParams.get('scope');
    if (scopeParam === 'JOB_REPORTING' || scopeParam === 'CARBON_EMISSION') {
      setAuditScope(scopeParam);
    } else if (tabParam === 'checklist' || tabParam === 'workflow') {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('scope', auditScope || 'CARBON_EMISSION');
          return next;
        },
        { replace: true }
      );
    }
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const parsedStep = parseInt(stepParam, 10);
      if (parsedStep >= 1 && parsedStep <= 5) {
        setActiveStep(parsedStep as WorkflowStep);
      }
    }
    const subIdParam = searchParams.get('submission_id');
    if (subIdParam) {
      setSubmissionId(subIdParam);
    }
    const tierParam = searchParams.get('tier');
    if (tierParam) {
      setSelectedTier(tierParam);
    }
    if (stepParam === '3' || stepParam === '4') {
      const timer = setTimeout(() => {
        fetchIsoStatus();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, fetchIsoStatus]);

  // ── Load credentials ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    api.getMyCredentials(token)
      .then((res) => setCredentials(res.credentials || []))
      .catch(() => setCredentials([]));
  }, [token]);

  // ── Answer change ─────────────────────────────────────────────────────────
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // ── Start Fresh Carbon Audit Action ────────────────────────────────────────
  const handleStartNewAudit = () => {
    setSubmissionId(null);
    setAnswers({});
    setSelectedFrameworks(['ISO_14064_1', 'UK_SECR']);
    setIsoStatus(null);
    const elem = document.getElementById('iso-audit-stepper-anchor');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ── Resume Workflow Action from Recent Audits ──────────────────────────────
  const handleResumeWorkflow = (sub: any) => {
    if (!sub) return;
    setSubmissionId(sub.id);
    setIsoStatus(sub);
    if (Array.isArray(sub.selectedFrameworks) && sub.selectedFrameworks.length > 0) {
      setSelectedFrameworks(sub.selectedFrameworks);
    }
    if (Array.isArray(sub.answers)) {
      const loadedAnswers: Record<string, string> = {};
      for (const item of sub.answers) {
        if (item.questionId && item.answer) {
          loadedAnswers[item.questionId] = item.answer;
        }
      }
      setAnswers((prev) => ({ ...prev, ...loadedAnswers }));
    }
    const elem = document.getElementById('iso-audit-stepper-anchor');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ── Evidence Proof Document Upload Handler ─────────────────────────────────
  const handleUploadEvidence = async (questionId: string, file: File) => {
    if (!token) throw new Error('Authentication required to upload proof documents.');
    const res = await api.uploadEvidenceProofFile(token, {
      file,
      questionId,
      licenseeId: user?.licenseeId || undefined,
      category: 'OTHER_AUDIT_PROOF',
    });
    if (res?.evidenceDoc) {
      setEvidenceByQuestion((prev) => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), res.evidenceDoc],
      }));
    }
    return res?.evidenceDoc || null;
  };

  // ── Submit ISO answers ────────────────────────────────────────────────────
  const handleIsoSubmit = async () => {
    if (!token) {
      setActiveStep(2);
      return;
    }
    const questionsToSubmit = (diagnosticBundle?.pillars || []).length > 0
      ? diagnosticBundle.pillars.flatMap((p: any) => (p.questions || []).map((q: any) => {
          const qId = q.questionId || q.id;
          return {
            questionId: qId,
            questionText: q.questionText || q.text || `Clause ${qId}`,
            answer: answers[qId] || answers[q.id] || answers[q.questionId] || 'Partially implemented',
            isoClause: q.isoClause || q.applicableStandards?.[0] || 'ISO 14064-1',
          };
        }))
      : (framework?.sections || []).flatMap((s: any) => (s.questions || []).map((q: any) => {
          const qId = q.questionId || q.id;
          return {
            questionId: qId,
            questionText: q.questionText || q.text || `Clause ${qId}`,
            answer: answers[qId] || answers[q.questionId] || answers[q.id] || 'Partially implemented',
            isoClause: q.isoClause || 'ISO 14001',
          };
        }));

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

  // ── Submit Diagnostic Answers for Lead Auditor Review (Transition to SUBMITTED) ────────
  const handleSubmitForAuditorReview = async () => {
    if (!token) return;
    setAuditorReviewLoading(true);
    setSubmitError(null);
    setAuditorReviewSuccess(null);
    try {
      let activeSubId = submissionId;
      const questionsToSubmit = (diagnosticBundle?.pillars || []).length > 0
        ? diagnosticBundle.pillars.flatMap((p: any) => (p.questions || []).map((q: any) => {
            const qId = q.questionId || q.id;
            return {
              questionId: qId,
              questionText: q.questionText || q.text || `Clause ${qId}`,
              answer: answers[qId] || answers[q.id] || answers[q.questionId] || 'Fully compliant & documented',
              isoClause: q.isoClause || q.applicableStandards?.[0] || 'ISO 14064-1',
            };
          }))
        : (framework?.sections || []).flatMap((s: any) => (s.questions || []).map((q: any) => {
            const qId = q.questionId || q.id;
            return {
              questionId: qId,
              questionText: q.questionText || q.text || `Clause ${qId}`,
              answer: answers[qId] || answers[q.questionId] || answers[q.id] || 'Yes, fully in place',
              isoClause: q.isoClause || 'ISO 14001',
            };
          }));

      // Save latest answers with status SUBMITTED to trigger Lead Auditor Review
      const subRes = await api.submitIsoAnswers(token, {
        answers: questionsToSubmit,
        tierSelected: selectedTier,
        selectedFrameworks,
      });
      activeSubId = subRes.submissionId;
      setSubmissionId(activeSubId);

      // Instantaneous optimistic state update for seamless UX
      setIsoStatus((prev: any) => ({
        ...(prev || {}),
        id: activeSubId,
        status: subRes.status || 'SUBMITTED',
        complianceScore: subRes.complianceScore ?? estimatedComplianceScore,
        tierSelected: subRes.tierSelected || selectedTier,
        selectedFrameworks: subRes.selectedFrameworks || selectedFrameworks,
        updatedAt: new Date().toISOString(),
      }));

      setAuditorReviewSuccess('Diagnostic answers and evidence successfully submitted to Lead Auditor Review Queue. Conformance verification in progress.');
      setShowSubmissionSuccessModal(true);

      await fetchIsoStatus();
    } catch (err: any) {
      setSubmitError(err.message || 'Auditor verification request failed.');
    } finally {
      setAuditorReviewLoading(false);
    }
  };

  // ── Export Dossier JSON Summary ──────────────────────────────────────────
  const handleExportDossierJson = () => {
    const exportData = {
      submissionId: submissionId || 'PENDING_SUBMISSION',
      timestamp: new Date().toISOString(),
      licenseeId: user?.licenseeId || 'N/A',
      userEmail: user?.email,
      selectedTier,
      selectedFrameworks,
      conformanceScore: estimatedComplianceScore,
      totalClauses: allQuestions.length,
      answeredClauses: answeredQuestions,
      answers,
      auditStandard: 'ISO 19011:2026 / ISO 14064-1:2018',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GHG_Statutory_Dossier_${(submissionId || 'draft').slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    if (jobReports.length === 0) {
      setJobFormError('Mandatory Section 106 period filing required. Submit at least one verified workforce report before proceeding.');
      return;
    }
    setJobFormError(null);
    setSubmittingJob(true);
    try {
      const latest = jobReports[0];
      const subRes = await api.submitIsoAnswers(token, {
        answers: [
          { questionId: 'S106-PERIOD-TYPE', questionText: 'Period Type', answer: latest.periodType, isoClause: 'Section 106' },
          { questionId: 'S106-PERIOD-START', questionText: 'Period Start Date', answer: new Date(latest.periodStart).toISOString(), isoClause: 'Section 106' },
          { questionId: 'S106-PERIOD-END', questionText: 'Period End Date', answer: new Date(latest.periodEnd).toISOString(), isoClause: 'Section 106' },
          { questionId: 'S106-JOBS-CREATED', questionText: 'Verified Jobs Created', answer: `Conforming: Statutory evidence document attached (${latest.jobsCreated} verified jobs created).`, isoClause: 'Section 106' },
          { questionId: 'S106-ATTESTATION-NOTE', questionText: 'Local Authority Covenant', answer: latest.attestationNote || 'Verified Section 106 covenant', isoClause: 'Section 106' },
        ],
        tierSelected: selectedTier,
        selectedFrameworks: ['SECTION_106'],
        submissionId: submissionId || undefined,
      });

      if (!subRes || !subRes.submissionId) {
        throw new Error('Workforce readiness assessment failed to register on the server.');
      }
      setSubmissionId(subRes.submissionId);
      setActiveStep(2);
    } catch (err: any) {
      console.error('[Job Readiness Submission Error]', err);
      setJobFormError(err.message || 'Workforce assurance transition failed. Please verify that your report is recorded and try again.');
    } finally {
      setSubmittingJob(false);
    }
  };



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

  // Corporate display name resolver (prioritizes registered corporate company name)
  const getDisplayName = (): string => {
    // 1. Registered Company Name from authenticated tenant profile
    if (user?.companyName && user.companyName.trim() && user.companyName !== 'Authorized Entity') {
      return user.companyName.trim();
    }

    if (user?.email) {
      const parts = user.email.split('@');
      const localPart = parts[0] || '';
      const domain = (parts[1] || '').toLowerCase();

      const PUBLIC_EMAIL_PROVIDERS = new Set([
        'gmail.com',
        'googlemail.com',
        'outlook.com',
        'hotmail.com',
        'yahoo.com',
        'yahoo.co.uk',
        'icloud.com',
        'proton.me',
        'protonmail.com',
        'mail.com',
        'aol.com',
        'live.com',
        'msn.com',
      ]);

      // 2. Corporate custom domain fallback (e.g. itm-power.com -> ITM Power)
      if (domain && !PUBLIC_EMAIL_PROVIDERS.has(domain)) {
        const base = domain.split('.')[0] || '';
        return base
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      // 3. Cleaned local part fallback
      if (localPart) {
        const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
        if (cleaned) {
          return cleaned
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        }
      }
    }
    return 'Enterprise Partner';
  };

  const displayName = getDisplayName();

  const getViewTitle = () => {
    switch (activeView) {
      case 'overview':
        return 'Executive KPI Overview';
      case 'checklist':
        return 'Preparation & Evidence Gathering Console';
      case 'workflow':
        return auditScope === 'JOB_REPORTING'
          ? 'Workforce & Social Value Assurance'
          : 'GHG & Carbon Emissions Assurance';
      case 'credentials':
        return 'Issued Audit Warranty Credentials';
      case 'jobs':
        return 'Section 106 Filings & Local Labour Ledger';
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
        questionId: q.questionId || q.id,
        id: q.questionId || q.id,
        questionText: q.questionText || q.text,
        text: q.questionText || q.text,
        applicableStandards: q.applicableStandards || (q.isoClause ? [q.isoClause] : []),
        isoClause: q.isoClause || q.applicableStandards?.[0] || 'ISO 14064-1',
        statutoryMandate: q.statutoryMandate || q.legalMandate,
        evidenceRequired: q.evidenceRequired,
        options: q.options || ['Fully compliant & documented', 'Partially implemented', 'Planned within 90 days', 'Not applicable'],
      })))
    : (framework?.sections || []).flatMap((s: any) => (s.questions || []).map((q: any) => ({
        questionId: q.questionId || q.id,
        id: q.questionId || q.id,
        questionText: q.questionText || q.text,
        text: q.questionText || q.text,
        applicableStandards: [q.isoClause],
        isoClause: q.isoClause || 'ISO 14001',
        statutoryMandate: q.legalMandate,
        evidenceRequired: q.evidenceRequired,
        options: ['Fully compliant & documented', 'Partially implemented', 'Planned within 90 days', 'Not applicable'],
      })));

  const formattedPillars = (diagnosticBundle?.pillars || (framework?.sections || []).map((s: any) => ({
    pillarId: s.sectionId,
    pillarTitle: s.sectionTitle,
    description: 'Statutory screening and management systems audit clause',
    questions: (s.questions || []).map((q: any) => ({
      id: q.questionId || q.id,
      questionId: q.questionId || q.id,
      text: q.questionText || q.text,
      questionText: q.questionText || q.text,
      applicableStandards: [q.isoClause],
      statutoryMandate: q.legalMandate,
      evidenceRequired: q.evidenceRequired,
      options: ['Fully compliant & documented', 'Partially implemented', 'Planned within 90 days', 'Not applicable'],
    })),
  }))).map((p: any) => ({
    pillarId: p.pillarId,
    pillarTitle: p.pillarTitle || p.title || `Pillar ${p.pillarNumber || ''}`.trim(),
    description: p.description,
    questions: (p.questions || []).map((q: any) => ({
      id: q.questionId || q.id,
      questionId: q.questionId || q.id,
      text: q.questionText || q.text,
      questionText: q.questionText || q.text,
      applicableStandards: q.applicableStandards || (q.isoClause ? [q.isoClause] : []),
      statutoryMandate: q.statutoryMandate || q.legalMandate,
      evidenceRequired: q.evidenceRequired,
      options: q.options || ['Fully compliant & documented', 'Partially implemented', 'Planned within 90 days', 'Not applicable'],
    })),
  }));

  const totalQuestions = allQuestions.length;
  const answeredQuestions = allQuestions.filter((q: any) => {
    const qId = q.questionId || q.id;
    return Boolean(answers[qId]);
  }).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // Real-time compliance score estimator (0 to 100%)
  const scoreMetrics = allQuestions.reduce(
    (acc: { score: number; count: number }, q: any) => {
      const qId = q.questionId || q.id;
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
  const isRevisionRequired = currentSubmissionStatus === 'REVISION_REQUIRED';
  const isSubmittedPendingReview = currentSubmissionStatus === 'SUBMITTED' || currentSubmissionStatus === 'UNDER_REVIEW';
  const isPaid = Boolean(isoStatus?.paidAt || currentSubmissionStatus === 'APPROVED');

  const totalVerifiedJobs = jobReports.reduce((acc, r) => acc + (r.jobsCreated || 0), 0);
  const settledTxs = Array.isArray(transactions) ? transactions.filter((t: any) => t.status === 'SETTLED') : [];
  const settledCount = summary?.countByStatus?.SETTLED ?? summary?.totalSettledTransactions ?? settledTxs.length;
  const settledGrossCents = summary?.totalGrossVolumeCents ?? settledTxs.reduce((acc: number, t: any) => acc + (t.grossAmountCents || 0), 0);
  const settledCharityCents = summary?.totalCharityGiftCentsSettled ?? summary?.totalCharityGiftCents ?? settledTxs.reduce((acc: number, t: any) => acc + (t.financialSplit?.charityGiftCents || (t.grossAmountCents ? Math.round(t.grossAmountCents * 0.15) : 0)), 0);

  const kpis = auditScope === 'CARBON_EMISSION'
    ? [
        { label: 'Settled Transactions', value: loading ? '...' : settledCount.toLocaleString(), sub: 'Verified Audit Trail', accent: 'var(--color-sky)' },
        { label: 'Settled Gross Volume', value: loading ? '...' : `\u00a3${(settledGrossCents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Contractual Settlement', accent: 'var(--color-green)' },
        { label: '15% ESG Charity Split', value: loading ? '...' : `\u00a3${(settledCharityCents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Direct Environmental Routing', accent: 'var(--color-sky)' },
        { label: 'Active Credentials', value: loading ? '...' : credentials.length.toString(), sub: 'Issued readiness credentials', accent: 'var(--google-amber)' },
      ]
    : [
        { label: 'Total Verified Jobs', value: loading ? '...' : totalVerifiedJobs.toLocaleString(), sub: 'Section 106 Local Impact', accent: 'var(--color-sky)' },
        { label: 'Active Filing Periods', value: loading ? '...' : jobReports.length.toString(), sub: 'Quarterly & Annual Covenants', accent: 'var(--color-green)' },
        { label: '15% Social Endowment', value: loading ? '...' : `\u00a3${(settledCharityCents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Direct Disaster Relief Endowment', accent: 'var(--color-sky)' },
        { label: 'Audited Covenants', value: loading ? '...' : (jobReports.length > 0 ? '100% Verified' : 'Filing Required'), sub: 'ISO 19011:2026 Assured', accent: 'var(--google-amber)' },
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
        {/* EXECUTIVE DASHBOARD */}
        <div className="portal-nav-section-title">EXECUTIVE DASHBOARD</div>
        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setActiveView('overview');
            onNav?.();
          }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Overview /></span>
          <span className="portal-nav-label">KPI Overview</span>
          <span className="portal-nav-badge count">Live</span>
        </button>

        {/* GHG & CARBON PIPELINE */}
        {isCarbonActive && (
          <>
            <div className="portal-nav-section-title" style={{ marginTop: '0.65rem' }}>GHG &amp; CARBON PIPELINE</div>
            <button
              type="button"
              className={`portal-nav-btn ${activeView === 'checklist' && auditScope === 'CARBON_EMISSION' ? 'active' : ''}`}
              onClick={() => {
                navigateToView('checklist', { scope: 'CARBON_EMISSION' });
                onNav?.();
              }}
            >
              <span className="portal-nav-icon"><GoogleIcons.Folder /></span>
              <span className="portal-nav-label">Carbon Preparation</span>
              {isCarbonPrepReady ? (
                <span className="portal-nav-badge count">Ready</span>
              ) : (
                <span className="portal-nav-badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.68rem', padding: '1px 6px' }}>Pending</span>
              )}
            </button>

            <button
              type="button"
              className={`portal-nav-btn ${activeView === 'workflow' && auditScope === 'CARBON_EMISSION' ? 'active' : ''}`}
              onClick={() => {
                handleNavigateWorkflow(1, 'CARBON_EMISSION');
                onNav?.();
              }}
            >
              <span className="portal-nav-icon"><GoogleIcons.Workflow /></span>
              <span className="portal-nav-label">Carbon Assurance Engine</span>
              {!user?.hasCompletedAssessment ? (
                <span className="portal-nav-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.68rem', padding: '1px 6px' }}>Intake Req.</span>
              ) : !isCarbonPrepReady ? (
                <span className="portal-nav-badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.68rem', padding: '1px 6px' }}>Prep Pending</span>
              ) : (
                activeView === 'workflow' && auditScope === 'CARBON_EMISSION' ? (
                  <span className="portal-nav-badge">Step {activeStep}/5</span>
                ) : (
                  <span className="portal-nav-badge count">Ready</span>
                )
              )}
            </button>
          </>
        )}

        {/* WORKFORCE & JOB AUDIT PIPELINE */}
        {isJobActive && (
          <>
            <div className="portal-nav-section-title" style={{ marginTop: '0.65rem' }}>JOB AUDIT &amp; SOCIAL VALUE</div>
            <button
              type="button"
              className={`portal-nav-btn ${activeView === 'checklist' && auditScope === 'JOB_REPORTING' ? 'active' : ''}`}
              onClick={() => {
                navigateToView('checklist', { scope: 'JOB_REPORTING' });
                onNav?.();
              }}
            >
              <span className="portal-nav-icon"><GoogleIcons.Folder /></span>
              <span className="portal-nav-label">Job Audit Preparation</span>
              {isJobPrepReady ? (
                <span className="portal-nav-badge count">Ready</span>
              ) : (
                <span className="portal-nav-badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.68rem', padding: '1px 6px' }}>Pending</span>
              )}
            </button>

            <button
              type="button"
              className={`portal-nav-btn ${activeView === 'workflow' && auditScope === 'JOB_REPORTING' ? 'active' : ''}`}
              onClick={() => {
                handleNavigateWorkflow(1, 'JOB_REPORTING');
                onNav?.();
              }}
            >
              <span className="portal-nav-icon"><GoogleIcons.Jobs /></span>
              <span className="portal-nav-label">Workforce Assurance Engine</span>
              {!user?.hasCompletedAssessment ? (
                <span className="portal-nav-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.68rem', padding: '1px 6px' }}>Intake Req.</span>
              ) : !isJobPrepReady ? (
                <span className="portal-nav-badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.68rem', padding: '1px 6px' }}>Prep Pending</span>
              ) : (
                activeView === 'workflow' && auditScope === 'JOB_REPORTING' ? (
                  <span className="portal-nav-badge">Step {activeStep}/5</span>
                ) : (
                  <span className="portal-nav-badge count">Ready</span>
                )
              )}
            </button>
          </>
        )}

        {/* ON-DEMAND AVAILABLE EXTENSIONS */}
        {!isJobActive && (
          <div style={{ margin: '0.85rem 0.5rem 0.25rem 0.5rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Available Extension
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#090d1a', marginBottom: '0.2rem' }}>
              Section 106 &amp; Social Value
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.65rem', lineHeight: 1.4 }}>
              Planning covenants and verified apprentice quotas.
            </div>
            <button
              type="button"
              disabled={activatingPipeline}
              onClick={() => handleActivatePipeline('DUAL')}
              style={{
                width: '100%',
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#059669',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {activatingPipeline ? 'Activating...' : '+ Activate Module'}
            </button>
          </div>
        )}

        {!isCarbonActive && (
          <div style={{ margin: '0.85rem 0.5rem 0.25rem 0.5rem', padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Available Extension
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#090d1a', marginBottom: '0.2rem' }}>
              GHG &amp; Carbon Emissions
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.65rem', lineHeight: 1.4 }}>
              Scope 1, 2 &amp; 3 emissions and ISO 14064 assurance.
            </div>
            <button
              type="button"
              disabled={activatingPipeline}
              onClick={() => handleActivatePipeline('DUAL')}
              style={{
                width: '100%',
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0284c7',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {activatingPipeline ? 'Activating...' : '+ Activate Module'}
            </button>
          </div>
        )}

        {/* VERIFICATION & GOVERNANCE */}
        <div className="portal-nav-section-title" style={{ marginTop: '0.65rem' }}>FLEET EMISSIONS</div>
        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'fleet' ? 'active' : ''}`}
          onClick={() => { setActiveView('fleet'); onNav?.(); }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Leaf /></span>
          <span className="portal-nav-label">Fleet Emissions</span>
        </button>

        <div className="portal-nav-section-title" style={{ marginTop: '0.65rem' }}>VERIFICATION &amp; GOVERNANCE</div>
        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'credentials' ? 'active' : ''}`}
          onClick={() => { setActiveView('credentials'); onNav?.(); }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Shield /></span>
          <span className="portal-nav-label">Verified Credentials</span>
          {credentials.length > 0 && <span className="portal-nav-badge count">{credentials.length}</span>}
        </button>

        {/* FINANCE & GOVERNANCE */}
        <div className="portal-nav-section-title" style={{ marginTop: '0.65rem' }}>FINANCE &amp; GOVERNANCE</div>
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

        {/* Unverified Corporate Work Email Alert Banner */}
        {user && user.emailVerified === false && (
          <div
            role="alert"
            style={{
              padding: '1rem 1.35rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '12px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.25rem',
              flexWrap: 'wrap',
              boxShadow: '0 1px 3px rgba(245, 158, 11, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.18)',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <GoogleIcons.Lock />
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#92400e', marginBottom: '0.2rem' }}>
                  Action Required: Corporate Email Verification Pending
                </div>
                <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.45 }}>
                  A verification link was dispatched to <strong>{user.email}</strong>. Corporate email verification is required to unlock statutory ISO 19011 warranty claims, S106 filings, and credential issuance.
                </div>
                {resendStatus && (
                  <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600, marginTop: '0.35rem' }}>
                    {resendStatus}
                  </div>
                )}
                {resendError && (
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600, marginTop: '0.35rem' }}>
                    {resendError}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleResendPortalVerification}
                disabled={resendingEmail || resendCooldown > 0}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: resendingEmail || resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  opacity: resendingEmail || resendCooldown > 0 ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {resendingEmail
                  ? 'Dispatching...'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend Verification Email'}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('profile')}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Settings
              </button>
            </div>
          </div>
        )}

        {/* Top Greeting Banner - Clean Google/Normative Enterprise Typography */}
        <div className="portal-greeting-banner">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
              {getGreeting()}, {displayName}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.84rem', color: '#4b5563' }}>
              <span>{getFormattedDate()}</span>
              <span>•</span>
              <span className="badge badge-settled" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                ACTIVE LICENSEE
              </span>
              <span>•</span>
              <span>ISO 19011:2026 Remote Auditing</span>
              {user?.licenseeId && (
                <button
                  type="button"
                  onClick={copyClientId}
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#334155',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '2px 8px',
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
            {activeView === 'workflow' && (
              <span
                className={
                  isAuditReady
                    ? 'badge badge-settled'
                    : isRevisionRequired
                    ? 'badge badge-failed'
                    : isSubmittedPendingReview
                    ? 'badge badge-pending'
                    : 'badge'
                }
                onClick={() => {
                  if (isSubmittedPendingReview || isAuditReady || isRevisionRequired) {
                    setShowSubmissionSuccessModal(true);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isSubmittedPendingReview || isAuditReady || isRevisionRequired ? 'pointer' : 'default',
                }}
                title={isSubmittedPendingReview || isAuditReady ? 'Click to inspect Lead Auditor review determination status' : undefined}
              >
                {isAuditReady
                  ? 'Gate 1 Cleared (View Status)'
                  : isRevisionRequired
                  ? 'Revisions Requested (View Notice)'
                  : isSubmittedPendingReview
                  ? 'In Auditor Review (View Status)'
                  : `Stage ${activeStep} of 5 In Progress`}
              </span>
            )}
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

          {/* Enterprise Header Status & Context Actions */}
          <div className="google-m3-scope-container">
            {activeView === 'overview' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.95rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9999px', fontSize: '0.78rem', color: '#1e293b', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7', display: 'inline-block' }} />
                <span>Executive Assurance Registry · FY 2025-2026</span>
              </div>
            )}

            {activeView === 'workflow' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.95rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9999px', fontSize: '0.78rem', color: '#1e293b', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: auditScope === 'CARBON_EMISSION' ? '#16a34a' : '#2563eb', display: 'inline-block' }} />
                <span>
                  {auditScope === 'CARBON_EMISSION'
                    ? 'ISO 14064-1 & GHG Protocol Assurance'
                    : 'Section 106 & CSRD ESRS S1 Social Value Assurance'}
                </span>
              </div>
            )}

            {activeView === 'jobs' && (
              <button
                type="button"
                onClick={() => setShowJobModal(true)}
                className="btn btn-primary"
                style={{
                  borderRadius: '9999px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                }}
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

        {/* ── STATUTORY INTAKE PROMPT (State A: ASSESSMENT_PENDING) ── */}
        {!user?.hasCompletedAssessment && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderLeft: '4px solid #191c1a',
              borderRadius: '14px',
              padding: '1.75rem 2rem',
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 10px 24px -4px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                <span className="pe-live-beacon" style={{ width: '6px', height: '6px', background: '#10b981' }} />
                <span>ASSESSMENT PENDING &bull; MANDATORY STATUTORY INTAKE</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.45rem', lineHeight: 1.25 }}>
                Complete your 3-Minute Statutory Intake Assessment
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '680px' }}>
                Determine which statutory carbon and workforce frameworks apply to your operating boundary (SECR, PPN 06/21, ISO 14064-1, Green Claims) and generate your tailored preparation roadmap.
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/portal/onboarding')}
              style={{
                background: '#191c1a',
                color: '#ffffff',
                border: '1px solid #191c1a',
                borderRadius: '6px',
                padding: '0.8rem 1.65rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
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
              <span>Start Intake Assessment</span>
              <span>&rarr;</span>
            </button>
          </div>
        )}

        {/* ── VIEW: Preparation Checklist Console (State B: PREPARATION) ── */}
        {activeView === 'checklist' && (
          <div style={{ marginBottom: '2.5rem' }}>
            <PreparationChecklistConsole
              initialScope={auditScope}
              onScopeChange={(newScope) => {
                setAuditScope(newScope);
                setSearchParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('tab', 'checklist');
                    next.set('scope', newScope);
                    return next;
                  },
                  { replace: true }
                );
              }}
              onChecklistsUpdated={(updated) => setChecklists(updated)}
              onProceedToDiagnostic={(wfType) => {
                refreshChecklists();
                if (wfType === 'JOB') {
                  handleNavigateWorkflow(1, 'JOB_REPORTING');
                } else {
                  handleNavigateWorkflow(1, 'CARBON_EMISSION');
                }
              }}
            />
          </div>
        )}

        {/* ── VIEW: Executive Overview & KPI Dashboard (True Source of Truth) ── */}
        {activeView === 'overview' && (
          <PortalOverviewView
            user={user}
            isCarbonPrepReady={isCarbonPrepReady}
            isJobPrepReady={isJobPrepReady}
            auditScope={auditScope}
            setAuditScope={setAuditScope}
            kpis={kpis}
            credentials={credentials}
            transactions={transactions}
            handleNavigateWorkflow={handleNavigateWorkflow}
            setActiveView={setActiveView}
          />
        )}

        {/* ── Sovereign Assurance Workflows: GHG Carbon or Workforce Social Value ─────────── */}
        {activeView === 'workflow' && (
          <PortalWorkflowContainer
            checklistsLoading={checklistsLoading}
            user={user}
            auditScope={auditScope}
            isCurrentScopePrepReady={isCurrentScopePrepReady}
            jobChecklists={jobChecklists}
            carbonChecklists={carbonChecklists}
            activeStep={activeStep}
            submissionId={submissionId}
            token={token}
            onNavigateToOnboarding={() => navigate('/portal/onboarding')}
            onNavigateToOverview={() => setActiveView('overview')}
            onNavigateToChecklist={() => navigateToView('checklist', { scope: auditScope })}
            fetchIsoStatus={fetchIsoStatus}
            onNavigateTab={(tab) => {
              if (tab === 'overview') setActiveView('overview');
              if (tab === 'embed') setActiveView('embed');
              if (tab === 'credentials') setActiveView('credentials');
            }}
          />
        )}

      {/* ── VIEW 3: Issued Credentials ───────────────────────────────────── */}
      {activeView === 'credentials' && (
        <PortalCredentialsView
          credentials={credentials}
          onIssueNewCredential={() => handleNavigateWorkflow(4, auditScope)}
          onOpenStudio={() => handleNavigateWorkflow(4, auditScope)}
        />
      )}

      {/* ── VIEW 4: Workforce & Job Filings ──────────────────────────────── */}
      {activeView === 'jobs' && (
        <PortalJobsView
          jobReports={jobReports}
          loading={loading}
          onNewFiling={() => setShowJobModal(true)}
        />
      )}

      {/* ── VIEW 5: Settlement History & 15% ESG Splits ──────────────────── */}
      {activeView === 'transactions' && (
        <PortalTransactionsView
          filteredTransactions={filteredTransactions}
          loading={loading}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      )}

      {/* ── VIEW 6: Client Profile & Ingestion API Keys ──────────────────── */}
      {activeView === 'profile' && (
        <PortalProfileView
          user={user}
          displayName={displayName}
          telemetryApiKey={telemetryApiKey}
          copiedApiKey={copiedApiKey}
          copyApiKey={copyApiKey}
          profileSuccess={profileSuccess}
          profileError={profileError}
          profileSaving={profileSaving}
          profileFirstName={profileFirstName}
          setProfileFirstName={setProfileFirstName}
          profileLastName={profileLastName}
          setProfileLastName={setProfileLastName}
          profileCompanyName={profileCompanyName}
          setProfileCompanyName={setProfileCompanyName}
          profileRegNo={profileRegNo}
          setProfileRegNo={setProfileRegNo}
          profileJobTitle={profileJobTitle}
          setProfileJobTitle={setProfileJobTitle}
          profilePrimaryRole={profilePrimaryRole}
          setProfilePrimaryRole={setProfilePrimaryRole}
          profileCountry={profileCountry}
          setProfileCountry={setProfileCountry}
          profileIndustry={profileIndustry}
          setProfileIndustry={setProfileIndustry}
          profileWebsiteUrl={profileWebsiteUrl}
          setProfileWebsiteUrl={setProfileWebsiteUrl}
          handleSaveProfile={handleSaveProfile}
          onOpenEvidenceLocker={() => setActiveView('profile')}
        />
      )}

      {/* ── VIEW 7: Software Embed & Live Trust Seal ──────────────────────── */}
      {activeView === 'embed' && (
        <div>
          <SoftwareEmbedBuilder
            licenseeId={user?.licenseeId || 'client-licensee'}
            partnerName={user?.companyName || user?.email}
            clientLogoUrl={clientLogoPreview || undefined}
            allowedOrigins={['*']}
            token={token || undefined}
            isVerified={isAuditReady}
            isPaid={isPaid}
            onNavigateWorkflow={(step) => {
              handleNavigateWorkflow(step as any, auditScope);
            }}
          />
        </div>
      )}

      {/* ── VIEW 8: Legal & Statutory Covenants ───────────────────────────── */}
      {activeView === 'legal' && <PortalLegalView />}

      {activeView === 'fleet' && token && (
        <FleetWorkspace token={token} returnedFromCheckout={searchParams.get('subscription') === 'success'} />
      )}

      {/* ── VIEW: Assurance Workflow Engine (Part B Screens 1–11) ────────── */}
      {activeView === 'assurance-wizard' && (
        <WorkflowWizard
          initialWorkflowType={workflowWizardType}
          initialSubmissionId={workflowWizardSubmissionId}
          onBackToDashboard={() => setActiveView('overview')}
        />
      )}

      {/* ── Job Filing Modal ──────────────────────────────────────────────────── */}
      <JobFilingModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        onSubmit={handleJobSubmit}
        submittingJob={submittingJob}
        jobFormError={jobFormError}
        periodType={periodType}
        setPeriodType={setPeriodType}
        periodStart={periodStart}
        setPeriodStart={setPeriodStart}
        periodEnd={periodEnd}
        setPeriodEnd={setPeriodEnd}
        jobsCreatedInput={jobsCreatedInput}
        setJobsCreatedInput={setJobsCreatedInput}
        customNoteInput={customNoteInput}
        setCustomNoteInput={setCustomNoteInput}
      />

      {/* ── Lead Auditor Submission Confirmation Modal ───────────────────────── */}
      <LeadAuditorSubmissionModal
        isOpen={showSubmissionSuccessModal}
        onClose={() => setShowSubmissionSuccessModal(false)}
        submissionId={submissionId}
        answeredQuestions={answeredQuestions}
        totalQuestions={totalQuestions}
        estimatedComplianceScore={estimatedComplianceScore}
        userEmail={user?.email}
        onExportDossierJson={handleExportDossierJson}
        onViewConformanceStatus={() => {
          setShowSubmissionSuccessModal(false);
          const elem = document.getElementById('conformance-verification-card');
          if (elem) {
            elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
      />
      </main>
    </div>
  );
};
