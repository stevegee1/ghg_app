import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { OpenSeaBadge } from '../components/OpenSeaBadge';

export const PortalPage: React.FC = () => {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [jobReports, setJobReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state for submitting job reports
  const [showJobModal, setShowJobModal] = useState<boolean>(false);
  const [periodType, setPeriodType] = useState<string>('QUARTERLY');
  const [periodStart, setPeriodStart] = useState<string>('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState<string>('2026-03-31');
  const [jobsCreatedInput, setJobsCreatedInput] = useState<string>('50');
  const [customNoteInput, setCustomNoteInput] = useState<string>('');
  const [submittingJob, setSubmittingJob] = useState<boolean>(false);
  const [jobFormError, setJobFormError] = useState<string | null>(null);

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

  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Partner Compliance Ledger</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Scoped Licensee ID: <code style={{ fontWeight: 600 }}>{user?.licenseeId || 'ALL (ADMIN)'}</code>
          </p>
        </div>

        <button
          onClick={() => setShowJobModal(true)}
          className="btn btn-primary"
          style={{ fontSize: '0.875rem', padding: '0.625rem 1.25rem' }}
        >
          + Submit Job Creation Report
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Settled Transactions</div>
          <div className="stat-value">{loading ? '...' : summary?.totalSettledTransactions ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Settled Gross Volume</div>
          <div className="stat-value">
            {loading ? '...' : `£${((summary?.totalGrossVolumeCents ?? 0) / 100).toFixed(2)}`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Settled Charity Contribution</div>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {loading ? '...' : `£${((summary?.totalCharityGiftCents ?? 0) / 100).toFixed(2)}`}
          </div>
        </div>
      </div>

      {/* Job Creation Reporting Section (M5f) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="card-title">Job Creation Reports</h2>
            <p className="card-subtitle">Self-reported and API-ingested job creation claims for this partner</p>
          </div>
          <button
            onClick={() => setShowJobModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}
          >
            + New Report
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading job creation reports...</div>
        ) : jobReports.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9375rem', fontWeight: 600 }}>No job reports submitted yet</p>
            <button
              onClick={() => setShowJobModal(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}
            >
              Submit Your First Job Creation Report
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Date Range</th>
                  <th>Jobs Created</th>
                  <th>Source</th>
                  <th>Attestation Note</th>
                </tr>
              </thead>
              <tbody>
                {jobReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <span className="badge badge-settled">{report.periodType}</span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(report.periodStart).toLocaleDateString('en-GB')} – {new Date(report.periodEnd).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)' }}>
                      {report.jobsCreated} jobs
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', border: '1px solid var(--border-medium)' }}>
                        {report.reportSource === 'THIRD_PARTY_API' ? 'API Ingestion' : 'Portal Self-Report'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '320px' }}>
                      {report.attestationNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions Table Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="card-title">Transaction History & Financial Splits</h2>
            <p className="card-subtitle">Auditable record of all trademark licensing events and charitable gift routing</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0, fontSize: '0.8125rem' }}>Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ padding: '0.375rem 0.75rem', width: 'auto' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SETTLED">SETTLED</option>
              <option value="PENDING">PENDING</option>
              <option value="REVERSED">REVERSED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transaction ledger...</div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions found for this account matching status filter "{statusFilter}".
          </div>
        ) : (
          <div className="table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date & Time</th>
                  <th>Gross Volume</th>
                  <th>Licensor Royalty</th>
                  <th>Charity Contribution</th>
                  <th>Status</th>
                  <th>OpenSea Provenance</th>
                  <th>Certificate</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const gross = tx.grossAmountCents || 0;
                  const royalty = tx.financialSplit?.licensorRoyaltyCents || 0;
                  const gift = tx.financialSplit?.charityGiftCents || 0;
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600 }}><code>{tx.id}</code></td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {new Date(tx.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td style={{ fontWeight: 600 }}>£{(gross / 100).toFixed(2)}</td>
                      <td>£{(royalty / 100).toFixed(2)}</td>
                      <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>£{(gift / 100).toFixed(2)}</td>
                      <td><StatusBadge status={tx.status} /></td>
                      <td><OpenSeaBadge transactionId={tx.id} licenseeId={user?.licenseeId || 'lic_itm_power'} /></td>
                      <td>
                        <a href={`/certificate/${tx.id}`} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                          View Certificate
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

      {/* Modal for Job Creation Report Submission */}
      {showJobModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Submit Job Creation Report</h3>
              <button
                onClick={() => setShowJobModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {jobFormError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{jobFormError}</div>}

            <form onSubmit={handleJobSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Period Type</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value)}
                  className="form-select"
                >
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="ANNUAL">ANNUAL</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Period Start Date</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Period End Date</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Jobs Created (Non-negative Integer)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={jobsCreatedInput}
                  onChange={(e) => setJobsCreatedInput(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Custom Attestation Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Defaults to 'Self-reported by partner via portal. Not independently verified.'"
                  value={customNoteInput}
                  onChange={(e) => setCustomNoteInput(e.target.value)}
                  className="form-input"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Note: Custom claims of independent verification or audit are strictly prohibited.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingJob}
                  className="btn btn-primary"
                >
                  {submittingJob ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
