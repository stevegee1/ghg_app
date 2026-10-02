import React from 'react';

export const PortalLegalView: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
          Statutory Covenants &amp; Legal Framework
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '720px' }}>
          Binding regulatory disclosures, ISO 19011:2026 remote auditing assurance terms, and statutory fee allocation agreements.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="persefoni-card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--color-sky)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Assurance Standard
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-main)' }}>
            ISO 19011:2026 Annex A Remote Verification
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Audits are conducted in strict alignment with ISO 19011:2026 Annex A remote auditing guidelines. Cryptographic evidence watermarking guarantees chain-of-custody for all utility files, telemetry sensor logs, and statutory carbon accounting disclosures.
          </p>
        </div>

        <div className="persefoni-card" style={{ padding: '1.75rem', borderLeft: '4px solid var(--color-green)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-green)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Statutory Division
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-main)' }}>
            85% Core Operations / 15% ESG Endowment
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Every transaction automatically splits 15% of gross fees directly to verified UK/EU environmental disaster relief charities and registered social foundation partners under transparent on-chain accounting.
          </p>
        </div>

        <div className="persefoni-card" style={{ padding: '1.75rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Warranty Validity
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-main)' }}>
            Bi-Temporal Warranty &amp; Operational Health
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Licenses carry a 365-day statutory epoch tied to continuous operational telemetry. Annual recalibration requires ISO/IEC 17025 certified lab testing. Telemetry drift exceeding 15% automatically suspends public trust seal verification.
          </p>
        </div>
      </div>

      <div className="persefoni-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-main)' }}>
          Full Regulatory Cross-Walk &amp; Disclosure Compliance
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Regulation / Standard</th>
                <th style={{ padding: '0.75rem 1rem' }}>Jurisdiction</th>
                <th style={{ padding: '0.75rem 1rem' }}>Statutory Threshold</th>
                <th style={{ padding: '0.75rem 1rem' }}>Audit Readiness Level</th>
              </tr>
            </thead>
            <tbody>
              {[
                { std: 'ISO 14064-1:2018', jur: 'Global / BSI', req: 'Scope 1, 2 & Category 3-6 Value Chain', status: 'Full System Readiness' },
                { std: 'ISO 50001:2018', jur: 'Global / EnMS', req: 'Energy Review & Measurement Plan', status: 'Full System Readiness' },
                { std: 'UK SECR (Companies Act 2006)', jur: 'United Kingdom', req: 'Quoted / Large Unquoted Companies', status: 'Statutory Direct Aligned' },
                { std: 'EU CSRD (ESRS E1)', jur: 'European Union', req: 'Double Materiality & 1.5C Transition', status: 'High Assurance Aligned' },
                { std: 'US CA-SB 253 (CCDRA)', jur: 'California / US', req: 'Revenue > $1B with Scope 1-3 Disclosures', status: 'SEC / CARB Standard Aligned' },
                { std: 'UK CMA Green Claims Code', jur: 'United Kingdom', req: 'Substantiated Marketing & Anti-Greenwash', status: 'Consumer Protection Assured' },
              ].map((row) => (
                <tr key={row.std} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>{row.std}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{row.jur}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{row.req}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-green)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
