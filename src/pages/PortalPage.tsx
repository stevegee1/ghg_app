import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { OpenSeaBadge } from '../components/OpenSeaBadge';

export const PortalPage: React.FC = () => {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [sumRes, txRes] = await Promise.all([
          api.getPortalSummary(token),
          api.getPortalTransactions(token),
        ]);
        if (isMounted) {
          setSummary(sumRes);
          setTransactions(txRes.transactions || []);
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

  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Partner Compliance Ledger</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Scoped Licensee ID: <code style={{ fontWeight: 600 }}>{user?.licenseeId || 'ALL (ADMIN)'}</code>
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary Cards */}
      <div className="stats-grid">
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

      {/* Transactions Table Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
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
                          View Certificate 📜
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
  );
};
