import React, { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useProfileLogo } from './useProfileLogo';

/** Upload the organisation's logo once; it is reused when setting up credentials. */
export const ProfileLogoCard: React.FC = () => {
  const { token, user, updateUser } = useAuth();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const src = useProfileLogo(token, user?.logoUrl, version);

  const upload = async (file: File | undefined) => {
    if (!file || !token) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.uploadProfileLogo(token, file);
      updateUser({ logoUrl: res.logoUrl });
      setVersion((v) => v + 1);
      setMessage({ tone: 'ok', text: 'Logo saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.removeProfileLogo(token);
      updateUser({ logoUrl: null });
      setMessage({ tone: 'ok', text: 'Logo removed.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-logo-card" aria-labelledby="profile-logo-title">
      <div className="profile-logo-preview">
        {src ? <img src={src} alt={`${user?.companyName ?? 'Organisation'} logo`} /> : <span aria-hidden="true">{(user?.companyName ?? 'O').slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="profile-logo-body">
        <h3 id="profile-logo-title">Organisation logo</h3>
        <p className="merch-note">PNG, JPG, SVG or WEBP, up to 5 MB. Used on your credentials and in your account menu; only your team can see it here.</p>
        <div className="profile-logo-actions">
          <label className={`btn btn-secondary btn-small${busy ? ' is-disabled' : ''}`}>
            {user?.logoUrl ? 'Replace logo' : 'Upload logo'}
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.webp"
              className="visually-hidden"
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {user?.logoUrl && (
            <button type="button" className="btn btn-secondary btn-small" onClick={remove} disabled={busy}>
              Remove
            </button>
          )}
        </div>
        {message && (
          <p className={message.tone === 'error' ? 'merch-error' : 'merch-note'} role={message.tone === 'error' ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
};
