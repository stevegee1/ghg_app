import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminFleetSetupRequest } from '../../api/fleet.types';

const STATUS_LABELS: Record<AdminFleetSetupRequest['status'], string> = {
  REQUESTED: 'Requested',
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Tracking-device set-up calls requested by Fleet clients (Branch B). */
export const FleetSetupRequestsAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [requests, setRequests] = useState<AdminFleetSetupRequest[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { scheduledFor: string; adminNotes: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { requests: list } = await api.listAdminFleetSetupRequests(token);
      setRequests(list);
      setDrafts(Object.fromEntries(list.map((r) => [r.id, { scheduledFor: toLocalInput(r.scheduledFor), adminNotes: r.adminNotes ?? '' }])));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (r: AdminFleetSetupRequest, status: AdminFleetSetupRequest['status']) => {
    const draft = drafts[r.id];
    if (status === 'SCHEDULED' && !draft.scheduledFor) return setError('Choose the call date and time before scheduling.');
    setBusy(r.id);
    setError(null);
    try {
      await api.updateAdminFleetSetupRequest(token, r.id, {
        status,
        scheduledFor: draft.scheduledFor ? new Date(draft.scheduledFor).toISOString() : null,
        adminNotes: draft.adminNotes.trim() || null,
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="fleet-stack" aria-labelledby="fleet-setup-admin-title">
      <header>
        <h2 id="fleet-setup-admin-title" className="fleet-panel-title">Fleet tracking-device set-up calls</h2>
        <p className="fleet-muted">Clients request these for machines that need a tracker fitted. Open requests are listed first.</p>
      </header>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!requests && !error && <div className="fleet-panel fleet-state">Loading requests...</div>}
      {requests && requests.length === 0 && <div className="fleet-panel fleet-muted">No set-up calls requested yet.</div>}
      {requests?.map((r) => {
        const draft = drafts[r.id];
        const open = r.status === 'REQUESTED' || r.status === 'SCHEDULED';
        return (
          <article key={r.id} className="fleet-panel fleet-form">
            <h3 className="fleet-panel-title">
              {r.licensee.name} <span className="fleet-muted">· {STATUS_LABELS[r.status]}</span>
            </h3>
            <p className="fleet-muted">
              {r.contactName} · <a href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a>
              {r.contactPhone ? ` · ${r.contactPhone}` : ''}
              {r.preferredTimes ? ` · prefers ${r.preferredTimes}` : ''}
            </p>
            <ul className="fleet-split-list">
              {r.assets.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.assetTag}</strong> {a.name}
                  </span>
                  <span className="fleet-muted">{[a.make, a.model].filter(Boolean).join(' ') || 'Make not given'}</span>
                </li>
              ))}
            </ul>
            {r.notes && <p className="pipeline-quote">{r.notes}</p>}
            {open && draft && (
              <>
                <div className="fleet-form-grid">
                  <label>
                    Call date and time
                    <input
                      type="datetime-local"
                      value={draft.scheduledFor}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], scheduledFor: e.target.value } }))}
                    />
                  </label>
                  <label>
                    Internal notes
                    <input
                      value={draft.adminNotes}
                      maxLength={2000}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], adminNotes: e.target.value } }))}
                    />
                  </label>
                </div>
                <div className="fleet-form-actions">
                  <button type="button" className="btn btn-primary btn-small" disabled={busy !== null} onClick={() => update(r, 'SCHEDULED')}>
                    {r.status === 'SCHEDULED' ? 'Update schedule' : 'Schedule'}
                  </button>
                  <button type="button" className="btn btn-secondary btn-small" disabled={busy !== null} onClick={() => update(r, 'COMPLETED')}>
                    Mark completed
                  </button>
                  <button type="button" className="btn btn-secondary btn-small" disabled={busy !== null} onClick={() => update(r, 'CANCELLED')}>
                    Cancel request
                  </button>
                </div>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
};
