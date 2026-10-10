import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

type State = { status: 'loading' } | { status: 'done'; kind: 'CHARITY' | 'DELIVERY' } | { status: 'error'; message: string };

/** Landing page for the link in a partner application's confirmation email. */
export const PartnerEmailVerifyPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>(token ? { status: 'loading' } : { status: 'error', message: 'This link is incomplete.' });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .verifyPartnerEmail(token)
      .then((res) => !cancelled && setState({ status: 'done', kind: res.kind }))
      .catch((err: Error) => !cancelled && setState({ status: 'error', message: err.message }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="partners-page">
      <section className="partners-hero container-x" aria-live="polite">
        <p className="partners-eyebrow">Partner application</p>
        {state.status === 'loading' && <h1>Confirming your email...</h1>}
        {state.status === 'done' && (
          <>
            <h1>Email confirmed</h1>
            <p>Your application is now with our team. We reply by email, usually within a few working days.</p>
            <Link to={state.kind === 'CHARITY' ? '/partners/charities' : '/partners/delivery'} className="btn btn-secondary">
              Back to the programme
            </Link>
          </>
        )}
        {state.status === 'error' && (
          <>
            <h1>We could not confirm this email</h1>
            <p>{state.message}</p>
            <Link to="/partners" className="btn btn-secondary">
              Go to partner programmes
            </Link>
          </>
        )}
      </section>
    </main>
  );
};
