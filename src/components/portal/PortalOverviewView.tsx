import React from 'react';
import { SharedDashboardShell } from '../SharedDashboardShell';

type AuditScope = 'CARBON_EMISSION' | 'JOB_REPORTING';

export interface KPIItem {
  label: string;
  value: string;
  sub: string;
}

interface PortalOverviewViewProps {
  /** Account figures from settled payments and issued credentials. */
  accountKpis: KPIItem[];
  /** Workforce filing figures; shown only when the client holds Workforce. */
  workforceKpis: KPIItem[] | null;
  services: { carbon: boolean; job: boolean };
  handleNavigateWorkflow: (scope: AuditScope) => void;
}

const KpiRow: React.FC<{ title: string; items: KPIItem[] }> = ({ title, items }) => (
  <section className="portal-kpi-section" aria-label={title}>
    <h3 className="portal-kpi-title">{title}</h3>
    <div className="portal-kpi-grid">
      {items.map((kpi) => (
        <div key={kpi.label} className="persefoni-card portal-kpi-card">
          <div className="portal-kpi-label">{kpi.label}</div>
          <div className="portal-kpi-value">{kpi.value}</div>
          <div className="portal-kpi-sub">{kpi.sub}</div>
        </div>
      ))}
    </div>
  </section>
);

export const PortalOverviewView: React.FC<PortalOverviewViewProps> = ({
  accountKpis,
  workforceKpis,
  services,
  handleNavigateWorkflow,
}) => (
  <div className="portal-overview">
    <KpiRow title="Account" items={accountKpis} />
    {workforceKpis && <KpiRow title="Workforce filings" items={workforceKpis} />}
    <SharedDashboardShell
      hideEmailBanner={true}
      services={services}
      onNavigateWorkflow={(type) => handleNavigateWorkflow(type === 'JOB' ? 'JOB_REPORTING' : 'CARBON_EMISSION')}
    />
  </div>
);
