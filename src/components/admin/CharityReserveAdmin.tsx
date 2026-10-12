import React, { useCallback, useEffect, useState } from 'react';
import { api, CharityReserveView } from '../../api/client';

interface ActiveCharity {
  id: string;
  name: string;
}

const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);

/** Equal shares in basis points that add up to exactly 10000. */
const equalShares = (ids: string[]): Record<string, number> => {
  const base = Math.floor(10000 / ids.length);
  return Object.fromEntries(ids.map((id, i) => [id, base + (i === 0 ? 10000 - base * ids.length : 0)]));
};

const AssignForm: React.FC<{
  token: string;
  currency: string;
  totalCents: number;
  charities: ActiveCharity[];
  onAssigned: (message: string) => void;
}> = ({ token, currency, totalCents, charities, onAssigned }) => {
  const [shares, setShares] = useState<Record<string, number>>(() => equalShares(charities.map((c) => c.id)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = Object.entries(shares).filter(([, bps]) => bps > 0);
  const sum = chosen.reduce((total, [, bps]) => total + bps, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sum !== 10000) return setError(`Shares must add up to 100%. They add up to ${(sum / 100).toFixed(2)}%.`);
    if (!window.confirm(`Assign ${formatMoney(totalCents, currency)} to the selected charities and pay them now?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.assignCharityReserve(token, {
        currency,
        charityAllocationBps: chosen.map(([charityId, bps]) => ({ charityId, bps })),
      });
      onAssigned(
        res.failedTransfers > 0
          ? `Assigned ${formatMoney(res.totalCents, currency)}. ${res.failedTransfers} payment(s) failed and are recorded for retry.`
          : `Assigned and paid ${formatMoney(res.totalCents, currency)} from ${res.paymentCount} payment(s).`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="reserve-assign" onSubmit={submit}>
      <ul className="reserve-assign-list">
        {charities.map((c) => (
          <li key={c.id} className="reserve-assign-row">
            <span>{c.name}</span>
            <label className="reserve-assign-share">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={(shares[c.id] ?? 0) / 100}
                onChange={(e) => setShares((prev) => ({ ...prev, [c.id]: Math.round(Number(e.target.value) * 100) || 0 }))}
                aria-label={`Share for ${c.name}, percent`}
              />
              <span>%</span>
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={saving || chosen.length === 0}>
        {saving ? 'Assigning...' : `Assign ${formatMoney(totalCents, currency)}`}
      </button>
    </form>
  );
};

/** Charity share held from payments taken while the split named no charities, and assigning it. */
export const CharityReserveAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<CharityReserveView | null>(null);
  const [charities, setCharities] = useState<ActiveCharity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.getCharityReserve(token), api.getActiveCharities()])
      .then(([reserve, active]) => {
        setData(reserve);
        setCharities(Array.isArray(active?.charities) ? active.charities.map((c: ActiveCharity) => ({ id: c.id, name: c.name })) : []);
      })
      .catch((err: Error) => setError(err.message));
  }, [token]);
  useEffect(load, [load]);

  return (
    <div className="fleet-panel">
      <h3 className="fleet-panel-title">Held charity share</h3>
      <p className="fleet-muted">
        When the split names no charities, the charity share of each payment is held here. Assign it once a charity is active with a
        connected payout account.
      </p>
      {notice && (
        <p className="fleet-muted" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="fleet-muted">Loading...</p>}
      {data && data.balances.length === 0 && <p className="fleet-muted">Nothing is held. Every charity share has been assigned.</p>}
      {data &&
        data.balances.map((b) => (
          <section key={b.currency} className="reserve-balance">
            <div className="reserve-balance-head">
              <strong>{formatMoney(b.totalCents, b.currency)}</strong>
              <span className="fleet-muted">held from {b.paymentCount} payment(s)</span>
            </div>
            {charities && charities.length === 0 && <p className="fleet-muted">Approve a charity before assigning these funds.</p>}
            {charities && charities.length > 0 && (
              <AssignForm
                token={token}
                currency={b.currency}
                totalCents={b.totalCents}
                charities={charities}
                onAssigned={(message) => {
                  setNotice(message);
                  load();
                }}
              />
            )}
          </section>
        ))}
      {data && data.assignments.length > 0 && (
        <>
          <h4 className="reserve-history-title">Past assignments</h4>
          <ul className="reserve-history">
            {data.assignments.map((a) => (
              <li key={a.id}>
                {formatMoney(a.totalCents, a.currency)} from {a.paymentCount} payment(s), by {a.assignedBy} on{' '}
                {new Date(a.createdAt).toLocaleDateString('en-GB')}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
