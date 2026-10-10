import React, { useState } from 'react';
import { api } from '../../api/client';

interface Props {
  open: boolean;
  /** How many charities we support at once, from the API. */
  maxCapacity: number | null;
  onApplied: () => void;
}

/** Application to become a charity partner. The server enforces the limit and the email check. */
export const CharityPartnerForm: React.FC<Props> = ({ open, maxCapacity, onApplied }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [statement, setStatement] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="partners-done">
        <h3>Applications are closed</h3>
        <p>
          {maxCapacity ? `All ${maxCapacity} places are taken. ` : 'All places are taken. '}
          Applications reopen when a current partnership ends.
        </p>
      </div>
    );
  }
  if (done) {
    return (
      <div className="partners-done" role="status">
        <h3>Check your inbox</h3>
        <p>{done}</p>
        <p>After you confirm, we check your registration and reply by email. If approved, you set up payouts with Stripe.</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !statement.trim()) return setError('Charity name, work email and statement are required.');
    setSending(true);
    setError(null);
    try {
      const res = await api.applyCharity({
        name: name.trim(),
        registeredCharityNumber: number.trim() || undefined,
        contactEmail: email.trim(),
        statement: statement.trim(),
      });
      setDone(res.message);
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
        Work email
        <span className="partners-hint">Use your charity's own email address. Personal addresses such as Gmail are not accepted.</span>
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
