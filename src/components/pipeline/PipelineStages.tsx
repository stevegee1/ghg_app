import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { ClientSubmission, PipelineFee } from '../../api/pipeline.types';
import { formatDate, formatFee } from './pipelineFormat';

/** Read-only answers, shown while the submission is in review and after it is approved. */
export const PipelineAnswerSummary: React.FC<{ token: string; submission: ClientSubmission }> = ({ token, submission }) => (
  <details className="pipeline-panel pipeline-summary">
    <summary>Your answers ({submission.questions.length})</summary>
    <dl>
      {submission.questions.map((q) => (
        <div key={q.id} className="pipeline-summary-row">
          <dt>{q.text}</dt>
          <dd>
            {q.answerType === 'BOOLEAN' ? (q.answer?.value === 'true' ? 'Yes' : q.answer?.value === 'false' ? 'No' : '') : q.answer?.value}
            {q.answer?.evidence && (
              <button
                type="button"
                className="pipeline-link"
                onClick={() => api.downloadEvidenceFile(token, q.answer!.evidence!.fileUrl, q.answer!.evidence!.fileName).catch(() => undefined)}
              >
                {q.answer.evidence.fileName}
              </button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  </details>
);

export const PipelineInReview: React.FC<{ submission: ClientSubmission }> = ({ submission }) => (
  <div className="pipeline-panel pipeline-stage-panel" role="status">
    <h3>In review</h3>
    <p>
      A Lead Auditor is reviewing your submission{submission.submittedAt ? `, sent on ${formatDate(submission.submittedAt)}` : ''}. We email you
      when there is a decision. If anything needs changing, the auditor's reason appears against each question.
    </p>
  </div>
);

interface PaymentProps {
  token: string;
  submission: ClientSubmission;
  fee: PipelineFee | null;
  paymentReturn: 'success' | 'cancelled' | null;
  onRefresh: () => void;
}

export const PipelinePayment: React.FC<PaymentProps> = ({ token, submission, fee, paymentReturn, onRefresh }) => {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe confirms payment by webhook, so poll briefly after returning from checkout.
  useEffect(() => {
    if (paymentReturn !== 'success') return;
    const interval = setInterval(onRefresh, 3000);
    const stop = setTimeout(() => clearInterval(interval), 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [paymentReturn, onRefresh]);

  const pay = async () => {
    setStarting(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.startPipelineCheckout(token, submission.id);
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  };

  return (
    <div className="pipeline-panel pipeline-stage-panel">
      <h3>Approved</h3>
      {submission.review && (
        <p>
          {submission.review.reviewerName}
          {submission.review.reviewerAccreditation ? ` (${submission.review.reviewerAccreditation})` : ''} approved your submission with a
          conformance score of {submission.review.score}%.
        </p>
      )}
      {paymentReturn === 'success' ? (
        <p className="pipeline-notice" role="status">
          Payment received. Your credential setup unlocks as soon as Stripe confirms it, usually within a minute.
          <button type="button" className="btn btn-secondary btn-small" onClick={onRefresh}>
            Refresh
          </button>
        </p>
      ) : (
        <>
          {paymentReturn === 'cancelled' && <p className="pipeline-muted">Checkout was cancelled. You have not been charged.</p>}
          <p>Pay the assurance fee to set up your credential.</p>
          <div className="pipeline-actions">
            <button type="button" className="btn btn-primary" onClick={pay} disabled={starting || !fee}>
              {starting ? 'Opening checkout...' : fee ? `Pay ${formatFee(fee)}` : 'Pay assurance fee'}
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="pipeline-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

const MESSAGE_MAX = 100;

export const PipelineCredentialSetup: React.FC<{ token: string; submission: ClientSubmission; onIssued: () => void }> = ({
  token,
  submission,
  onIssued,
}) => {
  const [logo, setLogo] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const issue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logo) return setError('Choose your logo.');
    if (!message.trim()) return setError('Write the message shown on your credential.');
    setIssuing(true);
    setError(null);
    try {
      await api.issuePipelineCredential(token, submission.id, logo, message.trim());
      onIssued();
    } catch (err) {
      setError((err as Error).message);
      setIssuing(false);
    }
  };

  return (
    <form className="pipeline-panel pipeline-stage-panel pipeline-form" onSubmit={issue} noValidate>
      <h3>Set up your credential</h3>
      <p>Your logo and message appear on the credential next to ours. Both are fixed once it is issued.</p>
      <label>
        Your logo (PNG, JPG, SVG or WEBP, up to 5 MB)
        <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
      </label>
      <label>
        Credential message
        <textarea rows={2} maxLength={MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} aria-describedby="pipeline-message-count" />
        <span id="pipeline-message-count" className="pipeline-muted">
          {message.length} of {MESSAGE_MAX} characters
        </span>
      </label>
      {error && (
        <p className="pipeline-error-text" role="alert">
          {error}
        </p>
      )}
      <div className="pipeline-actions">
        <button type="submit" className="btn btn-primary" disabled={issuing}>
          {issuing ? 'Issuing...' : 'Issue credential'}
        </button>
      </div>
    </form>
  );
};

export const PipelineCredentialIssued: React.FC<{ token: string; submission: ClientSubmission }> = ({ token, submission }) => {
  const [error, setError] = useState<string | null>(null);
  const credential = submission.credential;
  if (!credential) return null;
  const verifyUrl = `${window.location.origin}${credential.verifyPath}`;

  const downloadPdf = async () => {
    setError(null);
    try {
      const { blob, fileName } = await api.downloadFile(token, `/api/workflow/submissions/${encodeURIComponent(submission.id)}/pdf`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="pipeline-panel pipeline-stage-panel">
      <h3>Credential issued</h3>
      <img className="pipeline-badge" src={credential.badgePath} alt={`${submission.framework.name} credential badge`} />
      <dl className="pipeline-facts">
        <div>
          <dt>Issued</dt>
          <dd>{formatDate(credential.issuedAt)}</dd>
        </div>
        {credential.warrantyExpiresAt && (
          <div>
            <dt>Valid until</dt>
            <dd>{formatDate(credential.warrantyExpiresAt)}</dd>
          </div>
        )}
        <div>
          <dt>Public verification link</dt>
          <dd className="pipeline-break">
            <a href={verifyUrl} target="_blank" rel="noopener noreferrer">
              {verifyUrl}
            </a>
          </dd>
        </div>
      </dl>
      <div className="pipeline-actions">
        <button type="button" className="btn btn-primary" onClick={downloadPdf}>
          Download audit proof (PDF)
        </button>
      </div>
      {error && (
        <p className="pipeline-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
