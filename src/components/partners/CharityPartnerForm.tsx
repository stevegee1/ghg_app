import React, { useState } from 'react';
import { api } from '../../api/client';

interface Props {
  open: boolean;
  onApplied: () => void;
}

/** Application to become one of the (at most three) charity partners. The server enforces the limit. */
export const CharityPartnerForm: React.FC<Props> = ({ open, onApplied }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [statement, setStatement] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) {
    return (
      <div className="partners-done">
        <h3>All three places are taken</h3>
        <p>We work with up to three charities at a time. A place opens when a partnership ends; check back then.</p>
      </div>
    );
  }
  if (done) {
    return (
      <div className="partners-done" role="status">
        <h3>Application received</h3>
        <p>We check your registration and contact you by email. If approved, you complete payment onboarding with Stripe.</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !statement.trim()) return setError('Charity name, contact email and statement are required.');
    setSending(true);
    setError(null);
    try {
      await api.applyCharity({
        name: name.trim(),
        registeredCharityNumber: number.trim() || undefined,
        contactEmail: email.trim(),
        statement: statement.trim(),
      });
      setDone(true);
      onApplied();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="partners-form" onSubmit={submit} noValidate>
      <div className="partners-grid">
        <label>
          Charity name
          <input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Registered charity number
          <input value={number} maxLength={40} placeholder="Charity Commission or OSCR number" onChange={(e) => setNumber(e.target.value)} />
        </label>
      </div>
      <label>
        Contact email
        <input type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        What would the funding support?
        <textarea rows={3} maxLength={2000} value={statement} onChange={(e) => setStatement(e.target.value)} />
      </label>
      {error && (
        <p className="partners-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={sending}>
        {sending ? 'Sending...' : 'Apply as a charity partner'}
      </button>
    </form>
  );
};
