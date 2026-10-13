import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { WebsiteBadgePanel } from '../components/portal/WebsiteBadgePanel';
import { PipelineWorkspace } from '../components/pipeline/PipelineWorkspace';
import { PreparationChecklistConsole } from '../components/checklist/PreparationChecklistConsole';
import { PortalOverviewView } from '../components/portal/PortalOverviewView';
import { useSiteFacts } from '../components/landing/useSiteFacts';
import { Scope3Workspace } from '../components/scope3/Scope3Workspace';
import { FleetWorkspace } from '../components/fleet/FleetWorkspace';
import { PortalCredentialsView } from '../components/portal/PortalCredentialsView';
import { PortalJobsView } from '../components/portal/PortalJobsView';
import { PortalTransactionsView } from '../components/portal/PortalTransactionsView';
import { PortalProfileView } from '../components/portal/PortalProfileView';
import { PortalLegalView } from '../components/portal/PortalLegalView';
import { JobFilingModal } from '../components/portal/JobFilingModal';
import { LegacyCredentialPanel } from '../components/portal/LegacyCredentialPanel';

// ── Scope & Step definitions ────────────────────────────────────────────────
type AuditScope = 'CARBON_EMISSION' | 'JOB_REPORTING';

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

export type DashboardView = 'checklist' | 'workflow' | 'overview' | 'credentials' | 'jobs' | 'embed' | 'transactions' | 'legal' | 'profile' | 'fleet' | 'supply-chain';

/** Maps the ?tab= value (including older aliases) to a view. No tab means the overview. */
const viewFromTab = (tab: string | null): DashboardView => {
  switch (tab) {
    case 'checklist':
    case 'preparation':
      return 'checklist';
    case 'workflow':
    case 'diagnostic':
      return 'workflow';
    case 'credentials':
      return 'credentials';
    case 'transactions':
    case 'settlement':
      return 'transactions';
    case 'profile':
      return 'profile';
    case 'legal':
      return 'legal';
    case 'jobs':
    case 'job-reporting':
      return 'jobs';
    case 'embed':
      return 'embed';
    case 'fleet':
      return 'fleet';
    case 'supply-chain':
      return 'supply-chain';
    default:
      return 'overview';
  }
};

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
    return viewFromTab(params.get('tab') || params.get('view'));
  });

  const [auditScope, setAuditScope] = useState<AuditScope>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('scope') === 'JOB_REPORTING' ? 'JOB_REPORTING' : 'CARBON_EMISSION';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
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

  // Each service's pipeline is shown only when the client holds that service.
  const activeServiceLines = new Set((user?.serviceEntitlements || []).map((e) => e.serviceLine));
  const isCarbonActive = activeServiceLines.has('GHG') || activeServiceLines.has('CARBON');
  const isJobActive = activeServiceLines.has('JOB');

  const navigateToView = useCallback(
    (targetView: DashboardView, options?: { scope?: AuditScope }) => {
      const nextScope = options?.scope || auditScope;

      if (targetView === 'workflow' && !user?.hasCompletedAssessment) {
        navigate('/portal/onboarding');
        return;
      }

      setActiveViewState(targetView);
      if (options?.scope) setAuditScope(options.scope);

      // Each view change is a history entry, so the browser Back button returns to the previous view.
      // The pipeline workspace owns submission_id.
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (targetView === 'overview') next.delete('tab');
        else next.set('tab', targetView);
        next.delete('view');
        next.delete('step');
        next.delete('submission_id');
        next.delete('payment');
        if (targetView === 'workflow' || targetView === 'checklist') next.set('scope', nextScope);
        else next.delete('scope');
        return next;
      });
    },
    [auditScope, user?.hasCompletedAssessment, setSearchParams, navigate]
  );

  const setActiveView = useCallback(
    (view: DashboardView) => {
      navigateToView(view);
    },
    [navigateToView]
  );

  const handleNavigateWorkflow = useCallback(
    (targetScope: AuditScope = auditScope) => {
      navigateToView('workflow', { scope: targetScope });
    },
    [navigateToView, auditScope]
  );

  /** Adding a service asks that service's onboarding questions first. */
  const handleAddService = useCallback(
    (service: 'GHG' | 'WORKFORCE') => navigate(`/portal/onboarding?add=${service}`),
    [navigate]
  );
  const [credentials, setCredentials] = useState<any[]>([]);
  const { charityShare } = useSiteFacts();

  // ── Job filing modal ──────────────────────────────────────────────────────
  const [showJobModal, setShowJobModal] = useState<boolean>(false);
  const [periodType, setPeriodType] = useState<string>('QUARTERLY');
  const [periodStart, setPeriodStart] = useState<string>('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState<string>('2026-03-31');
  const [jobsCreatedInput, setJobsCreatedInput] = useState<string>('50');
  const [customNoteInput, setCustomNoteInput] = useState<string>('');
  const [submittingJob, setSubmittingJob] = useState<boolean>(false);
  const [jobFormError, setJobFormError] = useState<string | null>(null);

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

  // ── Fetch portal summary, transactions, jobs ───────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [sumRes, txRes, jobRes, checkRes] = await Promise.all([
          api.getPortalSummary(token),
          api.getPortalTransactions(token),
          api.getPortalJobReports(token).catch(() => ({ data: [] })),
          api.getChecklists(token).catch(() => ({ checklists: [] })),
        ]);
        if (isMounted) {
          setSummary(sumRes);
          setTransactions(txRes?.transactions || txRes?.data || []);
          setJobReports(jobRes?.data || jobRes?.reports || []);
          setChecklists(checkRes?.checklists || []);
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

  // Synchronize state when URL search parameters change (back/forward navigation or Stripe checkout return)
  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('view');
    setActiveViewState(viewFromTab(tabParam));
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
  }, [searchParams]);

  // ── Load credentials ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    api.getMyCredentials(token)
      .then((res) => setCredentials(res.credentials || []))
      .catch(() => setCredentials([]));
  }, [token]);

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

      setCustomNoteInput('');
    } catch (err: any) {
      setJobFormError(err.message || 'Failed to submit job creation report');
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
        return 'Your credentials';
      case 'jobs':
        return 'Section 106 Filings & Local Labour Ledger';
      case 'embed':
        return 'Website badge';
      case 'transactions':
        return 'Payments';
      case 'legal':
        return 'How we review';
      case 'profile':
        return 'Client Profile';
      case 'fleet':
        return 'Fleet Emissions';
      case 'supply-chain':
        return 'Supply Chain';
      default:
        return 'Client Profile Dashboard';
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  // A client is verified for the embed once they hold an issued credential.

  // Every figure below comes from the API: settled payments, their recorded splits, credentials and filings.
  const settledTxs = Array.isArray(transactions) ? transactions.filter((t: any) => t.status === 'SETTLED') : [];
  const settledCount = summary?.countByStatus?.SETTLED ?? settledTxs.length;
  const settledGrossCents =
    summary?.totalGrossCentsSettled ?? settledTxs.reduce((acc: number, t: any) => acc + (t.grossAmountCents || 0), 0);
  const settledCharityCents =
    summary?.totalCharityGiftCentsSettled ??
    settledTxs.reduce((acc: number, t: any) => acc + (t.financialSplit?.charityGiftCents || 0), 0);
  const formatPounds = (cents: number) =>
    `\u00a3${(cents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const issuedCredentials = credentials.filter((c) => c.status === 'ISSUED').length;
  const totalReportedJobs = jobReports.reduce((acc, r) => acc + (r.jobsCreated || 0), 0);
  const pending = (value: string) => (loading ? '...' : value);

  const accountKpis = [
    { label: 'Settled payments', value: pending(settledCount.toLocaleString('en-GB')), sub: 'Payments completed through Stripe' },
    { label: 'Amount paid', value: pending(formatPounds(settledGrossCents)), sub: 'Total of settled payments' },
    {
      label: charityShare ? `Charity share (${charityShare}%)` : 'Charity share',
      value: pending(formatPounds(settledCharityCents)),
      sub: 'Passed to partner charities from your payments',
    },
    { label: 'Credentials issued', value: issuedCredentials.toLocaleString('en-GB'), sub: 'Approved audits with a credential' },
  ];
  const workforceKpis = isJobActive
    ? [
        { label: 'Jobs reported', value: pending(totalReportedJobs.toLocaleString('en-GB')), sub: 'Across all filed periods' },
        { label: 'Filed periods', value: pending(jobReports.length.toLocaleString('en-GB')), sub: 'Quarterly and annual filings' },
      ]
    : null;

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
                handleNavigateWorkflow('CARBON_EMISSION');
                onNav?.();
              }}
            >
              <span className="portal-nav-icon"><GoogleIcons.Workflow /></span>
              <span className="portal-nav-label">Carbon Assurance Engine</span>
              {!user?.hasCompletedAssessment ? (
                <span className="portal-nav-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.68rem', padding: '1px 6px' }}>Intake Req.</span>
              ) : null}
            </button>

            {/* Scope 3 supply chain records belong to the GHG pipeline. */}
            <button
              type="button"
              className={`portal-nav-btn ${activeView === 'supply-chain' ? 'active' : ''}`}
              onClick={() => { setActiveView('supply-chain'); onNav?.(); }}
            >
              <span className="portal-nav-icon"><GoogleIcons.Leaf /></span>
              <span className="portal-nav-label">Supply Chain (Scope 3)</span>
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
                handleNavigateWorkflow('JOB_REPORTING');
                onNav?.();
              }}
            >
              <span className="portal-nav-icon"><GoogleIcons.Jobs /></span>
              <span className="portal-nav-label">Workforce Assurance Engine</span>
              {!user?.hasCompletedAssessment ? (
                <span className="portal-nav-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.68rem', padding: '1px 6px' }}>Intake Req.</span>
              ) : null}
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
              onClick={() => handleAddService('WORKFORCE')}
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
              + Add service
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
              onClick={() => handleAddService('GHG')}
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
              + Add service
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
        <button
          type="button"
          className={`portal-nav-btn ${activeView === 'embed' ? 'active' : ''}`}
          onClick={() => { setActiveView('embed'); onNav?.(); }}
        >
          <span className="portal-nav-icon"><GoogleIcons.Shield /></span>
          <span className="portal-nav-label">Website Badge</span>
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
          <span className="portal-nav-label">How We Review</span>
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
          <span className="portal-nav-label">Settings</span>
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
              alt="NFTYLOGS Logo"
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
            />
            <span className="portal-drawer-brand-text">NFTYLOGS</span>
          </div>
          <button
            type="button"
            className="portal-drawer-cancel-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <span className="portal-drawer-cancel-x" aria-hidden="true">✕</span>
          </button>
        </div>
        <SidebarContent onNav={() => setMobileSidebarOpen(false)} />
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
                  A verification link was dispatched to <strong>{user.email}</strong>. Verify your work email to submit for review and receive credentials.
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

        {/* Page header: one title per view; the greeting sits under it on the overview */}
        <div className="portal-workspace-header">
          <div className="portal-header-left">
            <h1 className="portal-page-heading">{getViewTitle()}</h1>
            {activeView === 'overview' && (
              <div className="portal-page-subline">
                <span>
                  {getGreeting()}, {displayName}
                </span>
                <span aria-hidden="true">·</span>
                <span>{getFormattedDate()}</span>
                {user?.licenseeId && (
                  <button type="button" className="portal-client-id-btn" onClick={copyClientId} title="Copy client ID">
                    {copiedClientId ? 'Copied' : `Client ID ${user.licenseeId.substring(0, 14)}...`}
                  </button>
                )}
              </div>
            )}
          </div>

          {activeView === 'jobs' && (
            <div className="google-m3-scope-container">
              <button type="button" onClick={() => setShowJobModal(true)} className="btn btn-primary">
                Submit job filing
              </button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* ── INTAKE PROMPT (State A: ASSESSMENT_PENDING) ── */}
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
                <span>ASSESSMENT PENDING</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.45rem', lineHeight: 1.25 }}>
                Complete your 3-minute intake assessment
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '680px' }}>
                Find out which carbon and workforce frameworks apply to your organisation (SECR, PPN 006, ISO 14064-1, Green Claims) and generate your tailored preparation roadmap.
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
                  handleNavigateWorkflow('JOB_REPORTING');
                } else {
                  handleNavigateWorkflow('CARBON_EMISSION');
                }
              }}
            />
          </div>
        )}

        {/* ── VIEW: Executive Overview & KPI Dashboard (True Source of Truth) ── */}
        {activeView === 'overview' && (
          <PortalOverviewView
            accountKpis={accountKpis}
            workforceKpis={workforceKpis}
            services={{ carbon: isCarbonActive, job: isJobActive }}
            handleNavigateWorkflow={handleNavigateWorkflow}
          />
        )}

        {/* ── Sovereign Assurance Workflows: GHG Carbon or Workforce Social Value ─────────── */}
        {activeView === 'workflow' && token && (
          <PipelineWorkspace
            key={auditScope}
            token={token}
            service={auditScope === 'JOB_REPORTING' ? 'WORKFORCE' : 'GHG'}
            onPrepare={() => navigateToView('checklist', { scope: auditScope })}
          />
        )}

      {/* ── VIEW 3: Issued Credentials ───────────────────────────────────── */}
      {activeView === 'credentials' && token && (
        <LegacyCredentialPanel
          token={token}
          onIssued={() => api.getMyCredentials(token).then((res) => setCredentials(res.credentials || [])).catch(() => undefined)}
        />
      )}
      {activeView === 'credentials' && (
        <PortalCredentialsView
          credentials={credentials}
          onIssueNewCredential={() => handleNavigateWorkflow(auditScope)}
          onOpenStudio={() => handleNavigateWorkflow(auditScope)}
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

      {/* ── VIEW 5: Payment history ──────────────────── */}
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
        />
      )}

      {/* ── VIEW 7: Website badge ──────────────────────────────────────────── */}
      {activeView === 'embed' && token && (
        <WebsiteBadgePanel token={token} companyName={user?.companyName || 'Your organisation'} onStart={() => handleNavigateWorkflow(auditScope)} />
      )}

      {/* ── VIEW 8: Legal & Statutory Covenants ───────────────────────────── */}
      {activeView === 'legal' && <PortalLegalView />}

      {activeView === 'fleet' && token && (
        <FleetWorkspace token={token} returnedFromCheckout={searchParams.get('subscription') === 'success'} />
      )}
      {activeView === 'supply-chain' && token && isCarbonActive && <Scope3Workspace token={token} />}

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

      </main>
    </div>
  );
};
