import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetCostRun, FleetProject, FleetProjectMaterial } from '../../api/fleet.types';
import { formatDate } from './fleetFormat';

interface Props {
  token: string;
  project: FleetProject;
}

const money = (pence: number, currency: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(pence / 100);
const unitLabel = (unit: string) => unit.split('_PER_')[1]?.toLowerCase().replace(/_/g, ' ') ?? unit;

/** Contract materials, the cost calculation and its latest result for one project. */
export const FleetProjectCosts: React.FC<Props> = ({ token, project }) => {
  const [materials, setMaterials] = useState<FleetProjectMaterial[] | null>(null);
  const [prices, setPrices] = useState<{ id: string; name: string; unit: string; currency: string }[]>([]);
  const [runs, setRuns] = useState<FleetCostRun[] | null>(null);
  const [indexId, setIndexId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, p, r] = await Promise.all([
        api.listFleetProjectMaterials(token, project.id),
        api.listFleetMaterialPrices(token),
        api.listFleetCostRuns(token, project.id),
      ]);
      setMaterials(m.materials);
      setPrices(p.indices.filter((i) => i.currency === project.currency));
      setRuns(r.runs);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token, project.id, project.currency]);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    void act(async () => {
      const res = await api.setFleetProjectMaterial(token, project.id, { indexId, quantity: quantity.trim(), budgetUnitPrice: budget.trim() });
      setMaterials(res.materials);
      setQuantity('');
      setBudget('');
    });
  };

  const calculate = () =>
    act(async () => {
      const res = await api.calculateFleetProjectCost(token, project.id, {});
      setRuns((prev) => [res.run, ...(prev ?? [])]);
    });

  const latest = runs?.[0];
  const r = latest?.results;

  return (
    <div className="fleet-costs">
      <h4 className="fleet-costs-title">Materials</h4>
      {materials && materials.length === 0 && <p className="fleet-muted">No materials. Add what the contract buys to track price movements.</p>}
      {materials && materials.length > 0 && (
        <ul className="fleet-project-assignments">
          {materials.map((m) => (
            <li key={m.id}>
              <span>
                <strong>{m.name}</strong> {m.quantity} {unitLabel(m.unit)}
              </span>
              <span className="fleet-muted">budgeted at {m.budgetUnitPrice} {project.currency} each</span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => act(async () => setMaterials((await api.removeFleetProjectMaterial(token, project.id, m.id)).materials))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {prices.length > 0 && (
        <form className="fleet-form fleet-project-assign" onSubmit={addMaterial}>
          <label>
            Material
            <select value={indexId} onChange={(e) => setIndexId(e.target.value)} required>
              <option value="">Choose a material</option>
              {prices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({unitLabel(p.unit)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </label>
          <label>
            Budgeted price per unit ({project.currency})
            <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-secondary" disabled={busy}>
            Save material
          </button>
        </form>
      )}

      <div className="fleet-costs-head">
        <h4 className="fleet-costs-title">Cost to the contract</h4>
        <button type="button" className="btn btn-primary" disabled={busy || project.assignments.length === 0} onClick={calculate}>
          {busy ? 'Calculating...' : 'Calculate now'}
        </button>
      </div>
      {project.assignments.length === 0 && <p className="fleet-muted">Put machines on the project to calculate its costs.</p>}
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!runs && !error && <p className="fleet-state">Loading costs...</p>}
      {runs && !latest && project.assignments.length > 0 && <p className="fleet-muted">Not calculated yet.</p>}
      {latest && r && (
        <div className="fleet-costs-result">
          <p className="fleet-muted">
            {formatDate(latest.periodFrom)} to {formatDate(latest.periodTo)} · calculated {formatDate(latest.createdAt)} · method {latest.methodVersion}
          </p>
          <dl className="fleet-costs-grid">
            <div>
              <dt>Cost per operating hour</dt>
              <dd>{r.costPerOperatingHourPence === null ? 'No operating hours' : money(r.costPerOperatingHourPence, r.currency)}</dd>
            </div>
            <div>
              <dt>Fuel and carbon cost</dt>
              <dd>{money(r.operatingCostPence, r.currency)}</dd>
            </div>
            <div>
              <dt>Material price movement</dt>
              <dd>{money(r.materialExposurePence, r.currency)}</dd>
            </div>
            <div>
              <dt>Share of budgeted margin</dt>
              <dd>{r.exposureShareOfMarginPercent === null ? 'No budgeted margin' : `${r.exposureShareOfMarginPercent}%`}</dd>
            </div>
          </dl>
          <p className="fleet-muted">
            Fuel {r.fuel.litres} l ({money(r.fuel.costPence, r.currency)}), of which idle {money(r.idle.fuelCostPence, r.currency)} · {r.carbon.tonnesCo2e} tCO2e (
            {money(r.carbon.costPence, r.currency)}) · {r.operatingHours} operating hours · budgeted margin {money(r.budgetedMarginPence, r.currency)}, after these{' '}
            {money(r.marginAfterExposurePence, r.currency)}
          </p>
          {r.warnings.length > 0 && (
            <ul className="fleet-costs-warnings">
              {r.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <p className="fleet-muted fleet-costs-hash">Record SHA-256 {latest.recordSha256}</p>
        </div>
      )}
    </div>
  );
};
