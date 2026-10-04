import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { ClientFramework, ClientSubmission, PipelineFee, PipelineService } from '../../api/pipeline.types';
import { PipelineFrameworkList } from './PipelineFrameworkList';
import { PipelineQuestionnaire } from './PipelineQuestionnaire';
import {
  PipelineAnswerSummary,
  PipelineCredentialIssued,
  PipelineCredentialSetup,
  PipelineInReview,
  PipelinePayment,
} from './PipelineStages';
import { SERVICE_TITLES, STAGES, STATUS_LABELS, stageIndex, statusTone } from './pipelineFormat';

interface Props {
  token: string;
  service: PipelineService;
  onPrepare: () => void;
}

/**
 * The client's GHG or Workforce pipeline on the workflow engine: framework list, then for one
 * submission the questionnaire, review, payment and credential. The open submission is kept in
 * the URL (submission_id) so a refresh or a return from Stripe resumes it.
 */
export const PipelineWorkspace: React.FC<Props> = ({ token, service, onPrepare }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const submissionId = searchParams.get('submission_id');
  const paymentParam = searchParams.get('payment');
  const paymentReturn = paymentParam === 'success' || paymentParam === 'cancelled' ? paymentParam : null;

  const [frameworks, setFrameworks] = useState<ClientFramework[] | null>(null);
  const [fee, setFee] = useState<PipelineFee | null>(null);
  const [submission, setSubmission] = useState<ClientSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const openSubmission = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set('submission_id', id);
          else next.delete('submission_id');
          next.delete('payment');
          return next;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  const loadList = useCallback(async () => {
    setError(null);
    try {
      const [list, fees] = await Promise.all([api.getMyFrameworks(token, service), api.getPipelineFees(token)]);
      setFrameworks(list.frameworks);
      setFee(fees.fees[service]);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token, service]);

  const loadSubmission = useCallback(async () => {
    if (!submissionId) return;
    setError(null);
    try {
      const { submission: loaded } = await api.getClientSubmission(token, submissionId);
      setSubmission(loaded);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token, submissionId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setSubmission(null);
    void loadSubmission();
  }, [loadSubmission]);

  const start = async (framework: ClientFramework) => {
    setStarting(framework.frameworkId);
    setError(null);
    try {
      const { submission: draft } = await api.startPipelineDraft(token, framework.workflowType, framework.frameworkId);
      openSubmission(draft.id);
      void loadList();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(null);
    }
  };

  const refreshSubmission = useCallback(() => {
    void loadSubmission();
    void loadList();
  }, [loadSubmission, loadList]);

  const copy = SERVICE_TITLES[service];

  return (
    <section className="pipeline-workspace" aria-labelledby="pipeline-title">
      <header className="pipeline-header">
        {submissionId && (
          <button type="button" className="pipeline-back" onClick={() => openSubmission(null)}>
            All frameworks
          </button>
        )}
        <h2 id="pipeline-title">{submission ? submission.framework.name : copy.title}</h2>
        <p className="pipeline-muted">{submission ? submission.framework.description ?? copy.summary : copy.summary}</p>
      </header>

      {error && (
        <div className="pipeline-panel pipeline-state-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={submissionId ? refreshSubmission : loadList}>
            Try again
          </button>
        </div>
      )}

      {!submissionId && (
        <>
          {!frameworks && !error && <div className="pipeline-panel pipeline-muted">Loading your frameworks...</div>}
          {frameworks && (
            <PipelineFrameworkList
              frameworks={frameworks}
              fee={fee}
              starting={starting}
              onStart={start}
              onOpen={openSubmission}
              onPrepare={onPrepare}
            />
          )}
        </>
      )}

      {submissionId && !submission && !error && <div className="pipeline-panel pipeline-muted">Loading submission...</div>}

      {submission && (
        <div className="pipeline-stack">
          <div className="pipeline-status-row">
            <ol className="pipeline-stages" aria-label="Progress">
              {STAGES.map((label, i) => {
                const current = stageIndex(submission.status);
                const done = i < current || submission.status === 'BADGE_ISSUED';
                return (
                  <li key={label} className={done ? 'is-done' : i === current ? 'is-current' : ''} aria-current={i === current ? 'step' : undefined}>
                    <span className="pipeline-stage-number" aria-hidden="true">
                      {done ? '✓' : i + 1}
                    </span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>
            <span className={`pipeline-chip tone-${statusTone(submission.status)}`}>{STATUS_LABELS[submission.status]}</span>
          </div>

          {(submission.status === 'DRAFT' || submission.status === 'REJECTED') && (
            <PipelineQuestionnaire key={submission.id + submission.status} token={token} submission={submission} onSubmitted={refreshSubmission} />
          )}

          {(submission.status === 'SUBMITTED' || submission.status === 'AI_SCREENED' || submission.status === 'UNDER_REVIEW') && (
            <PipelineInReview submission={submission} />
          )}

          {submission.status === 'APPROVED' && (
            <PipelinePayment token={token} submission={submission} fee={fee} paymentReturn={paymentReturn} onRefresh={refreshSubmission} />
          )}

          {submission.status === 'PAID' && <PipelineCredentialSetup token={token} submission={submission} onIssued={refreshSubmission} />}

          {submission.status === 'BADGE_ISSUED' && <PipelineCredentialIssued token={token} submission={submission} />}

          {submission.status !== 'DRAFT' && submission.status !== 'REJECTED' && <PipelineAnswerSummary token={token} submission={submission} />}
        </div>
      )}
    </section>
  );
};
