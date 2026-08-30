import React, { useState } from 'react';
import { RiskSpeedometer } from './RiskSpeedometer';

export interface AuditWizardRow {
  pillarIndex: number;
  pillarName: string;
  isoClauseLink: string;
  legalMandate: string;
  targetDepartment: string;
  questionText: string;
  objectiveEvidenceTypes: string;
  auditorFindings?: string;
  scorePoints: number;
  complianceGrading: 'CONFORMANT' | 'OPPORTUNITY_FOR_IMPROVEMENT' | 'MINOR_NON_CONFORMANCE' | 'MAJOR_NON_CONFORMANCE_GREENWASHING_RISK';
  weight: number;
  rootCause?: string;
  mandatoryCorrectiveAction?: string;
}

interface AuditMatrixWizardProps {
  facilityType: string;
  initialRows: AuditWizardRow[];
  onSubmitReport: (rows: AuditWizardRow[]) => Promise<void>;
}

export const AuditMatrixWizard: React.FC<AuditMatrixWizardProps> = ({
  facilityType,
  initialRows,
  onSubmitReport,
}) => {
  const [rows, setRows] = useState<AuditWizardRow[]>(initialRows);
  const [activePillarIndex, setActivePillarIndex] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live Score Calculation
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let hasZeroScore = false;

  rows.forEach((r) => {
    if (r.scorePoints === 0) hasZeroScore = true;
    totalWeightedScore += r.scorePoints * r.weight;
    totalWeight += r.weight;
  });

  const currentScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const currentRisk: 'LOW_RISK_CONFORMANT' | 'MEDIUM_RISK_OFI' | 'HIGH_RISK_GREENWASHING_EXPOSURE' =
    hasZeroScore || currentScore < 2.8
      ? 'HIGH_RISK_GREENWASHING_EXPOSURE'
      : currentScore < 4.2
      ? 'MEDIUM_RISK_OFI'
      : 'LOW_RISK_CONFORMANT';

  const activeRow = rows.find((r) => r.pillarIndex === activePillarIndex) || rows[0];

  const handleScoreChange = (score: number) => {
    let grading: AuditWizardRow['complianceGrading'] = 'CONFORMANT';
    if (score === 0) grading = 'MAJOR_NON_CONFORMANCE_GREENWASHING_RISK';
    else if (score <= 2) grading = 'MINOR_NON_CONFORMANCE';
    else if (score <= 4) grading = 'OPPORTUNITY_FOR_IMPROVEMENT';

    setRows(
      rows.map((r) =>
        r.pillarIndex === activePillarIndex
          ? { ...r, scorePoints: score, complianceGrading: grading }
          : r
      )
    );
  };

  const handleFindingsChange = (findings: string) => {
    setRows(
      rows.map((r) =>
        r.pillarIndex === activePillarIndex ? { ...r, auditorFindings: findings } : r
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmitReport(rows);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit audit matrix.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
      {/* Left Column: Interrogation Steps */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--border-medium)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {rows.map((r) => (
            <button
              key={r.pillarIndex}
              type="button"
              onClick={() => setActivePillarIndex(r.pillarIndex)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: r.pillarIndex === activePillarIndex ? 'var(--accent-primary)' : '#0f172a',
                color: '#ffffff',
                border: '1px solid var(--border-medium)',
                whiteSpace: 'nowrap',
              }}
            >
              Pillar {r.pillarIndex} ({r.scorePoints.toFixed(1)})
            </button>
          ))}
        </div>

        {activeRow && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  {activeRow.pillarName}
                </h3>
                <div style={{ fontSize: '0.8125rem', color: '#38bdf8', marginTop: '0.25rem' }}>
                  {activeRow.isoClauseLink}
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', backgroundColor: '#334155', color: '#94a3b8' }}>
                Weight: {(activeRow.weight * 100).toFixed(0)}%
              </span>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Legal Mandate: {activeRow.legalMandate}
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.5 }}>
                {activeRow.questionText}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a7f3d0', marginTop: '0.5rem' }}>
                🔍 Required Evidence: {activeRow.objectiveEvidenceTypes}
              </div>
            </div>

            {/* Score Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8125rem', color: '#ffffff' }}>
                Compliance Grading & Score Points
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {[
                  { label: '5.0 (Conformant)', score: 5.0, color: '#10b981' },
                  { label: '3.5 (Opportunity for Improvement)', score: 3.5, color: '#f59e0b' },
                  { label: '2.0 (Minor Non-Conformance)', score: 2.0, color: '#ea580c' },
                  { label: '0.0 (Greenwashing Risk / Critical)', score: 0.0, color: '#ef4444' },
                ].map((option) => (
                  <button
                    key={option.score}
                    type="button"
                    onClick={() => handleScoreChange(option.score)}
                    style={{
                      padding: '0.625rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: activeRow.scorePoints === option.score ? `2px solid ${option.color}` : '1px solid #334155',
                      backgroundColor: activeRow.scorePoints === option.score ? `${option.color}22` : '#0f172a',
                      color: activeRow.scorePoints === option.score ? option.color : '#94a3b8',
                      textAlign: 'center',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auditor Findings */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.8125rem', color: '#ffffff' }}>
                Auditor Observations & Evidence Verification Findings
              </label>
              <textarea
                rows={3}
                value={activeRow.auditorFindings || ''}
                onChange={(e) => handleFindingsChange(e.target.value)}
                placeholder="Log physical verification notes, certificate hash references, or root-cause citations..."
                className="form-input"
                style={{ backgroundColor: '#0f172a', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                disabled={activePillarIndex <= 1}
                onClick={() => setActivePillarIndex(activePillarIndex - 1)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem' }}
              >
                ← Previous Pillar
              </button>

              {activePillarIndex < rows.length ? (
                <button
                  type="button"
                  onClick={() => setActivePillarIndex(activePillarIndex + 1)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Next Pillar →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8125rem', backgroundColor: '#10b981' }}
                >
                  {isSubmitting ? 'Finalizing Evaluation...' : 'Submit Audit Report & Scorecard'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Dynamic Speedometer & Live Risk Gauge */}
      <div>
        <RiskSpeedometer score={currentScore} riskLevel={currentRisk} />

        <div style={{ backgroundColor: '#1e293b', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginTop: '1rem', border: '1px solid var(--border-medium)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
            Audit Integrity Covenant
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Under ISO 14065 & UK CMA guidelines, a single score of 0.0 across any critical pillar triggers immediate <strong>HIGH_RISK_GREENWASHING_EXPOSURE</strong> and requires supervisor containment.
          </p>
        </div>

        {submitError && (
          <div className="alert alert-error" style={{ marginTop: '1rem', fontSize: '0.8125rem' }}>
            {submitError}
          </div>
        )}
      </div>
    </div>
  );
};
