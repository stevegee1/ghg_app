import React, { useState, useEffect, useCallback, useRef } from 'react';

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
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const currentPillar = pillars[activePillarIdx] || pillars[0];
  const currentQuestions = currentPillar?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];
  const currentQId = currentQuestion ? (currentQuestion.id || currentQuestion.questionId || '') : '';
  const currentSelectedAnswer = answers[currentQId];

  // Navigation handlers with directional animations
  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('right');

    setTimeout(() => {
      if (activeQuestionIdx < currentQuestions.length - 1) {
        setActiveQuestionIdx((prev) => prev + 1);
      } else if (activePillarIdx < pillars.length - 1) {
        setActivePillarIdx((prev) => prev + 1);
        setActiveQuestionIdx(0);
      }
      setIsAnimating(false);
      if (stageRef.current) {
        stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 180);
  }, [activeQuestionIdx, activePillarIdx, currentQuestions.length, pillars.length, isAnimating]);

  const goToPrev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('left');

    setTimeout(() => {
      if (activeQuestionIdx > 0) {
        setActiveQuestionIdx((prev) => prev - 1);
      } else if (activePillarIdx > 0) {
        const prevPillarQuestions = pillars[activePillarIdx - 1]?.questions || [];
        setActivePillarIdx((prev) => prev - 1);
        setActiveQuestionIdx(Math.max(0, prevPillarQuestions.length - 1));
      }
      setIsAnimating(false);
    }, 180);
  }, [activeQuestionIdx, activePillarIdx, pillars, isAnimating]);

  const defaultOptions = [
    'Fully compliant & documented',
    'Partially implemented',
    'Planned within 90 days',
    'Not applicable',
  ];
  const questionOptions = currentQuestion?.options || defaultOptions;

  // Handle Option Select with 320ms Auto-Advance
  const handleSelectOption = (opt: string) => {
    onAnswerChange(currentQId, opt);

    // If there is an existing pending auto-advance, clear it
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);

    // Auto-advance if not the very last question of the entire assessment
    const isLastQuestionInAssessment =
      activePillarIdx === pillars.length - 1 && activeQuestionIdx === currentQuestions.length - 1;

    if (!isLastQuestionInAssessment) {
      const timer = setTimeout(() => {
        goToNext();
      }, 340);
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

      // Hotkeys: A, B, C, D or 1, 2, 3, 4
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

  // Overall assessment calculation
  const totalQuestionsAllPillars = pillars.reduce((acc, p) => acc + (p.questions || []).length, 0);
  const totalAnsweredAllPillars = pillars.reduce((acc, p) => {
    return acc + (p.questions || []).filter((q) => Boolean(answers[q.id || q.questionId || ''])).length;
  }, 0);
  const isEntireAssessmentComplete =
    totalQuestionsAllPillars > 0 && totalAnsweredAllPillars === totalQuestionsAllPillars;

  const isLastQuestionInPillar = activeQuestionIdx === currentQuestions.length - 1;
  const isLastPillar = activePillarIdx === pillars.length - 1;

  return (
    <div className="cerebrium-stepper-container" ref={stageRef}>
      <div className="cerebrium-stepper-split">
        {/* ── Left Column: Cerebrium Vertical Pillar Navigator ─────────────── */}
        <div className="cerebrium-stepper-sidebar">
          <div>
            <div className="cerebrium-stepper-header-tag">
              <span>•</span>
              <span>Statutory Audit Pillars</span>
            </div>

            <div className="cerebrium-pillar-list" role="tablist">
              {pillars.map((pillar, pIdx) => {
                const questions = pillar.questions || [];
                const answered = questions.filter((q) =>
                  Boolean(answers[q.id || q.questionId || ''])
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
                    <div
                      className={`cerebrium-pillar-meta ${isComplete ? 'completed' : ''}`}
                    >
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

          {/* Bottom Live Conformance Gauge Card */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1.15rem',
              backgroundColor: 'var(--cerebrium-ice-slate)',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
            }}
          >
            <div
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.35rem',
              }}
            >
              Overall Readiness Index
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.4rem',
                marginBottom: '0.4rem',
              }}
            >
              <span
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color:
                    estimatedScore >= 80
                      ? 'var(--color-green)'
                      : 'var(--cerebrium-magenta)',
                }}
              >
                {estimatedScore}%
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color:
                    estimatedScore >= 80
                      ? 'var(--color-green)'
                      : 'var(--cerebrium-magenta)',
                }}
              >
                {estimatedScore >= 80 ? '• Audit-Ready' : '• In Progress'}
              </span>
            </div>
            {/* Shimmer Bar */}
            <div
              style={{
                height: '6px',
                backgroundColor: 'rgba(12, 16, 39, 0.08)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(totalAnsweredAllPillars / Math.max(totalQuestionsAllPillars, 1)) * 100}%`,
                  height: '100%',
                  backgroundColor:
                    estimatedScore >= 80
                      ? 'var(--color-green)'
                      : 'var(--cerebrium-magenta)',
                  transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                marginTop: '0.35rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Completion:</span>
              <span style={{ fontWeight: 700 }}>
                {totalAnsweredAllPillars}/{totalQuestionsAllPillars} clauses
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Cerebrium Interactive Question Stage ───────────── */}
        <div className="cerebrium-question-stage">
          <div>
            {/* Top Step Dots Row */}
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
                  const qAns = answers[q.id || q.questionId || ''];
                  const isDotActive = idx === activeQuestionIdx;
                  return (
                    <div
                      key={q.id || idx}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`cerebrium-step-dot ${isDotActive ? 'active' : ''} ${
                        qAns ? 'completed' : ''
                      }`}
                      title={`Jump to Question ${idx + 1}`}
                    />
                  );
                })}
              </div>

              {/* Monospace clause identifier badge */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--cerebrium-magenta)',
                    backgroundColor: 'var(--cerebrium-magenta-subtle)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Clause {currentQId}
                </span>
                {(currentQuestion.applicableStandards || []).map((std, sIdx) => (
                  <span
                    key={sIdx}
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: 'var(--cerebrium-ink-navy)',
                      backgroundColor: '#ffffff',
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

            {/* Question Animated Presentation Box */}
            <div
              key={`${currentPillar.pillarId}_${currentQId}`}
              style={{
                animation:
                  slideDirection === 'right'
                    ? 'stepSlideInFromRight 0.22s cubic-bezier(0.16, 1, 0.3, 1) both'
                    : 'stepSlideInFromLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
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
                    color: 'var(--cerebrium-slate-text)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-light)',
                    borderLeft: '3px solid var(--cerebrium-magenta)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.95rem',
                    marginBottom: '1rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: 'var(--cerebrium-ink-navy)' }}>
                    Statutory Evidence Requirement:
                  </strong>{' '}
                  {currentQuestion.evidenceRequired}
                </div>
              )}

              {/* Cerebrium 4 Hotkey Option Cards */}
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

              {/* Cerebrium Terminal Card (Active Evidence Stream) */}
              <div className="cerebrium-terminal-card">
                <div className="cerebrium-terminal-header">
                  <div className="cerebrium-terminal-dots">
                    <div
                      className="cerebrium-terminal-dot"
                      style={{ backgroundColor: '#ef4444' }}
                    />
                    <div
                      className="cerebrium-terminal-dot"
                      style={{ backgroundColor: '#f59e0b' }}
                    />
                    <div
                      className="cerebrium-terminal-dot"
                      style={{ backgroundColor: '#10b981' }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    continuous-assurance-engine://telemetry/node-uk01
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
                    <span className="cerebrium-terminal-success">✓</span> Telemetry
                    Feed:{' '}
                    <span style={{ color: '#ffffff' }}>Active</span> (Node UK-01, 15-min
                    statutory interval)
                  </div>
                  {currentSelectedAnswer && (
                    <div style={{ marginTop: '0.2rem' }}>
                      <span className="cerebrium-terminal-success">⚡</span> Attested
                      Status:{' '}
                      <span style={{ color: 'var(--cerebrium-magenta)' }}>
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
                className="cerebrium-btn-ghost"
                style={{
                  backgroundColor: '#ffffff',
                  color: 'var(--cerebrium-ink-navy)',
                  borderColor: 'var(--border-medium)',
                }}
              >
                ← Previous
              </button>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
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
                  className="cerebrium-btn-magenta"
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
                  className="cerebrium-btn-magenta"
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
