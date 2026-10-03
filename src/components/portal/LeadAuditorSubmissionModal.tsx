import React from 'react';
import { createPortal } from 'react-dom';

interface LeadAuditorSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string | null;
  answeredQuestions: number;
  totalQuestions: number;
  estimatedComplianceScore: number;
  userEmail?: string;
  onExportDossierJson: () => void;
  onViewConformanceStatus: () => void;
}

export const LeadAuditorSubmissionModal: React.FC<LeadAuditorSubmissionModalProps> = ({
  isOpen,
  onClose,
  submissionId,
  answeredQuestions,
  totalQuestions,
  estimatedComplianceScore,
  userEmail,
  onExportDossierJson,
  onViewConformanceStatus,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="lead-auditor-status-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="persefoni-card"
        style={{
          maxWidth: '640px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid var(--border-light)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(2, 132, 199, 0.06) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-green, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '1.3rem',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Submitted: Awaiting Review
              </h3>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>Dossier Reference:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: 'var(--color-sky-dark, #0369a1)',
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  GHG-SUB-{(submissionId || '').slice(0, 8).toUpperCase() || 'PENDING'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.35rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1,
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.75rem' }}>
          {/* Review SLA Badge */}
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span
              className="radar-pulse"
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--google-amber, #f59e0b)',
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.4 }}>
              <strong>Lead Auditor Verification Active:</strong> Assigned to UK-01 Audit Queue. Target Conformance Determination SLA: <strong>24 to 48 Hours</strong> under ISO 19011:2026.
            </div>
          </div>

          {/* Key Diagnostic Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                ATTESTED CLAUSES
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {answeredQuestions} / {totalQuestions}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-green, #10b981)', fontWeight: 600, marginTop: '0.2rem' }}>
                100% Completed
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                CONFORMANCE SCORE
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: estimatedComplianceScore >= 80 ? 'var(--color-green, #10b981)' : 'var(--google-amber, #f59e0b)', marginTop: '0.2rem' }}>
                {estimatedComplianceScore}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                ISO 19011 Benchmark
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                COMMERCIAL GATE 1
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--google-amber, #f59e0b)', marginTop: '0.2rem' }}>
                Locked
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Awaiting Auditor Pass
              </div>
            </div>
          </div>

          {/* Conformance Verification Progression Roadmap */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              padding: '1.15rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Statutory Audit Workflow (ISO 14064-1 and UK CMA Code)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--color-green, #10b981)', color: '#fff', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Step 1: Client Diagnostic and Statutory Attestation
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    All 5 pillars, organizational boundaries, and primary utility sensor responses recorded.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--google-amber, #f59e0b)', color: '#fff', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>
                    Step 2: Lead Auditor Conformance Verification (Current Step)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Independent auditor verifies primary meter evidence and consolidation consistency under ISO 19011:2026.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--border-light, #cbd5e1)', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Step 3: Gate 1 Commercial Clearance and Stripe Checkout
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Unlocks automatically when Lead Auditor issues sign-off. Enables official credential issuance.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informational Statutory Note */}
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
            }}
          >
            Under UK CMA Green Claims and ISO 14064-1 statutory rules, unverified self-assessments cannot proceed directly to commercial certification. You will receive an automated notification at <strong>{userEmail || 'your account email'}</strong> once the Lead Auditor renders a determination.
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1.15rem 1.75rem',
            backgroundColor: 'var(--bg-subtle, #f8fafc)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={onExportDossierJson}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            <span>Export Dossier JSON</span>
          </button>

          <button
            type="button"
            onClick={onViewConformanceStatus}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', fontWeight: 700 }}
          >
            View Conformance Status in Portal
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
