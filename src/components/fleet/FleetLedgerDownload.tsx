import React, { useState } from 'react';
import { api } from '../../api/client';
import { saveBlob } from './fleetFormat';

interface Props {
  token: string;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Download the climate ledger (emissions, carbon prices, contract exposure) for a period as JSON or CSV. */
export const FleetLedgerDownload: React.FC<Props> = ({ token }) => {
  const now = new Date();
  const [from, setFrom] = useState(isoDay(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))));
  const [to, setTo] = useState(isoDay(now));
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (format: 'json' | 'csv') => {
    setBusy(format);
    setError(null);
    try {
      const { blob, fileName } = await api.downloadFile(
        token,
        `/api/fleet/ledger?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=${format}`
      );
      saveBlob(blob, fileName);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fleet-panel fleet-form">
      <h3 className="fleet-panel-title">Climate ledger</h3>
      <p className="fleet-muted">
        Emissions by scope, the carbon prices applied and each project&apos;s latest cost calculation, in a machine-readable file aligned to
        IFRS S2 (the basis for UK SRS S2). Each file carries a SHA-256 so anyone can check it has not been altered.
      </p>
      <div className="fleet-project-assign">
        <label>
          From
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => download('csv')}>
          {busy === 'csv' ? 'Preparing...' : 'Download CSV'}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => download('json')}>
          {busy === 'json' ? 'Preparing...' : 'Download JSON'}
        </button>
      </div>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
