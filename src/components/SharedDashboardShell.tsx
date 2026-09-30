import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export interface ActivityItem {
  id: string;
  date: string;
  type: 'WORKFLOW_SUBMISSION' | 'PAYMENT' | 'CHARITY_PAYOUT' | 'MERCH_ORDER';
  title: string;
  amountCents?: number | null;
  currency?: string | null;
  status: string;
  isDraftOrPending: boolean;
  link: string;
}

export interface CredentialItem {
  id: string;
  type: 'AUDIT_BADGE' | 'CHARITY_PARTNERSHIP';
  title: string;
  frameworkOrScope: string;
  issuedAt: string;
  status: string;
  badgeImageUrl?: string | null;
  tokenId?: string | null;
  openSeaUrl?: string | null;
  pdfDownloadUrl: string;
}

export interface ClientDashboardData {
  profile: {
    userId: string;
    email: string;
    name: string;
    organizationName: string;
    logoUrl?: string | null;
    accountRoles: ('AUDIT_CLIENT' | 'CHARITY_PARTNER' | 'MERCH_BUYER')[];
  };
  auditCards: {
    carbon: {
      activeSubmissions: number;
      approvedBadges: number;
      latestDraftId?: string | null;
    };
    job: {
      activeSubmissions: number;
      approvedBadges: number;
      latestDraftId?: string | null;
    };
  };
  recentActivity: ActivityItem[];
  credentials: CredentialItem[];
  telemetryApi: {
    isEnabled: boolean;
    maskedApiKey?: string | null;
    docsUrl: string;
    telemetryCount: number;
  } | null;
}

interface SharedDashboardShellProps {
  initialData?: ClientDashboardData | null;
  targetLicenseeId?: string;
  isAdminViewing?: boolean;
  hideEmailBanner?: boolean;
  onNavigateWorkflow?: (type: 'CARBON' | 'JOB', draftId?: string | null) => void;
}

// ── Type-badge lookup ─────────────────────────────────────────────────────────
const TYPE_CHIP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  WORKFLOW_SUBMISSION: { label: 'Workflow', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  PAYMENT:            { label: 'Payment',  bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  CHARITY_PAYOUT:     { label: 'ESG Payout', bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  MERCH_ORDER:        { label: 'Merch',    bg: '#faf5ff', color: '#6d28d9', border: '#ddd6fe' },
};

export const SharedDashboardShell: React.FC<SharedDashboardShellProps> = ({
  initialData,
  targetLicenseeId,
  isAdminViewing = false,
  hideEmailBanner = false,
  onNavigateWorkflow,
}) => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<ClientDashboardData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<boolean>(false);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendingEmail(true);
    setResendStatus(null);
    try {
      const res = await api.resendVerificationEmail(user.email, token || undefined);
      setResendStatus(res.message || 'Verification link sent to your work email.');
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to dispatch verification email.');
    } finally {
      setResendingEmail(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const query = targetLicenseeId ? `?licenseeId=${encodeURIComponent(targetLicenseeId)}` : '';
        const res = await fetch(`/api/portal/dashboard${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load dashboard: ${res.statusText}`);
        }

        const json = await res.json();
        if (isMounted) {
          const dashboardData = json.dashboard ? json.dashboard : (json.profile ? json : null);
          setData(dashboardData);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[SHARED DASHBOARD FETCH ERROR]', err);
          setError(err.message || 'Error loading dashboard metrics.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [token, targetLicenseeId, initialData]);

  const handleCopyKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleStartWorkflow = (type: 'CARBON' | 'JOB', draftId?: string | null) => {
    if (onNavigateWorkflow) {
      onNavigateWorkflow(type, draftId);
    } else {
      if (draftId) {
        navigate(`/portal/workflow/${draftId}`);
      } else {
        navigate(`/portal/workflow/new?type=${type}`);
      }
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="shared-dash-glass-card" style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '32px', height: '32px', border: '2.5px solid var(--border-light)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 500 }}>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="shared-dash-glass-card" style={{ maxWidth: '580px', margin: '2rem auto', textAlign: 'center', borderColor: '#fca5a5' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.5rem' }}>Unable to Load Dashboard</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '1.25rem' }}>{error || 'Unknown error occurred while fetching dashboard data.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="shared-dash-cta-btn"
          style={{ maxWidth: '200px', margin: '0 auto' }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Data extraction ───────────────────────────────────────────────────────
  const profile = data?.profile || {
    userId: '',
    email: '',
    name: 'Authorized Entity',
    organizationName: 'Authorized Entity',
    logoUrl: null,
    accountRoles: ['AUDIT_CLIENT'] as ('AUDIT_CLIENT' | 'CHARITY_PARTNER' | 'MERCH_BUYER')[],
  };
  const orgName = profile.organizationName || profile.name || 'Authorized Entity';
  const orgInitials = (orgName.slice(0, 2) || 'AE').toUpperCase();
  const accountRoles = Array.isArray(profile.accountRoles) ? profile.accountRoles : ['AUDIT_CLIENT'];
  const auditCards = data?.auditCards || {
    carbon: { activeSubmissions: 0, approvedBadges: 0, latestDraftId: null },
    job: { activeSubmissions: 0, approvedBadges: 0, latestDraftId: null },
  };
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  const credentials = Array.isArray(data?.credentials) ? data.credentials : [];
  const telemetryApi = data?.telemetryApi || null;

  return (
    <div className="shared-dash-container">

      {/* ── Unverified Email Notice ─────────────────────────────────────────── */}
      {!hideEmailBanner && user && user.emailVerified === false && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '260px', flex: 1 }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: '0.825rem', color: '#92400e', lineHeight: 1.5 }}>
              <strong>Unverified Work Email:</strong> Verification link sent to <strong>{user.email}</strong>. Verify your address to activate audit signing credentials.
              {resendStatus && (
                <span style={{ display: 'block', color: '#b45309', marginTop: '0.2rem', fontWeight: 600 }}>
                  {resendStatus}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingEmail}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#ffffff',
                border: '1px solid #d97706',
                color: '#b45309',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: resendingEmail ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: resendingEmail ? 0.6 : 1,
              }}
            >
              {resendingEmail ? 'Sending...' : 'Resend Verification'}
            </button>
            <Link
              to="/verify-email"
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-light)',
                textDecoration: 'none',
              }}
            >
              Enter Token
            </Link>
          </div>
        </div>
      )}

      {/* ── Administrator Inspection Banner ────────────────────────────────── */}
      {isAdminViewing && (
        <div style={{
          padding: '0.75rem 1.25rem',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-md)',
          color: '#92400e',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}>
          <span>Administrator Inspection Mode: Viewing <strong>{orgName}</strong> in read-only tenant view.</span>
          <span style={{
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 700,
            padding: '0.15rem 0.5rem',
            background: '#fef3c7',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid #fde68a',
          }}>Read Only</span>
        </div>
      )}

      {/* ── 1. Profile Header ───────────────────────────────────────────────── */}
      <section className="shared-dash-glass-card">
        <div className="shared-dash-profile-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div className="shared-dash-avatar">
              {orgInitials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.025em' }}>
                  {orgName}
                </h1>
                <div className="shared-dash-roles-row">
                  {accountRoles.map((role) => {
                    if (role === 'AUDIT_CLIENT') {
                      return <span key={role} className="shared-dash-badge-client">Audit Client</span>;
                    }
                    if (role === 'CHARITY_PARTNER') {
                      return <span key={role} className="shared-dash-badge-charity">Charity Partner</span>;
                    }
                    if (role === 'MERCH_BUYER') {
                      return <span key={role} className="shared-dash-badge-merch">Merch Buyer</span>;
                    }
                    return null;
                  })}
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontFamily: 'var(--font-mono, monospace)', margin: '0.3rem 0 0 0' }}>
                {profile.email || 'licensee@ghglogodrop.com'} &bull; ID: {profile.userId ? profile.userId.slice(0, 10) : 'VERIFIED'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/portal?tab=evidence"
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
            >
              Evidence Locker
            </Link>
            <Link
              to="/portal?tab=credentials"
              style={{
                padding: '0.5rem 1.1rem',
                background: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
            >
              View Credentials
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Audit Workflow Cards ─────────────────────────────────────────── */}
      <section className="shared-dash-workflow-grid">

        {/* Carbon Emission Audit */}
        <div className="shared-dash-workflow-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.7rem', fontWeight: 600, color: '#047857',
                background: '#ecfdf5', padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-pill)', border: '1px solid #a7f3d0',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
                ISO 14064-1 &bull; ISO 50001 &bull; GHG Protocol
              </div>
              {auditCards.carbon.latestDraftId && (
                <span style={{
                  fontSize: '0.7rem', fontFamily: 'var(--font-mono, monospace)',
                  color: '#b45309', background: '#fffbeb',
                  padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-xs)',
                  border: '1px solid #fde68a',
                }}>
                  Draft in Progress
                </span>
              )}
            </div>

            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.3rem 0' }}>
                Carbon Emission Audit
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', lineHeight: 1.55, margin: 0 }}>
                Corporate greenhouse gas inventories, Scope 1-3 assurance, and energy management audit-readiness assessment.
              </p>
            </div>
          </div>

          <div className="shared-dash-metrics-grid">
            <div>
              <div className="shared-dash-metric-num">{auditCards.carbon.activeSubmissions}</div>
              <div className="shared-dash-metric-lbl">Active Submissions</div>
            </div>
            <div>
              <div className="shared-dash-metric-num" style={{ color: '#047857' }}>{auditCards.carbon.approvedBadges}</div>
              <div className="shared-dash-metric-lbl">Approved Badges</div>
            </div>
          </div>

          <button
            onClick={() => handleStartWorkflow('CARBON', auditCards.carbon.latestDraftId)}
            className="shared-dash-cta-btn"
          >
            <span>{auditCards.carbon.latestDraftId ? 'Resume Carbon Draft' : 'Start New Carbon Audit'}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Job Reporting Audit */}
        <div className="shared-dash-workflow-card job-scope">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.7rem', fontWeight: 600, color: '#0f766e',
                background: '#f0fdfa', padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-pill)', border: '1px solid #99f6e4',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#14b8a6', flexShrink: 0 }} />
                UK Section 106 &bull; Social Value PPN 06/20
              </div>
              {auditCards.job.latestDraftId && (
                <span style={{
                  fontSize: '0.7rem', fontFamily: 'var(--font-mono, monospace)',
                  color: '#b45309', background: '#fffbeb',
                  padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-xs)',
                  border: '1px solid #fde68a',
                }}>
                  Draft in Progress
                </span>
              )}
            </div>

            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.3rem 0' }}>
                Job Reporting Audit
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', lineHeight: 1.55, margin: 0 }}>
                Local resident workforce, apprentice density quotas, and Section 106 statutory social value compliance.
              </p>
            </div>
          </div>

          <div className="shared-dash-metrics-grid">
            <div>
              <div className="shared-dash-metric-num">{auditCards.job.activeSubmissions}</div>
              <div className="shared-dash-metric-lbl">Active Submissions</div>
            </div>
            <div>
              <div className="shared-dash-metric-num" style={{ color: '#0f766e' }}>{auditCards.job.approvedBadges}</div>
              <div className="shared-dash-metric-lbl">Approved Badges</div>
            </div>
          </div>

          <button
            onClick={() => handleStartWorkflow('JOB', auditCards.job.latestDraftId)}
            className="shared-dash-cta-btn job-btn"
          >
            <span>{auditCards.job.latestDraftId ? 'Resume Job Draft' : 'Start New Job Audit'}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── 3. Recent Activity Ledger ───────────────────────────────────────── */}
      <section className="shared-dash-glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Recent Activity</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', margin: '0.2rem 0 0 0' }}>
              Workflow milestones, payments, payouts, and in-progress drafts.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-light)' }}>
            {recentActivity.length} records
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1rem',
            border: '1.5px dashed var(--border-light)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 500, margin: 0 }}>No activity recorded yet.</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.3rem', opacity: 0.8 }}>
              Start a compliance assessment or order merch to populate your ledger.
            </p>
          </div>
        ) : (
          <div className="shared-dash-table-wrap">
            <table className="shared-dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item) => {
                  const chip = TYPE_CHIP[item.type] || { label: item.type, bg: 'var(--bg-subtle)', color: 'var(--text-muted)', border: 'var(--border-light)' };
                  return (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                        {new Date(item.date).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.7rem', padding: '0.15rem 0.55rem',
                          borderRadius: 'var(--radius-xs)',
                          background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`,
                          fontWeight: 600,
                        }}>
                          {chip.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.title}</td>
                      <td style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {typeof item.amountCents === 'number'
                          ? `£${(item.amountCents / 100).toFixed(2)}`
                          : '-'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {item.isDraftOrPending ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            fontSize: '0.7rem', padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-xs)',
                            background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a',
                            fontWeight: 600,
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                            Draft / Pending
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.7rem', padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-xs)',
                            background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                            fontWeight: 600,
                          }}>
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link
                          to={item.link}
                          style={{ color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
                        >
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 4. Credentials Panel ───────────────────────────────────────────── */}
      <section className="shared-dash-glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Credentials</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', margin: '0.2rem 0 0 0' }}>
              Issued assurance badges, on-chain tokens, and statutory partnership certificates.
            </p>
          </div>
          <Link
            to="/portal?tab=credentials"
            style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Open Credential Studio &rarr;
          </Link>
        </div>

        {credentials.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1rem',
            border: '1.5px dashed var(--border-light)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 500, margin: 0 }}>No verified credentials issued yet.</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.3rem', opacity: 0.8 }}>
              Complete an ISO audit or Section 106 review to generate a digital badge.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.1rem' }}>
            {credentials.map((cred) => (
              <div
                key={cred.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.67rem', fontFamily: 'var(--font-mono, monospace)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-subtle)', color: 'var(--text-light)',
                      border: '1px solid var(--border-light)',
                    }}>
                      {cred.type === 'AUDIT_BADGE' ? 'Assurance Badge' : 'Statutory Partnership'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#047857' }}>
                      {cred.status}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cred.title}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', margin: 0 }}>{cred.frameworkOrScope}</p>
                </div>

                <div style={{
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: '0.75rem',
                }}>
                  {cred.openSeaUrl ? (
                    <a
                      href={cred.openSeaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono, monospace)', textDecoration: 'underline' }}
                    >
                      Polygon PoS #{cred.tokenId || 'Token'}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-light)', fontFamily: 'var(--font-mono, monospace)' }}>
                      Issued: {new Date(cred.issuedAt).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  <a
                    href={cred.pdfDownloadUrl}
                    download
                    style={{
                      color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    }}
                  >
                    <span>Download PDF</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 5. Telemetry API Panel ──────────────────────────────────────────── */}
      {telemetryApi && telemetryApi.isEnabled && (
        <section className="shared-dash-glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.7rem', fontWeight: 600, color: '#047857',
                background: '#ecfdf5', padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-pill)', border: '1px solid #a7f3d0',
                marginBottom: '0.4rem',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Statutory Machine-to-Machine Ingestion
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Live Telemetry API Key</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', margin: '0.2rem 0 0 0' }}>
                Automated ingestion key for Scope 1 &amp; 2 SCADA, sub-meter, and workforce data feeds.
              </p>
            </div>
            <Link
              to={telemetryApi.docsUrl}
              style={{
                fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-primary)',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              <span>View OpenAPI Docs</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>

          <div className="shared-dash-telemetry-box">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Production API Key</span>
              <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem', color: 'var(--text-main)', userSelect: 'all' }}>
                {telemetryApi.maskedApiKey || 'ghg_live_••••••••'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontFamily: 'var(--font-mono, monospace)' }}>
                {telemetryApi.telemetryCount} logs recorded
              </span>
              <button
                onClick={() => handleCopyKey(telemetryApi.maskedApiKey || '')}
                style={{
                  padding: '0.4rem 0.95rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                {copiedKey ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
