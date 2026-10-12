import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { TrainingConsentView } from '../../api/fleet.types';
import { saveBlob } from './fleetFormat';

/** Uploads past maintenance history so the forecast and the model start with real records. */
export const MaintenanceHistoryImport: React.FC<{ token: string; onImported: () => void }> = ({ token, onImported }) => {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [rejections, setRejections] = useState<{ line: number; reason: string }[]>([]);

  const template = async () => {
    try {
      const { blob, fileName } = await api.downloadFile(token, '/api/fleet/templates/maintenance');
      saveBlob(blob, fileName);
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    }
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage(null);
    setRejections([]);
    try {
      const r = await api.importMaintenanceHistory(token, file);
      if (r.rejections.length > 0) {
        setRejections(r.rejections);
        setMessage({ tone: 'error', text: 'Nothing was imported. Fix these rows and upload the file again.' });
      } else {
        setMessage({ tone: 'ok', text: `${r.rowsAccepted} record(s) imported${r.duplicates ? `, ${r.duplicates} already recorded` : ''}.` });
        onImported();
      }
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="fleet-panel maint-side" onSubmit={upload}>
      <h3 className="fleet-panel-title">Import maintenance history</h3>
      <p className="fleet-muted">One row per service, inspection, breakdown or repair. Types: scheduled service, inspection, breakdown, unplanned repair.</p>
      <button type="button" className="btn btn-secondary btn-small" onClick={template}>
        Download template
      </button>
      <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Maintenance history CSV" />
      <button type="submit" className="btn btn-primary" disabled={!file || busy}>
        {busy ? 'Importing...' : 'Import'}
      </button>
      {message && (
        <p className={message.tone === 'error' ? 'fleet-error-text' : 'fleet-muted'} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
      {rejections.length > 0 && (
        <ul className="maint-rejections">
          {rejections.slice(0, 20).map((r) => (
            <li key={r.line}>
              Line {r.line}: {r.reason}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
};

/** The client's choice to let anonymised data train the shared model. */
export const TrainingConsentCard: React.FC<{ token: string }> = ({ token }) => {
  const [state, setState] = useState<TrainingConsentView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTrainingConsent(token).then(setState).catch((e: Error) => setError(e.message));
  }, [token]);

  const change = async (granted: boolean) => {
    setBusy(true);
    setError(null);
    try {
      setState(await api.setTrainingConsent(token, granted));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fleet-panel maint-side">
      <h3 className="fleet-panel-title">Help improve predictions</h3>
      {!state && !error && <p className="fleet-muted">Loading...</p>}
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {state && (
        <>
          <p className="fleet-muted">{state.text}</p>
          <p className="fleet-muted">
            {state.granted && state.consent ? `Agreed on ${new Date(state.consent.grantedAt).toLocaleDateString('en-GB')}.` : 'Not agreed. You still receive predictions.'}
          </p>
          <button type="button" className={`btn ${state.granted ? 'btn-secondary' : 'btn-primary'}`} disabled={busy} onClick={() => change(!state.granted)}>
            {state.granted ? 'Withdraw agreement' : 'I agree'}
          </button>
        </>
      )}
    </div>
  );
};
