import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

/** Opt in or out of the public transparency page. Off unless the organisation turns it on. */
export const TransparencyListingCard: React.FC = () => {
  const { token, user, updateUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const listed = Boolean(user?.listedOnTransparency);

  const toggle = async () => {
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.updateProfile(token, { listedOnTransparency: !listed });
      updateUser({ listedOnTransparency: Boolean(res.user?.listedOnTransparency) });
      setMessage({ tone: 'ok', text: res.user?.listedOnTransparency ? 'Your organisation is now listed.' : 'Your organisation is no longer listed.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-logo-card" aria-labelledby="transparency-listing-title">
      <div className="profile-logo-body">
        <h3 id="transparency-listing-title">Public transparency listing</h3>
        <p className="merch-note">
          When listed, your organisation name, settled payments, charity contribution and latest jobs figure appear on the public{' '}
          <Link to="/transparency">transparency page</Link>. Off unless you turn it on.
        </p>
        <label className="profile-listing-toggle">
          <input type="checkbox" checked={listed} disabled={busy} onChange={toggle} />
          <span>List my organisation on the transparency page</span>
        </label>
        {message && (
          <p className={message.tone === 'error' ? 'merch-error' : 'merch-note'} role={message.tone === 'error' ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
};
