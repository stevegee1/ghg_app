import React, { useEffect, useState } from 'react';
import { api, MyCredential } from '../../api/client';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; credentials: MyCredential[] };

/** Copy-paste HTML: a plain link and image, so it works on any website or CMS and runs no script. */
function badgeSnippet(origin: string, credential: MyCredential, companyName: string): string {
  const alt = `${companyName}: readiness reviewed by NFTYLOGS`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return [
    `<a href="${origin}/verify/credential/${credential.id}" target="_blank" rel="noopener">`,
    `  <img src="${origin}/api/credentials/${credential.id}/badge.png" alt="${alt}" width="320" style="max-width:100%;height:auto">`,
    `</a>`,
  ].join('\n');
}

const BadgeRow: React.FC<{ credential: MyCredential; companyName: string }> = ({ credential, companyName }) => {
  const [copied, setCopied] = useState(false);
  const origin = window.location.origin;
  const snippet = badgeSnippet(origin, credential, companyName);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <li className="badge-row">
      <div className="badge-row-preview">
        <img src={`/api/credentials/${credential.id}/badge.png`} alt={`${companyName} badge preview`} />
      </div>
      <div className="badge-row-body">
        <p className="badge-row-title">{credential.selectedFrameworks.join(', ') || 'Readiness credential'}</p>
        <p className="merch-note">
          Valid until {credential.warrantyExpiresAt ? new Date(credential.warrantyExpiresAt).toLocaleDateString('en-GB') : 'not recorded'}. The badge stops showing
          automatically if the credential expires or is withdrawn.
        </p>
        <label className="merch-field">
          <span>HTML to paste into your website</span>
          <textarea className="form-input badge-row-code" readOnly rows={4} value={snippet} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <div className="badge-row-actions">
          <button type="button" className="btn btn-primary" onClick={copy}>
            {copied ? 'Copied' : 'Copy HTML'}
          </button>
          <a className="btn btn-secondary" href={`/verify/credential/${credential.id}`} target="_blank" rel="noopener noreferrer">
            Open verification page
          </a>
        </div>
      </div>
    </li>
  );
};

/** The client's website badge: our mark and theirs with their message, linking to the public record. */
export const WebsiteBadgePanel: React.FC<{ token: string; companyName: string; onStart: () => void }> = ({ token, companyName, onStart }) => {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api
      .listMyCredentials(token)
      .then((res) => !cancelled && setState({ status: 'done', credentials: res.credentials.filter((c) => c.valid && c.hasBadgeImage) }))
      .catch((err: Error) => !cancelled && setState({ status: 'error', message: err.message }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="merch-panel badge-panel" aria-labelledby="badge-panel-title">
      <h2 id="badge-panel-title" className="merch-panel-title">Website badge</h2>
      <p className="merch-note">
        Show visitors that your submission was reviewed. The badge carries our mark, your logo and your message, and links to a public page anyone can
        check.
      </p>
      {state.status === 'loading' && <p className="merch-note">Loading your credentials...</p>}
      {state.status === 'error' && (
        <p className="merch-error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'done' && state.credentials.length === 0 && (
        <div className="badge-empty">
          <p>You will get a badge when the Lead Auditor approves a submission and you set up its credential.</p>
          <button type="button" className="btn btn-primary" onClick={onStart}>
            Go to your compliance work
          </button>
        </div>
      )}
      {state.status === 'done' && state.credentials.length > 0 && (
        <ul className="badge-list">
          {state.credentials.map((c) => (
            <BadgeRow key={c.id} credential={c} companyName={companyName} />
          ))}
        </ul>
      )}
    </section>
  );
};
