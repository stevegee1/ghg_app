import React, { useCallback, useEffect, useState } from 'react';
import { api, FleetApiError } from '../../api/client';
import type { FleetImportBatch, FleetImportResult } from '../../api/fleet.types';
import { formatDate, formatTonnes, saveBlob } from './fleetFormat';

type Format = 'readings' | 'fuel-card';

const FORMAT_HELP: Record<Format, { label: string; detail: string }> = {
  readings: {
    label: 'Periodic readings',
    detail: 'One row per asset and period with fuel litres, and optionally engine hours, idle hours and distance. Dates are inclusive.',
  },
  'fuel-card': {
    label: 'Fuel card transactions',
    detail: 'One row per fill-up with the asset tag or registration, date and litres. Fill-ups on the same day are added together.',
  },
};

const SOURCE_LABELS: Record<FleetImportBatch['source'], string> = {
  CSV_UPLOAD: 'Readings',
  FUEL_CARD: 'Fuel card',
  ISO_15143_3: 'Manufacturer feed',
  PARTNER_API: 'Partner feed',
};

interface Props {
  token: string;
  onSubscribe: () => void;
  onImported: () => void;
}

export const FleetUploads: React.FC<Props> = ({ token, onSubscribe, onImported }) => {
  const [format, setFormat] = useState<Format>('readings');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<FleetImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [history, setHistory] = useState<FleetImportBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory((await api.listFleetImports(token)).batches);
    } catch (err) {
      setHistoryError((err as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setUploadError(null);
    setNeedsSubscription(false);
    try {
      const res = await api.importFleetReadings(token, file, format);
      setResult(res);
      if (res.rowsAccepted > 0) onImported();
      loadHistory();
    } catch (err) {
      if (err instanceof FleetApiError && err.status === 402) setNeedsSubscription(true);
      else setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const { blob, fileName } = await api.downloadFile(token, `/api/fleet/templates/${format}`);
      saveBlob(blob, fileName);
    } catch (err) {
      setUploadError((err as Error).message);
    }
  };

  return (
    <div className="fleet-stack">
      <div className="fleet-panel fleet-form">
        <h3 className="fleet-panel-title">Upload fuel data</h3>
        <div className="fleet-segmented" role="radiogroup" aria-label="File format">
          {(Object.keys(FORMAT_HELP) as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              className={`fleet-segment${format === f ? ' is-selected' : ''}`}
              onClick={() => setFormat(f)}
            >
              {FORMAT_HELP[f].label}
            </button>
          ))}
        </div>
        <p className="fleet-muted">{FORMAT_HELP[format].detail} Every asset must be registered first. If any row is invalid, nothing in the file is imported.</p>
        <div className="fleet-form-actions">
          <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
            Download template
          </button>
          <label className="btn btn-primary fleet-file-button">
            {uploading ? 'Uploading...' : 'Choose CSV file'}
            <input type="file" accept=".csv,text/csv" disabled={uploading} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>

        {needsSubscription && (
          <div className="fleet-notice" role="status">
            <span>Uploading data needs an active Fleet subscription.</span>
            <button type="button" className="btn btn-secondary btn-small" onClick={onSubscribe}>View subscription</button>
          </div>
        )}
        {uploadError && <p className="fleet-error-text" role="alert">{uploadError}</p>}
        {result && result.rowsAccepted > 0 && (
          <div className="fleet-notice" role="status">
            Imported {result.rowsAccepted} rows: {formatTonnes(result.totalKgCo2e)} t CO2e.
          </div>
        )}
        {result && result.rowsAccepted === 0 && (
          <div className="fleet-state-error fleet-inline-error" role="alert">
            <strong>Nothing was imported. Fix these rows and upload the file again:</strong>
            <ul className="fleet-rejections">
              {result.rejections.map((r) => (
                <li key={`${r.line}-${r.reason}`}>Line {r.line}: {r.reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Upload history</h3>
        {historyLoading && <p className="fleet-state">Loading history...</p>}
        {!historyLoading && historyError && (
          <div className="fleet-state fleet-state-error" role="alert">
            <span>{historyError}</span>
            <button type="button" className="btn btn-secondary" onClick={loadHistory}>Try again</button>
          </div>
        )}
        {!historyLoading && !historyError && history.length === 0 && <p className="fleet-muted">No files uploaded yet.</p>}
        {!historyLoading && !historyError && history.length > 0 && (
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>File</th>
                <th>Type</th>
                <th className="num">Rows</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.id}>
                  <td data-label="Date">{formatDate(b.createdAt)}</td>
                  <td data-label="File">{b.fileName}</td>
                  <td data-label="Type">{SOURCE_LABELS[b.source]}</td>
                  <td data-label="Rows" className="num">{b.rowsReceived}</td>
                  <td data-label="Result">{b.rowsAccepted > 0 ? 'Imported' : `Rejected (${b.rejections.length} ${b.rejections.length === 1 ? 'issue' : 'issues'})`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
