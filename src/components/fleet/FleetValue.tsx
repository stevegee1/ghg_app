import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetAssetFinanceRow } from '../../api/fleet.types';

const money = (pence: number, currency: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(pence / 100);
const toPence = (text: string) => {
  const clean = text.replace(/[,\s£]/g, '');
  return /^\d+(\.\d{1,2})?$/.test(clean) ? Math.round(Number(clean) * 100) : null;
};

const FinanceForm: React.FC<{ token: string; row: FleetAssetFinanceRow; currency: string; onSaved: () => void }> = ({ token, row, currency, onSaved }) => {
  const f = row.finance;
  const [cost, setCost] = useState(f ? String(f.acquisitionCostPence / 100) : '');
  const [date, setDate] = useState(f?.acquisitionDate ?? '');
  const [years, setYears] = useState(f?.expectedLifeYears ?? '');
  const [hours, setHours] = useState(f?.expectedLifeHours ?? '');
  const [residual, setResidual] = useState(f ? String(f.residualValuePence / 100) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const costPence = toPence(cost);
    const residualPence = toPence(residual);
    if (costPence === null || residualPence === null) return setError('Enter the purchase cost and residual value as amounts.');
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.setFleetFinance(token, row.assetId, {
        currency: f?.currency ?? currency,
        acquisitionCostPence: costPence,
        acquisitionDate: date,
        expectedLifeYears: years.trim(),
        expectedLifeHours: hours.trim(),
        residualValuePence: residualPence,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="fleet-panel fleet-form" onSubmit={submit}>
      <h3 className="fleet-panel-title">
        {row.assetTag} {row.name}
      </h3>
      {f && (
        <p className="fleet-muted">
          Bought {f.acquisitionDate} for {money(f.acquisitionCostPence, f.currency)}, expected to last {f.expectedLifeYears} years
          {f.expectedLifeHours ? ` or ${f.expectedLifeHours} operating hours` : ''}, residual {money(f.residualValuePence, f.currency)}.
        </p>
      )}
      <div className="fleet-form-grid">
        <label>
          Purchase cost ({f?.currency ?? currency})
          <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} required />
        </label>
        <label>
          Purchase date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Expected life (years)
          <input inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} required />
        </label>
        <label>
          Expected life (operating hours, optional)
          <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label>
          Residual value at end of life ({f?.currency ?? currency})
          <input inputMode="decimal" value={residual} onChange={(e) => setResidual(e.target.value)} required />
        </label>
      </div>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="fleet-muted" role="status">
          Saved.
        </p>
      )}
      <div className="fleet-form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : f ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );
};

/** Purchase cost, life and residual value per machine: the basis for value and ownership cost estimates. */
export const FleetValue: React.FC<{ token: string; onSubscribe: () => void }> = ({ token, onSubscribe }) => {
  const [data, setData] = useState<{ assets: FleetAssetFinanceRow[]; defaultCurrency: string } | null>(null);
  const [error, setError] = useState<{ message: string; needsSubscription: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.listFleetFinance(token));
    } catch (err) {
      const e = err as Error & { status?: number };
      setError({ message: e.message, needsSubscription: e.status === 402 });
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="fleet-panel">
        <p className="fleet-error-text" role="alert">
          {error.message}
        </p>
        {error.needsSubscription && (
          <button type="button" className="btn btn-primary" onClick={onSubscribe}>
            View subscription
          </button>
        )}
      </div>
    );
  }
  if (!data) return <div className="fleet-panel fleet-state">Loading machines...</div>;

  return (
    <div className="fleet-stack">
      <p className="fleet-muted">Record what each machine cost and how long it should last. Value and total cost of ownership are estimated from these and its use.</p>
      {data.assets.length === 0 && <div className="fleet-panel fleet-muted">Register machines first.</div>}
      {data.assets
        .filter((a) => a.active)
        .map((a) => (
          <FinanceForm key={a.assetId} token={token} row={a} currency={data.defaultCurrency} onSaved={load} />
        ))}
    </div>
  );
};
