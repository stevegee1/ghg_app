import React from 'react';
import { StatusBadge } from '../StatusBadge';

interface PortalCredentialsViewProps {
  credentials: any[];
  onIssueNewCredential: () => void;
  onOpenStudio: () => void;
}

export const PortalCredentialsView: React.FC<PortalCredentialsViewProps> = ({
  credentials,
  onIssueNewCredential,
  onOpenStudio,
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
            Issued Audit Warranty Credentials
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Polygon PoS ERC-1155 tokens attesting 1-year statutory audit warranty
          </p>
        </div>
        <button
          type="button"
          onClick={onIssueNewCredential}
          className="btn btn-primary"
          style={{ fontSize: '0.8rem', minHeight: '38px' }}
        >
          + Issue New Credential
        </button>
      </div>

      {credentials.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: 'var(--text-main)' }}>No credentials issued yet</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
            Complete your diagnostic evaluation in the Assurance Workflow Studio to generate and mint your tokenized audit badge.
          </p>
          <button
            type="button"
            onClick={onOpenStudio}
            className="btn btn-primary"
          >
            Go to Credential Studio (Step 4) &rarr;
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Credential ID</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Token ID</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Warranty Expires</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>OpenSea</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((cred: any) => (
                <tr key={cred.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {cred.id.substring(0, 18)}...
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--color-sky)' }}>
                    {cred.tokenId || '-'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <StatusBadge status={cred.status} />
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {cred.warrantyExpiresAt
                      ? new Date(cred.warrantyExpiresAt).toLocaleDateString('en-GB')
                      : '-'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {cred.openSeaUrl ? (
                      <a href={cred.openSeaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2081E2', fontSize: '0.8rem', fontWeight: 600 }}>
                        OpenSea
                      </a>
                    ) : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}
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
