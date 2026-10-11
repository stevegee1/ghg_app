import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetApiKeyRecord, FleetApiScope } from '../../api/fleet.types';
import { formatDate } from './fleetFormat';
import { FleetMcpPanel } from './FleetMcpPanel';

const SCOPES: { id: FleetApiScope; label: string; help: string }[] = [
  { id: 'telemetry:write', label: 'Send telemetry', help: 'Post machine snapshots from your systems or telematics bridge.' },
  { id: 'fleet:read', label: 'Read fleet data', help: 'Read your assets, latest telemetry and emissions summary.' },
];

/** Clients create and revoke keys for the Fleet API here. A new key is shown once only. */
export const FleetApiAccess: React.FC<{ token: string }> = ({ token }) => {
  const [keys, setKeys] = useState<FleetApiKeyRecord[] | null>(null);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<FleetApiScope[]>(['telemetry:write']);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setKeys((await api.listFleetApiKeys(token)).keys);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Give the key a name, such as the system that will use it.');
    if (scopes.length === 0) return setError('Choose at least one permission.');
    setBusy('create');
    setError(null);
    try {
      const { key } = await api.createFleetApiKey(token, name.trim(), scopes);
      setCreated(key.key);
      setCopied(false);
      setName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (key: FleetApiKeyRecord) => {
    if (!window.confirm(`Revoke "${key.name}"? Systems using it will stop working immediately.`)) return;
    setBusy(key.id);
    setError(null);
    try {
      await api.revokeFleetApiKey(token, key.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const origin = window.location.origin;
  const example = `curl -X POST ${origin}/api/fleet/v1/telemetry \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"snapshots":[{"assetTag":"EX-01","observedAt":"2026-10-01T18:00:00Z",
       "cumulativeOperatingHours":1210.5,"cumulativeFuelUsedLitres":45180.5}]}'`;

  return (
    <div className="fleet-stack">
      <form className="fleet-panel fleet-form" onSubmit={create} noValidate>
        <h3 className="fleet-panel-title">Create an API key</h3>
        <p className="fleet-muted">
          Send machine data from your own systems, or read your fleet data into them. Data follows the ISO 15143-3 (AEMP 2.0) schema.
        </p>
        <label>
          Key name
          <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Site telematics bridge" />
        </label>
        <fieldset className="fleet-api-scopes">
          <legend>Permissions</legend>
          {SCOPES.map((s) => (
            <label key={s.id} className="fleet-checkbox">
              <input
                type="checkbox"
                checked={scopes.includes(s.id)}
                onChange={(e) => setScopes((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))}
              />
              <span>
                <strong>{s.label}</strong> <span className="fleet-muted">{s.help}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="fleet-error-text" role="alert">
            {error}
          </p>
        )}
        <div className="fleet-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy !== null}>
            {busy === 'create' ? 'Creating...' : 'Create key'}
          </button>
        </div>
      </form>

      {created && (
        <div className="fleet-panel fleet-warning fleet-api-created" role="status">
          <h3 className="fleet-panel-title">Copy your key now</h3>
          <p>This is the only time the full key is shown. Store it in your system's secret settings.</p>
          <code className="fleet-api-key-value">{created}</code>
          <div className="fleet-form-actions">
            <button type="button" className="btn btn-primary btn-small" onClick={copy}>
              {copied ? 'Copied' : 'Copy key'}
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setCreated(null)}>
              I have stored it
            </button>
          </div>
        </div>
      )}

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Your keys</h3>
        {!keys && !error && <p className="fleet-state">Loading keys...</p>}
        {keys && keys.length === 0 && <p className="fleet-muted">No keys yet.</p>}
        {keys && keys.length > 0 && (
          <table className="fleet-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Key</th>
                <th scope="col">Permissions</th>
                <th scope="col">Last used</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className={k.revokedAt ? 'is-inactive' : ''}>
                  <td data-label="Name">
                    <span>{k.name}</span>
                  </td>
                  <td data-label="Key">
                    <span className="fleet-api-prefix">{k.keyPrefix}...</span>
                  </td>
                  <td data-label="Permissions">
                    <span>{k.scopes.map((s) => SCOPES.find((x) => x.id === s)?.label ?? s).join(', ')}</span>
                  </td>
                  <td data-label="Last used">
                    <span>{k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}</span>
                  </td>
                  <td data-label="Status">
                    <span>{k.revokedAt ? `Revoked ${formatDate(k.revokedAt)}` : 'Active'}</span>
                  </td>
                  <td>
                    {!k.revokedAt && (
                      <button type="button" className="btn btn-secondary btn-small" disabled={busy !== null} onClick={() => revoke(k)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Sending data</h3>
        <p className="fleet-muted">
          Send up to 500 snapshots per request, oldest first. Meters are cumulative: we calculate fuel and CO2e between consecutive
          snapshots. The field list is at <a href="/api/fleet/v1/schema">/api/fleet/v1/schema</a>.
        </p>
        <pre className="fleet-api-example">
          <code>{example}</code>
        </pre>
      </div>

      <FleetMcpPanel token={token} />
    </div>
  );
};
