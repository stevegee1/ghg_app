import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetDataSourcesView } from '../../api/fleet.types';

const SOURCE_LABELS: Record<string, string> = {
  CLIENT_API: 'Your systems, through your API key',
  OEM_CLOUD: 'Manufacturer cloud',
  ISO_15143_3: 'ISO 15143-3 feed',
  PARTNER_API: 'Tracking device',
  CSV_UPLOAD: 'File upload',
  FUEL_CARD: 'Fuel card upload',
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never');

/** Every source feeding this client's Fleet data, so they can see what is connected and still sending. */
export const FleetDataSources: React.FC<{ token: string; onOpenApi: () => void }> = ({ token, onOpenApi }) => {
  const [data, setData] = useState<FleetDataSourcesView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getFleetDataSources(token).then(setData).catch((e: Error) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="fleet-panel fleet-state fleet-state-error" role="alert">
        {error}
      </div>
    );
  }
  if (!data) return <div className="fleet-panel fleet-state">Loading data sources...</div>;

  return (
    <div className="fleet-stack">
      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Live machine data</h3>
        {data.telemetry.length === 0 && <p className="fleet-muted">No machine has sent live data yet.</p>}
        {data.telemetry.length > 0 && (
          <ul className="fleet-split-list">
            {data.telemetry.map((t) => (
              <li key={t.source}>
                <span>
                  <strong>{SOURCE_LABELS[t.source] ?? t.source}</strong>
                </span>
                <span className="fleet-muted">
                  {t.machines} machine(s) · {t.snapshots} reading(s) · last received {when(t.lastReceivedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Your API keys</h3>
        <p className="fleet-muted">
          Each key is unique to your organisation. We keep only a one-way fingerprint of it, so it cannot be read back, and it can be revoked at any time.
        </p>
        {data.apiKeys.length === 0 && <p className="fleet-muted">No active keys.</p>}
        {data.apiKeys.length > 0 && (
          <ul className="fleet-split-list">
            {data.apiKeys.map((k) => (
              <li key={k.keyPrefix}>
                <span>
                  <strong>{k.name}</strong> <code>{k.keyPrefix}...</code>
                </span>
                <span className="fleet-muted">
                  {k.scopes.join(', ')} · last used {when(k.lastUsedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-secondary btn-small" onClick={onOpenApi}>
          Manage API keys
        </button>
      </div>

      <div className="fleet-tiles">
        <div className="fleet-tile">
          <span className="fleet-tile-label">Connected tracking devices</span>
          <span className="fleet-tile-value">{data.connectedDevices.reduce((s, d) => s + d.count, 0)}</span>
        </div>
        <div className="fleet-tile">
          <span className="fleet-tile-label">Files uploaded</span>
          <span className="fleet-tile-value">{data.uploads.files}</span>
        </div>
        <div className="fleet-tile">
          <span className="fleet-tile-label">Maintenance records</span>
          <span className="fleet-tile-value">{data.maintenanceRecords.count}</span>
        </div>
      </div>
    </div>
  );
};
