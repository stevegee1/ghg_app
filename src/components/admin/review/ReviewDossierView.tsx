import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../api/client';
import type { ReviewDossier, ReviewQuestion } from '../../../api/review.types';
import { formatDate, formatFileSize } from '../../pipeline/pipelineFormat';
import { AI_FINDING_LABELS, REVIEW_STATUS_LABELS, WORKFLOW_TYPE_LABELS, reviewStatusTone } from './reviewFormat';

interface QuestionDecision {
  accepted: boolean | null;
  reason: string;
}

interface Props {
  token: string;
  submissionId: string;
  onBack: () => void;
}

function displayAnswer(q: ReviewQuestion): string {
  if (q.answer === null || q.answer.trim() === '') return 'Not answered';
  if (q.answerType === 'BOOLEAN') return q.answer === 'true' ? 'Yes' : q.answer === 'false' ? 'No' : q.answer;
  return q.answer;
}

export const ReviewDossierView: React.FC<Props> = ({ token, submissionId, onBack }) => {
  const [dossier, setDossier] = useState<ReviewDossier | null>(null);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [decisions, setDecisions] = useState<Record<string, QuestionDecision>>({});
  const [score, setScore] = useState('');
  const [accreditation, setAccreditation] = useState('');
  const [notes, setNotes] = useState('');
  const [attested, setAttested] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [{ submission }, { profile, aiProvider: provider }] = await Promise.all([
        api.getReviewDossier(token, submissionId),
        api.getReviewerProfile(token),
      ]);
      setDossier(submission);
      setAiProvider(provider);
      setReviewerName(profile.name);
      setAccreditation((current) => current || profile.lastAccreditation || '');
      setDecisions((current) => {
        const next: Record<string, QuestionDecision> = {};
        for (const q of submission.questions) next[q.id] = current[q.id] ?? { accepted: null, reason: '' };
        return next;
      });
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, [token, submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDecision = (questionId: string, change: Partial<QuestionDecision>) => {
    setDecisions((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...change } }));
    setErrors((prev) => {
      if (!prev[questionId]) return prev;
      const { [questionId]: _cleared, ...rest } = prev;
      return rest;
    });
  };

  const acceptRemaining = () => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const [id, d] of Object.entries(next)) if (d.accepted === null) next[id] = { accepted: true, reason: '' };
      return next;
    });
    setErrors({});
  };

  const runAction = async (label: string, action: () => Promise<unknown>, message: string) => {
    setBusy(label);
    setFormError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loadError) {
    return (
      <div className="pipeline-panel pipeline-state-error" role="alert">
        <span>{loadError}</span>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Try again
        </button>
      </div>
    );
  }
  if (!dossier) return <div className="pipeline-panel pipeline-muted">Loading submission...</div>;

  const revisionCount = Object.values(decisions).filter((d) => d.accepted === false).length;
  const undecidedCount = Object.values(decisions).filter((d) => d.accepted === null).length;
  const overall: 'APPROVED' | 'REJECTED' = revisionCount > 0 ? 'REJECTED' : 'APPROVED';

  const record = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const q of dossier.questions) {
      const d = decisions[q.id];
      if (d.accepted === null) nextErrors[q.id] = 'Accept this answer or ask for a revision.';
      else if (d.accepted === false && !d.reason.trim()) nextErrors[q.id] = 'Give the client a reason they can act on.';
    }
    const parsedScore = Number(score);
    if (score.trim() === '' || !Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 100) nextErrors.score = 'Enter a whole number from 0 to 100.';
    if (!accreditation.trim()) nextErrors.accreditation = 'Enter the accreditation you are signing under.';
    if (!attested) nextErrors.attested = 'Confirm you reviewed the answers and evidence yourself.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Some items need attention before the decision can be recorded.');
      return;
    }
    await runAction(
      'decide',
      () =>
        api.recordReviewDecision(token, dossier.id, {
          overallDecision: overall,
          overallScore: parsedScore,
          reviewerAccreditation: accreditation.trim(),
          reviewerNotes: notes.trim() || null,
          perQuestionDecisions: dossier.questions.map((q) => {
            const d = decisions[q.id];
            return d.accepted ? { questionId: q.id, accepted: true } : { questionId: q.id, accepted: false, reasonIfRejected: d.reason.trim() };
          }),
        }),
      overall === 'APPROVED' ? 'Approved. The client can now complete the next step to receive the credential.' : 'Revision requested. The client sees your reasons against each question.'
    );
  };

  return (
    <section className="pipeline-workspace" aria-labelledby="review-dossier-title">
      <header className="pipeline-header">
        <button type="button" className="pipeline-back" onClick={onBack}>
          Review queue
        </button>
        <h2 id="review-dossier-title">{dossier.licensee.name}</h2>
        <p className="pipeline-muted">
          {dossier.framework.name} · version {dossier.version.version} ({dossier.version.standardReference}) ·{' '}
          {WORKFLOW_TYPE_LABELS[dossier.workflowType]}
          {dossier.submittedAt ? ` · submitted ${formatDate(dossier.submittedAt)}` : ''}
        </p>
        <p>
          <span className={`pipeline-chip tone-${reviewStatusTone(dossier.status)}`}>{REVIEW_STATUS_LABELS[dossier.status]}</span>
        </p>
      </header>

      {notice && (
        <p className="pipeline-notice" role="status">
          {notice}
        </p>
      )}

      <div className="pipeline-panel review-ai">
        <h3>AI pre-screen (advice only)</h3>
        {!aiProvider && (
          <p className="pipeline-notice" role="status">
            No AI model is configured, so pre-screens use the rules engine only. To enable AI review, set ANTHROPIC_API_KEY and
            ANTHROPIC_MODEL (or the Gemini or OpenAI equivalents) in the server environment.
          </p>
        )}
        {dossier.ai ? (
          <>
            <p className="pipeline-muted">
              {dossier.ai.reviewer} · {formatDate(dossier.ai.screenedAt)}
              {dossier.ai.score !== null ? ` · ${dossier.ai.score}%` : ''}
              {dossier.ai.recommendation ? ` · suggests ${dossier.ai.recommendation === 'APPROVE' ? 'approval' : 'revision'}` : ''}
            </p>
            {dossier.ai.summary && <p>{dossier.ai.summary}</p>}
          </>
        ) : (
          <p className="pipeline-muted">No pre-screen has been recorded. You can review without it.</p>
        )}
        <div className="pipeline-actions">
          {dossier.canRerunAi && (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              disabled={busy !== null}
              onClick={() => runAction('ai', () => api.rerunAiPrescreen(token, dossier.id), 'Pre-screen started. Refresh in a minute to see the result.')}
            >
              {busy === 'ai' ? 'Starting...' : dossier.ai ? 'Run pre-screen again' : 'Run pre-screen'}
            </button>
          )}
          {dossier.canStartReview && (
            <button
              type="button"
              className="btn btn-primary btn-small"
              disabled={busy !== null}
              onClick={() => runAction('start', () => api.startReview(token, dossier.id), 'Review started.')}
            >
              {busy === 'start' ? 'Starting...' : 'Start review without pre-screen'}
            </button>
          )}
        </div>
      </div>

      {dossier.review && !dossier.canDecide && (
        <div className="pipeline-panel">
          <h3>Decision recorded</h3>
          <p>
            {dossier.review.decision === 'APPROVED' ? 'Approved' : 'Revision requested'} with a score of {dossier.review.score}% by{' '}
            {dossier.review.reviewerName}
            {dossier.review.reviewerAccreditation ? ` (${dossier.review.reviewerAccreditation})` : ''} on {formatDate(dossier.review.decidedAt)}.
          </p>
          {dossier.review.notes && <p className="pipeline-quote">{dossier.review.notes}</p>}
        </div>
      )}

      <form className="pipeline-stack" onSubmit={record} noValidate>
        <ol className="pipeline-questions">
          {dossier.questions.map((q, i) => {
            const d = decisions[q.id];
            const error = errors[q.id];
            const name = `review-${q.id}`;
            return (
              <li key={q.id} className={`pipeline-panel pipeline-question${error ? ' has-error' : ''}`}>
                <div className="pipeline-question-head">
                  <span className="pipeline-question-number">{i + 1}</span>
                  <div>
                    <p className="pipeline-question-text" id={`${name}-label`}>
                      {q.text}
                    </p>
                    <p className="pipeline-clause">{q.clauseReference}</p>
                  </div>
                </div>

                <dl className="review-answer">
                  <div>
                    <dt>Client answer</dt>
                    <dd>{displayAnswer(q)}</dd>
                  </div>
                  <div>
                    <dt>Evidence{q.evidenceRequired ? ' (required)' : ''}</dt>
                    <dd>
                      {q.evidence ? (
                        <>
                          {q.evidence.stored ? (
                            <button
                              type="button"
                              className="pipeline-link"
                              onClick={() => api.downloadEvidenceFile(token, q.evidence!.fileUrl, q.evidence!.fileName).catch((err: Error) => setFormError(err.message))}
                            >
                              {q.evidence.fileName}
                            </button>
                          ) : (
                            <span>{q.evidence.fileName} (recorded before file storage; no file available)</span>
                          )}
                          <span className="pipeline-muted review-hash">
                            {formatFileSize(q.evidence.fileSizeBytes)} · SHA-256 {q.evidence.sha256Hash}
                          </span>
                        </>
                      ) : (
                        'None attached'
                      )}
                    </dd>
                  </div>
                </dl>

                {q.aiFinding && (
                  <p className="review-ai-finding">
                    <strong>AI advice: {AI_FINDING_LABELS[q.aiFinding.status] ?? q.aiFinding.status}.</strong> {q.aiFinding.findings}
                  </p>
                )}
                {q.previousDecision && !q.previousDecision.accepted && q.previousDecision.reasonIfRejected && (
                  <p className="pipeline-muted">
                    {dossier.canDecide ? 'Reason given in the previous round' : 'Revision reason sent to the client'}: {q.previousDecision.reasonIfRejected}
                  </p>
                )}

                {dossier.canDecide && (
                  <>
                    <div className="pipeline-choice" role="radiogroup" aria-labelledby={`${name}-label`}>
                      {[
                        { value: true, label: 'Accept' },
                        { value: false, label: 'Needs revision' },
                      ].map((opt) => (
                        <label key={opt.label} className={`pipeline-choice-option${d?.accepted === opt.value ? ' is-selected' : ''}`}>
                          <input type="radio" name={name} checked={d?.accepted === opt.value} onChange={() => setDecision(q.id, { accepted: opt.value })} />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {d?.accepted === false && (
                      <label className="review-reason">
                        Reason shown to the client
                        <textarea
                          className="pipeline-input"
                          rows={2}
                          value={d.reason}
                          aria-invalid={Boolean(error)}
                          onChange={(e) => setDecision(q.id, { reason: e.target.value })}
                        />
                      </label>
                    )}
                  </>
                )}
                {error && <p className="pipeline-error-text">{error}</p>}
              </li>
            );
          })}
        </ol>

        {dossier.canDecide && (
          <div className="pipeline-panel pipeline-form review-decision">
            <h3>Your decision</h3>
            <p className="pipeline-muted">
              {undecidedCount > 0
                ? `${undecidedCount} question(s) still need a decision.`
                : revisionCount > 0
                ? `${revisionCount} question(s) marked for revision: the client will be asked to revise.`
                : 'Every answer accepted: the submission will be approved.'}
            </p>
            {undecidedCount > 0 && (
              <button type="button" className="btn btn-secondary btn-small" onClick={acceptRemaining}>
                Accept all undecided answers
              </button>
            )}
            <label>
              Conformance score (0 to 100)
              <input
                className="pipeline-input review-score"
                type="text"
                inputMode="numeric"
                value={score}
                aria-invalid={Boolean(errors.score)}
                onChange={(e) => setScore(e.target.value.replace(/[^0-9]/g, ''))}
              />
              {errors.score && <span className="pipeline-error-text">{errors.score}</span>}
            </label>
            <label>
              Accreditation you sign under
              <input
                className="pipeline-input"
                type="text"
                value={accreditation}
                aria-invalid={Boolean(errors.accreditation)}
                onChange={(e) => setAccreditation(e.target.value)}
              />
              {errors.accreditation && <span className="pipeline-error-text">{errors.accreditation}</span>}
            </label>
            <label>
              Note to the client (optional)
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <label className="review-attest">
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
              I, {reviewerName}, reviewed these answers and the evidence myself. The AI pre-screen informed but did not make this decision.
            </label>
            {errors.attested && <p className="pipeline-error-text">{errors.attested}</p>}
            {formError && (
              <p className="pipeline-error-text" role="alert">
                {formError}
              </p>
            )}
            <div className="pipeline-actions">
              <button type="submit" className="btn btn-primary" disabled={busy !== null}>
                {busy === 'decide' ? 'Recording...' : overall === 'APPROVED' ? 'Approve and sign' : 'Request revision and sign'}
              </button>
            </div>
          </div>
        )}
        {!dossier.canDecide && formError && (
          <p className="pipeline-error-text" role="alert">
            {formError}
          </p>
        )}
      </form>
    </section>
  );
};
