import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

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
  isSubmittedPendingReview?: boolean;
  onProceedToCheckout?: () => void;
  onSubmitForReview?: () => void;
  estimatedScore: number;
  submitting?: boolean;
  submitError?: string | null;
  onViewReviewStatus?: () => void;
  onUploadEvidence?: (questionId: string, file: File) => Promise<any>;
  evidenceByQuestion?: Record<string, Array<{ fileName: string; sha256Hash: string; fileUrl: string; fileSizeBytes?: number }>>;
}

export const InteractiveAuditStepper: React.FC<InteractiveAuditStepperProps> = ({
  pillars,
  answers,
  onAnswerChange,
  isAuditReady,
  isSubmittedPendingReview,
  onProceedToCheckout,
  onSubmitForReview,
  estimatedScore,
  submitting = false,
  submitError = null,
  onViewReviewStatus,
  onUploadEvidence,
  evidenceByQuestion = {},
}) => {
  const { token } = useAuth();
  const [activePillarIdx, setActivePillarIdx] = useState<number>(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const currentPillar = pillars[activePillarIdx] || pillars[0];
  const currentQuestions = currentPillar?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];
  const currentQId = currentQuestion ? (currentQuestion.questionId || currentQuestion.id || '') : '';
  const currentSelectedAnswer = answers[currentQId];
  const questionEvidenceList = evidenceByQuestion[currentQId] || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!onUploadEvidence) {
      setUploadError('Evidence upload handler is not configured.');
      return;
    }
    setUploadingEvidence(true);
    try {
      await onUploadEvidence(currentQId, file);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload proof document.');
    } finally {
      setUploadingEvidence(false);
      e.target.value = '';
    }
  };

  // Navigation handlers with clean, instantaneous state updates
  const goToNext = useCallback(() => {
    if (submitting) return;
    setDirection('next');

    if (activeQuestionIdx < currentQuestions.length - 1) {
      setActiveQuestionIdx((prev) => prev + 1);
    } else if (activePillarIdx < pillars.length - 1) {
      setActivePillarIdx((prev) => prev + 1);
      setActiveQuestionIdx(0);
    } else {
      // Reached the end of the entire diagnostic: Trigger Review & Submission
      if (isAuditReady && onProceedToCheckout) {
        onProceedToCheckout();
      } else if (isSubmittedPendingReview) {
        if (onViewReviewStatus) {
          onViewReviewStatus();
        } else {
          const elem = document.getElementById('conformance-verification-card');
          if (elem) {
            elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } else if (onSubmitForReview) {
        onSubmitForReview();
      } else {
        const elem = document.getElementById('conformance-verification-card');
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [
    activeQuestionIdx,
    activePillarIdx,
    currentQuestions.length,
    pillars.length,
    isAuditReady,
    isSubmittedPendingReview,
    submitting,
    onProceedToCheckout,
    onSubmitForReview,
    onViewReviewStatus,
  ]);

  const goToPrev = useCallback(() => {
    setDirection('prev');
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
                      setDirection(pIdx >= activePillarIdx ? 'next' : 'prev');
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
                className="cerebrium-laser-bar"
                style={{
                  width: `${completionPct}%`,
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
                      onClick={() => {
                        setDirection(idx >= activeQuestionIdx ? 'next' : 'prev');
                        setActiveQuestionIdx(idx);
                      }}
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

            {/* Question Animated Presentation Stage with Cerebrium 3D Kinetic Swing */}
            <div className="cerebrium-question-viewport">
              <div
                key={`${activePillarIdx}_${activeQuestionIdx}`}
                className={direction === 'next' ? 'cerebrium-swing-next' : 'cerebrium-swing-prev'}
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

                {/* Proof Document Attachment Section */}
                <div className="cerebrium-evidence-uploader">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Proof Document Attachment (Clause Verification)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      PDF, DOC, DOCX, XLS, CSV, PNG, JPG (up to 25MB)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--color-sky)',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: uploadingEvidence ? 'not-allowed' : 'pointer',
                        opacity: uploadingEvidence ? 0.7 : 1,
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp"
                        onChange={handleFileUpload}
                        disabled={uploadingEvidence}
                        style={{ display: 'none' }}
                      />
                      {uploadingEvidence ? 'Uploading & Computing SHA-256...' : 'Attach Proof Document'}
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Cryptographic SHA-256 checksum is computed on upload.
                    </span>
                  </div>

                  {uploadError && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--google-red, #dc2626)' }}>
                      {uploadError}
                    </div>
                  )}

                  {/* Attached Evidence List */}
                  {questionEvidenceList.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Attached Proof Documents ({questionEvidenceList.length})
                      </div>
                      {questionEvidenceList.map((doc, dIdx) => (
                        <div key={dIdx} className="cerebrium-evidence-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <span style={{ fontSize: '0.85rem' }}>📄</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                              {doc.fileName}
                            </span>
                            <span className="cerebrium-evidence-chip">
                              ✓ SHA-256: {doc.sha256Hash?.substring(0, 10)}...
                            </span>
                          </div>
                          {doc.fileUrl && token && (
                            <button
                              type="button"
                              onClick={() => api.downloadEvidenceFile(token, doc.fileUrl, doc.fileName).catch((err: Error) => alert(err.message))}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                color: 'var(--color-sky)',
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                            >
                              Download document
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
                        <span className="cerebrium-terminal-success">✓</span> Attested Conformance:{' '}
                        <span style={{ color: 'var(--color-sky-dark)', fontWeight: 700 }}>
                          "{currentSelectedAnswer}"
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Error Banner */}
          {submitError && (() => {
            const isAuthError =
              submitError.toLowerCase().includes('token') ||
              submitError.toLowerCase().includes('unauthorized') ||
              submitError.toLowerCase().includes('authentication');

            return (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid var(--google-red, #ef4444)',
                  color: 'var(--google-red, #dc2626)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    <strong>{isAuthError ? 'Authentication Session Expired:' : 'Lead Auditor Submission Notice:'}</strong>{' '}
                    {isAuthError
                      ? 'Your security session has timed out. All your answers are safely saved in local storage.'
                      : submitError}
                  </span>
                </div>
                {isAuthError ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <a
                      href="/portal/login"
                      style={{
                        backgroundColor: 'var(--google-red, #dc2626)',
                        color: '#ffffff',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}
                    >
                      Log In to Complete Submission
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSubmitForReview && onSubmitForReview()}
                    disabled={submitting}
                    style={{
                      backgroundColor: 'var(--google-red, #dc2626)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {submitting ? 'Retrying...' : 'Retry Submission'}
                  </button>
                )}
              </div>
            );
          })()}

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
                Previous
              </button>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                }}
              >
                Press <kbd className="kbd-hint">A-D</kbd> or <kbd className="kbd-hint">1-4</kbd> | <kbd className="kbd-hint">Enter</kbd>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
              {isSubmittedPendingReview ? (
                <>
                  {(!isLastQuestionInPillar || !isLastPillar) && (
                    <button
                      type="button"
                      onClick={goToNext}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.65rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>
                        {isLastQuestionInPillar
                          ? `Next Pillar: ${pillars[activePillarIdx + 1]?.pillarTitle || ''}`
                          : 'Next Question'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewReviewStatus) onViewReviewStatus();
                    }}
                    className="btn btn-primary"
                    style={{
                      padding: '0.65rem 1.65rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: 'var(--google-amber, #f59e0b)',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                    }}
                  >
                    <span
                      className="radar-pulse"
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#ffffff',
                      }}
                    />
                    <span>In Lead Auditor Queue: View Status</span>
                  </button>
                </>
              ) : isLastQuestionInPillar && isLastPillar ? (
                <button
                  type="button"
                  disabled={!currentSelectedAnswer || submitting}
                  onClick={() => {
                    if (isAuditReady && onProceedToCheckout) {
                      onProceedToCheckout();
                    } else if (onSubmitForReview) {
                      onSubmitForReview();
                    } else {
                      goToNext();
                    }
                  }}
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1.65rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    opacity: currentSelectedAnswer && !submitting ? 1 : 0.5,
                    cursor: currentSelectedAnswer && !submitting ? 'pointer' : 'not-allowed',
                    backgroundColor: isAuditReady
                      ? 'var(--color-green, #10b981)'
                      : undefined,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {submitting && (
                    <span
                      className="radar-pulse"
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  )}
                  <span>
                    {submitting
                      ? 'Submitting Dossier to Lead Auditor...'
                      : isAuditReady
                      ? 'Proceed to Step 2: Commercial Tier'
                      : 'Diagnostic Complete: Submit for Review'}
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
                          pillars[activePillarIdx + 1]?.pillarTitle || ''
                        }`
                      : 'Next Question'}
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
