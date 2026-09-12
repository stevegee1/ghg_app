import React, { useState, useEffect, useCallback } from 'react';

export interface AuditQuestion {
  id: string;
  questionId?: string;
  text: string;
  questionText?: string;
  applicableStandards?: string[];
  statutoryMandate?: string;
  evidenceRequired?: string;
  options?: string[];
}

export interface AuditPillar {
  pillarId: string;
  pillarTitle: string;
  description?: string;
  questions: AuditQuestion[];
}

interface InteractiveAuditStepperProps {
  pillars: AuditPillar[];
  answers: Record<string, any>;
  onAnswerChange: (questionId: string, answer: string) => void;
  isAuditReady: boolean;
  onProceedToCheckout?: () => void;
  estimatedScore: number;
}

export const InteractiveAuditStepper: React.FC<InteractiveAuditStepperProps> = ({
  pillars,
  answers,
  onAnswerChange,
  isAuditReady,
  onProceedToCheckout,
  estimatedScore,
}) => {
  const [activePillarIdx, setActivePillarIdx] = useState<number>(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  const currentPillar = pillars[activePillarIdx] || pillars[0];
  const currentQuestions = currentPillar?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];
  const currentQId = currentQuestion ? (currentQuestion.questionId || currentQuestion.id || '') : '';
  const currentSelectedAnswer = answers[currentQId];

  // Navigation handlers with clean, instantaneous state updates
  const goToNext = useCallback(() => {
    if (activeQuestionIdx < currentQuestions.length - 1) {
      setActiveQuestionIdx((prev) => prev + 1);
    } else if (activePillarIdx < pillars.length - 1) {
      setActivePillarIdx((prev) => prev + 1);
      setActiveQuestionIdx(0);
    }
  }, [activeQuestionIdx, activePillarIdx, currentQuestions.length, pillars.length]);

  const goToPrev = useCallback(() => {
    if (activeQuestionIdx > 0) {
      setActiveQuestionIdx((prev) => prev - 1);
    } else if (activePillarIdx > 0) {
      const prevPillarQuestions = pillars[activePillarIdx - 1]?.questions || [];
      setActivePillarIdx((prev) => prev - 1);
      setActiveQuestionIdx(Math.max(0, prevPillarQuestions.length - 1));
    }
  }, [activeQuestionIdx, activePillarIdx, pillars]);

  const defaultOptions = [
    'Fully compliant & documented',
    'Partially implemented',
    'Planned within 90 days',
    'Not applicable',
  ];
  const questionOptions = currentQuestion?.options || defaultOptions;

  // Handle Option Select with 300ms smooth auto-advance
  const handleSelectOption = (opt: string) => {
    onAnswerChange(currentQId, opt);

    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);

    const isLastQuestionInAssessment =
      activePillarIdx === pillars.length - 1 && activeQuestionIdx === currentQuestions.length - 1;

    if (!isLastQuestionInAssessment) {
      const timer = setTimeout(() => {
        goToNext();
      }, 300);
      setAutoAdvanceTimer(timer);
    }
  };

  // Keyboard navigation listener (1-4, A-D, Enter, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && target.getAttribute('type') === 'text'))
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      if (key === 'A' || key === '1') {
        e.preventDefault();
        if (questionOptions[0]) handleSelectOption(questionOptions[0]);
      } else if (key === 'B' || key === '2') {
        e.preventDefault();
        if (questionOptions[1]) handleSelectOption(questionOptions[1]);
      } else if (key === 'C' || key === '3') {
        e.preventDefault();
        if (questionOptions[2]) handleSelectOption(questionOptions[2]);
      } else if (key === 'D' || key === '4') {
        e.preventDefault();
        if (questionOptions[3]) handleSelectOption(questionOptions[3]);
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (currentSelectedAnswer) {
          e.preventDefault();
          goToNext();
        }
      } else if (e.key === 'ArrowLeft') {
        if (activeQuestionIdx > 0 || activePillarIdx > 0) {
          e.preventDefault();
          goToPrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSelectedAnswer, goToNext, goToPrev, questionOptions, activeQuestionIdx, activePillarIdx]);

  if (!currentPillar || !currentQuestion) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No diagnostic questionnaire modules loaded for the selected standards.
      </div>
    );
  }

  // Overall assessment metrics
  const totalQuestionsAllPillars = pillars.reduce((acc, p) => acc + (p.questions || []).length, 0);
  const totalAnsweredAllPillars = pillars.reduce((acc, p) => {
    return acc + (p.questions || []).filter((q) => Boolean(answers[q.questionId || q.id || ''])).length;
  }, 0);
  const completionPct =
    totalQuestionsAllPillars > 0
      ? Math.round((totalAnsweredAllPillars / totalQuestionsAllPillars) * 100)
      : 0;
  const isEntireAssessmentComplete =
    totalQuestionsAllPillars > 0 && totalAnsweredAllPillars === totalQuestionsAllPillars;

  const isLastQuestionInPillar = activeQuestionIdx === currentQuestions.length - 1;
  const isLastPillar = activePillarIdx === pillars.length - 1;

  return (
    <div className="cerebrium-stepper-container">
      <div className="cerebrium-stepper-split">
        {/* ── Left Column: Pillar Navigator & Progress Card ─────────────── */}
        <div className="cerebrium-stepper-sidebar">
          <div>
            <div className="cerebrium-stepper-header-tag">
              <span className="radar-pulse" style={{ width: '7px', height: '7px' }} />
              <span>Statutory Audit Pillars</span>
            </div>

            <div className="cerebrium-pillar-list" role="tablist">
              {pillars.map((pillar, pIdx) => {
                const questions = pillar.questions || [];
                const answered = questions.filter((q) =>
                  Boolean(answers[q.questionId || q.id || ''])
                ).length;
                const isComplete = questions.length > 0 && answered === questions.length;
                const isActive = pIdx === activePillarIdx;

                return (
                  <button
                    key={pillar.pillarId || pIdx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActivePillarIdx(pIdx);
                      setActiveQuestionIdx(0);
                    }}
                    className={`cerebrium-pillar-btn ${isActive ? 'active' : ''} ${
                      isComplete ? 'completed' : ''
                    }`}
                  >
                    <div className="pillar-headline">{pillar.pillarTitle}</div>
                    <div className={`cerebrium-pillar-meta ${isComplete ? 'completed' : ''}`}>
                      {isComplete ? (
                        <span>✓ {questions.length}/{questions.length} Verified</span>
                      ) : (
                        <span>
                          {answered} of {questions.length} answered
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Live Conformance & Progress Gauge Card */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.45rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Assessment Progress
              </span>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: completionPct === 100 ? 'var(--color-green-dark)' : 'var(--color-sky)',
                }}
              >
                {completionPct}%
              </span>
            </div>

            {/* Progress Track */}
            <div
              style={{
                height: '6px',
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '0.75rem',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${completionPct}%`,
                  backgroundColor:
                    completionPct === 100 ? 'var(--color-green)' : 'var(--color-sky)',
                  transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              <span>Clauses Answered:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                {totalAnsweredAllPillars} of {totalQuestionsAllPillars}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '0.35rem',
                lineHeight: 1.4,
              }}
            >
              <span>Estimated Conformity:</span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    estimatedScore >= 80 ? 'var(--color-green-dark)' : 'var(--color-sky)',
                }}
              >
                {estimatedScore}% {estimatedScore >= 80 ? '• Audit-Ready' : '• In Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Interactive Question Presentation Stage ───────────── */}
        <div className="cerebrium-question-stage">
          <div>
            {/* Top Step Dots & Clause Identifiers */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div className="cerebrium-step-dots-row">
                {currentQuestions.map((q, idx) => {
                  const qAns = answers[q.questionId || q.id || ''];
                  const isDotActive = idx === activeQuestionIdx;
                  return (
                    <div
                      key={q.questionId || q.id || idx}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`cerebrium-step-dot ${isDotActive ? 'active' : ''} ${
                        qAns ? 'completed' : ''
                      }`}
                      title={`Jump to Question ${idx + 1}`}
                    />
                  );
                })}
              </div>

              {/* Clean Clause Badges */}
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--color-sky-dark)',
                    backgroundColor: 'var(--accent-light)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
                  }}
                >
                  Clause {currentQId}
                </span>
                {(currentQuestion.applicableStandards || []).map((std, sIdx) => (
                  <span
                    key={sIdx}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-light)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {std}
                  </span>
                ))}
              </div>
            </div>

            {/* Question Animated Presentation Stage */}
            <div
              key={`${activePillarIdx}_${activeQuestionIdx}`}
              style={{
                animation: 'saasQuestionFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}
            >
              {/* Question Headline */}
              <h2 className="cerebrium-question-heading">
                {currentQuestion.text || currentQuestion.questionText}
              </h2>

              {/* Statutory Evidence Requirement */}
              {currentQuestion.evidenceRequired && (
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-light)',
                    borderLeft: '3px solid var(--color-sky)',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: 'var(--text-main)' }}>
                    Statutory Evidence Requirement:
                  </strong>{' '}
                  {currentQuestion.evidenceRequired}
                </div>
              )}

              {/* 4 Interactive Option Cards */}
              <div
                className="cerebrium-options-grid"
                role="radiogroup"
                aria-label="Compliance answers"
              >
                {questionOptions.map((opt, idx) => {
                  const isSelected = currentSelectedAnswer === opt;
                  const keyLetter = ['A', 'B', 'C', 'D'][idx] || String(idx + 1);

                  return (
                    <div
                      key={opt}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => handleSelectOption(opt)}
                      className={`cerebrium-option-card ${
                        isSelected ? 'selected-compliant' : ''
                      }`}
                    >
                      <div className="cerebrium-keycap-pill">{keyLetter}</div>
                      <div className="cerebrium-option-label">{opt}</div>
                      <div className="cerebrium-option-radio-indicator">
                        {isSelected ? '✓' : '○'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Continuous Telemetry & Audit Evidence Stream Panel */}
              <div className="cerebrium-terminal-card">
                <div className="cerebrium-terminal-header">
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span className="radar-pulse" style={{ width: '7px', height: '7px' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Continuous Audit Trail &amp; Telemetry Sync
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Node UK-01 · Active
                  </span>
                </div>
                <div className="cerebrium-terminal-code">
                  <div>
                    <span className="cerebrium-terminal-success">✓</span> Standard:{' '}
                    <span className="cerebrium-terminal-hash">
                      {currentQuestion.applicableStandards?.[0] || 'ISO 14064-1:2018'}
                    </span>{' '}
                    Clause Conformance Matrix Synced
                  </div>
                  <div>
                    <span className="cerebrium-terminal-success">✓</span> Telemetry Stream:{' '}
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Healthy</span> (15-min statutory verification epoch)
                  </div>
                  {currentSelectedAnswer && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <span className="cerebrium-terminal-success">⚡</span> Attested Conformance:{' '}
                      <span style={{ color: 'var(--color-sky-dark)', fontWeight: 700 }}>
                        "{currentSelectedAnswer}"
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1.5rem',
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border-light)',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={activeQuestionIdx === 0 && activePillarIdx === 0}
                onClick={goToPrev}
                className="btn btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                }}
              >
                ← Previous
              </button>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                }}
              >
                Press <kbd className="kbd-hint">A–D</kbd> or <kbd className="kbd-hint">1–4</kbd> • <kbd className="kbd-hint">Enter ↵</kbd>
              </span>
            </div>

            <div>
              {isEntireAssessmentComplete && isLastQuestionInPillar && isLastPillar ? (
                <button
                  type="button"
                  onClick={onProceedToCheckout}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.65rem', fontSize: '0.85rem' }}
                >
                  <span>
                    {isAuditReady
                      ? 'Proceed to Step 2: Commercial Tier →'
                      : 'Complete Diagnostic & Request Sign-Off →'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!currentSelectedAnswer}
                  onClick={goToNext}
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1.65rem',
                    fontSize: '0.85rem',
                    opacity: currentSelectedAnswer ? 1 : 0.5,
                    cursor: currentSelectedAnswer ? 'pointer' : 'not-allowed',
                  }}
                >
                  <span>
                    {isLastQuestionInPillar
                      ? `Next Pillar: ${
                          pillars[activePillarIdx + 1]?.pillarTitle || 'Review'
                        } →`
                      : 'Next Question →'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
