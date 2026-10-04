import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminFleetBinding, AdminFleetProvider, AdminTrackingAsset, FleetProviderAuthType, MappingTestResult } from '../../api/fleet.types';

const AUTH_LABELS: Record<FleetProviderAuthType, string> = {
  DEVICE_SHARED_KEY: 'Shared key in a header',
  DEVICE_HMAC_SHA256: 'HMAC-SHA256 signature with timestamp',
};

/** A starting point for a new device's mapping; every value is edited for the real device. */
const MAPPING_TEMPLATE = JSON.stringify(
  {
    messagesPath: 'readings',
    deviceIdPath: 'deviceId',
    observedAt: { path: 'timestamp', format: 'iso8601' },
    fields: {
      cumulativeOperatingHours: { path: 'engineHours', unit: 'hour' },
      cumulativeFuelUsedLitres: { path: 'fuelUsedLitres', unit: 'litre' },
      latitude: { path: 'lat' },
      longitude: { path: 'lon' },
    },
  },
  null,
  2
);

const SAMPLE_TEMPLATE = JSON.stringify(
  { readings: [{ deviceId: 'DEVICE-001', timestamp: '2026-10-01T08:00:00Z', engineHours: 1520.5, fuelUsedLitres: 48210.2, lat: 51.5, lon: -0.12 }] },
  null,
  2
);

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

/** Tracking-device providers (configured, never coded per device) and the trackers bound to client assets. */
export const FleetProvidersAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [providers, setProviders] = useState<AdminFleetProvider[] | null>(null);
  const [bindings, setBindings] = useState<AdminFleetBinding[]>([]);
  const [trackingAssets, setTrackingAssets] = useState<AdminTrackingAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [authType, setAuthType] = useState<FleetProviderAuthType>('DEVICE_HMAC_SHA256');
  const [secret, setSecret] = useState('');
  const [mappingText, setMappingText] = useState(MAPPING_TEMPLATE);
  const [sampleText, setSampleText] = useState(SAMPLE_TEMPLATE);
  const [testResults, setTestResults] = useState<MappingTestResult[] | null>(null);

  const [bindProvider, setBindProvider] = useState<Record<string, string>>({});
  const [bindDevice, setBindDevice] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([api.listAdminFleetProviders(token), api.listAdminFleetBindings(token)]);
      setProviders(p.providers);
      setBindings(b.bindings);
      setTrackingAssets(b.trackingDeviceAssets);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const testMapping = async () => {
    setError(null);
    try {
      const { results } = await api.testAdminFleetMapping(token, parseJson(mappingText, 'The mapping'), parseJson(sampleText, 'The sample'));
      setTestResults(results);
    } catch (err) {
      setTestResults(null);
      setError((err as Error).message);
    }
  };

  const createProvider = (e: React.FormEvent) => {
    e.preventDefault();
    void run(
      'create',
      async () => {
        await api.createAdminFleetProvider(token, { name: name.trim(), kind: 'TRACKING_DEVICE', authType, secret, fieldMapping: parseJson(mappingText, 'The mapping') });
        setFormOpen(false);
        setName('');
        setSecret('');
        setTestResults(null);
      },
      'Provider added. Give the device vendor its ingest address and secret.'
    );
  };

  const rotateSecret = (p: AdminFleetProvider) => {
    const next = window.prompt(`New shared secret for ${p.name} (at least 16 characters). Devices using the old one will be refused.`);
    if (!next) return;
    void run(p.id, () => api.updateAdminFleetProvider(token, p.id, { secret: next }), 'Secret replaced.');
  };

  const origin = window.location.origin;
  const activeProviders = (providers ?? []).filter((p) => p.active && p.kind === 'TRACKING_DEVICE');

  return (
    <section className="fleet-stack" aria-labelledby="fleet-providers-title">
      <header>
        <h2 id="fleet-providers-title" className="fleet-panel-title">Fleet tracking devices</h2>
        <p className="fleet-muted">
          Each tracker type is a provider: how it signs its messages and where each reading sits in them. Adding a device needs no code.
        </p>
      </header>

      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="fleet-notice">{notice}</p>}

      <div className="fleet-panel">
        <div className="fleet-toolbar-group fleet-admin-head">
          <h3 className="fleet-panel-title">Providers</h3>
          <button type="button" className="btn btn-primary btn-small" onClick={() => setFormOpen((o) => !o)} aria-expanded={formOpen}>
            {formOpen ? 'Close' : 'Add provider'}
          </button>
        </div>
        {!providers && !error && <p className="fleet-state">Loading providers...</p>}
        {providers && providers.length === 0 && <p className="fleet-muted">No providers yet.</p>}
        {providers && providers.length > 0 && (
          <ul className="fleet-split-list">
            {providers.map((p) => (
              <li key={p.id}>
                <span>
                  <strong>{p.name}</strong> <span className="fleet-muted">· {AUTH_LABELS[p.authType] ?? p.authType} · {p.activeBindings ?? 0} {(p.activeBindings ?? 0) === 1 ? 'device' : 'devices'}</span>
                  <br />
                  <code className="fleet-api-prefix">{`${origin}/api/fleet/ingest/devices/${p.id}`}</code>
                </span>
                <span className="fleet-toolbar-group">
                  <span className="fleet-muted">{p.active ? 'Active' : 'Off'}</span>
                  <button type="button" className="btn btn-secondary btn-small" disabled={busy !== null} onClick={() => rotateSecret(p)}>
                    Replace secret
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    disabled={busy !== null}
                    onClick={() => run(p.id, () => api.updateAdminFleetProvider(token, p.id, { active: !p.active }), p.active ? 'Provider switched off.' : 'Provider switched on.')}
                  >
                    {p.active ? 'Switch off' : 'Switch on'}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {formOpen && (
          <form className="fleet-form fleet-setup-form" onSubmit={createProvider} noValidate>
            <h4>Add a tracking-device provider</h4>
            <div className="fleet-form-grid">
              <label>
                Name
                <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme GPS tracker v2" />
              </label>
              <label>
                How devices authenticate
                <select value={authType} onChange={(e) => setAuthType(e.target.value as FleetProviderAuthType)}>
                  {Object.entries(AUTH_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Shared secret (16+ characters, stored encrypted)
                <input type="password" autoComplete="new-password" value={secret} onChange={(e) => setSecret(e.target.value)} />
              </label>
            </div>
            <label>
              Field mapping (JSON)
              <textarea className="fleet-json" rows={14} spellCheck={false} value={mappingText} onChange={(e) => setMappingText(e.target.value)} />
            </label>
            <label>
              Sample message from the device (JSON)
              <textarea className="fleet-json" rows={6} spellCheck={false} value={sampleText} onChange={(e) => setSampleText(e.target.value)} />
            </label>
            <div className="fleet-form-actions">
              <button type="button" className="btn btn-secondary" onClick={testMapping}>
                Test mapping
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy !== null}>
                {busy === 'create' ? 'Saving...' : 'Save provider'}
              </button>
            </div>
            {testResults && (
              <ul className="fleet-split-list" aria-label="Mapping test results">
                {testResults.map((r) => (
                  <li key={r.index}>
                    <span>Message {r.index + 1}</span>
                    {r.ok ? (
                      <code className="fleet-api-prefix">{`${r.externalDeviceId}: ${JSON.stringify(r.snapshot)}`}</code>
                    ) : (
                      <span className="fleet-error-text">{r.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}
      </div>

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Tracking-device assets</h3>
        <p className="fleet-muted">Bind each fitted tracker to its machine. A machine has one active tracker at a time.</p>
        {trackingAssets.length === 0 && <p className="fleet-muted">No client has a machine waiting for a tracker.</p>}
        <ul className="fleet-split-list">
          {trackingAssets.map((a) => {
            const bound = a.bindings[0];
            return (
              <li key={a.id}>
                <span>
                  <strong>{a.licensee.name}</strong> · {a.assetTag} {a.name}
                  {a.make ? <span className="fleet-muted"> · {[a.make, a.model].filter(Boolean).join(' ')}</span> : null}
                </span>
                {bound ? (
                  <span className="fleet-toolbar-group">
                    <span className="fleet-muted">
                      {bound.provider.name}: {bound.externalDeviceId}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      disabled={busy !== null}
                      onClick={() => run(bound.id, () => api.deactivateAdminFleetBinding(token, bound.id), 'Tracker unbound.')}
                    >
                      Unbind
                    </button>
                  </span>
                ) : (
                  <span className="fleet-toolbar-group fleet-bind-form">
                    <select
                      aria-label={`Provider for ${a.assetTag}`}
                      value={bindProvider[a.id] ?? ''}
                      onChange={(e) => setBindProvider((s) => ({ ...s, [a.id]: e.target.value }))}
                    >
                      <option value="">Provider...</option>
                      {activeProviders.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`Device ID for ${a.assetTag}`}
                      placeholder="Device ID"
                      maxLength={128}
                      value={bindDevice[a.id] ?? ''}
                      onChange={(e) => setBindDevice((s) => ({ ...s, [a.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      disabled={busy !== null || !bindProvider[a.id] || !bindDevice[a.id]?.trim()}
                      onClick={() =>
                        run(
                          a.id,
                          () => api.createAdminFleetBinding(token, { providerId: bindProvider[a.id], assetId: a.id, externalDeviceId: bindDevice[a.id].trim() }),
                          `Tracker bound to ${a.assetTag}.`
                        )
                      }
                    >
                      Bind
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {bindings.some((b) => !b.active) && (
        <details className="fleet-panel">
          <summary>Released trackers ({bindings.filter((b) => !b.active).length})</summary>
          <ul className="fleet-split-list">
            {bindings
              .filter((b) => !b.active)
              .map((b) => (
                <li key={b.id}>
                  <span>
                    {b.licensee.name} · {b.asset.assetTag}
                  </span>
                  <span className="fleet-muted">
                    {b.provider.name}: {b.externalDeviceId}
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
};
