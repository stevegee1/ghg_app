import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AnchorBatchStatus, AnchorOverview } from '../../api/anchor.types';

const KIND_LABELS: Record<string, string> = {
  FLEET_TELEMETRY_SNAPSHOT: 'Machine telemetry',
  FLEET_IMPORT_FILE: 'Fleet data files',
  FLEET_COST_RUN: 'Contract cost calculations',
  EVIDENCE_FILE: 'Evidence files',
  CREDENTIAL: 'Issued credentials',
  SCOPE3_RECORD: 'Scope 3 supply chain records',
};

const STATUS_LABELS: Record<AnchorBatchStatus, string> = {
  PENDING: 'Waiting to publish',
  SUBMITTED: 'Published, awaiting confirmation',
  CONFIRMED: 'Confirmed on chain',
  FAILED: 'Publishing failed',
};

/** Fingerprint batches: what has been fingerprinted, and each daily batch root and its on-chain status. */
export const AnchorsAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<AnchorOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .getAnchors(token)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [token]);
  useEffect(load, [load]);

  const run = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await api.runAnchoring(token);
      const added = Object.values(r.added).reduce((a, b) => a + b, 0);
      setNotice(r.batch ? `${added} new fingerprint(s). Batch of ${r.batch.leafCount} created.` : `${added} new fingerprint(s). Nothing new to batch.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fleet-stack" aria-labelledby="anchors-title">
      <header className="fleet-admin-head">
        <div>
          <h2 id="anchors-title" className="fleet-panel-title">Blockchain anchoring</h2>
          <p className="fleet-muted">
            Each day new records are fingerprinted and combined into one root, which is published on chain. Only fingerprints are published, never
            record content.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={run} disabled={busy}>
          {busy ? 'Running...' : 'Run now'}
        </button>
      </header>
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
      {!data && !error && <div className="fleet-panel fleet-state">Loading anchoring...</div>}
      {data && (
        <>
          <div className="fleet-panel">
            <h3 className="fleet-panel-title">Fingerprinted records</h3>
            <ul className="fleet-split-list">
              {Object.keys(KIND_LABELS).map((k) => (
                <li key={k}>
                  <span>{KIND_LABELS[k]}</span>
                  <span className="fleet-muted">{(data.fingerprintsByKind[k] ?? 0).toLocaleString('en-GB')}</span>
                </li>
              ))}
              <li>
                <span>Waiting for the next batch</span>
                <span className="fleet-muted">{data.unbatched.toLocaleString('en-GB')}</span>
              </li>
            </ul>
          </div>
          <div className="fleet-panel">
            <h3 className="fleet-panel-title">Batches</h3>
            {data.batches.length === 0 ? (
              <p className="fleet-muted">No batches yet.</p>
            ) : (
              <div className="transparency-table-wrap">
                <table className="transparency-table">
                  <thead>
                    <tr>
                      <th scope="col">Created</th>
                      <th scope="col">Records</th>
                      <th scope="col">Status</th>
                      <th scope="col">Merkle root</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.batches.map((b) => (
                      <tr key={b.id}>
                        <td>{new Date(b.createdAt).toLocaleString('en-GB')}</td>
                        <td>{b.leafCount.toLocaleString('en-GB')}</td>
                        <td>
                          {STATUS_LABELS[b.status]}
                          {b.lastError ? ` (${b.lastError})` : ''}
                        </td>
                        <td className="market-source-cell">{b.merkleRoot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};
