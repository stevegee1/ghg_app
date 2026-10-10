import React, { useState } from 'react';
import { api } from '../../api/client';
import { CAPACITY_BANDS, CERTIFICATIONS, DELIVERY_CAPABILITIES, PRODUCTION_CAPABILITIES } from './partnerOptions';

/** Application for local delivery and production partners for merch orders. */
export const DeliveryPartnerForm: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [area, setArea] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [capacity, setCapacity] = useState('UNDER_500');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !workEmail.trim() || !area.trim()) return setError('Company name, work email and service area are required.');
    if (capabilities.length === 0) return setError('Choose at least one service.');
    setSending(true);
    setError(null);
    try {
      const res = await api.applyFulfillmentPartner({
        companyName: companyName.trim(),
        workEmail: workEmail.trim(),
        countryCode: 'GB',
        regionOfOperation: area.trim(),
        capabilities,
        monthlyCapacityUnits: capacity,
        certifications,
        message: message.trim() || undefined,
      });
      setDone(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="partners-done" role="status">
        <h3>Check your inbox</h3>
        <p>{done}</p>
      </div>
    );
  }

  const checkboxes = (items: { id: string; label: string }[], selected: string[], set: (v: string[]) => void) =>
    items.map((item) => (
      <label key={item.id} className="partners-check">
        <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(selected, set, item.id)} />
        <span>{item.label}</span>
      </label>
    ));

  return (
    <form className="partners-form" onSubmit={submit} noValidate>
      <div className="partners-grid">
        <label>
          Company name
          <input value={companyName} maxLength={160} onChange={(e) => setCompanyName(e.target.value)} />
        </label>
        <label>
          Work email
          <span className="partners-hint">Use your company email address. Personal addresses such as Gmail are not accepted.</span>
          <input type="email" value={workEmail} maxLength={254} onChange={(e) => setWorkEmail(e.target.value)} />
        </label>
      </div>
      <label>
        Area you cover
        <input value={area} maxLength={300} placeholder="Towns, cities or postcode districts, e.g. Leeds, LS1-LS17" onChange={(e) => setArea(e.target.value)} />
      </label>
      <fieldset>
        <legend>Delivery</legend>
        <div className="partners-checks">{checkboxes(DELIVERY_CAPABILITIES, capabilities, setCapabilities)}</div>
      </fieldset>
      <fieldset>
        <legend>Production (optional)</legend>
        <div className="partners-checks">{checkboxes(PRODUCTION_CAPABILITIES, capabilities, setCapabilities)}</div>
      </fieldset>
      <div className="partners-grid">
        <label>
          Monthly capacity
          <select value={capacity} onChange={(e) => setCapacity(e.target.value)}>
            {CAPACITY_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Certifications (optional)</legend>
        <div className="partners-checks">{checkboxes(CERTIFICATIONS, certifications, setCertifications)}</div>
      </fieldset>
      <label>
        Anything else (optional)
        <textarea rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {error && (
        <p className="partners-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={sending}>
        {sending ? 'Sending...' : 'Apply as a delivery partner'}
      </button>
    </form>
  );
};
