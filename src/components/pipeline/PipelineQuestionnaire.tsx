import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import type { AnswerInput, ClientEvidence, ClientQuestion, ClientSubmission } from '../../api/pipeline.types';
import { EVIDENCE_ACCEPT, formatFileSize } from './pipelineFormat';

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

/** Questions still blocking submission, with the reason shown next to each. */
function findProblems(questions: ClientQuestion[], answers: Record<string, DraftAnswer>): Record<string, string> {
  const problems: Record<string, string> = {};
  for (const q of questions) {
    const a = answers[q.id];
    if (!a || a.value.trim() === '') problems[q.id] = 'Answer this question.';
    else if (q.evidenceRequired && !a.evidence) problems[q.id] = 'Attach evidence for this question.';
  }
  return problems;
}

export const PipelineQuestionnaire: React.FC<Props> = ({ token, submission, onSubmitted }) => {
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>(() => initialAnswers(submission.questions));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [uploading, setUploading] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef<Map<string, AnswerInput>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const queue = (questionId: string, next: DraftAnswer, immediate = false) => {
    pending.current.set(questionId, { questionId, value: next.value, evidenceDocumentId: next.evidence?.id ?? null });
    setFieldErrors((prev) => {
      if (!prev[questionId]) return prev;
      const { [questionId]: _cleared, ...rest } = prev;
      return rest;
    });
    if (timer.current) clearTimeout(timer.current);
    if (immediate) void flush();
    else timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  };

  const setValue = (questionId: string, value: string) => {
    const next = { ...answers[questionId], value };
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    queue(questionId, next);
  };

  const attachEvidence = async (questionId: string, file: File) => {
    setUploading(questionId);
    setFormError(null);
    try {
      const { evidenceDocument } = await api.uploadPipelineEvidence(token, file);
      const evidence: ClientEvidence = {
        id: evidenceDocument.id,
        fileName: evidenceDocument.fileName,
        fileUrl: evidenceDocument.fileUrl,
        fileSizeBytes: evidenceDocument.fileSizeBytes,
        sha256Hash: evidenceDocument.sha256Hash,
        uploadedAt: evidenceDocument.createdAt,
      };
      const next = { ...answers[questionId], evidence };
      setAnswers((prev) => ({ ...prev, [questionId]: next }));
      queue(questionId, next, true);
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, [questionId]: (err as Error).message }));
    } finally {
      setUploading(null);
    }
  };

  const removeEvidence = (questionId: string) => {
    const next = { ...answers[questionId], evidence: null };
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    queue(questionId, next, true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const problems = findProblems(submission.questions, answers);
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) {
      setFormError(`${Object.keys(problems).length} question(s) need attention before you can submit.`);
      document.getElementById(`pipeline-q-${Object.keys(problems)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      if (!(await flush())) return;
      const result = await api.submitPipeline(token, submission.id);
      if (result.missingQuestions?.length) {
        setFieldErrors(Object.fromEntries(result.missingQuestions.map((m) => [m.questionId, 'This question needs attention.'])));
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

  const answeredCount = submission.questions.filter((q) => answers[q.id]?.value.trim()).length;
  const isRevision = submission.status === 'REJECTED';

  return (
    <form className="pipeline-stack" onSubmit={handleSubmit} noValidate>
      {isRevision && submission.review && (
        <div className="pipeline-panel pipeline-revision" role="status">
          <h3>Revision requested</h3>
          <p>
            {submission.review.reviewerName ?? 'Your Lead Auditor'} asked for changes to the questions marked below. Update them
            and submit again.
          </p>
          {submission.review.notes && <p className="pipeline-quote">{submission.review.notes}</p>}
        </div>
      )}

      <div className="pipeline-progress-bar">
        <span>
          {answeredCount} of {submission.questions.length} answered
        </span>
        <span className={`pipeline-save is-${saveState}`} aria-live="polite">
          {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? 'Not saved' : ''}
        </span>
      </div>

      <ol className="pipeline-questions">
        {submission.questions.map((q, i) => {
          const a = answers[q.id];
          const error = fieldErrors[q.id];
          const inputId = `pipeline-q-${q.id}`;
          const hintId = `${inputId}-hint`;
          const errorId = `${inputId}-error`;
          const describedBy = [q.guidanceNotes ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
          return (
            <li key={q.id} className={`pipeline-panel pipeline-question${q.revisionReason ? ' needs-revision' : ''}${error ? ' has-error' : ''}`}>
              <div className="pipeline-question-head">
                <span className="pipeline-question-number">{i + 1}</span>
                <div>
                  <label htmlFor={q.answerType === 'BOOLEAN' ? undefined : inputId} className="pipeline-question-text" id={`${inputId}-label`}>
                    {q.text}
                  </label>
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

              {q.answerType === 'BOOLEAN' ? (
                <div className="pipeline-choice" role="radiogroup" aria-labelledby={`${inputId}-label`} aria-describedby={describedBy}>
                  {[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                  ].map((opt, idx) => (
                    <label key={opt.value} className={`pipeline-choice-option${a.value === opt.value ? ' is-selected' : ''}`}>
                      <input
                        type="radio"
                        id={idx === 0 ? inputId : undefined}
                        name={inputId}
                        value={opt.value}
                        checked={a.value === opt.value}
                        onChange={() => setValue(q.id, opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              ) : q.answerType === 'SELECT' ? (
                <select id={inputId} className="pipeline-input" value={a.value} aria-describedby={describedBy} aria-invalid={Boolean(error)} onChange={(e) => setValue(q.id, e.target.value)}>
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
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  onChange={(e) => setValue(q.id, e.target.value.replace(/[^0-9.,-]/g, ''))}
                />
              ) : (
                <textarea
                  id={inputId}
                  className="pipeline-input"
                  rows={3}
                  value={a.value}
                  aria-describedby={describedBy}
                  aria-invalid={Boolean(error)}
                  onChange={(e) => setValue(q.id, e.target.value)}
                />
              )}

              <div className="pipeline-evidence">
                {a.evidence ? (
                  <div className="pipeline-evidence-file">
                    <button type="button" className="pipeline-link" onClick={() => api.downloadEvidenceFile(token, a.evidence!.fileUrl, a.evidence!.fileName).catch((err: Error) => setFormError(err.message))}>
                      {a.evidence.fileName}
                    </button>
                    <span className="pipeline-muted">
                      {formatFileSize(a.evidence.fileSizeBytes)} · SHA-256 {a.evidence.sha256Hash.slice(0, 12)}
                    </span>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => removeEvidence(q.id)}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="btn btn-secondary btn-small pipeline-file-button">
                    {uploading === q.id ? 'Uploading...' : q.evidenceRequired ? 'Attach evidence (required)' : 'Attach evidence (optional)'}
                    <input
                      type="file"
                      accept={EVIDENCE_ACCEPT}
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void attachEvidence(q.id, file);
                      }}
                    />
                  </label>
                )}
              </div>

              {error && (
                <p id={errorId} className="pipeline-error-text">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {formError && (
        <div className="pipeline-panel pipeline-state-error" role="alert">
          {formError}
        </div>
      )}

      <div className="pipeline-submit-bar">
        <p className="pipeline-muted">Your answers save as you go. You can leave and come back at any time.</p>
        <button type="submit" className="btn btn-primary" disabled={submitting || uploading !== null}>
          {submitting ? 'Submitting...' : isRevision ? 'Resubmit for review' : 'Submit for review'}
        </button>
      </div>
    </form>
  );
};
