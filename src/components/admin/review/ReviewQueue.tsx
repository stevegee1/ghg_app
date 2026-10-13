import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../api/client';
import type { ReviewQueueItem, ReviewQueueStage } from '../../../api/review.types';
import { formatDate } from '../../pipeline/pipelineFormat';
import { ReviewDossierView } from './ReviewDossierView';
import { REVIEW_STATUS_LABELS, WORKFLOW_TYPE_LABELS, reviewStatusTone } from './reviewFormat';

const STAGES: { id: ReviewQueueStage; label: string }[] = [
  { id: 'awaiting', label: 'Awaiting decision' },
  { id: 'decided', label: 'Decided' },
  { id: 'all', label: 'All' },
];

/** The Lead Auditor's queue of GHG and Workforce submissions on the workflow engine. */
export const ReviewQueue: React.FC<{ token: string }> = ({ token }) => {
  const [stage, setStage] = useState<ReviewQueueStage>('awaiting');
  const [items, setItems] = useState<ReviewQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ?review=<submission id> opens that dossier directly, for example from the Readiness Tracker.
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('review');
  const setOpenId = (id: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('review', id);
      else next.delete('review');
      return next;
    });

  const load = useCallback(async () => {
    setError(null);
    setItems(null);
    try {
      setItems((await api.getReviewQueue(token, stage)).submissions);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token, stage]);

  useEffect(() => {
    void load();
  }, [load]);

  if (openId) {
    return (
      <ReviewDossierView
        token={token}
        submissionId={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  return (
    <section className="pipeline-workspace" aria-labelledby="review-queue-title">
      <header className="pipeline-header">
        <h2 id="review-queue-title">Review queue</h2>
        <p className="pipeline-muted">GHG and Workforce submissions. The audit engine pre-screen is advice; every decision is yours.</p>
      </header>

      <div className="review-segmented" role="tablist" aria-label="Queue filter">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={stage === s.id}
            className={`review-segment${stage === s.id ? ' is-selected' : ''}`}
            onClick={() => setStage(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="pipeline-panel pipeline-state-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={load}>
            Try again
          </button>
        </div>
      )}
      {!items && !error && <div className="pipeline-panel pipeline-muted">Loading the queue...</div>}
      {items && items.length === 0 && (
        <div className="pipeline-panel pipeline-empty">
          <h3>{stage === 'awaiting' ? 'Nothing awaiting a decision' : 'No submissions here yet'}</h3>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="review-list">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="pipeline-panel review-row" onClick={() => setOpenId(item.id)}>
                <span className="review-row-main">
                  <strong>{item.licensee.name}</strong>
                  <span>{item.framework.name}</span>
                  <span className="pipeline-muted">
                    {WORKFLOW_TYPE_LABELS[item.workflowType]}
                    {item.submittedAt ? ` · submitted ${formatDate(item.submittedAt)}` : ''}
                    {item.decidedBy ? ` · decided by ${item.decidedBy}` : ''}
                  </span>
                </span>
                <span className="review-row-meta">
                  <span className={`pipeline-chip tone-${reviewStatusTone(item.status)}`}>{REVIEW_STATUS_LABELS[item.status]}</span>
                  {item.ai && (
                    <span className="pipeline-muted">
                      Engine advice: {item.ai.recommendation === 'APPROVE' ? 'approve' : 'revise'}
                      {item.ai.score !== null ? `, ${item.ai.score}%` : ''}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
