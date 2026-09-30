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
        background: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#dc2626' }}>
            System Export Lock Active (HTTP 423 Resource Locked)
          </div>
          <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '0.1rem', lineHeight: 1.45 }}>
            {unresolvedCount} baseline anomaly event{unresolvedCount !== 1 ? 's' : ''} exceed the 15% threshold. Public transparency exports are restricted until supervisor root-cause resolution under ISO Clause 10.2.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenRemediation}
        style={{
          background: '#dc2626',
          color: '#ffffff',
          fontWeight: 700,
          padding: '0.5rem 1.1rem',
          fontSize: '0.82rem',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s ease',
          flexShrink: 0,
        }}
      >
        Resolve Non-Conformance
      </button>
    </div>
  );
};
