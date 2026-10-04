import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatDate } from '../pipeline/pipelineFormat';

interface PendingSubmission {
  id: string;
  selectedFrameworks: string[];
  paidAt: string;
  createdAt: string;
}

const MESSAGE_MAX = 200;

/**
 * Readiness submissions from the retired ISO pipeline that were approved and paid but never got
 * their credential. Shown only when there is one to issue.
 */
export const LegacyCredentialPanel: React.FC<{ token: string; onIssued: () => void }> = ({ token, onIssued }) => {
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials/legacy-pending', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPending(((await res.json()) as { submissions: PendingSubmission[] }).submissions);
    } catch {
      setPending([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (pending.length === 0) return null;

  const issue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openId) return;
    if (!logo) return setError('Choose your logo.');
    if (!message.trim()) return setError('Write the message shown on your credential.');
    setIssuing(true);
    setError(null);
    try {
      await api.issueCredential(token, { clientLogoFile: logo, clientMessage: message.trim(), submissionId: openId });
      setOpenId(null);
      setLogo(null);
      setMessage('');
      await load();
      onIssued();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <section className="pipeline-panel pipeline-revision legacy-credential" aria-labelledby="legacy-credential-title">
      <h3 id="legacy-credential-title">Credential ready to issue</h3>
      <p>Your earlier readiness review was approved and paid. Add your logo and message to issue its credential.</p>
      <ul className="pipeline-plain-list">
        {pending.map((p) => (
          <li key={p.id}>
            <span>
              {p.selectedFrameworks.length > 0 ? p.selectedFrameworks.join(', ') : 'Readiness review'} · paid {formatDate(p.paidAt)}
            </span>
            {openId !== p.id && (
              <button type="button" className="btn btn-primary btn-small" onClick={() => setOpenId(p.id)}>
                Issue credential
              </button>
            )}
          </li>
        ))}
      </ul>
      {openId && (
        <form className="pipeline-form" onSubmit={issue} noValidate>
          <label>
            Your logo (PNG, JPG, SVG or WEBP, up to 5 MB)
            <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
          </label>
          <label>
            Credential message
            <textarea rows={2} maxLength={MESSAGE_MAX} value={message} onChange={(e) => setMessage(e.target.value)} />
            <span className="pipeline-muted">
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
            <button type="button" className="btn btn-secondary" onClick={() => setOpenId(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
