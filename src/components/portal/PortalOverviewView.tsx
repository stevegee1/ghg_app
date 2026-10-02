import React from 'react';
import { SharedDashboardShell } from '../SharedDashboardShell';
import { StatusBadge } from '../StatusBadge';

type AuditScope = 'CARBON_EMISSION' | 'JOB_REPORTING';
type WorkflowStep = 1 | 2 | 3 | 4 | 5;

interface KPIItem {
  label: string;
  value: string;
  sub: string;
  accent: string;
}

interface PortalOverviewViewProps {
  user: any;
  isCarbonPrepReady: boolean;
  isJobPrepReady: boolean;
  auditScope: AuditScope;
  setAuditScope: (scope: AuditScope) => void;
  kpis: KPIItem[];
  credentials: any[];
  transactions: any[];
  handleNavigateWorkflow: (step: WorkflowStep, scope: AuditScope) => void;
  setActiveView: (view: any) => void;
}

export const PortalOverviewView: React.FC<PortalOverviewViewProps> = ({
  user,
  isCarbonPrepReady,
  isJobPrepReady,
  auditScope,
  setAuditScope,
  kpis,
  credentials,
  transactions,
  handleNavigateWorkflow,
  setActiveView,
}) => {
  return (
    <div className="space-y-8" style={{ marginBottom: '2.5rem' }}>
      <SharedDashboardShell
        hideEmailBanner={true}
        onNavigateWorkflow={(type) => {
          if (type === 'JOB') {
            handleNavigateWorkflow(1, 'JOB_REPORTING');
          } else {
            handleNavigateWorkflow(1, 'CARBON_EMISSION');
          }
        }}
      />

      {/* Sovereign Assurance Launchers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div
          className="persefoni-card"
          style={{
            padding: '1.5rem',
            border: '1px solid #bbf7d0',
            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Independent Assurance Flow
              </span>
              <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '9999px', fontWeight: 600 }}>
                ISO 14064-1
              </span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              GHG &amp; Carbon Emissions
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Corporate carbon footprint audit across Scope 1 direct, Scope 2 electricity, and Scope 3 supply chain with dual-mark warranty attestation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigateWorkflow(1, 'CARBON_EMISSION')}
            style={{
              backgroundColor: isCarbonPrepReady ? '#16a34a' : '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {!user?.hasCompletedAssessment
              ? 'Complete Intake Assessment First \u2192'
              : !isCarbonPrepReady
              ? 'Complete Preparation Checklist First \u2192'
              : 'Launch Carbon Assurance Engine \u2192'}
          </button>
        </div>

        <div
          className="persefoni-card"
          style={{
            padding: '1.5rem',
            border: '1px solid #bfdbfe',
            background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Independent Assurance Flow
              </span>
              <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', fontWeight: 600 }}>
                Section 106 &amp; ESRS S1
              </span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              Workforce &amp; Social Value
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Legally enforceable statutory Section 106 TCPA 1990 covenant audit, apprentice density verification, and CSRD workforce social compliance assurance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNavigateWorkflow(1, 'JOB_REPORTING')}
            style={{
              backgroundColor: isJobPrepReady ? '#2563eb' : '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {!user?.hasCompletedAssessment
              ? 'Complete Intake Assessment First \u2192'
              : !isJobPrepReady
              ? 'Complete Preparation Checklist First \u2192'
              : 'Launch Workforce Assurance Engine \u2192'}
          </button>
        </div>
      </div>

      {/* Adaptive KPI Summary Cards with Scope Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Statutory Assurance Performance KPIs
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
            Audited metrics verified against smart contract registry and regulatory filings
          </p>
        </div>
        <div style={{ display: 'inline-flex', padding: '3px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setAuditScope('CARBON_EMISSION')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: auditScope === 'CARBON_EMISSION' ? '#ffffff' : 'transparent',
              color: auditScope === 'CARBON_EMISSION' ? '#0f172a' : '#64748b',
              boxShadow: auditScope === 'CARBON_EMISSION' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Carbon KPIs
          </button>
          <button
            type="button"
            onClick={() => setAuditScope('JOB_REPORTING')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: auditScope === 'JOB_REPORTING' ? '#ffffff' : 'transparent',
              color: auditScope === 'JOB_REPORTING' ? '#0f172a' : '#64748b',
              boxShadow: auditScope === 'JOB_REPORTING' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Workforce KPIs
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="persefoni-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: kpi.accent }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.72rem', color: kpi.accent, marginTop: '0.2rem', fontWeight: 600 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent Credentials and Settlements Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
        {/* Recent Credentials Preview */}
        <div className="persefoni-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Recent Credentials</h3>
            <button type="button" onClick={() => setActiveView('credentials')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
              View All ({credentials.length}) &rarr;
            </button>
          </div>
          {credentials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.82rem', margin: '0 0 0.75rem 0' }}>No credentials issued yet.</p>
              <button type="button" onClick={() => handleNavigateWorkflow(4, 'CARBON_EMISSION')} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
                Open Credential Studio
              </button>
            </div>
          ) : (
            <div>
              {credentials.slice(0, 3).map((c: any) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-main)' }}>{c.id.substring(0, 14)}...</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Settlements Preview */}
        <div className="persefoni-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Recent Settlements</h3>
            <button type="button" onClick={() => setActiveView('transactions')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
              View All ({transactions.length}) &rarr;
            </button>
          </div>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.82rem', margin: '0 0 0.75rem 0' }}>No transactions recorded yet.</p>
              <button type="button" onClick={() => handleNavigateWorkflow(2, 'CARBON_EMISSION')} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}>
                Review Commercial Scope
              </button>
            </div>
          ) : (
            <div>
              {transactions.slice(0, 3).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>£{(t.grossAmountCents / 100).toFixed(2)}</span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
