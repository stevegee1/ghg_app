import React, { useCallback, useEffect, useState } from 'react';
import { api, NewsletterSubscriberListing, NewsletterSubscriberStatus } from '../../api/client';
import { saveBlob } from '../fleet/fleetFormat';

const STATUS_LABELS: Record<NewsletterSubscriberStatus, string> = {
  CONFIRMED: 'Confirmed',
  PENDING: 'Awaiting confirmation',
  UNSUBSCRIBED: 'Unsubscribed',
};

/** Newsletter sign-ups. Only confirmed addresses may be emailed; the export contains only those. */
export const NewsletterAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [filter, setFilter] = useState<NewsletterSubscriberStatus>('CONFIRMED');
  const [data, setData] = useState<NewsletterSubscriberListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setData(null);
    api
      .getNewsletterSubscribers(token, filter)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [token, filter]);
  useEffect(load, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await api.downloadFile(token, '/api/admin/newsletter/subscribers.csv');
      saveBlob(blob, fileName);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fleet-panel">
      <h3 className="fleet-panel-title">Newsletter subscribers</h3>
      <p className="fleet-muted">
        People join from the site footer and confirm by email. Only confirmed addresses may be sent the newsletter; every email must include the
        unsubscribe link.
      </p>
      <div className="newsletter-admin-bar">
        <div className="merch-filters" role="group" aria-label="Filter by status">
          {(Object.keys(STATUS_LABELS) as NewsletterSubscriberStatus[]).map((s) => (
            <button key={s} type="button" className={`merch-filter${filter === s ? ' is-active' : ''}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {STATUS_LABELS[s]}
              {data ? ` (${data.counts[s]})` : ''}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={exporting || !data || data.counts.CONFIRMED === 0}>
          {exporting ? 'Exporting...' : 'Export confirmed (CSV)'}
        </button>
      </div>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="fleet-muted">Loading...</p>}
      {data && data.subscribers.length === 0 && <p className="fleet-muted">No subscribers with this status.</p>}
      {data && data.subscribers.length > 0 && (
        <div className="table-container-responsive">
          <table className="newsletter-admin-table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Agreed</th>
                <th scope="col">Confirmed</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {data.subscribers.map((s) => (
                <tr key={s.email}>
                  <td>{s.email}</td>
                  <td>{new Date(s.consentAt).toLocaleDateString('en-GB')}</td>
                  <td>{s.confirmedAt ? new Date(s.confirmedAt).toLocaleDateString('en-GB') : 'Not yet'}</td>
                  <td>{s.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
