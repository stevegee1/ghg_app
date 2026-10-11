import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetAssetFinanceRow, FleetValuation } from '../../api/fleet.types';

const money = (pence: number, currency: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(pence / 100);
const toPence = (text: string) => {
  const clean = text.replace(/[,\s£]/g, '');
  return /^\d+(\.\d{1,2})?$/.test(clean) ? Math.round(Number(clean) * 100) : null;
};

const ValuationView: React.FC<{ v: FleetValuation }> = ({ v }) => {
  const r = v.results;
  return (
    <div className="fleet-costs-result">
      <dl className="fleet-costs-grid">
        <div>
          <dt>Estimated value</dt>
          <dd>{money(r.estimatedValuePence, r.currency)}</dd>
        </div>
        <div>
          <dt>Of which weather wear</dt>
          <dd>{money(r.weatherWearPence, r.currency)}</dd>
        </div>
        <div>
          <dt>Total cost of ownership to date</dt>
          <dd>{money(r.totalCostOfOwnershipPence, r.currency)}</dd>
        </div>
        <div>
          <dt>Per operating hour</dt>
          <dd>{r.tcoPerOperatingHourPence === null ? 'No hours' : money(r.tcoPerOperatingHourPence, r.currency)}</dd>
        </div>
      </dl>
      <p className="fleet-muted">
        Estimate as of {v.asOf} · value lost {money(r.valueLostPence, r.currency)} (use {money(r.baseWearPence, r.currency)} by{' '}
        {r.baseWearBasis === 'OPERATING_HOURS' ? `${r.operatingHours} operating hours` : `${r.ageYears} years of age`}, weather {money(r.weatherWearPence, r.currency)}) · fuel{' '}
        {money(r.fuel.costPence, r.currency)} · carbon {money(r.carbon.costPence, r.currency)} · not included: {r.notIncluded.join(', ')} · method {v.methodVersion}
        {v.inputs.wearCoefficients ? `, wear coefficients ${v.inputs.wearCoefficients.version}` : ''}
      </p>
      {r.warnings.length > 0 && (
        <ul className="fleet-costs-warnings">
          {r.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <p className="fleet-muted fleet-costs-hash">Record SHA-256 {v.recordSha256}</p>
    </div>
  );
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
  const [valuations, setValuations] = useState<Record<string, FleetValuation>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<Record<string, string>>({});
  const [error, setError] = useState<{ message: string; needsSubscription: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const [finance, vals] = await Promise.all([api.listFleetFinance(token), api.listFleetValuations(token)]);
      setData(finance);
      setValuations(Object.fromEntries(vals.valuations.map((v) => [v.assetId, v])));
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
          <div key={a.assetId} className="fleet-stack">
            <FinanceForm token={token} row={a} currency={data.defaultCurrency} onSaved={load} />
            {a.finance && (
              <div className="fleet-panel">
                <div className="fleet-costs-head">
                  <h4 className="fleet-costs-title">Value and cost of ownership</h4>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busyId === a.assetId}
                    onClick={async () => {
                      setBusyId(a.assetId);
                      setCalcError((prev) => ({ ...prev, [a.assetId]: '' }));
                      try {
                        const r = await api.calculateFleetValuation(token, a.assetId);
                        setValuations((prev) => ({ ...prev, [a.assetId]: r.valuation }));
                      } catch (err) {
                        setCalcError((prev) => ({ ...prev, [a.assetId]: (err as Error).message }));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    {busyId === a.assetId ? 'Calculating...' : 'Calculate now'}
                  </button>
                </div>
                {calcError[a.assetId] && (
                  <p className="fleet-error-text" role="alert">
                    {calcError[a.assetId]}
                  </p>
                )}
                {valuations[a.assetId] ? <ValuationView v={valuations[a.assetId]} /> : <p className="fleet-muted">Not calculated yet.</p>}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};
