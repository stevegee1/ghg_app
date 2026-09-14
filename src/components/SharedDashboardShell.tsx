import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  onNavigateWorkflow?: (type: 'CARBON' | 'JOB', draftId?: string | null) => void;
}

export const SharedDashboardShell: React.FC<SharedDashboardShellProps> = ({
  initialData,
  targetLicenseeId,
  isAdminViewing = false,
  onNavigateWorkflow,
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<ClientDashboardData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

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
          if (json.success && json.dashboard) {
            setData(json.dashboard);
          } else {
            setData(json);
          }
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

  if (loading) {
    return (
      <div className="shared-dash-glass-card" style={{ minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '38px', height: '38px', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Loading Enterprise Client Profile...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="shared-dash-glass-card" style={{ maxWidth: '580px', margin: '2rem auto', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f87171', marginBottom: '0.5rem' }}>Unable to Load Dashboard</h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>{error || 'Unknown error occurred while fetching dashboard data.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="shared-dash-cta-btn"
          style={{ maxWidth: '200px', margin: '0 auto' }}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { profile, auditCards, recentActivity, credentials, telemetryApi } = data;

  return (
    <div className="shared-dash-container">
      {/* Admin Inspection Banner */}
      {isAdminViewing && (
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', color: '#fcd34d', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Administrator Inspection Mode: Viewing <strong>{profile.organizationName}</strong> in read-only tenant view.</span>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>Read Only</span>
        </div>
      )}

      {/* ── 1. Profile Header & Role Badges ───────────────────────────────────── */}
      <section className="shared-dash-glass-card">
        <div className="shared-dash-ambient-glow" />
        <div className="shared-dash-profile-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div className="shared-dash-avatar">
              {profile.organizationName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                  {profile.organizationName}
                </h1>
                <div className="shared-dash-roles-row">
                  {profile.accountRoles.map((role) => {
                    if (role === 'AUDIT_CLIENT') {
                      return (
                        <span key={role} className="shared-dash-badge-client">
                          Audit Client
                        </span>
                      );
                    }
                    if (role === 'CHARITY_PARTNER') {
                      return (
                        <span key={role} className="shared-dash-badge-charity">
                          Charity Partner
                        </span>
                      );
                    }
                    if (role === 'MERCH_BUYER') {
                      return (
                        <span key={role} className="shared-dash-badge-merch">
                          Merch Buyer
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)', margin: '0.35rem 0 0 0' }}>
                {profile.email} &bull; ID: {profile.userId.slice(0, 10)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/portal?tab=evidence"
              style={{ padding: '0.55rem 1rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s ease' }}
            >
              Evidence Locker
            </Link>
            <Link
              to="/portal?tab=credentials"
              style={{ padding: '0.55rem 1.15rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', color: '#ffffff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', transition: 'all 0.15s ease' }}
            >
              View Credentials
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Top Action Cards for Audit Clients (Part B.5) ──────────────────── */}
      <section className="shared-dash-workflow-grid">
        {/* Carbon Emission Audit Card */}
        <div className="shared-dash-workflow-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 600, color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', padding: '0.25rem 0.65rem', borderRadius: '9999px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399' }} />
                <span>ISO 14064-1 &bull; ISO 50001 &bull; GHG Protocol</span>
              </div>
              {auditCards.carbon.latestDraftId && (
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono, monospace)', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  Draft in Progress
                </span>
              )}
            </div>

            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.35rem 0' }}>
                Carbon Emission Audit
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
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
              <div className="shared-dash-metric-num" style={{ color: '#34d399' }}>{auditCards.carbon.approvedBadges}</div>
              <div className="shared-dash-metric-lbl">Approved Badges</div>
            </div>
          </div>

          <button
            onClick={() => handleStartWorkflow('CARBON', auditCards.carbon.latestDraftId)}
            className="shared-dash-cta-btn"
          >
            <span>{auditCards.carbon.latestDraftId ? 'Resume Carbon Draft' : 'Start New Carbon Audit'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Job Reporting Audit Card */}
        <div className="shared-dash-workflow-card job-scope">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 600, color: '#2dd4bf', background: 'rgba(20, 184, 166, 0.12)', padding: '0.25rem 0.65rem', borderRadius: '9999px', border: '1px solid rgba(20, 184, 166, 0.25)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2dd4bf' }} />
                <span>UK Section 106 &bull; Social Value PPN 06/20</span>
              </div>
              {auditCards.job.latestDraftId && (
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono, monospace)', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  Draft in Progress
                </span>
              )}
            </div>

            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.35rem 0' }}>
                Job Reporting Audit
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
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
              <div className="shared-dash-metric-num" style={{ color: '#2dd4bf' }}>{auditCards.job.approvedBadges}</div>
              <div className="shared-dash-metric-lbl">Approved Badges</div>
            </div>
          </div>

          <button
            onClick={() => handleStartWorkflow('JOB', auditCards.job.latestDraftId)}
            className="shared-dash-cta-btn job-btn"
          >
            <span>{auditCards.job.latestDraftId ? 'Resume Job Draft' : 'Start New Job Audit'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── 3. Recent Activity & Unified Reverse-Chronological Transactions Feed ─ */}
      <section className="shared-dash-glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Recent Activity & Ledger Feed</h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Reverse-chronological record of workflow milestones, payments, payouts, and in-progress drafts.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono, monospace)', color: '#94a3b8' }}>
            {recentActivity.length} Recent Records
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.2)' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500, margin: 0 }}>No recent transactions or activity recorded yet.</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>Start a compliance assessment or order merch to populate your ledger feed.</p>
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
                {recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-mono, monospace)', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(item.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {item.type === 'WORKFLOW_SUBMISSION' && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          Workflow
                        </span>
                      )}
                      {item.type === 'PAYMENT' && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.12)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                          Payment
                        </span>
                      )}
                      {item.type === 'CHARITY_PAYOUT' && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                          ESG Payout
                        </span>
                      )}
                      {item.type === 'MERCH_ORDER' && (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                          Merch
                        </span>
                      )}
                    </td>
                    <td style={{ color: '#f1f5f9' }}>{item.title}</td>
                    <td style={{ fontFamily: 'var(--font-mono, monospace)', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                      {typeof item.amountCents === 'number'
                        ? `£${(item.amountCents / 100).toFixed(2)}`
                        : '-'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {item.isDraftOrPending ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                          Draft / Pending
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link
                        to={item.link}
                        style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 4. Credentials Panel (Badges, On-Chain Tokens, PDF Proofs) ───────── */}
      <section className="shared-dash-glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Credentials & Proofs Locker</h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Issued assurance badges, ERC-1155 on-chain tokens, and statutory partnership certificates.
            </p>
          </div>
          <Link
            to="/portal?tab=credentials"
            style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600, textDecoration: 'none' }}
          >
            Open Credential Studio &rarr;
          </Link>
        </div>

        {credentials.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.2)' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500, margin: 0 }}>No verified credentials issued yet.</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>Complete an ISO audit or Section 106 review to generate a digital badge.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
            {credentials.map((cred) => (
              <div
                key={cred.id}
                style={{ background: 'rgba(10, 15, 29, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', transition: 'all 0.2s ease' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1' }}>
                      {cred.type === 'AUDIT_BADGE' ? 'Assurance Badge' : 'Statutory Partnership'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono, monospace)', color: '#34d399' }}>
                      {cred.status}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cred.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>{cred.frameworkOrScope}</p>
                </div>

                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  {cred.openSeaUrl ? (
                    <a
                      href={cred.openSeaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#38bdf8', fontFamily: 'var(--font-mono, monospace)', textDecoration: 'underline' }}
                    >
                      Polygon PoS #{cred.tokenId || 'Token'}
                    </a>
                  ) : (
                    <span style={{ color: '#64748b', fontFamily: 'var(--font-mono, monospace)' }}>
                      Issued: {new Date(cred.issuedAt).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  <a
                    href={cred.pdfDownloadUrl}
                    download
                    style={{ color: '#34d399', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
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

      {/* ── 5. Telemetry API Access Panel (Shown only post-badge / active key) ─ */}
      {telemetryApi && telemetryApi.isEnabled && (
        <section className="shared-dash-glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 600, color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '0.4rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399' }} />
                <span>Statutory Machine-to-Machine Ingestion</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Live Telemetry API Key</h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                Automated ingestion key for continuous Scope 1 & 2 SCADA, sub-meter, and workforce data feeds.
              </p>
            </div>
            <Link
              to={telemetryApi.docsUrl}
              style={{ fontSize: '0.78rem', fontWeight: 600, color: '#34d399', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>View OpenAPI Docs</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>

          <div className="shared-dash-telemetry-box">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Production API Key</span>
              <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9rem', color: '#6ee7b7', userSelect: 'all' }}>
                {telemetryApi.maskedApiKey || 'ghg_live_••••••••'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono, monospace)' }}>
                {telemetryApi.telemetryCount} Logs Recorded
              </span>
              <button
                onClick={() => handleCopyKey(telemetryApi.maskedApiKey || '')}
                style={{ padding: '0.45rem 0.95rem', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '8px', color: '#ffffff', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease' }}
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
