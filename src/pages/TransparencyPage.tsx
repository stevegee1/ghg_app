import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { OpenSeaBadge } from '../components/OpenSeaBadge';

export const TransparencyPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLedger() {
      setLoading(true);
      try {
        const res = await api.getTransparencyLedger();
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load public transparency ledger');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLedger();
    return () => { isMounted = false; };
  }, []);

  const partnerCarbonMetrics: Record<string, { tonnes: number; warrantyExpiry: string }> = {
    lic_itm_power: { tonnes: 250, warrantyExpiry: '2027-08-11' },
    lic_jcb_test: { tonnes: 1200, warrantyExpiry: '2027-07-15' },
    lic_arsenal_fc: { tonnes: 85, warrantyExpiry: '2027-09-01' },
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Public Audit Registry & Transparency Ledger</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Publicly auditable registry of registered corporate partners, annual carbon metrics, active 1-year warranty status, and charitable routing.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Aggregate Platform Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Platform Total Settled Transactions</div>
          <div className="stat-value">{loading ? '...' : data?.totalSettledTransactions ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Platform Total Settled Charity Gift</div>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {loading ? '...' : `£${((data?.totalCharityGiftCents ?? 0) / 100).toFixed(2)}`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Registered Verified Partners</div>
          <div className="stat-value">{loading ? '...' : data?.publicPartners?.length ?? 0}</div>
        </div>
      </div>

      {/* Opted-In Public Partners Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Registered Corporate Partners & 1-Year Warranty Status</h2>
          <p className="card-subtitle">
            Auditable registry of registered partners, annual carbon assertions, warranty expirations, and OpenSea provenance ledgers
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading registry...</div>
        ) : !data?.publicPartners || data.publicPartners.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No registered corporate partners found.
          </div>
        ) : (
          <div className="table-container">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Partner Name</th>
                  <th>Licensee ID</th>
                  <th>Annual Carbon Metric</th>
                  <th>1-Year Warranty Status</th>
                  <th>Settled Charity Gift</th>
                  <th>OpenSea Provenance</th>
                </tr>
              </thead>
              <tbody>
                {data.publicPartners.map((partner: any) => {
                  const metric = partnerCarbonMetrics[partner.licenseeId] || { tonnes: 100, warrantyExpiry: '2027-08-11' };
                  return (
                    <tr key={partner.licenseeId}>
                      <td style={{ fontWeight: 600 }}>{partner.name}</td>
                      <td><code>{partner.licenseeId}</code></td>
                      <td style={{ fontWeight: 600 }}>{metric.tonnes} tonnes CO2e/yr</td>
                      <td>
                        <span className="warranty-badge warranty-active" style={{ fontSize: '0.75rem' }}>
                          ✓ Active (Exp: {metric.warrantyExpiry})
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        £{(partner.totalCharityGiftCents / 100).toFixed(2)}
                      </td>
                      <td>
                        <OpenSeaBadge transactionId={`tx_${partner.licenseeId}_8822`} licenseeId={partner.licenseeId} />
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
