import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { AnswerInput, ClientEvidence, ClientQuestion, ClientSubmission, EarlierEvidenceFile } from '../../api/pipeline.types';
import { EVIDENCE_ACCEPT, formatDate, formatFileSize } from './pipelineFormat';

const AUTOSAVE_DELAY_MS = 800;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface DraftAnswer {
  value: string;
  evidence: ClientEvidence | null;
}

interface Props {
  token: string;
  submission: ClientSubmission;
  onSubmitted: () => void;
}

function initialAnswers(questions: ClientQuestion[]): Record<string, DraftAnswer> {
  const map: Record<string, DraftAnswer> = {};
  for (const q of questions) {
    map[q.id] = { value: q.answer?.value ?? '', evidence: q.answer?.evidence ?? null };
  }
  return map;
}

/** What still blocks one question from being submitted, or null when it is complete. */
function problemFor(q: ClientQuestion, a: DraftAnswer | undefined): string | null {
  if (!a || a.value.trim() === '') return 'Not answered yet.';
  if (q.evidenceRequired && !a.evidence) return 'Evidence is required.';
  return null;
}

function answerLabel(q: ClientQuestion, value: string): string {
  if (q.answerType === 'BOOLEAN') return value === 'true' ? 'Yes' : value === 'false' ? 'No' : '';
  return value;
}

/** Where to open: the first question the auditor flagged, else the first unfinished one, else the review. */
function startingStep(questions: ClientQuestion[], answers: Record<string, DraftAnswer>): number {
  const flagged = questions.findIndex((q) => q.revisionReason);
  if (flagged >= 0) return flagged;
  const unfinished = questions.findIndex((q) => problemFor(q, answers[q.id]));
  return unfinished >= 0 ? unfinished : questions.length;
}

/**
 * The questionnaire as one step per question: answer it, attach its evidence (a new upload or a
 * file uploaded before), then continue. Answers save as you go; the last step reviews everything
 * and submits. Each item is asked once, so there is no separate preparation checklist.
 */
export const PipelineQuestionnaire: React.FC<Props> = ({ token, submission, onSubmitted }) => {
  const questions = submission.questions;
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>(() => initialAnswers(questions));
  const [step, setStep] = useState(() => startingStep(questions, initialAnswers(questions)));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [uploading, setUploading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [earlierFiles, setEarlierFiles] = useState<EarlierEvidenceFile[] | null>(null);
  const pending = useRef<Map<string, AnswerInput>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const onReview = step >= questions.length;
  const current = onReview ? null : questions[step];
  const problems = Object.fromEntries(questions.map((q) => [q.id, problemFor(q, answers[q.id])]));
  const completeCount = questions.filter((q) => !problems[q.id]).length;
  const isRevision = submission.status === 'REJECTED';

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current.size === 0) return true;
    const batch = [...pending.current.values()];
    pending.current.clear();
    setSaveState('saving');
    try {
      await api.savePipelineAnswers(token, submission.id, batch);
      setSaveState('saved');
      return true;
    } catch (err) {
      for (const a of batch) if (!pending.current.has(a.questionId)) pending.current.set(a.questionId, a);
      setSaveState('error');
      setFormError((err as Error).message);
      return false;
    }
  }, [token, submission.id]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Move focus to the new step's heading so keyboard and screen reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // Files uploaded earlier (for this or another question, or during the old preparation checklist).
  useEffect(() => {
    let cancelled = false;
    api
      .getMyEvidenceFiles(token)
      .then((res) => !cancelled && setEarlierFiles(res.files))
      .catch(() => !cancelled && setEarlierFiles([]));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const queue = (questionId: string, next: DraftAnswer, immediate = false) => {
    pending.current.set(questionId, { questionId, value: next.value, evidenceDocumentId: next.evidence?.id ?? null });
    setFieldError(null);
    if (timer.current) clearTimeout(timer.current);
    if (immediate) void flush();
    else timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  };

  const setValue = (questionId: string, value: string) => {
    const next = { ...answers[questionId], value };
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    queue(questionId, next);
  };

  const setEvidence = (questionId: string, evidence: ClientEvidence | null) => {
    const next = { ...answers[questionId], evidence };
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    queue(questionId, next, true);
  };

  const uploadEvidence = async (questionId: string, file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const { evidenceDocument } = await api.uploadPipelineEvidence(token, file);
      setEvidence(questionId, {
        id: evidenceDocument.id,
        fileName: evidenceDocument.fileName,
        fileUrl: evidenceDocument.fileUrl,
        fileSizeBytes: evidenceDocument.fileSizeBytes,
        sha256Hash: evidenceDocument.sha256Hash,
        uploadedAt: evidenceDocument.createdAt,
      });
      setEarlierFiles((prev) => [
        {
          id: evidenceDocument.id,
          fileName: evidenceDocument.fileName,
          fileUrl: evidenceDocument.fileUrl,
          fileSizeBytes: evidenceDocument.fileSizeBytes,
          sha256Hash: evidenceDocument.sha256Hash,
          createdAt: evidenceDocument.createdAt,
        },
        ...(prev ?? []),
      ]);
    } catch (err) {
      setFieldError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const reuseEvidence = (questionId: string, fileId: string) => {
    const file = earlierFiles?.find((f) => f.id === fileId);
    if (!file) return;
    setEvidence(questionId, {
      id: file.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileSizeBytes: file.fileSizeBytes,
      sha256Hash: file.sha256Hash,
      uploadedAt: file.createdAt,
    });
  };

  const goTo = async (target: number) => {
    await flush();
    setFieldError(null);
    setStep(Math.max(0, Math.min(target, questions.length)));
  };

  const submit = async () => {
    setFormError(null);
    const firstProblem = questions.findIndex((q) => problems[q.id]);
    if (firstProblem >= 0) {
      setFormError(`${questions.length - completeCount} question(s) still need an answer or evidence. Use Edit to finish them.`);
      return;
    }
    setSubmitting(true);
    try {
      if (!(await flush())) return;
      const result = await api.submitPipeline(token, submission.id);
      if (result.missingQuestions?.length) {
        setFormError(result.error ?? 'Some questions need attention before you can submit.');
        return;
      }
      onSubmitted();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveLabel = saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? 'Not saved' : '';

  return (
    <div className="pipeline-stepper">
      {isRevision && submission.review && (
        <div className="pipeline-panel pipeline-revision" role="status">
          <h3>Revision requested</h3>
          <p>
            {submission.review.reviewerName ?? 'Your Lead Auditor'} asked for changes to the questions marked in the list. Update them and
            submit again.
          </p>
          {submission.review.notes && <p className="pipeline-quote">{submission.review.notes}</p>}
        </div>
      )}

      <div className="pipeline-progress-bar">
        <div className="pipeline-progress-main">
          <span>{onReview ? 'Review and submit' : `Question ${step + 1} of ${questions.length}`}</span>
          <div className="pipeline-meter" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={completeCount} aria-label="Questions complete">
            <span style={{ width: `${questions.length ? Math.round((completeCount / questions.length) * 100) : 0}%` }} />
          </div>
          <span className="pipeline-muted">
            {completeCount} of {questions.length} complete
          </span>
        </div>
        <span className={`pipeline-save is-${saveState}`} aria-live="polite">
          {saveLabel}
        </span>
      </div>

      <div className="pipeline-stepper-body">
        <nav className="pipeline-step-list" aria-label="Questions">
          <ol>
            {questions.map((q, i) => {
              const state = q.revisionReason ? 'revision' : problems[q.id] ? (answers[q.id]?.value.trim() ? 'partial' : 'todo') : 'done';
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    className={`pipeline-step is-${state}${i === step ? ' is-current' : ''}`}
                    aria-current={i === step ? 'step' : undefined}
                    onClick={() => void goTo(i)}
                  >
                    <span className="pipeline-step-mark" aria-hidden="true">
                      {state === 'done' ? '✓' : state === 'revision' ? '!' : i + 1}
                    </span>
                    <span className="pipeline-step-text">{q.text}</span>
                    <span className="visually-hidden">
                      {state === 'done' ? ' (complete)' : state === 'revision' ? ' (auditor asked for changes)' : state === 'partial' ? ' (evidence needed)' : ' (not answered)'}
                    </span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className={`pipeline-step is-review${onReview ? ' is-current' : ''}`}
                aria-current={onReview ? 'step' : undefined}
                onClick={() => void goTo(questions.length)}
              >
                <span className="pipeline-step-mark" aria-hidden="true">
                  ✔
                </span>
                <span className="pipeline-step-text">Review and submit</span>
              </button>
            </li>
          </ol>
        </nav>

        <div className="pipeline-step-main">
          {current && (
            <QuestionStep
              key={current.id}
              headingRef={headingRef}
              token={token}
              number={step + 1}
              question={current}
              answer={answers[current.id]}
              earlierFiles={earlierFiles}
              uploading={uploading}
              error={fieldError}
              onValue={(v) => setValue(current.id, v)}
              onUpload={(file) => void uploadEvidence(current.id, file)}
              onReuse={(fileId) => reuseEvidence(current.id, fileId)}
              onRemoveEvidence={() => setEvidence(current.id, null)}
              onDownloadError={setFormError}
            />
          )}

          {onReview && (
            <section className="pipeline-panel pipeline-review" aria-labelledby="pipeline-review-title">
              <h3 id="pipeline-review-title" ref={headingRef} tabIndex={-1}>
                Review your answers
              </h3>
              <p className="pipeline-muted">Check each answer and its evidence. Use Edit to change anything, then submit for review.</p>
              <ol className="pipeline-review-list">
                {questions.map((q, i) => {
                  const a = answers[q.id];
                  const problem = problems[q.id];
                  return (
                    <li key={q.id} className={problem ? 'has-problem' : ''}>
                      <div>
                        <p className="pipeline-review-question">
                          {i + 1}. {q.text}
                        </p>
                        <p className="pipeline-review-answer">{answerLabel(q, a.value) || <em>No answer</em>}</p>
                        <p className="pipeline-muted">
                          {a.evidence ? `Evidence: ${a.evidence.fileName}` : q.evidenceRequired ? 'No evidence attached (required)' : 'No evidence attached'}
                        </p>
                        {problem && <p className="pipeline-error-text">{problem}</p>}
                      </div>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => void goTo(i)} aria-label={`Edit question ${i + 1}`}>
                        Edit
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {formError && (
            <div className="pipeline-panel pipeline-state-error" role="alert">
              {formError}
            </div>
          )}

          <div className="pipeline-step-actions">
            <button type="button" className="btn btn-secondary" onClick={() => void goTo(step - 1)} disabled={step === 0 || submitting}>
              Back
            </button>
            {onReview ? (
              <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={submitting || uploading}>
                {submitting ? 'Submitting...' : isRevision ? 'Resubmit for review' : 'Submit for review'}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => void goTo(step + 1)} disabled={uploading}>
                {step === questions.length - 1 ? 'Save and review answers' : 'Save and continue'}
              </button>
            )}
          </div>
          <p className="pipeline-muted">Your answers save as you go. You can leave and come back at any time.</p>
        </div>
      </div>
    </div>
  );
};

interface QuestionStepProps {
  headingRef: React.RefObject<HTMLHeadingElement>;
  token: string;
  number: number;
  question: ClientQuestion;
  answer: DraftAnswer;
  earlierFiles: EarlierEvidenceFile[] | null;
  uploading: boolean;
  error: string | null;
  onValue: (value: string) => void;
  onUpload: (file: File) => void;
  onReuse: (fileId: string) => void;
  onRemoveEvidence: () => void;
  onDownloadError: (message: string) => void;
}

/** One question: its answer and its evidence. */
const QuestionStep: React.FC<QuestionStepProps> = ({
  headingRef,
  token,
  number,
  question: q,
  answer: a,
  earlierFiles,
  uploading,
  error,
  onValue,
  onUpload,
  onReuse,
  onRemoveEvidence,
  onDownloadError,
}) => {
  const inputId = `pipeline-q-${q.id}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [q.guidanceNotes ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  const reusable = (earlierFiles ?? []).filter((f) => f.id !== a.evidence?.id);

  return (
    <section className={`pipeline-panel pipeline-question${q.revisionReason ? ' needs-revision' : ''}${error ? ' has-error' : ''}`} aria-labelledby={`${inputId}-label`}>
      <div className="pipeline-question-head">
        <span className="pipeline-question-number">{number}</span>
        <div>
          <h3 id={`${inputId}-label`} className="pipeline-question-text" ref={headingRef} tabIndex={-1}>
            {q.text}
          </h3>
          <p className="pipeline-clause">{q.clauseReference}</p>
        </div>
      </div>

      {q.revisionReason && (
        <p className="pipeline-revision-reason">
          <strong>Auditor:</strong> {q.revisionReason}
        </p>
      )}
      {q.guidanceNotes && (
        <p id={hintId} className="pipeline-muted">
          {q.guidanceNotes}
        </p>
      )}

      <div className="pipeline-step-field">
        <span className="pipeline-step-label">Your answer</span>
        {q.answerType === 'BOOLEAN' ? (
          <div className="pipeline-choice" role="radiogroup" aria-labelledby={`${inputId}-label`} aria-describedby={describedBy}>
            {[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ].map((opt, idx) => (
              <label key={opt.value} className={`pipeline-choice-option${a.value === opt.value ? ' is-selected' : ''}`}>
                <input type="radio" id={idx === 0 ? inputId : undefined} name={inputId} value={opt.value} checked={a.value === opt.value} onChange={() => onValue(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        ) : q.answerType === 'SELECT' ? (
          <select id={inputId} className="pipeline-input" value={a.value} aria-labelledby={`${inputId}-label`} aria-describedby={describedBy} onChange={(e) => onValue(e.target.value)}>
            <option value="">Choose an option</option>
            {q.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : q.answerType === 'NUMBER' ? (
          <input
            id={inputId}
            className="pipeline-input pipeline-input-number"
            type="text"
            inputMode="decimal"
            value={a.value}
            aria-labelledby={`${inputId}-label`}
            aria-describedby={describedBy}
            onChange={(e) => onValue(e.target.value.replace(/[^0-9.,-]/g, ''))}
          />
        ) : (
          <textarea id={inputId} className="pipeline-input" rows={4} value={a.value} aria-labelledby={`${inputId}-label`} aria-describedby={describedBy} onChange={(e) => onValue(e.target.value)} />
        )}
      </div>

      <div className="pipeline-step-field">
        <span className="pipeline-step-label">Evidence {q.evidenceRequired ? '(required)' : '(optional)'}</span>
        <p className="pipeline-muted">PDF, images (PNG, JPG, WEBP), Word, Excel or CSV.</p>
        {a.evidence ? (
          <div className="pipeline-evidence-file">
            <button
              type="button"
              className="pipeline-link"
              onClick={() => api.downloadEvidenceFile(token, a.evidence!.fileUrl, a.evidence!.fileName).catch((err: Error) => onDownloadError(err.message))}
            >
              {a.evidence.fileName}
            </button>
            <span className="pipeline-muted">{formatFileSize(a.evidence.fileSizeBytes)}</span>
            <button type="button" className="btn btn-secondary btn-small" onClick={onRemoveEvidence}>
              Remove
            </button>
          </div>
        ) : (
          <div className="pipeline-evidence-options">
            <label className="btn btn-secondary btn-small pipeline-file-button">
              {uploading ? 'Uploading...' : 'Upload a file'}
              <input
                type="file"
                accept={EVIDENCE_ACCEPT}
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) onUpload(file);
                }}
              />
            </label>
            {reusable.length > 0 && (
              <label className="pipeline-reuse">
                <span>or use a file you already uploaded</span>
                <select className="pipeline-input" value="" onChange={(e) => e.target.value && onReuse(e.target.value)}>
                  <option value="">Choose a file</option>
                  {reusable.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fileName} ({formatFileSize(f.fileSizeBytes)}, {formatDate(f.createdAt)})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="pipeline-error-text" role="alert">
          {error}
        </p>
      )}
    </section>
  );
};
