import React, { useState } from 'react';

export interface NonConformanceItem {
  id: string;
  assetTag: string;
  metricName: string;
  baselineValue: number;
  observedValue: number;
  percentageVariance: number;
  conformanceGrade: string;
  isoClause: string;
  isResolved: boolean;
  rootCauseAnalysis?: string | null;
  correctiveAction?: string | null;
  signOffSupervisor?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

interface NonConformanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: NonConformanceItem[];
  onResolveEvent: (id: string, rootCause: string, correctiveAction: string) => Promise<void>;
}

export const NonConformanceDrawer: React.FC<NonConformanceDrawerProps> = ({
  isOpen,
  onClose,
  events,
  onResolveEvent,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [rootCause, setRootCause] = useState<string>('');
  const [correctiveAction, setCorrectiveAction] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;

    if (!rootCause.trim() || !correctiveAction.trim()) {
      setError('Both Root Cause Analysis and Corrective Action plan are mandatory under ISO Clause 10.2.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onResolveEvent(activeEvent.id, rootCause, correctiveAction);
      setRootCause('');
      setCorrectiveAction('');
      setSelectedEventId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve non-conformance event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
          overflowY: 'auto',
          padding: '1.5rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              ISO Clause 10.2 — Non-Conformance Tracker
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0.2rem 0 0 0' }}>
              Root-Cause Remediation &amp; Export Lock Release
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-light)',
              color: 'var(--text-light)',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {events.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Zero Active Non-Conformance Incidents</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.35rem', maxWidth: '320px', margin: '0.35rem auto 0' }}>
              All telemetry metrics are within calibrated ISO 50001/14001 baseline models. Transparency exports are active.
            </div>
          </div>
        ) : (
          <div>
            {/* Event Selector Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {events.map((evt) => {
                const isActive = activeEvent?.id === evt.id;
                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => { setSelectedEventId(evt.id); setError(null); }}
                    style={{
                      padding: '0.45rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: isActive ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {evt.assetTag} ({evt.percentageVariance}%)
                  </button>
                );
              })}
            </div>

            {activeEvent && (
              <div style={{
                background: 'var(--bg-subtle)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
              }}>
                {/* Clause & Grade */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {activeEvent.isoClause}
                  </span>
                  <span style={{
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: activeEvent.conformanceGrade.includes('MAJOR') ? '#fee2e2' : '#fffbeb',
                    color: activeEvent.conformanceGrade.includes('MAJOR') ? '#dc2626' : '#b45309',
                    border: activeEvent.conformanceGrade.includes('MAJOR') ? '1px solid #fca5a5' : '1px solid #fde68a',
                  }}>
                    {activeEvent.conformanceGrade}
                  </span>
                </div>

                {/* Metrics */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                  marginBottom: '1rem',
                  background: 'var(--bg-card)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginBottom: '0.15rem' }}>Baseline Value</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{activeEvent.baselineValue}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#dc2626', marginBottom: '0.15rem' }}>Observed Shift</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
                      {activeEvent.observedValue} (+{activeEvent.percentageVariance}%)
                    </div>
                  </div>
                </div>

                {activeEvent.isResolved ? (
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Incident Resolved
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <strong>Root Cause:</strong> {activeEvent.rootCauseAnalysis}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <strong>Corrective Action:</strong> {activeEvent.correctiveAction}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.4rem' }}>
                      Verified by: {activeEvent.signOffSupervisor} on {activeEvent.resolvedAt ? new Date(activeEvent.resolvedAt).toLocaleDateString('en-GB') : ''}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleResolve}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        Root Cause Analysis (ISO 14001 Clause 10.2.a)
                      </label>
                      <textarea
                        rows={3}
                        value={rootCause}
                        onChange={(e) => setRootCause(e.target.value)}
                        placeholder="Detail mechanical, electrical, or operational reason for the variance..."
                        className="form-input"
                        style={{ fontSize: '0.8125rem' }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        Corrective Action Plan (ISO 14001 Clause 10.2.b)
                      </label>
                      <textarea
                        rows={3}
                        value={correctiveAction}
                        onChange={(e) => setCorrectiveAction(e.target.value)}
                        placeholder="Detail immediate containment and long-term preventive action..."
                        className="form-input"
                        style={{ fontSize: '0.8125rem' }}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.625rem' }}
                    >
                      {submitting ? 'Verifying...' : 'Sign Off & Release Export Lock'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
