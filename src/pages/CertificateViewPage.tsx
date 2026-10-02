import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { OpenSeaBadge } from '../components/OpenSeaBadge';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { StatusBadge } from '../components/StatusBadge';

export const CertificateViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchTx() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await api.getPortalTransactions();
        const found = res.transactions?.find((t: any) => t.id === id);
        if (!found) {
          if (isMounted) setError(`Transaction certificate record "${id}" was not found.`);
        } else {
          if (isMounted) setTransaction(found);
        }
      } catch (err: any) {
        if (isMounted) setError('Failed to load transaction certificate details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTx();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Certificate...</div>;
  }

  if (error || !transaction) {
    return <div className="alert alert-error">{error || 'Certificate not found.'}</div>;
  }

  return (
    <div style={{ maxWidth: '680px', margin: '1.5rem auto' }}>
      <div className="card" style={{ borderTop: '4px solid var(--accent-primary)', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-primary)', fontWeight: 700 }}>
              Official Certificate of Trademark Licensing & Royalty Settlement
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>
              GHG Logo Drop Provenance Certificate
            </h1>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Licensee ID: <code>{transaction.licenseeId}</code>
            </div>
          </div>

          <OpenSeaBadge transactionId={transaction.id} licenseeId={transaction.licenseeId} />
        </div>

        <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
          <div className="responsive-grid-2" style={{ gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Transaction Reference</div>
              <div style={{ fontWeight: 700 }}><code>{transaction.id}</code></div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Settlement Status</div>
              <div style={{ marginTop: '0.2rem' }}><StatusBadge status={transaction.status} /></div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Gross Licensing Fee</div>
              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                £{((transaction.grossAmountCents || 0) / 100).toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Settlement Date</div>
              <div>{new Date(transaction.createdAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Financial Split & Verified Charitable Allocation
          </h3>
          <FinancialSplitBar
            grossAmountCents={transaction.grossAmountCents}
            licensorRoyaltyCents={transaction.financialSplit?.licensorRoyaltyCents || 0}
            charityGiftCents={transaction.financialSplit?.charityGiftCents || 0}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <Link to="/transparency" className="btn btn-secondary">
            ← View Public Transparency Registry
          </Link>
          <a
            href={`https://opensea.io/assets/ethereum/0x71c7656ec7ab88b098defb751b7401b5f6d8976f/${transaction.id.slice(-4)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-opensea"
          >
            Open on OpenSea ↗
          </a>
        </div>
      </div>
    </div>
  );
};
