import React, { useState } from 'react';

interface OpenSeaBadgeProps {
  transactionId: string;
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
      >
        <span style={{ fontSize: '0.875rem' }}>⛵</span>
        <span>OpenSea Verified</span>
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⛵</span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>OpenSea Digital Provenance</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-logout" style={{ fontSize: '1rem' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              On-chain verifiable trademark licensing mark recorded on Ethereum Mainnet.
            </p>

            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong>Contract Address:</strong> <code>0x71C7656EC7ab88b098defB751B7401B5f6d8976F</code>
              </div>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong>Token Standard:</strong> ERC-721 (Verified Trademark Mark)
              </div>
              <div style={{ marginBottom: '0.375rem' }}>
                <strong>Token ID:</strong> <code>#{tokenId}</code>
              </div>
              <div>
                <strong>Transaction Ref:</strong> <code>{transactionId}</code>
              </div>
            </div>

            <div className="disclaimer-box" style={{ margin: '1rem 0', padding: '0.75rem 1rem' }}>
              <div className="disclaimer-title" style={{ fontSize: '0.75rem' }}>Standing Legal Disclaimer</div>
              <div className="disclaimer-text" style={{ fontSize: '0.8125rem' }}>
                Figures reflect settled licensing transactions and charitable routing only. Partner environmental claims are not independently verified by this platform.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Close
              </button>
              <a
                href={openSeaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-opensea"
                style={{ flex: 1, textDecoration: 'none' }}
              >
                View on OpenSea.io ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
