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
  onNavigateWorkflow?: (type: 'CARBON' | 'JOB', draftId?: string | null) => void;
}

export const SharedDashboardShell: React.FC<SharedDashboardShellProps> = ({
  initialData,
  targetLicenseeId,
  isAdminViewing = false,
  onNavigateWorkflow,
}) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<ClientDashboardData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
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
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load profile dashboard (${res.status})`);
        }

        const json = await res.json();
        if (isMounted) {
          setData(json.dashboard);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error loading dashboard');
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
      <div className="flex items-center justify-center min-h-[500px] w-full bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading Enterprise Client Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-950/30 border border-rose-800/50 rounded-2xl text-center max-w-xl mx-auto my-12">
        <div className="inline-flex p-3 bg-rose-900/40 rounded-full text-rose-400 mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Unable to Load Dashboard</h3>
        <p className="text-sm text-rose-300/80 mb-6">{error || 'Unknown error occurred while fetching dashboard data.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { profile, auditCards, recentActivity, credentials, telemetryApi } = data;

  return (
    <div className="w-full space-y-8 text-slate-100 antialiased">
      {/* Admin Inspection Banner (if applicable) */}
      {isAdminViewing && (
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium">
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Administrator Inspection Mode: Viewing <strong>{profile.organizationName}</strong> in read-only tenant view.
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-amber-400/20 rounded border border-amber-400/30">
            Read Only
          </span>
        </div>
      )}

      {/* ── 1. Profile Header & Role Badges ───────────────────────────────────── */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4 sm:space-x-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl sm:text-2xl shadow-inner shrink-0">
              {profile.organizationName.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {profile.organizationName}
                </h1>
                {/* Multi-role badge chips: Show all that apply */}
                <div className="flex flex-wrap items-center gap-1.5 ml-1">
                  {profile.accountRoles.map((role) => {
                    if (role === 'AUDIT_CLIENT') {
                      return (
                        <span
                          key={role}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        >
                          Audit Client
                        </span>
                      );
                    }
                    if (role === 'CHARITY_PARTNER') {
                      return (
                        <span
                          key={role}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        >
                          Charity Partner
                        </span>
                      );
                    }
                    if (role === 'MERCH_BUYER') {
                      return (
                        <span
                          key={role}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                        >
                          Merch Buyer
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-mono">
                {profile.email} &bull; ID: {profile.userId.slice(0, 10)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Link
              to="/portal?tab=evidence"
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Evidence Locker
            </Link>
            <Link
              to="/portal?tab=credentials"
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-lg shadow-emerald-900/30"
            >
              View Credentials
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Top Action Cards for Audit Clients (Screen 1) ─────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Carbon Emission Audit Card */}
        <div className="bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 sm:p-7 backdrop-blur transition-all duration-200 flex flex-col justify-between space-y-6 group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>ISO 14064-1 &bull; ISO 50001 &bull; GHG Protocol</span>
              </div>
              {auditCards.carbon.latestDraftId && (
                <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  Draft in Progress
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                Carbon Emission Audit
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mt-1">
                Corporate greenhouse gas inventories, Scope 1-3 assurance, and energy management audit-readiness assessment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-800/80">
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{auditCards.carbon.activeSubmissions}</div>
              <div className="text-xs text-slate-400 font-medium">Active Submissions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">{auditCards.carbon.approvedBadges}</div>
              <div className="text-xs text-slate-400 font-medium">Approved Badges</div>
            </div>
          </div>

          <button
            onClick={() => handleStartWorkflow('CARBON', auditCards.carbon.latestDraftId)}
            className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950/50"
          >
            <span>{auditCards.carbon.latestDraftId ? 'Resume Carbon Draft' : 'Start New Carbon Audit'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Job Reporting Audit Card */}
        <div className="bg-slate-900/70 border border-slate-800 hover:border-teal-500/40 rounded-2xl p-6 sm:p-7 backdrop-blur transition-all duration-200 flex flex-col justify-between space-y-6 group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 text-xs font-semibold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>UK Section 106 &bull; Social Value PPN 06/20</span>
              </div>
              {auditCards.job.latestDraftId && (
                <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  Draft in Progress
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors">
                Job Reporting Audit
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mt-1">
                Local resident workforce, apprentice density quotas, and Section 106 statutory social value compliance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-800/80">
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">{auditCards.job.activeSubmissions}</div>
              <div className="text-xs text-slate-400 font-medium">Active Submissions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-400 tracking-tight">{auditCards.job.approvedBadges}</div>
              <div className="text-xs text-slate-400 font-medium">Approved Badges</div>
            </div>
          </div>

          <button
            onClick={() => handleStartWorkflow('JOB', auditCards.job.latestDraftId)}
            className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md shadow-teal-950/50"
          >
            <span>{auditCards.job.latestDraftId ? 'Resume Job Draft' : 'Start New Job Audit'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── 3. Recent Activity & Unified Reverse-Chronological Transactions Feed ─ */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Recent Activity & Ledger Feed</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reverse-chronological record of workflow milestones, payments, payouts, and in-progress drafts.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {recentActivity.length} Recent Records
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <p className="text-sm text-slate-400 font-medium">No recent transactions or activity recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">Start a compliance assessment or order merch to populate your ledger feed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {recentActivity.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-400 font-mono text-xs">
                      {new Date(item.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {item.type === 'WORKFLOW_SUBMISSION' && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Workflow
                        </span>
                      )}
                      {item.type === 'PAYMENT' && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          Payment
                        </span>
                      )}
                      {item.type === 'CHARITY_PAYOUT' && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          ESG Payout
                        </span>
                      )}
                      {item.type === 'MERCH_ORDER' && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          Merch
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-200">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {typeof item.amountCents === 'number'
                        ? `£${(item.amountCents / 100).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {item.isDraftOrPending ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
                          Draft / Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <Link
                        to={item.link}
                        className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold underline underline-offset-4"
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
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Credentials & Proofs Locker</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Issued assurance badges, ERC-1155 on-chain tokens, and statutory partnership certificates.
            </p>
          </div>
          <Link
            to="/portal?tab=credentials"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            Open Credential Studio &rarr;
          </Link>
        </div>

        {credentials.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <p className="text-sm text-slate-400 font-medium">No verified credentials issued yet.</p>
            <p className="text-xs text-slate-500 mt-1">Complete an ISO audit or Section 106 review to generate a digital badge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {cred.type === 'AUDIT_BADGE' ? 'Assurance Badge' : 'Statutory Partnership'}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {cred.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-white text-sm line-clamp-1">{cred.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{cred.frameworkOrScope}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  {cred.openSeaUrl ? (
                    <a
                      href={cred.openSeaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 underline font-mono text-[11px]"
                    >
                      Polygon PoS #{cred.tokenId || 'Token'}
                    </a>
                  ) : (
                    <span className="text-slate-500 font-mono text-[11px]">
                      Issued: {new Date(cred.issuedAt).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  <a
                    href={cred.pdfDownloadUrl}
                    download
                    className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium"
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
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Statutory Machine-to-Machine Ingestion</span>
              </div>
              <h3 className="text-lg font-bold text-white">Live Telemetry API Key</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated ingestion key for continuous Scope 1 & 2 SCADA, sub-meter, and workforce data feeds.
              </p>
            </div>
            <Link
              to={telemetryApi.docsUrl}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 shrink-0"
            >
              <span>View OpenAPI Docs</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Production API Key</span>
              <div className="font-mono text-sm text-emerald-300 select-all">
                {telemetryApi.maskedApiKey || 'ghg_live_••••••••'}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-mono">
                {telemetryApi.telemetryCount} Telemetry Logs Recorded
              </span>
              <button
                onClick={() => handleCopyKey(telemetryApi.maskedApiKey || '')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
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
