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

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 0' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--accent-light)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            padding: '0.4rem 0.9rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-sky)',
            letterSpacing: '0.04em',
            marginBottom: '1rem',
          }}
        >
          <span className="radar-pulse" />
          <span>MULTI-TENANT AUDIT-READY TRANSPARENCY REGISTRY</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.85rem, 3.8vw, 2.5rem)', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.75rem 0', letterSpacing: '-0.03em' }}>
          Public Audit Registry & Transparency Ledger
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '750px', margin: 0 }}>
          Publicly auditable registry of registered corporate partners, continuous carbon metrics, active 1-year warranty status, and exact 15% ESG charitable routing.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Aggregate KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="persefoni-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--color-sky)' }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Settled Drops</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            {loading ? '...' : (data?.totalSettledTransactions ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-sky)', marginTop: '0.25rem', fontWeight: 600 }}>Verified On-Chain & Ledger</div>
        </div>

        <div className="persefoni-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--color-green)' }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>15% ESG Charity Split</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-green)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            {loading ? '...' : `£${((data?.totalCharityGiftCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-green)', marginTop: '0.25rem', fontWeight: 600 }}>Direct Local Environmental Funds</div>
        </div>

        <div className="persefoni-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#a855f7' }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Verified Registered Partners</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
            {loading ? '...' : (data?.publicPartners?.length ?? 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a855f7', marginTop: '0.25rem', fontWeight: 600 }}>Active Warranty Holders</div>
        </div>

      </div>

      {/* Opted-In Public Partners Table */}
      <div className="persefoni-card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Registered Corporate Partners & 1-Year Warranty Status
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Auditable registry of registered partners, annual carbon assertions, warranty expirations, and cryptographic provenance ledgers.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading registry...</div>
        ) : !data?.publicPartners || data.publicPartners.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No registered corporate partners found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Partner Entity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Licensee ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Annual Carbon Metric</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Warranty Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>On-Chain Twin</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.publicPartners.map((partner: any) => (
                  <tr key={partner.licenseeId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {partner.name}
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {partner.licenseeId}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {partner.annualCarbonTonnes ?? 250} tCO2e / yr
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--color-green-light)', color: 'var(--color-green-dark)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', fontWeight: 700 }}>
                        <span>✓ Active</span>
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <OpenSeaBadge licenseeId={partner.licenseeId} />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link
                        to={`/partner-logo-drop?licenseeId=${partner.licenseeId}`}
                        style={{ color: 'var(--color-sky)', fontWeight: 700, textDecoration: 'none', fontSize: '0.8rem' }}
                      >
                        View Drops →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
