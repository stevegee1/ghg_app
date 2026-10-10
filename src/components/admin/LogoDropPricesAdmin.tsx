import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Row {
  id: string;
  name: string;
  pricePerDropCents: number | null;
}

const toPounds = (pence: number | null) => (pence === null ? '' : (pence / 100).toFixed(2));

const PriceRow: React.FC<{ token: string; row: Row; currency: string; onSaved: (r: Row) => void }> = ({ token, row, currency, onSaved }) => {
  const [price, setPrice] = useState(toPounds(row.pricePerDropCents));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);

  const save = async () => {
    const trimmed = price.trim();
    if (trimmed && !/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      return setMessage({ tone: 'error', text: 'Enter a price like 5 or 5.00, or leave it empty to stop offering logo drops.' });
    }
    const pence = trimmed ? Math.round(Number(trimmed) * 100) : null;
    if (pence !== null && pence <= 0) return setMessage({ tone: 'error', text: 'The price must be more than zero.' });
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.updateLogoDropPrice(token, row.id, pence);
      onSaved(res.licensee);
      setMessage({ tone: 'ok', text: 'Saved.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="merch-admin-row">
      <div className="merch-admin-info">
        <strong>{row.name}</strong>
        <span className="fleet-muted">{row.id}</span>
      </div>
      <label className="merch-admin-field">
        <span>Price per drop ({currency})</span>
        <input inputMode="decimal" value={price} placeholder="Not offered" onChange={(e) => setPrice(e.target.value)} />
      </label>
      <span />
      <button type="button" className="btn btn-primary" disabled={saving || price === toPounds(row.pricePerDropCents)} onClick={save}>
        {saving ? 'Saving...' : 'Save'}
      </button>
      {message && (
        <p className={message.tone === 'error' ? 'fleet-error-text' : 'fleet-muted'} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </li>
  );
};

/** Each client's price per logo drop, used by the portal and the B2B API. */
export const LogoDropPricesAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<{ currency: string; licensees: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .getAdminLogoDropPrices(token)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [token]);
  useEffect(load, [load]);

  const replace = (updated: Row) =>
    setData((prev) => (prev ? { ...prev, licensees: prev.licensees.map((l) => (l.id === updated.id ? updated : l)) } : prev));

  return (
    <div className="fleet-panel">
      <h3 className="fleet-panel-title">Logo drop prices per client</h3>
      <p className="fleet-muted">Charged for logo drops ordered in the portal or through the B2B API. Leave empty to stop offering them.</p>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="fleet-state">Loading prices...</p>}
      {data && data.licensees.length === 0 && <p className="fleet-muted">No clients yet.</p>}
      {data && (
        <ul className="merch-admin-list">
          {data.licensees.map((l) => (
            <PriceRow key={l.id} token={token} row={l} currency={data.currency} onSaved={replace} />
          ))}
        </ul>
      )}
    </div>
  );
};
