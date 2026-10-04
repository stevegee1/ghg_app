import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { FLEET_CONNECTION_OPTIONS, type FleetAsset, type FleetConnectionOverview } from '../../api/fleet.types';
import { formatDate } from './fleetFormat';

const ONBOARDING_HINTS: Record<string, string> = {
  ALL: 'At onboarding you said all your machines report to a cloud. Please confirm each one below.',
  SOME: 'At onboarding you said some machines report to a cloud and some do not. Please confirm each one below.',
  NONE: 'At onboarding you said your machines do not report to a cloud yet. Please confirm each one below.',
  NOT_SURE: 'At onboarding you were not sure which machines report to a cloud. Check with your plant team and confirm each one below.',
};

const STATUS_LABELS = { REQUESTED: 'Requested', SCHEDULED: 'Scheduled', COMPLETED: 'Completed', CANCELLED: 'Cancelled' } as const;

interface Props {
  token: string;
  assets: FleetAsset[];
  refreshKey: number;
}

/**
 * Explains the three ways a machine can connect, shows how many still need confirming, and lets the
 * client book a set-up call for machines that need a tracking device.
 */
export const FleetConnectionPanel: React.FC<Props> = ({ token, assets, refreshKey }) => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<FleetConnectionOverview | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [contactName, setContactName] = useState([user?.firstName, user?.lastName].filter(Boolean).join(' '));
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [preferredTimes, setPreferredTimes] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await api.getFleetConnections(token));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (!overview) return null;

  const requested = new Set(
    overview.setupRequests.filter((r) => r.status === 'REQUESTED' || r.status === 'SCHEDULED').flatMap((r) => r.assetIds)
  );
  const needingCall = assets.filter((a) => a.active && a.connectionBranch === 'TRACKING_DEVICE' && !requested.has(a.id));
  const tagFor = (id: string) => assets.find((a) => a.id === id)?.assetTag ?? 'Removed asset';
  const unconfirmed = overview.counts.UNCONFIRMED;

  const openForm = () => {
    setSelected(needingCall.map((a) => a.id));
    setFormOpen(true);
    setNotice(null);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) return setError('Choose at least one machine.');
    setSending(true);
    setError(null);
    try {
      await api.requestFleetSetupCall(token, {
        assetIds: selected,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        preferredTimes: preferredTimes.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setFormOpen(false);
      setNotice('Set-up call requested. We will email you to confirm a time.');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fleet-panel fleet-connection-panel">
      <h3 className="fleet-panel-title">How each machine connects</h3>
      {unconfirmed > 0 ? (
        <p className="fleet-connection-alert" role="status">
          {unconfirmed} {unconfirmed === 1 ? 'machine needs' : 'machines need'} a connection choice. Set it in the Connection column below.
        </p>
      ) : (
        <p className="fleet-muted">Every active machine has a confirmed connection.</p>
      )}
      {unconfirmed > 0 && overview.onboardingCloudConnection && (
        <p className="fleet-muted">{ONBOARDING_HINTS[overview.onboardingCloudConnection]}</p>
      )}
      <dl className="fleet-connection-options">
        {FLEET_CONNECTION_OPTIONS.map((o) => (
          <div key={o.id}>
            <dt>
              {o.label} <span className="fleet-muted">({overview.counts[o.id]})</span>
            </dt>
            <dd>{o.help}</dd>
          </div>
        ))}
      </dl>

      {notice && <p className="fleet-notice">{notice}</p>}

      {needingCall.length > 0 && !formOpen && (
        <div className="fleet-form-actions">
          <button type="button" className="btn btn-primary" onClick={openForm}>
            Book a set-up call ({needingCall.length} {needingCall.length === 1 ? 'machine' : 'machines'})
          </button>
        </div>
      )}

      {formOpen && (
        <form className="fleet-form fleet-setup-form" onSubmit={send} noValidate>
          <h4>Book a tracking-device set-up call</h4>
          <fieldset className="fleet-api-scopes">
            <legend>Machines</legend>
            {needingCall.map((a) => (
              <label key={a.id} className="fleet-checkbox">
                <input
                  type="checkbox"
                  checked={selected.includes(a.id)}
                  onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id)))}
                />
                <span>
                  <strong>{a.assetTag}</strong> {a.name}
                  {a.make ? <span className="fleet-muted"> · {[a.make, a.model].filter(Boolean).join(' ')}</span> : null}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="fleet-form-grid">
            <label>
              Contact name
              <input value={contactName} maxLength={120} onChange={(e) => setContactName(e.target.value)} />
            </label>
            <label>
              Contact email
              <input type="email" value={contactEmail} maxLength={254} onChange={(e) => setContactEmail(e.target.value)} />
            </label>
            <label>
              Phone (optional)
              <input type="tel" value={contactPhone} maxLength={40} onChange={(e) => setContactPhone(e.target.value)} />
            </label>
            <label>
              Best times (optional)
              <input value={preferredTimes} maxLength={500} placeholder="e.g. weekday mornings" onChange={(e) => setPreferredTimes(e.target.value)} />
            </label>
          </div>
          <label>
            Anything we should know (optional)
            <textarea rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {error && (
            <p className="fleet-error-text" role="alert">
              {error}
            </p>
          )}
          <div className="fleet-form-actions">
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending...' : 'Request call'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {overview.setupRequests.length > 0 && (
        <div className="fleet-setup-requests">
          <h4>Set-up calls</h4>
          <ul className="fleet-split-list">
            {overview.setupRequests.map((r) => (
              <li key={r.id}>
                <span>{r.assetIds.map(tagFor).join(', ')}</span>
                <span className="fleet-muted">
                  {r.status === 'SCHEDULED' && r.scheduledFor
                    ? `Scheduled for ${formatDate(r.scheduledFor)}`
                    : r.status === 'REQUESTED'
                    ? `Requested ${formatDate(r.createdAt)}`
                    : STATUS_LABELS[r.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
