import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import {
  FLEET_CONNECTION_OPTIONS,
  FLEET_CATEGORY_LABELS,
  FLEET_FUEL_LABELS,
  FLEET_OWNERSHIP_LABELS,
  type FleetAsset,
  type FleetAssetCategory,
  type FleetAssetInput,
  type FleetConnectionBranch,
  type FleetFuelType,
  type FleetOwnership,
  type RowRejection,
} from '../../api/fleet.types';
import { saveBlob } from './fleetFormat';
import { FleetConnectionPanel } from './FleetConnectionPanel';

interface Props {
  token: string;
  onChanged: () => void;
}

const EMPTY_FORM: FleetAssetInput = {
  assetTag: '',
  name: '',
  category: 'EXCAVATOR',
  fuelType: 'DIESEL_AVERAGE_BIOFUEL_BLEND',
  ownership: 'OWNED',
  operationalControl: true,
  siteName: '',
  make: '',
  model: '',
};

export const FleetAssets: React.FC<Props> = ({ token, onChanged }) => {
  const [assets, setAssets] = useState<FleetAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FleetAssetInput>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; rejections: RowRejection[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connectionKey, setConnectionKey] = useState(0);
  const [savingConnection, setSavingConnection] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssets((await api.listFleetAssets(token)).assets);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const afterChange = (billingSynced: boolean) => {
    setNotice(billingSynced ? null : 'Saved. Your subscription quantity will update shortly.');
    onChanged();
    load();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const result = await api.createFleetAsset(token, form);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      afterChange(result.billingSynced);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (asset: FleetAsset) => {
    try {
      const result = await api.updateFleetAsset(token, asset.id, { active: !asset.active });
      afterChange(result.billingSynced);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const setConnection = async (asset: FleetAsset, branch: FleetConnectionBranch) => {
    if (branch === 'UNCONFIRMED') return;
    setSavingConnection(asset.id);
    setError(null);
    try {
      await api.setFleetAssetConnection(token, [asset.id], branch);
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, connectionBranch: branch } : a)));
      setConnectionKey((k) => k + 1);
      onChanged();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setSavingConnection(null);
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await api.importFleetAssets(token, file);
      setImportResult({ created: result.created, rejections: result.rejections });
      if (result.created > 0) afterChange(result.billingSynced);
    } catch (err) {
      setImportResult({ created: 0, rejections: [{ line: 0, reason: (err as Error).message }] });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const { blob, fileName } = await api.downloadFile(token, '/api/fleet/templates/assets');
      saveBlob(blob, fileName);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const setOwnership = (ownership: FleetOwnership) =>
    setForm((f) => ({ ...f, ownership, operationalControl: ownership === 'RENTED_OUT' ? false : f.operationalControl }));

  return (
    <div className="fleet-stack">
      <div className="fleet-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen((o) => !o)} aria-expanded={formOpen}>
          {formOpen ? 'Close form' : 'Add asset'}
        </button>
        <div className="fleet-toolbar-group">
          <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
            Asset CSV template
          </button>
          <label className="btn btn-secondary fleet-file-button">
            {importing ? 'Importing...' : 'Import assets CSV'}
            <input type="file" accept=".csv,text/csv" disabled={importing} onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
      </div>

      {notice && <div className="fleet-panel fleet-notice">{notice}</div>}

      {importResult && (
        <div className={`fleet-panel ${importResult.rejections.length ? 'fleet-state-error' : 'fleet-notice'}`} role="status">
          {importResult.rejections.length === 0 ? (
            <span>{importResult.created} assets registered.</span>
          ) : (
            <>
              <strong>No assets were registered. Fix these rows and upload the file again:</strong>
              <ul className="fleet-rejections">
                {importResult.rejections.map((r) => (
                  <li key={`${r.line}-${r.reason}`}>{r.line > 0 ? `Line ${r.line}: ` : ''}{r.reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {formOpen && (
        <form className="fleet-panel fleet-form" onSubmit={submit}>
          <h3 className="fleet-panel-title">Register an asset</h3>
          <p className="fleet-muted">
            Fuel type, ownership and operational control decide how emissions are reported. They cannot be changed once
            data has been uploaded for the asset.
          </p>
          <div className="fleet-form-grid">
            <label>
              Asset tag or registration
              <input required maxLength={64} value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} />
            </label>
            <label>
              Name
              <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Category
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FleetAssetCategory })}>
                {Object.entries(FLEET_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
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
              Ownership
              <select value={form.ownership} onChange={(e) => setOwnership(e.target.value as FleetOwnership)}>
                {Object.entries(FLEET_OWNERSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Site
              <input maxLength={120} value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
            </label>
            <label>
              Make
              <input maxLength={120} value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
            </label>
            <label>
              Model
              <input maxLength={120} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </label>
          </div>
          <label className="fleet-checkbox">
            <input
              type="checkbox"
              checked={form.operationalControl}
              disabled={form.ownership === 'RENTED_OUT'}
              onChange={(e) => setForm({ ...form, operationalControl: e.target.checked })}
            />
            <span>
              We operate this asset and control how it is used (operational control). Its fuel is reported as Scope 1;
              otherwise it is reported separately as Scope 3.
            </span>
          </label>
          {formError && <p className="fleet-error-text" role="alert">{formError}</p>}
          <div className="fleet-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Register asset'}
            </button>
          </div>
        </form>
      )}

      {!loading && !error && assets.length > 0 && <FleetConnectionPanel token={token} assets={assets} refreshKey={connectionKey} />}

      {loading && <div className="fleet-panel fleet-state">Loading assets...</div>}
      {!loading && error && (
        <div className="fleet-panel fleet-state fleet-state-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={load}>Try again</button>
        </div>
      )}
      {!loading && !error && assets.length === 0 && (
        <div className="fleet-panel fleet-empty">
          <h3>No assets registered yet</h3>
          <p>Add your excavators, trucks and vehicles one at a time, or import them from a CSV file.</p>
        </div>
      )}
      {!loading && !error && assets.length > 0 && (
        <div className="fleet-panel">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Category</th>
                <th>Fuel</th>
                <th>Ownership</th>
                <th>Scope</th>
                <th>Connection</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className={a.active ? '' : 'is-inactive'}>
                  <td data-label="Asset">
                    <span>
                      <strong>{a.assetTag}</strong> {a.name}
                      {a.siteName && <span className="fleet-muted"> · {a.siteName}</span>}
                    </span>
                  </td>
                  <td data-label="Category">{FLEET_CATEGORY_LABELS[a.category]}</td>
                  <td data-label="Fuel">{FLEET_FUEL_LABELS[a.fuelType]}</td>
                  <td data-label="Ownership">{FLEET_OWNERSHIP_LABELS[a.ownership]}</td>
                  <td data-label="Scope">{a.operationalControl ? 'Scope 1' : 'Scope 3'}</td>
                  <td data-label="Connection">
                    <select
                      className={`fleet-connection-select${a.connectionBranch === 'UNCONFIRMED' ? ' needs-choice' : ''}`}
                      aria-label={`Connection for ${a.assetTag}`}
                      value={a.connectionBranch}
                      disabled={!a.active || savingConnection === a.id}
                      onChange={(e) => setConnection(a, e.target.value as FleetConnectionBranch)}
                    >
                      {a.connectionBranch === 'UNCONFIRMED' && <option value="UNCONFIRMED">Choose...</option>}
                      {FLEET_CONNECTION_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Status">{a.active ? 'Active' : 'Inactive'}</td>
                  <td className="fleet-row-actions">
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => toggleActive(a)}>
                      {a.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
