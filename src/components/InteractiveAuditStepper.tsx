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
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const stageRef = useRef<HTMLDivElement>(null);

  const currentPillar = pillars[activePillarIdx] || pillars[0];
  const currentQuestions = currentPillar?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];
  const currentQId = currentQuestion ? (currentQuestion.id || currentQuestion.questionId || '') : '';
  const currentSelectedAnswer = answers[currentQId];

  // Navigation handlers with animated directional slide
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
      // Smoothly scroll stage into view if needed
      if (stageRef.current) {
        stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
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
    }, 150);
  }, [activeQuestionIdx, activePillarIdx, pillars, isAnimating]);

  // Keyboard navigation: Enter key advances when current question is answered
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a textarea or text input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.getAttribute('type') === 'text'))) {
        return;
      }

      if (e.key === 'Enter' && currentSelectedAnswer) {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowRight' && currentSelectedAnswer) {
        goToNext();
      } else if (e.key === 'ArrowLeft' && (activeQuestionIdx > 0 || activePillarIdx > 0)) {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSelectedAnswer, goToNext, goToPrev, activeQuestionIdx, activePillarIdx]);

  if (!currentPillar || !currentQuestion) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No diagnostic questionnaire modules loaded for the selected standards.
      </div>
    );
  }

  // Answer counts for current pillar
  const pillarAnsweredCount = currentQuestions.filter((q) => Boolean(answers[q.id || q.questionId || ''])).length;
  const isCurrentPillarComplete = currentQuestions.length > 0 && pillarAnsweredCount === currentQuestions.length;

  // Overall assessment calculation
  const totalQuestionsAllPillars = pillars.reduce((acc, p) => acc + (p.questions || []).length, 0);
  const totalAnsweredAllPillars = pillars.reduce((acc, p) => {
    return acc + (p.questions || []).filter((q) => Boolean(answers[q.id || q.questionId || ''])).length;
  }, 0);
  const isEntireAssessmentComplete = totalQuestionsAllPillars > 0 && totalAnsweredAllPillars === totalQuestionsAllPillars;

  const defaultOptions = [
    'Fully compliant & documented',
    'Partially implemented',
    'Planned within 90 days',
    'Not applicable',
  ];
  const questionOptions = currentQuestion.options || defaultOptions;

  const hasNote = Boolean(answers[`${currentQId}_notes`]);
  const isNoteExpanded = expandedNotes[currentQId] || hasNote;

  const getOptionClass = (opt: string, isSelected: boolean) => {
    if (!isSelected) return 'compliance-option-card';
    const lower = opt.toLowerCase();
    if (lower.includes('fully') || lower.includes('yes')) return 'compliance-option-card selected-compliant';
    if (lower.includes('partially')) return 'compliance-option-card selected-partial';
    if (lower.includes('planned') || lower.includes('not yet')) return 'compliance-option-card selected-planned';
    return 'compliance-option-card selected-na';
  };

  const getOptionIcon = (opt: string, isSelected: boolean) => {
    if (!isSelected) return '○';
    const lower = opt.toLowerCase();
    if (lower.includes('fully') || lower.includes('yes')) return '✓';
    if (lower.includes('partially')) return '◐';
    if (lower.includes('planned') || lower.includes('not yet')) return '⏳';
    return '—';
  };

  const isLastQuestionInPillar = activeQuestionIdx === currentQuestions.length - 1;
  const isLastPillar = activePillarIdx === pillars.length - 1;

  return (
    <div className="audit-stepper-container" ref={stageRef}>
      {/* ── Pillar Navigation Ribbon ─────────────────────────────────────── */}
      <div className="pillar-ribbon-track" role="tablist" aria-label="Assessment Pillars">
        {pillars.map((pillar, pIdx) => {
          const questions = pillar.questions || [];
          const answered = questions.filter((q) => Boolean(answers[q.id || q.questionId || ''])).length;
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
              className={`pillar-ribbon-tab ${isActive ? 'active' : ''} ${isComplete ? 'completed' : ''}`}
            >
              <div className="pillar-ribbon-badge">
                {isComplete ? '✓' : pIdx + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="pillar-ribbon-title" title={pillar.pillarTitle}>
                  {pillar.pillarTitle}
                </div>
                <div className="pillar-ribbon-sub">
                  {answered} of {questions.length} answered
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Question Presentation Stage ─────────────────────────────────── */}
      <div className="question-stage-box">
        {/* Breadcrumb row & Metadata */}
        <div className="question-meta-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="question-counter-badge">
              <span>Pillar {activePillarIdx + 1} of {pillars.length}</span>
              <span>•</span>
              <span>Question {activeQuestionIdx + 1} of {currentQuestions.length}</span>
            </span>

            <span style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-subtle)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-light)',
            }}>
              {currentQId}
            </span>
          </div>

          {/* Statutory Mandate Tags */}
          <div className="question-mandate-tags">
            {(currentQuestion.applicableStandards || []).map((std, sIdx) => (
              <span
                key={sIdx}
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--color-sky)',
                  backgroundColor: 'rgba(2, 132, 199, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {std}
              </span>
            ))}
            {currentQuestion.statutoryMandate && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#9333ea',
                  backgroundColor: 'rgba(147, 51, 234, 0.08)',
                  border: '1px solid rgba(147, 51, 234, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {currentQuestion.statutoryMandate}
              </span>
            )}
          </div>
        </div>

        {/* Animated Question Content Container */}
        <div className={slideDirection === 'right' ? 'slide-in-right' : 'slide-in-left'} key={`${currentPillar.pillarId}_${currentQId}`}>
          {/* Question Text Heading */}
          <h3 className="question-text-heading">
            {currentQuestion.text || currentQuestion.questionText}
          </h3>

          {/* Evidence Requirement Note */}
          {currentQuestion.evidenceRequired && (
            <div className="question-evidence-requirement">
              <strong style={{ color: 'var(--color-sky-dark)' }}>Required Statutory Evidence:</strong> {currentQuestion.evidenceRequired}
            </div>
          )}

          {/* 4 Interactive Compliance Option Cards */}
          <div className="compliance-options-grid" role="radiogroup" aria-label="Compliance answers">
            {questionOptions.map((opt) => {
              const isSelected = currentSelectedAnswer === opt;
              return (
                <div
                  key={opt}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => onAnswerChange(currentQId, opt)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onAnswerChange(currentQId, opt);
                    }
                  }}
                  className={getOptionClass(opt, isSelected)}
                >
                  <div className="compliance-radio-indicator">
                    {getOptionIcon(opt, isSelected)}
                  </div>
                  <div className="compliance-option-label">
                    {opt}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Supporting Evidence Reference Accordion */}
          <div style={{ marginBottom: '1rem' }}>
            {!isNoteExpanded ? (
              <button
                type="button"
                onClick={() => setExpandedNotes((prev) => ({ ...prev, [currentQId]: true }))}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.78rem',
                  color: 'var(--color-sky)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>+</span>
                <span>Attach evidence file reference or document docket number (optional)</span>
              </button>
            ) : (
              <div style={{ animation: 'fadeInUpStagger 0.25s ease both' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Statutory Evidence Reference / Document ID:
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpandedNotes((prev) => ({ ...prev, [currentQId]: false }))}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    Hide
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. DOC-ISO14064-2026-CALIB-01, Energy Management System Audit Dossier..."
                  value={answers[`${currentQId}_notes`] || ''}
                  onChange={(e) => onAnswerChange(`${currentQId}_notes`, e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.8125rem', width: '100%' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Next Action Footer Bar ───────────────────────────────────────── */}
        <div className="compliance-action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              disabled={activeQuestionIdx === 0 && activePillarIdx === 0}
              onClick={goToPrev}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.15rem', fontSize: '0.85rem' }}
            >
              ← Previous
            </button>

            {/* Quick Fill Button */}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tip: Press <kbd style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.7rem' }}>Enter ↵</kbd> to advance
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* If all pillars are answered and user is at the end */}
            {isEntireAssessmentComplete && isLastQuestionInPillar && isLastPillar ? (
              <button
                type="button"
                onClick={onProceedToCheckout}
                className="btn-animated-next pulsing"
                style={{ backgroundColor: 'var(--color-green-dark)' }}
              >
                <span>{isAuditReady ? 'Proceed to Step 2: Checkout →' : 'Complete Diagnostic & Request Sign-Off →'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!currentSelectedAnswer}
                onClick={goToNext}
                className={`btn-animated-next ${currentSelectedAnswer ? 'pulsing' : ''}`}
              >
                <span>
                  {isLastQuestionInPillar
                    ? `Next Pillar: ${pillars[activePillarIdx + 1]?.pillarTitle || 'Review'} →`
                    : 'Next Question →'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
