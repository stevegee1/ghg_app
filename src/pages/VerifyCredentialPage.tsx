import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, CredentialVerification } from '../api/client';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'done'; record: CredentialVerification };

const formatDate = (iso: string | null) => (iso ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(iso)) : 'Not recorded');

/** Where a website badge links to: the public record of one credential, valid or not. */
export const VerifyCredentialPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    document.title = 'Verify a credential - NFTYLOGS';
    let cancelled = false;
    api
      .verifyCredential(id)
      .then((record) => !cancelled && setState({ status: 'done', record }))
      .catch((err: Error) => !cancelled && setState({ status: 'error', message: err.message }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="container-x verify-credential">
      <p className="merch-eyebrow">Credential verification</p>
      {state.status === 'loading' && <p className="merch-note">Checking the credential...</p>}
      {state.status === 'error' && (
        <div className="verify-credential-card">
          <h1>Credential not found</h1>
          <p>No credential exists with this reference. The badge that linked here may be out of date.</p>
        </div>
      )}
      {state.status === 'done' && (
        <div className="verify-credential-card">
          <span className={`verify-credential-status ${state.record.valid ? 'is-valid' : 'is-invalid'}`}>
            {state.record.valid ? 'Valid' : 'Not currently valid'}
          </span>
          <h1>{state.record.licenseeName}</h1>
          {state.record.clientMessage && <p className="verify-credential-message">{state.record.clientMessage}</p>}
          <dl className="verify-credential-facts">
            {state.record.assessedAgainst && (
              <div>
                <dt>Assessed against</dt>
                <dd>
                  {state.record.assessedAgainst.frameworkName}, version {state.record.assessedAgainst.version} ({state.record.assessedAgainst.standardReference})
                </dd>
              </div>
            )}
            {!state.record.assessedAgainst && state.record.selectedFrameworks.length > 0 && (
              <div>
                <dt>Frameworks</dt>
                <dd>{state.record.selectedFrameworks.join(', ')}</dd>
              </div>
            )}
            <div>
              <dt>Issued</dt>
              <dd>{formatDate(state.record.issuedAt)}</dd>
            </div>
            <div>
              <dt>Valid until</dt>
              <dd>{formatDate(state.record.warrantyExpiresAt)}</dd>
            </div>
            {state.record.verificationSeal && (
              <div>
                <dt>Seal</dt>
                <dd className="verify-credential-seal">{state.record.verificationSeal}</dd>
              </div>
            )}
          </dl>
          <p className="merch-note">{state.record.scopeStatement}</p>
        </div>
      )}
      <Link to="/" className="btn btn-secondary">
        About NFTYLOGS
      </Link>
    </main>
  );
};
