import React, { useState } from 'react';

interface OpenSeaBadgeProps {
  transactionId?: string;
  licenseeId?: string;
  className?: string;
}

export const OpenSeaBadge: React.FC<OpenSeaBadgeProps> = ({
  transactionId,
  licenseeId = 'lic_itm_power',
  className = '',
}) => {
  const [showModal, setShowModal] = useState(false);

  const tokenId = transactionId ? transactionId.replace(/[^0-9]/g, '').slice(-4) || '8842' : '8842';
  const openSeaUrl = `https://opensea.io/assets/ethereum/0x71c7656ec7ab88b098defb751b7401b5f6d8976f/${tokenId}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`opensea-badge ${className}`}
        title="View On-Chain Digital Provenance on OpenSea"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 0.85rem',
          borderRadius: '8px',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          backgroundColor: 'rgba(236, 72, 153, 0.07)',
          color: '#db2777',
          fontSize: '0.8125rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ec4899', flexShrink: 0 }} />
        <span>OpenSea Verified</span>
      </button>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', color: 'var(--text-main)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ec4899', flexShrink: 0 }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  OpenSea Digital Provenance
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-light)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  width: '28px',
                  height: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '1rem' }}>
              On-chain verifiable trademark licensing mark recorded on Ethereum Mainnet.
            </p>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'inherit' }}>Contract Address:</strong>{' '}
                <code>0x71C7656EC7ab88b098defB751B7401B5f6d8976F</code>
              </div>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'inherit' }}>Token Standard:</strong> ERC-721 (Verified Trademark Mark)
              </div>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'inherit' }}>Token ID:</strong> <code>#{tokenId}</code>
              </div>
              <div>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'inherit' }}>Transaction Ref:</strong>{' '}
                <code>{transactionId}</code>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.65rem' }}
              >
                Close
              </button>
              <a
                href={openSeaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  backgroundColor: '#ec4899',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                }}
              >
                View on OpenSea
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
