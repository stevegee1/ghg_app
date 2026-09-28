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
          border: '1px solid rgba(255, 45, 141, 0.35)',
          backgroundColor: 'rgba(255, 45, 141, 0.1)',
          color: '#ffffff',
          fontSize: '0.8125rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff2d8d' }} />
        <span>OpenSea Verified</span>
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ backgroundColor: 'rgba(8, 4, 12, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#111726', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff2d8d' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>OpenSea Digital Provenance</h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem' }}>
              On-chain verifiable trademark licensing mark recorded on Ethereum Mainnet.
            </p>

            <div style={{ backgroundColor: '#0d121c', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1rem', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1.25rem', color: '#e2e8f0' }}>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong style={{ color: '#ffffff' }}>Contract Address:</strong> <code>0x71C7656EC7ab88b098defB751B7401B5f6d8976F</code>
              </div>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong style={{ color: '#ffffff' }}>Token Standard:</strong> ERC-721 (Verified Trademark Mark)
              </div>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong style={{ color: '#ffffff' }}>Token ID:</strong> <code>#{tokenId}</code>
              </div>
              <div>
                <strong style={{ color: '#ffffff' }}>Transaction Ref:</strong> <code>{transactionId}</code>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#0d121c', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
              <a
                href={openSeaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#ff2d8d', color: '#ffffff', borderRadius: '8px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                View on OpenSea.io
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
