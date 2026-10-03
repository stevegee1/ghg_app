import React from 'react';
import { StatusBadge } from '../StatusBadge';

interface PortalTransactionsViewProps {
  filteredTransactions: any[];
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

export const PortalTransactionsView: React.FC<PortalTransactionsViewProps> = ({
  filteredTransactions,
  loading,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <div className="persefoni-card portal-card-pad">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            Transaction History &amp; 15% ESG Splits
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Immutable settlement history with SHA-256 data watermarks
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'SETTLED', 'PENDING'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === s ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                backgroundColor: statusFilter === s ? 'var(--accent-light)' : 'var(--bg-card)',
                color: statusFilter === s ? 'var(--color-sky)' : 'var(--text-muted)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="dash-loading-state">
          <span className="dash-spinner" />
          Loading transactions...
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state-title">No Transactions Found</div>
          <div className="dash-empty-state-desc">
            No settlement records match filter: <strong>{statusFilter}</strong>
          </div>
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
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx: any) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>
                    {tx.id.substring(0, 16)}...
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
  );
};
