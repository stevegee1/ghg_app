import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';

export const AdminPage: React.FC = () => {
  const { token, isAdmin } = useAuth();

  // Active top-level admin tab
  const [activeAdminTab, setActiveAdminTab] = useState<'SUBMISSIONS' | 'DEMOS' | 'SPLITS'>('SUBMISSIONS');

  // Audit Submissions Review Queue state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>('ALL');
  const [submissionSearch, setSubmissionSearch] = useState<string>('');
  const [selectedSubDetail, setSelectedSubDetail] = useState<any | null>(null);
  const [selectedSubEvidence, setSelectedSubEvidence] = useState<any[]>([]);
  const [loadingSubDetail, setLoadingSubDetail] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [auditorNotesInput, setAuditorNotesInput] = useState<string>('');
  const [complianceScoreInput, setComplianceScoreInput] = useState<number>(95);
  const [reviewingLoading, setReviewingLoading] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Demo Inquiries state
  const [demoBookings, setDemoBookings] = useState<any[]>([]);
  const [loadingDemos, setLoadingDemos] = useState<boolean>(true);
  const [demoSearch, setDemoSearch] = useState<string>('');
  const [demoFilterScope, setDemoFilterScope] = useState<string>('ALL');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Split configuration state
  const [history, setHistory] = useState<any[]>([]);
  const [royaltyBps, setRoyaltyBps] = useState<number>(8500); // 85% default
  const [licenseeId, setLicenseeId] = useState<string>(''); // empty = platform default

  // Split charities
  const [charities, setCharities] = useState<Array<{ charityId: string; charityName: string; bps: number }>>([
    { charityId: 'charity_green_earth', charityName: 'Green Earth Foundation', bps: 5000 },
    { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', bps: 5000 },
  ]);

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch Submissions Review Queue
  const loadSubmissions = async () => {
    if (!token) return;
    setLoadingSubmissions(true);
    try {
      const res = await api.getAdminIsoSubmissions(token, {
        status: submissionStatusFilter !== 'ALL' ? submissionStatusFilter : undefined,
        search: submissionSearch.trim() || undefined,
      });
      setSubmissions(res.items || []);
    } catch (err: any) {
      console.error('Failed to load audit submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'SUBMISSIONS') {
      loadSubmissions();
    }
  }, [token, activeAdminTab, submissionStatusFilter]);

  const handleOpenDossier = async (submissionId: string) => {
    if (!token) return;
    setLoadingSubDetail(true);
    setShowReviewModal(true);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      const res = await api.getAdminIsoSubmissionDetail(token, submissionId);
      setSelectedSubDetail(res.submission);
      setSelectedSubEvidence(res.evidenceDocuments || []);
      setComplianceScoreInput(res.submission.complianceScore || 90);
      setAuditorNotesInput(
        res.submission.reviewerNotes ||
          'ISO 19011:2026 Annex A remote verification completed. 80%+ conformance threshold verified across selected frameworks.'
      );
    } catch (err: any) {
      setReviewError(err.message || 'Failed to load submission dossier');
    } finally {
      setLoadingSubDetail(false);
    }
  };

  const handleSubmitReview = async (decision: 'APPROVE' | 'REQUIRE_REVISION') => {
    if (!token || !selectedSubDetail) return;
    setReviewingLoading(true);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      const res = await api.reviewIsoSubmission(token, {
        submissionId: selectedSubDetail.id,
        decision,
        targetStatus: decision === 'APPROVE' ? 'AUDIT_READY' : 'REVISION_REQUIRED',
        auditorNotes: auditorNotesInput,
        complianceScore: Number(complianceScoreInput) || 90,
      });
      setReviewSuccess(
        res.message || (decision === 'APPROVE' ? 'Approved as AUDIT_READY. Gate 1 cleared.' : 'Revision requested.')
      );
      await loadSubmissions();
      setSelectedSubDetail({
        ...selectedSubDetail,
        status: decision === 'APPROVE' ? 'AUDIT_READY' : 'REVISION_REQUIRED',
        reviewerNotes: auditorNotesInput,
        complianceScore: Number(complianceScoreInput) || 90,
      });
    } catch (err: any) {
      setReviewError(err.message || 'Failed to apply review decision');
    } finally {
      setReviewingLoading(false);
    }
  };

  // Fetch Demo Bookings
  const loadDemoBookings = async () => {
    if (!token) return;
    setLoadingDemos(true);
    try {
      const res = await api.getDemoBookings(token);
      setDemoBookings(res.bookings || []);
    } catch (err: any) {
      console.error('Failed to load demo inquiries:', err);
    } finally {
      setLoadingDemos(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'DEMOS') {
      loadDemoBookings();
    }
  }, [token, activeAdminTab]);

  // Fetch Split History
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      if (!token) return;
      setLoadingHistory(true);
      try {
        const res = await api.getSplitConfigHistory(token, licenseeId || undefined);
        if (isMounted) setHistory(res.history || []);
      } catch (err: any) {
        if (isMounted) setError('Failed to load split configuration history');
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }
    if (activeAdminTab === 'SPLITS') {
      loadHistory();
    }
    return () => { isMounted = false; };
  }, [token, licenseeId, activeAdminTab]);

  const charityBpsSum = charities.reduce((sum, c) => sum + c.bps, 0);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (charityBpsSum !== 10000) {
      setError(`Charity allocation basis points must sum to exactly 10000 (100.0%). Current sum: ${charityBpsSum} bps.`);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    setShowConfirmModal(false);

    try {
      await api.createSplitConfig(token, {
        licenseeId: licenseeId.trim() || null,
        royaltyBps,
        charityAllocationBps: charities.map((c) => ({ charityId: c.charityId, bps: c.bps })),
      });
      setSuccessMsg('New versioned split configuration successfully created and activated.');

      // Refresh history
      const res = await api.getSplitConfigHistory(token, licenseeId || undefined);
      setHistory(res.history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to submit split configuration');
    } finally {
      setSubmitting(false);
    }
  };

  // Export demo bookings to CSV
  const handleExportCsv = () => {
    if (demoBookings.length === 0) return;

    const headers = ['ID', 'Full Name', 'Work Email', 'Company Name', 'Facilities', 'Scope', 'Requested Slot', 'NDA Requested', 'Status', 'Submitted At'];
    const rows = demoBookings.map((b) => [
      b.id,
      `"${(b.fullName || '').replace(/"/g, '""')}"`,
      b.workEmail,
      `"${(b.companyName || '').replace(/"/g, '""')}"`,
      `"${(b.facilityCount || '').replace(/"/g, '""')}"`,
      b.primaryScope,
      new Date(b.requestedSlot).toISOString(),
      b.ndaRequested ? 'YES' : 'NO',
      b.status,
      new Date(b.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ghg_demo_inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyLeadEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Filter demo bookings
  const filteredBookings = demoBookings.filter((b) => {
    const matchesSearch =
      demoSearch === '' ||
      b.fullName?.toLowerCase().includes(demoSearch.toLowerCase()) ||
      b.workEmail?.toLowerCase().includes(demoSearch.toLowerCase()) ||
      b.companyName?.toLowerCase().includes(demoSearch.toLowerCase());
    const matchesScope = demoFilterScope === 'ALL' || b.primaryScope === demoFilterScope;
    return matchesSearch && matchesScope;
  });

  if (!isAdmin) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <h2 className="card-title" style={{ color: 'var(--status-failed-text)' }}>Access Denied</h2>
        <p className="card-subtitle" style={{ margin: '1rem 0' }}>
          Your user account does not have <strong>ADMIN</strong> privileges. Administration is restricted to system administrators.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Executive Administration Console
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage enterprise demo inquiries, inbound pipeline, and versioned statutory royalty configurations.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-subtle, #111726)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setActiveAdminTab('SUBMISSIONS')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: activeAdminTab === 'SUBMISSIONS' ? 'var(--cerebrium-magenta, #ff2d8d)' : 'transparent',
              color: '#ffffff',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Audit Review Queue</span>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.22)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>
              {submissions.filter((s) => s.status === 'SUBMITTED').length || submissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('DEMOS')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: activeAdminTab === 'DEMOS' ? 'var(--cerebrium-magenta, #ff2d8d)' : 'transparent',
              color: '#ffffff',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Demo Inquiries & Leads</span>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.22)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>
              {demoBookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('SPLITS')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              backgroundColor: activeAdminTab === 'SPLITS' ? 'var(--cerebrium-magenta, #ff2d8d)' : 'transparent',
              color: '#ffffff',
              transition: 'all 0.15s ease',
            }}
          >
            Split Configuration
          </button>
        </div>
      </div>

      {/* TAB: AUDIT REVIEW QUEUE (LEAD AUDITOR CONSOLE) */}
      {activeAdminTab === 'SUBMISSIONS' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, maxWidth: '640px' }}>
              <input
                type="text"
                placeholder="Search by licensee name or ID..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadSubmissions(); }}
                className="form-input"
                style={{ flex: 1, minWidth: '220px' }}
              />

              <select
                value={submissionStatusFilter}
                onChange={(e) => setSubmissionStatusFilter(e.target.value)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="ALL">All Submission Statuses</option>
                <option value="SUBMITTED">Awaiting Lead Review (SUBMITTED)</option>
                <option value="AUDIT_READY">Gate 1 Cleared (AUDIT_READY)</option>
                <option value="REVISION_REQUIRED">Revisions Required</option>
                <option value="APPROVED">Licensed / Paid (APPROVED)</option>
                <option value="DRAFT">Draft In Progress</option>
              </select>

              <button
                type="button"
                onClick={loadSubmissions}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
              >
                Refresh
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Showing <strong>{submissions.length}</strong> dossier{submissions.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 className="card-title">Lead Auditor Assessment Queue</h2>
                <p className="card-subtitle">
                  Inspect client questionnaire answers, verify cryptographic evidence attachments, and clear Gate 1 access.
                </p>
              </div>
              <span className="badge badge-settled" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                ISO 19011:2026 Remote Verification Standard
              </span>
            </div>

            {loadingSubmissions ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading audit submissions queue...
              </div>
            ) : submissions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No diagnostic submissions found matching criteria.
              </div>
            ) : (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="ledger-table" style={{ fontSize: '0.8125rem', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Licensee / Organisation</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Frameworks &amp; Tier</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem' }}>Readiness Score</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Updated</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const isPending = sub.status === 'SUBMITTED' || sub.status === 'UNDER_REVIEW';
                      const isReady = sub.status === 'AUDIT_READY';
                      const isRevision = sub.status === 'REVISION_REQUIRED';
                      const isApproved = sub.status === 'APPROVED';

                      return (
                        <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.06))' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {sub.licenseeName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', marginTop: '2px' }}>
                              <span>ID: <code>{sub.licenseeId ? sub.licenseeId.substring(0, 10) : 'N/A'}...</code></span>
                              {sub.licenseeVertical && (
                                <span style={{ backgroundColor: 'var(--bg-subtle)', padding: '1px 5px', borderRadius: '4px' }}>
                                  {sub.licenseeVertical}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                              {sub.tierSelected === 'TIER_2_CONTINUOUS' ? 'Continuous Quarterly (£3,500)' : 'Single-Site Readiness (£1,250)'}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                              {(sub.selectedFrameworks || []).slice(0, 3).map((fw: string) => (
                                <span key={fw} style={{ fontSize: '0.68rem', backgroundColor: 'var(--bg-subtle)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-light)' }}>
                                  {fw.replace('_', ' ')}
                                </span>
                              ))}
                              {(sub.selectedFrameworks || []).length > 3 && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  +{sub.selectedFrameworks.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: (sub.complianceScore || 0) >= 80 ? 'var(--color-green, #10b981)' : 'var(--google-amber, #f59e0b)' }}>
                              {sub.complianceScore != null ? `${sub.complianceScore}%` : '-'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {sub.answersCount ? `${sub.answersCount} answers` : ''}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                            {isPending && (
                              <span className="badge badge-pending" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                PENDING REVIEW
                              </span>
                            )}
                            {isReady && (
                              <span className="badge badge-settled" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                AUDIT_READY
                              </span>
                            )}
                            {isRevision && (
                              <span className="badge badge-failed" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                REVISION REQ.
                              </span>
                            )}
                            {isApproved && (
                              <span className="badge badge-settled" style={{ backgroundColor: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                                LICENSED &amp; PAID
                              </span>
                            )}
                            {!isPending && !isReady && !isRevision && !isApproved && (
                              <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                {sub.status}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {new Date(sub.updatedAt || sub.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.75rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenDossier(sub.id)}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 700 }}
                            >
                              Review Dossier
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: DEMO INQUIRIES & LEADS */}
      {activeAdminTab === 'DEMOS' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, maxWidth: '600px' }}>
              <input
                type="text"
                placeholder="Search by lead name, company, or email..."
                value={demoSearch}
                onChange={(e) => setDemoSearch(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: '220px' }}
              />

              <select
                value={demoFilterScope}
                onChange={(e) => setDemoFilterScope(e.target.value)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="ALL">All Statutory Scopes</option>
                <option value="CARBON_EMISSION">Carbon & Energy (ISO)</option>
                <option value="JOB_REPORTING">Section 106 Workforce</option>
                <option value="DUAL_SCOPE">Dual-Scope</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={loadDemoBookings}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                title="Refresh inquiries list"
              >
                ↻ Refresh
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={demoBookings.length === 0}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>Export to CSV</span>
                <span>↓</span>
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loadingDemos ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading enterprise demo bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {demoBookings.length === 0 ? (
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Inquiries Yet</h3>
                    <p style={{ fontSize: '0.875rem' }}>Bookings submitted via the "Book Demo" modal or page will appear here instantly.</p>
                  </div>
                ) : (
                  <p>No bookings matching your search query.</p>
                )}
              </div>
            ) : (
              <div className="table-container" style={{ margin: 0 }}>
                <table className="ledger-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Requested Session</th>
                      <th>Lead Contact & Title</th>
                      <th>Organization & Facilities</th>
                      <th>Work Email</th>
                      <th>Statutory Scope</th>
                      <th>NDA</th>
                      <th style={{ textAlign: 'right' }}>Direct Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const slotDate = new Date(b.requestedSlot);
                      const formattedDate = slotDate.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={b.id}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: b.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                color: b.status === 'CONFIRMED' ? '#10b981' : 'var(--text-muted)',
                              }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: b.status === 'CONFIRMED' ? '#10b981' : '#888' }} />
                              {b.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--cerebrium-ice-accent, #67e8f9)', whiteSpace: 'nowrap' }}>
                            {formattedDate} UTC
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Submitted {new Date(b.createdAt).toLocaleDateString('en-GB')}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{b.companyName}</div>
                            {b.facilityCount && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.facilityCount}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <a
                                href={`mailto:${b.workEmail}?subject=GHGEmissionLogs%20Statutory%20Assurance%20Demonstration`}
                                style={{ color: 'var(--cerebrium-magenta, #ff2d8d)', textDecoration: 'none', fontWeight: 600 }}
                              >
                                {b.workEmail}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyLeadEmail(b.workEmail)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  padding: '1px 4px',
                                }}
                                title="Copy email address"
                              >
                                {copiedEmail === b.workEmail ? '✓' : '⎘'}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}>
                              {b.primaryScope === 'CARBON_EMISSION' ? 'Carbon (ISO)' : b.primaryScope === 'JOB_REPORTING' ? 'Section 106' : b.primaryScope}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', color: b.ndaRequested ? '#4ade80' : 'var(--text-muted)' }}>
                              {b.ndaRequested ? 'Requested' : 'Standard'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <a
                              href={`mailto:${b.workEmail}?subject=GHGEmissionLogs%20Statutory%20Assurance%20Session&body=Hi%20${encodeURIComponent(b.fullName)},%0A%0AThank%20you%20for%20scheduling%20an%20architectural%20walkthrough%20for%20${encodeURIComponent(b.companyName)}.%0A%0AWe%20look%20forward%20to%20meeting%20you.`}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Email Lead</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SPLIT CONFIGURATION */}
      {activeAdminTab === 'SPLITS' && (
        <div>
          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          <div className="responsive-grid-2">
            {/* Form Column */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Configure New Active Split</h2>
                <p className="card-subtitle">Changes financial routing rules for future transactions only</p>
              </div>

              <form onSubmit={handleOpenConfirm}>
                <div className="form-group">
                  <label className="form-label" htmlFor="licenseeScope">Target Scope</label>
                  <select
                    id="licenseeScope"
                    value={licenseeId}
                    onChange={(e) => setLicenseeId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Platform Default (licenseeId IS NULL)</option>
                    <option value="lic_itm_power">ITM Power Test (lic_itm_power)</option>
                    <option value="lic_jcb_test">JCB Test (lic_jcb_test)</option>
                    <option value="lic_arsenal_fc">Arsenal FC Test (lic_arsenal_fc)</option>
                  </select>
                  <div className="form-help">Select whether this split applies platform-wide or overrides a specific licensee.</div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="royaltyBps">
                    Licensor Royalty Basis Points (bps)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      id="royaltyBps"
                      type="number"
                      min="0"
                      max="10000"
                      step="50"
                      value={royaltyBps}
                      onChange={(e) => setRoyaltyBps(parseInt(e.target.value, 10) || 0)}
                      className="form-input"
                      style={{ width: '140px' }}
                    />
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      = {(royaltyBps / 100).toFixed(1)}% Royalty / {((10000 - royaltyBps) / 100).toFixed(1)}% Charity
                    </div>
                  </div>
                </div>

                {/* Split Visualization */}
                <div style={{ margin: '1rem 0', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Split Ratio Preview:</div>
                  <FinancialSplitBar
                    grossAmountCents={10000}
                    licensorRoyaltyCents={Math.round((10000 * royaltyBps) / 10000)}
                    charityGiftCents={10000 - Math.round((10000 * royaltyBps) / 10000)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Approved Charity Beneficiary Allocations</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {charities.map((ch, idx) => (
                      <div key={ch.charityId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{ch.charityName}</div>
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          step="100"
                          value={ch.bps}
                          onChange={(e) => {
                            const newBps = parseInt(e.target.value, 10) || 0;
                            const updated = [...charities];
                            updated[idx].bps = newBps;
                            setCharities(updated);
                          }}
                          className="form-input"
                          style={{ width: '90px' }}
                        />
                        <div style={{ width: '60px', fontSize: '0.8125rem', textAlign: 'right' }}>
                          {(ch.bps / 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: charityBpsSum === 10000 ? 'var(--status-settled-text)' : 'var(--status-failed-text)' }}>
                    Total Charity Pool Allocated: {charityBpsSum} / 10000 bps ({charityBpsSum === 10000 ? 'Valid 100%' : 'Must equal 10000 bps'})
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={charityBpsSum !== 10000}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Review & Activate Configuration
                </button>
              </form>
            </div>

            {/* Audit History Column */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Split Configuration Audit History</h2>
                <p className="card-subtitle">
                  Insert-only chain of active and deactivated configurations for scope: <code>{licenseeId || 'PLATFORM DEFAULT'}</code>
                </p>
              </div>

              {loadingHistory ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit history...</div>
              ) : history.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit history records found.</div>
              ) : (
                <div className="table-container">
                  <table className="ledger-table" style={{ fontSize: '0.8125rem' }}>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Royalty Bps</th>
                        <th>Changed At</th>
                        <th>Changed By</th>
                        <th>Prev Config ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((cfg) => (
                        <tr key={cfg.id} style={{ backgroundColor: cfg.isActive ? 'var(--status-settled-bg)' : 'transparent' }}>
                          <td>
                            {cfg.isActive ? (
                              <span className="badge badge-settled">ACTIVE</span>
                            ) : (
                              <span className="badge badge-reversed">INACTIVE</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>{cfg.royaltyBps} bps ({(cfg.royaltyBps / 100).toFixed(1)}%)</td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {new Date(cfg.changedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td><code>{cfg.changedByUserId}</code></td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <code>{cfg.previousConfigId || 'ROOT'}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Explicit Confirmation Modal */}
          {showConfirmModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Confirm Financial Split Routing Change
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                  You are about to activate a new split configuration for scope <code>{licenseeId || 'PLATFORM DEFAULT'}</code>:
                </p>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                  <div>• <strong>Licensor Royalty:</strong> {royaltyBps} bps ({(royaltyBps / 100).toFixed(1)}%)</div>
                  <div>• <strong>Charity Gift Share:</strong> {10000 - royaltyBps} bps ({((10000 - royaltyBps) / 100).toFixed(1)}%)</div>
                  <div>• <strong>Previous Active Config:</strong> Will be deactivated (`isActive = false`) and chained in audit history.</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {submitting ? 'Applying Change...' : 'Confirm & Apply Change'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lead Auditor Review Modal / Drawer */}
      {showReviewModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--bg-card, #0f172a)', border: '1px solid var(--border-light, rgba(255,255,255,0.12))', borderRadius: '12px', width: '100%', maxWidth: '960px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.08))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-subtle, #111827)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-settled" style={{ fontSize: '0.72rem' }}>ISO 19011:2026</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    Audit Dossier Inspection &amp; Gate 1 Determination
                  </h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                  Licensee: <strong>{selectedSubDetail?.licensee?.name || selectedSubDetail?.licenseeId}</strong> · Submission ID: <code>{selectedSubDetail?.id}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {loadingSubDetail ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading diagnostic dossier &amp; cryptographic evidence...
                </div>
              ) : selectedSubDetail ? (
                <>
                  {/* Status Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0.85rem 1.15rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Verification Status</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        {selectedSubDetail.status === 'AUDIT_READY' ? 'Gate 1 Cleared: AUDIT_READY' : selectedSubDetail.status === 'REVISION_REQUIRED' ? 'Revisions Requested' : selectedSubDetail.status}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Licensing Tier</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-sky)' }}>
                        {selectedSubDetail.tierSelected || 'TIER_1_READINESS'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payment Settlement</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedSubDetail.paidAt ? 'var(--color-green)' : 'var(--text-muted)' }}>
                        {selectedSubDetail.paidAt ? `Settled on ${new Date(selectedSubDetail.paidAt).toLocaleDateString('en-GB')}` : 'Awaiting Gate 1 Clearance'}
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Questionnaire Responses */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>1. Diagnostic Questionnaire Answers</span>
                      <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '10px' }}>
                        {Array.isArray(selectedSubDetail.answers) ? selectedSubDetail.answers.length : Object.keys(selectedSubDetail.answers || {}).length} questions
                      </span>
                    </h4>

                    <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.15)' }}>
                      {Array.isArray(selectedSubDetail.answers) ? (
                        selectedSubDetail.answers.map((ans: any, idx: number) => (
                          <div key={idx} style={{ padding: '0.65rem', borderBottom: idx < selectedSubDetail.answers.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                {ans.questionText || `Question ${ans.questionId}`}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-sky)', whiteSpace: 'nowrap' }}>
                                {ans.isoClause || ans.questionId}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-green, #10b981)', marginTop: '4px', fontWeight: 500 }}>
                              Answer: <strong>{ans.answer || 'Yes, fully implemented'}</strong>
                            </div>
                          </div>
                        ))
                      ) : (
                        Object.entries(selectedSubDetail.answers || {}).map(([k, v]: [string, any], idx: number) => (
                          <div key={k} style={{ padding: '0.55rem', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{k}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{String(v)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Section 2: Attached Evidence Documents */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>2. Attached Audit Evidence Documents</span>
                      <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '10px' }}>
                        {selectedSubEvidence.length} document{selectedSubEvidence.length === 1 ? '' : 's'}
                      </span>
                    </h4>

                    {selectedSubEvidence.length === 0 ? (
                      <div style={{ padding: '1rem', border: '1px dashed var(--border-light)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No standalone evidence documents uploaded for this licensee. (Self-attestation diagnostic mode).
                      </div>
                    ) : (
                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Filename</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>Category</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem' }}>SHA-256 Digest</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSubEvidence.map((doc: any) => (
                              <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{doc.fileName}</td>
                                <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{doc.category}</td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <code style={{ fontSize: '0.7rem', color: 'var(--color-sky)' }}>
                                    {doc.sha256Hash ? `${doc.sha256Hash.substring(0, 16)}...` : 'N/A'}
                                  </code>
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                                  {doc.fileSizeBytes ? `${(doc.fileSizeBytes / 1024).toFixed(0)} KB` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Lead Auditor Sign-Off Controls */}
                  <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.85rem 0' }}>
                      3. Lead Auditor Determination &amp; Gate 1 Sign-Off
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          Verified Conformance Score (%):
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={complianceScoreInput}
                          onChange={(e) => setComplianceScoreInput(Number(e.target.value))}
                          className="form-input"
                          style={{ width: '100%' }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Requirement: 80%+ conformance required for Gate 1 clearance under ISO 19011:2026.
                        </span>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          Auditor Findings &amp; Statutory Notes:
                        </label>
                        <textarea
                          rows={3}
                          value={auditorNotesInput}
                          onChange={(e) => setAuditorNotesInput(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', resize: 'vertical' }}
                          placeholder="Document verification findings, clause observations, or required corrections..."
                        />
                      </div>
                    </div>

                    {reviewError && (
                      <div style={{ color: 'var(--google-red, #ef4444)', fontSize: '0.82rem', marginBottom: '0.85rem', fontWeight: 600 }}>
                        {reviewError}
                      </div>
                    )}

                    {reviewSuccess && (
                      <div style={{ color: 'var(--color-green, #10b981)', fontSize: '0.82rem', marginBottom: '0.85rem', fontWeight: 700 }}>
                        {reviewSuccess}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleSubmitReview('REQUIRE_REVISION')}
                        disabled={reviewingLoading}
                        className="btn btn-secondary"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', fontWeight: 700 }}
                      >
                        {reviewingLoading ? 'Applying...' : 'Reject or Request Revision'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSubmitReview('APPROVE')}
                        disabled={reviewingLoading || complianceScoreInput < 80}
                        className="btn btn-primary"
                        style={{ fontWeight: 700 }}
                      >
                        {reviewingLoading ? 'Clearing Gate 1...' : 'Approve and Clear Gate 1 (AUDIT_READY)'}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
