import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { FLEET_FUEL_LABELS, type EmissionFactorInput, type EmissionFactorRecord, type FleetFuelType } from '../../api/fleet.types';

interface Props {
  token: string;
}

const EMPTY: EmissionFactorInput = {
  source: 'UK DESNZ GHG Conversion Factors',
  publicationYear: new Date().getUTCFullYear(),
  fuelType: 'DIESEL_AVERAGE_BIOFUEL_BLEND',
  kgCo2ePerUnit: '',
  citation: '',
};

/**
 * Administrators enter emission factors from the published source. Fleet emissions cannot be
 * calculated for a fuel until a factor exists; factors are never overwritten, only retired.
 */
export const EmissionFactorsAdmin: React.FC<Props> = ({ token }) => {
  const [factors, setFactors] = useState<EmissionFactorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EmissionFactorInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFactors((await api.listEmissionFactors(token)).factors);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.createEmissionFactor(token, { ...form, kgCo2ePerUnit: form.kgCo2ePerUnit.trim() });
      setForm({ ...EMPTY, source: form.source, publicationYear: form.publicationYear });
      load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const retire = async (factor: EmissionFactorRecord) => {
    if (!window.confirm(`Retire the ${FLEET_FUEL_LABELS[factor.fuelType]} factor for ${factor.publicationYear}? Existing readings keep it; new data will not use it.`)) return;
    try {
      await api.retireEmissionFactor(token, factor.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const missingFuels = (Object.keys(FLEET_FUEL_LABELS) as FleetFuelType[]).filter(
    (fuel) => !factors.some((f) => f.fuelType === fuel && !f.retiredAt)
  );

  return (
    <div className="fleet-stack">
      <form className="fleet-panel fleet-form" onSubmit={submit}>
        <h3 className="fleet-panel-title">Add an emission factor</h3>
        <p className="fleet-muted">
          Copy the value exactly from the published conversion factors, in kg CO2e per litre, and cite the table and row.
          Factors are kept for audit and cannot be edited.
        </p>
        <div className="fleet-form-grid">
          <label>
            Source
            <input required maxLength={120} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </label>
          <label>
            Publication year
            <input
              required
              type="number"
              min={2000}
              max={new Date().getUTCFullYear() + 1}
              value={form.publicationYear}
              onChange={(e) => setForm({ ...form, publicationYear: Number(e.target.value) })}
            />
          </label>
          <label>
            Fuel
            <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value as FleetFuelType })}>
              {Object.entries(FLEET_FUEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            kg CO2e per litre
            <input
              required
              inputMode="decimal"
              pattern="\d{1,6}(\.\d{1,6})?"
              title="A positive number with up to 6 decimal places"
              value={form.kgCo2ePerUnit}
              onChange={(e) => setForm({ ...form, kgCo2ePerUnit: e.target.value })}
            />
          </label>
          <label>
            Citation
            <input
              required
              minLength={10}
              maxLength={500}
              value={form.citation}
              onChange={(e) => setForm({ ...form, citation: e.target.value })}
            />
          </label>
        </div>
        {formError && <p className="fleet-error-text" role="alert">{formError}</p>}
        <div className="fleet-form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add factor'}
          </button>
        </div>
      </form>

      {!loading && !error && missingFuels.length > 0 && (
        <div className="fleet-panel fleet-warning" role="status">
          No active factor for: {missingFuels.map((f) => FLEET_FUEL_LABELS[f]).join(', ')}. Fleet data for these fuels is
          rejected until one is added.
        </div>
      )}

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Emission factors</h3>
        {loading && <p className="fleet-state">Loading factors...</p>}
        {!loading && error && (
          <div className="fleet-state fleet-state-error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn-secondary" onClick={load}>Try again</button>
          </div>
        )}
        {!loading && !error && factors.length === 0 && <p className="fleet-muted">No factors yet.</p>}
        {!loading && !error && factors.length > 0 && (
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Fuel</th>
                <th className="nowrap">Year</th>
                <th className="num nowrap">kg CO2e / L</th>
                <th>Source and citation</th>
                <th className="nowrap">Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {factors.map((f) => (
                <tr key={f.id} className={f.retiredAt ? 'is-inactive' : ''}>
                  <td data-label="Fuel">{FLEET_FUEL_LABELS[f.fuelType]}</td>
                  <td data-label="Year" className="nowrap">{f.publicationYear}</td>
                  <td data-label="kg CO2e / L" className="num nowrap">{f.kgCo2ePerUnit}</td>
                  <td data-label="Source">
                    <span>
                      {f.source}. <span className="fleet-muted">{f.citation}. Added by {f.createdBy.email}.</span>
                    </span>
                  </td>
                  <td data-label="Status" className="nowrap">{f.retiredAt ? 'Retired' : 'Active'}</td>
                  <td className="fleet-row-actions">
                    {!f.retiredAt && (
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => retire(f)}>
                        Retire
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
