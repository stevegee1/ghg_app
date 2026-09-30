import React from 'react';

interface PdfAuditViewerProps {
  reportId: string;
  auditRefId: string;
  licenseeName: string;
  weightedScore: number;
  overallGrade: string;
  greenwashingRiskLevel: string;
  docHash?: string;
  onClose: () => void;
}

export const PdfAuditViewer: React.FC<PdfAuditViewerProps> = ({
  reportId,
  auditRefId,
  licenseeName,
  weightedScore,
  overallGrade,
  greenwashingRiskLevel,
  docHash,
  onClose,
}) => {
  const downloadUrl = `/api/portal/iso/reports/${reportId}/pdf`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Boardroom PDF Audit Report Generator
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', margin: '0.25rem 0 0 0' }}>
              ISO 14001 / 50001 Integrated Audit Log Matrix ({auditRefId})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-light)',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Executive Summary Card */}
        <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Organization</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{licenseeName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weighted Score</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>
                {weightedScore.toFixed(2)} / 5.00
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Status:</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: greenwashingRiskLevel.includes('LOW') ? '#10b981' : '#f59e0b',
              }}
            >
              {greenwashingRiskLevel}
            </span>
          </div>

          {docHash && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              SHA-256 Watermark: {docHash}
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          This signed document embeds the 5-Pillar ISO Questionnaire Matrix, Dual-Impact (Carbon + Jobs) statistics, Section X Master Contract Clause Block, and a verifiable SHA-256 cryptographic watermark for third-party accredited registrars (ISO 14065).
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem', padding: '0.625rem 1.25rem' }}
          >
            Close
          </button>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              fontSize: '0.875rem',
              padding: '0.625rem 1.5rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#10b981',
            }}
          >
            <span>📥</span> Export Boardroom PDF
          </a>
        </div>
      </div>
    </div>
  );
};
