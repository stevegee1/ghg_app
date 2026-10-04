import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { CAPACITY_BANDS, CERTIFICATIONS, DELIVERY_CAPABILITIES, PRODUCTION_CAPABILITIES } from '../partners/partnerOptions';

interface Application {
  id: string;
  companyName: string;
  workEmail: string;
  regionOfOperation: string;
  capabilities: string[];
  monthlyCapacityUnits: string;
  certifications: string[];
  message: string | null;
  status: 'PENDING' | 'UNDER_REVIEW' | 'CALL_SCHEDULED' | 'APPROVED' | 'REJECTED';
  reviewNotes: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<Application['status'], string> = {
  PENDING: 'New',
  UNDER_REVIEW: 'Under review',
  CALL_SCHEDULED: 'Call scheduled',
  APPROVED: 'Approved',
  REJECTED: 'Declined',
};

const LABELS: Record<string, string> = Object.fromEntries(
  [...DELIVERY_CAPABILITIES, ...PRODUCTION_CAPABILITIES, ...CERTIFICATIONS, ...CAPACITY_BANDS].map((o) => [o.id, o.label])
);

/** Applications from local delivery and production partners for merch orders. */
export const DeliveryPartnersAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.getAdminFulfillmentPartners(token);
      setApps(res.applications);
      setNotes(Object.fromEntries((res.applications as Application[]).map((a) => [a.id, a.reviewNotes ?? ''])));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (a: Application, status: Application['status']) => {
    setBusy(a.id);
    setError(null);
    try {
      await api.updateAdminFulfillmentPartner(token, a.id, { status, reviewNotes: notes[a.id] ?? '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="fleet-stack" aria-labelledby="delivery-partners-title">
      <header>
        <h2 id="delivery-partners-title" className="fleet-panel-title">Delivery and production partner applications</h2>
        <p className="fleet-muted">Local partners who produce and deliver merch orders near the customer.</p>
      </header>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!apps && !error && <div className="fleet-panel fleet-state">Loading applications...</div>}
      {apps && apps.length === 0 && <div className="fleet-panel fleet-muted">No applications yet.</div>}
      {apps?.map((a) => (
        <article key={a.id} className="fleet-panel fleet-form">
          <h3 className="fleet-panel-title">
            {a.companyName} <span className="fleet-muted">· {STATUS_LABELS[a.status]}</span>
          </h3>
          <p className="fleet-muted">
            <a href={`mailto:${a.workEmail}`}>{a.workEmail}</a> · covers {a.regionOfOperation} · {LABELS[a.monthlyCapacityUnits] ?? a.monthlyCapacityUnits} ·
            applied {new Date(a.createdAt).toLocaleDateString('en-GB')}
          </p>
          <ul className="fleet-split-list">
            <li>
              <span>Services</span>
              <span className="fleet-muted">{a.capabilities.map((c) => LABELS[c] ?? c).join(', ') || 'None given'}</span>
            </li>
            <li>
              <span>Certifications</span>
              <span className="fleet-muted">{a.certifications.map((c) => LABELS[c] ?? c).join(', ') || 'None given'}</span>
            </li>
          </ul>
          {a.message && <p className="pipeline-quote">{a.message}</p>}
          <label>
            Review notes
            <input value={notes[a.id] ?? ''} maxLength={2000} onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))} />
          </label>
          <div className="fleet-form-actions">
            {(['UNDER_REVIEW', 'CALL_SCHEDULED', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                className={`btn btn-small ${status === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}`}
                disabled={busy !== null || a.status === status}
                onClick={() => setStatus(a, status)}
              >
                {status === 'REJECTED' ? 'Decline' : STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
};
