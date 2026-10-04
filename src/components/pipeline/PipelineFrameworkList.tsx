import React from 'react';
import type { ClientFramework, PipelineFee } from '../../api/pipeline.types';
import { STATUS_LABELS, formatDate, formatFee, statusTone } from './pipelineFormat';

interface Props {
  frameworks: ClientFramework[];
  fee: PipelineFee | null;
  starting: string | null;
  onStart: (framework: ClientFramework) => void;
  onOpen: (submissionId: string) => void;
  onPrepare: () => void;
}

export const PipelineFrameworkList: React.FC<Props> = ({ frameworks, fee, starting, onStart, onOpen, onPrepare }) => {
  if (frameworks.length === 0) {
    return (
      <div className="pipeline-panel pipeline-empty">
        <h3>No frameworks yet</h3>
        <p>Your frameworks come from your onboarding answers. Complete onboarding for this service to see them here.</p>
      </div>
    );
  }

  return (
    <ul className="pipeline-frameworks">
      {frameworks.map((f) => {
        const latest = f.latestSubmission;
        const prepReady = f.preparation?.ready ?? false;
        return (
          <li key={f.frameworkId} className="pipeline-panel pipeline-framework">
            <div className="pipeline-framework-head">
              <div>
                <h3>{f.name}</h3>
                <p className="pipeline-muted">
                  {f.governingBody ? `${f.governingBody} · ` : ''}
                  Version {f.currentVersion.version} · {f.questionCount} questions
                </p>
              </div>
              <span className={`pipeline-chip ${f.isLegallyMandatory ? 'tone-attention' : 'tone-neutral'}`}>
                {f.isLegallyMandatory ? 'Required by law' : 'Recommended'}
              </span>
            </div>

            <p className="pipeline-framework-why">{f.plainEnglishWhy}</p>

            {latest && (
              <p className="pipeline-framework-status">
                <span className={`pipeline-chip tone-${statusTone(latest.status)}`}>{STATUS_LABELS[latest.status]}</span>
                <span className="pipeline-muted">Updated {formatDate(latest.updatedAt)}</span>
              </p>
            )}
            {latest?.open && latest.newerVersionAvailable && (
              <p className="pipeline-muted">
                This submission is on version {latest.version}. Version {f.currentVersion.version} is now current and applies to your next
                submission.
              </p>
            )}

            <div className="pipeline-actions">
              {!f.entitled ? (
                <p className="pipeline-muted">This service is not active on your account. Contact us to activate it.</p>
              ) : !prepReady ? (
                <>
                  <p className="pipeline-muted">
                    Finish preparation first
                    {f.preparation ? ` (${f.preparation.completedItems} of ${f.preparation.totalItems} items done)` : ''}.
                  </p>
                  <button type="button" className="btn btn-secondary" onClick={onPrepare}>
                    Go to preparation
                  </button>
                </>
              ) : latest?.open ? (
                <button type="button" className="btn btn-primary" onClick={() => onOpen(latest.id)}>
                  {latest.status === 'DRAFT' || latest.status === 'REJECTED' ? 'Continue' : 'View'}
                </button>
              ) : (
                <>
                  {latest && (
                    <button type="button" className="btn btn-secondary" onClick={() => onOpen(latest.id)}>
                      View credential
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={starting !== null}
                    onClick={() => onStart(f)}
                  >
                    {starting === f.frameworkId ? 'Starting...' : latest ? 'Start a new submission' : 'Start questionnaire'}
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
      {fee && (
        <li className="pipeline-fee-note pipeline-muted">
          One assurance fee of {formatFee(fee)} per framework, payable after the Lead Auditor approves your submission.
        </li>
      )}
    </ul>
  );
};
