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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
          backgroundColor: '#0f172a',
          borderLeft: '1px solid var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.5)',
          overflowY: 'auto',
          padding: '1.5rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              ISO Clause 10.2 Non-Conformance Tracker
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Root-Cause Remediation & Export Lock Release
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {events.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontWeight: 700 }}>Zero Active Non-Conformance Incidents</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              All telemetry metrics are within calibrated ISO 50001/14001 baseline models. Transparency exports are active.
            </div>
          </div>
        ) : (
          <div>
            {/* Event Selector List */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {events.map((evt) => (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => {
                    setSelectedEventId(evt.id);
                    setError(null);
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: (activeEvent?.id === evt.id) ? 'var(--accent-primary)' : '#1e293b',
                    color: '#ffffff',
                    border: '1px solid var(--border-medium)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {evt.assetTag} ({evt.percentageVariance}%)
                </button>
              ))}
            </div>

            {activeEvent && (
              <div style={{ backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>
                    {activeEvent.isoClause}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: activeEvent.conformanceGrade.includes('MAJOR') ? '#ef4444' : '#f59e0b',
                      color: '#ffffff',
                    }}
                  >
                    {activeEvent.conformanceGrade}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', backgroundColor: '#0f172a', padding: '0.75rem', borderRadius: '4px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline Value</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{activeEvent.baselineValue}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>Observed Shift</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>
                      {activeEvent.observedValue} (+{activeEvent.percentageVariance}%)
                    </div>
                  </div>
                </div>

                {activeEvent.isResolved ? (
                  <div style={{ borderTop: '1px solid var(--border-medium)', paddingTop: '1rem' }}>
                    <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.875rem' }}>
                      ✅ Incident Resolved & Closed
                    </div>
                    <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                      <strong>Root Cause:</strong> {activeEvent.rootCauseAnalysis}
                    </div>
                    <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                      <strong>Corrective Action:</strong> {activeEvent.correctiveAction}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Verified by: {activeEvent.signOffSupervisor} on {activeEvent.resolvedAt ? new Date(activeEvent.resolvedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleResolve}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8125rem', color: '#ffffff' }}>
                        Root Cause Analysis (ISO 14001 Clause 10.2.a)
                      </label>
                      <textarea
                        rows={3}
                        value={rootCause}
                        onChange={(e) => setRootCause(e.target.value)}
                        placeholder="Detail mechanical, electrical, or operational reason for the >15% variance..."
                        className="form-input"
                        style={{ backgroundColor: '#0f172a', fontSize: '0.8125rem' }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8125rem', color: '#ffffff' }}>
                        Mandatory Corrective Action Plan (ISO 14001 Clause 10.2.b)
                      </label>
                      <textarea
                        rows={3}
                        value={correctiveAction}
                        onChange={(e) => setCorrectiveAction(e.target.value)}
                        placeholder="Detail immediate containment and long-term preventive action..."
                        className="form-input"
                        style={{ backgroundColor: '#0f172a', fontSize: '0.8125rem' }}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.625rem' }}
                    >
                      {submitting ? 'Verifying & Signing Off...' : 'Sign Off & Release Export Lock'}
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
