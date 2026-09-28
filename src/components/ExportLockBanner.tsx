import React from 'react';

interface ExportLockBannerProps {
  unresolvedCount: number;
  onOpenRemediation: () => void;
}

export const ExportLockBanner: React.FC<ExportLockBannerProps> = ({
  unresolvedCount,
  onOpenRemediation,
}) => {
  if (unresolvedCount <= 0) return null;

  return (
    <div
      style={{
        backgroundColor: '#7f1d1d',
        border: '1px solid #ef4444',
        borderRadius: 'var(--radius-sm)',
        padding: '0.875rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#fef2f2',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fef2f2' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
            System Export Lock Active (HTTP 423 Resource Locked)
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#fca5a5', marginTop: '0.15rem' }}>
            {unresolvedCount} baseline anomaly event(s) exceed the 15% threshold. Public transparency exports are restricted until supervisor root-cause resolution under ISO Clause 10.2.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenRemediation}
        className="btn"
        style={{
          backgroundColor: '#ef4444',
          color: '#ffffff',
          fontWeight: 700,
          padding: '0.5rem 1rem',
          fontSize: '0.8125rem',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        Resolve Non-Conformance
      </button>
    </div>
  );
};
