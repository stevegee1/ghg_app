import React, { useState } from 'react';
import { api } from '../../api/client';
import { MAINTENANCE_EVENT_LABELS, MaintenanceEventType } from '../../api/fleet.types';

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/** Logs a service, inspection, breakdown or unplanned repair. Breakdowns teach the predictive model. */
export const MaintenanceEventForm: React.FC<{ token: string; assetId: string; onSaved: () => void; onCancel: () => void }> = ({ token, assetId, onSaved, onCancel }) => {
  const [type, setType] = useState<MaintenanceEventType>('SCHEDULED_SERVICE');
  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [operatingHours, setOperatingHours] = useState('');
  const [downtimeHours, setDowntimeHours] = useState('');
  const [component, setComponent] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.logMaintenanceEvent(token, {
        assetId,
        type,
        occurredAt: new Date(occurredAt).toISOString(),
        operatingHours: operatingHours.trim() || undefined,
        downtimeHours: downtimeHours.trim() || undefined,
        component: component.trim() || undefined,
        description: description.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="maint-form" onSubmit={submit}>
      <div className="maint-form-grid">
        <label className="merch-field">
          <span>What happened</span>
          <select className="form-input" value={type} onChange={(e) => setType(e.target.value as MaintenanceEventType)}>
            {(Object.keys(MAINTENANCE_EVENT_LABELS) as MaintenanceEventType[]).map((t) => (
              <option key={t} value={t}>
                {MAINTENANCE_EVENT_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="merch-field">
          <span>When</span>
          <input className="form-input" type="datetime-local" value={occurredAt} max={nowLocal()} onChange={(e) => setOccurredAt(e.target.value)} required />
        </label>
        <label className="merch-field">
          <span>Engine hours at the time (optional)</span>
          <input className="form-input" inputMode="decimal" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} />
        </label>
        <label className="merch-field">
          <span>Hours out of use (optional)</span>
          <input className="form-input" inputMode="decimal" value={downtimeHours} onChange={(e) => setDowntimeHours(e.target.value)} />
        </label>
        <label className="merch-field">
          <span>Component (optional)</span>
          <input className="form-input" value={component} placeholder="e.g. hydraulics, engine, tracks" onChange={(e) => setComponent(e.target.value)} />
        </label>
        <label className="merch-field maint-form-wide">
          <span>Notes (optional)</span>
          <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      {error && (
        <p className="merch-error" role="alert">
          {error}
        </p>
      )}
      <div className="maint-form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save record'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

/** Sets the machine's service interval, from the maker's manual or the client's own policy. */
export const MaintenancePlanForm: React.FC<{
  token: string;
  assetId: string;
  current: { serviceIntervalHours: string; intervalSource: string } | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ token, assetId, current, onSaved, onCancel }) => {
  const [intervalHours, setIntervalHours] = useState(current?.serviceIntervalHours ?? '');
  const [source, setSource] = useState(current?.intervalSource ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.setMaintenancePlan(token, { assetId, serviceIntervalHours: intervalHours.trim(), intervalSource: source.trim() });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="maint-form" onSubmit={submit}>
      <div className="maint-form-grid">
        <label className="merch-field">
          <span>Service every (engine hours)</span>
          <input className="form-input" inputMode="decimal" value={intervalHours} onChange={(e) => setIntervalHours(e.target.value)} required />
        </label>
        <label className="merch-field">
          <span>Where this interval comes from</span>
          <input className="form-input" value={source} placeholder="e.g. maker's manual, 500-hour service" onChange={(e) => setSource(e.target.value)} required />
        </label>
      </div>
      {error && (
        <p className="merch-error" role="alert">
          {error}
        </p>
      )}
      <div className="maint-form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save interval'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};
