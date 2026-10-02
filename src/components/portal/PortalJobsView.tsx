import React from 'react';

interface PortalJobsViewProps {
  jobReports: any[];
  loading: boolean;
  onNewFiling: () => void;
}

export const PortalJobsView: React.FC<PortalJobsViewProps> = ({
  jobReports,
  loading,
  onNewFiling,
}) => {
  return (
    <div className="persefoni-card portal-card-pad" style={{ marginBottom: '2.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            Job Creation &amp; Social Impact Filings
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Section 106 local authority covenants and artisan manufacturing workforce hours
          </p>
        </div>
        <button
          type="button"
          onClick={onNewFiling}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', minHeight: '38px' }}
        >
          + New Filing
        </button>
      </div>

      {loading ? (
        <div className="dash-loading-state">
          <span className="dash-spinner" />
          Loading filings...
        </div>
      ) : jobReports.length === 0 ? (
        <div className="dash-empty-state">
          <div className="dash-empty-state-title">No Job Filings Recorded</div>
          <div className="dash-empty-state-desc">
            No Section 106 local authority filings have been logged for this period.
          </div>
          <button
            type="button"
            onClick={onNewFiling}
            className="btn btn-primary"
            style={{ marginTop: '0.5rem' }}
          >
            Submit Your First Filing
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Period</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date Range</th>
                <th style={{ padding: '0.75rem 1rem' }}>Jobs Created</th>
                <th style={{ padding: '0.75rem 1rem' }}>Source</th>
                <th style={{ padding: '0.75rem 1rem' }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {jobReports.map((report: any) => (
                <tr key={report.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ backgroundColor: 'var(--accent-light)', color: 'var(--color-sky)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {report.periodType}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(report.periodStart).toLocaleDateString('en-GB')} - {new Date(report.periodEnd).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '1rem', color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                    {report.jobsCreated}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                      {report.reportSource === 'THIRD_PARTY_API' ? 'API Ingest' : 'Portal Self-Report'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '280px' }}>
                    {report.attestationNote || 'Verified Section 106 covenant'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
