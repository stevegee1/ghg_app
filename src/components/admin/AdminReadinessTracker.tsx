import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type EntitlementStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
type ServiceLine = 'GHG' | 'CARBON' | 'JOB' | 'MERCH' | 'FLEET';

interface ServiceEntitlement {
  serviceLine: ServiceLine;
  status: EntitlementStatus;
  grantedAt: string | null;
}

interface Framework {
  frameworkCode: string;
  frameworkName: string;
  isLegallyMandatory: boolean;
  clientAccepted: boolean;
  isReadyToIngest: boolean;
  totalItems: number;
  completedItems: number;
}

interface LicenseeRow {
  licenseeId: string;
  licenseeName: string;
  country: string;
  industrySector: string | null;
  hasCompletedAssessment: boolean;
  assessmentCompletedAt: string | null;
  totalFrameworksRecommended: number;
  mandatoryFrameworksCount: number;
  readyFrameworksCount: number;
  totalChecklistItems: number;
  completedChecklistItems: number;
  readinessPercentage: number;
  primaryContact: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    jobTitle: string | null;
    primaryRole: string | null;
  } | null;
  serviceEntitlements: ServiceEntitlement[];
  frameworks: Framework[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_LINE_META: Record<ServiceLine, { label: string; color: string; bg: string; description: string }> = {
  GHG: {
    label: 'GHG Disclosure',
    color: '#0369a1',
    bg: '#e0f2fe',
    description: 'SECR, ISO 14064-1, ISO 50001, ESOS',
  },
  CARBON: {
    label: 'Carbon Claims',
    color: '#7c3aed',
    bg: '#ede9fe',
    description: 'PPN 006, CMA Green Claims, SBTi, ISO 14068',
  },
  JOB: {
    label: 'Job Reporting',
    color: '#0f766e',
    bg: '#ccfbf1',
    description: 'Section 106, Social Value, PPN 002/026',
  },
  MERCH: {
    label: 'Merchandise',
    color: '#b45309',
    bg: '#fef3c7',
    description: 'Commercial Participator / Charity Split',
  },
  FLEET: {
    label: 'Fleet Emissions',
    color: '#15803d',
    bg: '#dcfce7',
    description: 'Scope 1 mobile combustion, per-asset subscription',
  },
};

const ENTITLEMENT_STATUS_META: Record<EntitlementStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#92400e', bg: '#fef3c7' },
  ACTIVE:    { label: 'Active',    color: '#15803d', bg: '#dcfce7' },
  SUSPENDED: { label: 'Suspended', color: '#b91c1c', bg: '#fee2e2' },
  REVOKED:   { label: 'Revoked',   color: '#6b7280', bg: '#f3f4f6' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const EntitlementPill: React.FC<{ entitlement: ServiceEntitlement }> = ({ entitlement }) => {
  const lineMeta = SERVICE_LINE_META[entitlement.serviceLine];
  const statusMeta = ENTITLEMENT_STATUS_META[entitlement.status];

  return (
    <div
      title={lineMeta.description}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        background: lineMeta.bg,
        border: `1px solid ${lineMeta.color}22`,
        fontSize: '0.7rem',
        fontWeight: 700,
        color: lineMeta.color,
        whiteSpace: 'nowrap',
      }}
    >
      {lineMeta.label}
      <span
        style={{
          padding: '0.05rem 0.3rem',
          borderRadius: '999px',
          background: statusMeta.bg,
          color: statusMeta.color,
          fontSize: '0.62rem',
          fontWeight: 800,
          letterSpacing: '0.03em',
        }}
      >
        {statusMeta.label.toUpperCase()}
      </span>
    </div>
  );
};

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
    <div
      style={{
        width: `${pct}%`,
        height: '100%',
        borderRadius: '3px',
        background: pct === 100 ? '#16a34a' : pct > 60 ? '#0284c7' : '#f59e0b',
        transition: 'width 0.3s ease',
      }}
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminReadinessTracker: React.FC = () => {
  const { token } = useAuth();
  const [licensees, setLicensees] = useState<LicenseeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [filterLine, setFilterLine] = useState<ServiceLine | 'ALL'>('ALL');

  const [selectedLicensee, setSelectedLicensee] = useState<LicenseeRow | null>(null);
  const [checklistModalOpen, setChecklistModalOpen] = useState<boolean>(false);
  const [clientChecklists, setClientChecklists] = useState<any[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState<boolean>(false);
  const [waiveReason, setWaiveReason] = useState<string>('');
  const [waivingItemId, setWaivingItemId] = useState<string | null>(null);

  const fetchTrackerData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminReadinessTracker(token);
      setLicensees(res.licensees || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load readiness overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [token]);

  const handleInspectLicensee = async (lic: LicenseeRow) => {
    setSelectedLicensee(lic);
    setChecklistModalOpen(true);
    if (!token) return;
    try {
      setChecklistsLoading(true);
      const res = await fetch(`/api/checklists`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-licensee-id': lic.licenseeId,
        },
      });
      const data = await res.json();
      setClientChecklists(data.checklists || []);
    } catch (err: any) {
      console.error('Failed to load client checklists:', err);
    } finally {
      setChecklistsLoading(false);
    }
  };

  const handleWaiveItem = async (itemId: string) => {
    if (!token || !waiveReason.trim()) return;
    try {
      await api.adminWaiveChecklistItem(token, itemId, waiveReason.trim());
      setWaiveReason('');
      setWaivingItemId(null);
      await fetchTrackerData();
      if (selectedLicensee) handleInspectLicensee(selectedLicensee);
    } catch (err: any) {
      alert(err.message || 'Failed to waive checklist item');
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredLicensees = licensees.filter((l) => {
    const q = search.toLowerCase();
    const textMatch =
      l.licenseeName.toLowerCase().includes(q) ||
      (l.primaryContact?.email || '').toLowerCase().includes(q) ||
      (l.industrySector || '').toLowerCase().includes(q);

    const lineMatch =
      filterLine === 'ALL' ||
      l.serviceEntitlements.some((e) => e.serviceLine === filterLine);

    return textMatch && lineMatch;
  });

  // ── KPI aggregates ─────────────────────────────────────────────────────────

  const totalCount = licensees.length;
  const completedAssessmentCount = licensees.filter((l) => l.hasCompletedAssessment).length;
  const fullyReadyCount = licensees.filter((l) => l.readyFrameworksCount > 0).length;
  const inPreparationCount = licensees.filter(
    (l) => l.hasCompletedAssessment && l.readinessPercentage > 0 && l.readinessPercentage < 100
  ).length;

  const activeEntitlementsByLine: Record<ServiceLine, number> = {
    GHG: 0, CARBON: 0, JOB: 0, MERCH: 0, FLEET: 0,
  };
  licensees.forEach((l) => {
    l.serviceEntitlements.forEach((e) => {
      if (e.status === 'ACTIVE' || e.status === 'PENDING') {
        activeEntitlementsByLine[e.serviceLine]++;
      }
    });
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading enterprise readiness tracking telemetry...
      </div>
    );
  }

  return (
    <div>
      {/* KPI Overview Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={kpiCard}>
          <div style={kpiLabel}>Total Client Accounts</div>
          <div style={{ ...kpiValue, color: '#0f172a' }}>{totalCount}</div>
        </div>

        <div style={kpiCard}>
          <div style={{ ...kpiLabel, color: '#0369a1' }}>Assessments Completed</div>
          <div style={{ ...kpiValue, color: '#0284c7' }}>
            {completedAssessmentCount}
            <span style={kpiSub}>/ {totalCount}</span>
          </div>
        </div>

        <div style={kpiCard}>
          <div style={{ ...kpiLabel, color: '#d97706' }}>In Data Gathering</div>
          <div style={{ ...kpiValue, color: '#b45309' }}>{inPreparationCount}</div>
        </div>

        <div style={kpiCard}>
          <div style={{ ...kpiLabel, color: '#15803d' }}>Audit-Ready Dossiers</div>
          <div style={{ ...kpiValue, color: '#16a34a' }}>{fullyReadyCount}</div>
        </div>
      </div>

      {/* Service Line Pipeline KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '2rem',
        }}
      >
        {(Object.keys(SERVICE_LINE_META) as ServiceLine[]).map((line) => {
          const meta = SERVICE_LINE_META[line];
          return (
            <button
              key={line}
              type="button"
              onClick={() => setFilterLine(filterLine === line ? 'ALL' : line)}
              style={{
                background: filterLine === line ? meta.bg : '#ffffff',
                border: `1.5px solid ${filterLine === line ? meta.color : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {meta.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                {activeEntitlementsByLine[line]}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {meta.description}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Search + Filter Header */}
      <div className="tracker-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Client Readiness &amp; Pipeline Entitlements
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Live mirror of every licensee intake state, service line access, and audit dossier readiness.
            {filterLine !== 'ALL' && (
              <span style={{ marginLeft: '0.5rem', color: SERVICE_LINE_META[filterLine].color, fontWeight: 600 }}>
                Filtered: {SERVICE_LINE_META[filterLine].label}
              </span>
            )}
          </p>
        </div>

        <input
          id="admin-tracker-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, contact email, sector..."
          style={{
            padding: '0.6rem 0.95rem',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            minWidth: '240px',
            flex: '1 1 240px',
            maxWidth: '360px',
            outline: 'none',
            transition: 'border-color 0.15s ease',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Tracker Table */}
      <div className="tracker-table-wrapper" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '10px', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={th}>Client Organisation</th>
              <th style={th}>Sector / Country</th>
              <th style={th}>Primary Contact</th>
              <th style={th}>Service Lines</th>
              <th style={th}>Assessment</th>
              <th style={th}>Preparation Progress</th>
              <th style={th}>Audit Ingestion</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicensees.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No client accounts matched your filter.
                </td>
              </tr>
            ) : (
              filteredLicensees.map((lic) => {
                const isReady = lic.readyFrameworksCount > 0;
                const isPending = !lic.hasCompletedAssessment;
                const hasEntitlements = lic.serviceEntitlements.length > 0;

                return (
                  <tr key={lic.licenseeId} style={{ borderBottom: '1px solid #f1f5f9' }}>

                    {/* Organisation */}
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      <div>{lic.licenseeName}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400, marginTop: '0.1rem' }}>
                        {lic.licenseeId.slice(0, 12)}...
                      </div>
                    </td>

                    {/* Sector */}
                    <td style={{ padding: '0.9rem 1rem', color: '#475569' }}>
                      <div>{lic.industrySector || 'General'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{lic.country}</div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>
                      {lic.primaryContact ? (
                        <>
                          <div style={{ fontWeight: 500 }}>
                            {lic.primaryContact.firstName} {lic.primaryContact.lastName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {lic.primaryContact.email}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {lic.primaryContact.jobTitle || lic.primaryContact.primaryRole}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Unassigned</span>
                      )}
                    </td>

                    {/* Service Line Entitlements - the core new column */}
                    <td style={{ padding: '0.9rem 1rem', minWidth: '180px' }}>
                      {hasEntitlements ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {lic.serviceEntitlements.map((e) => (
                            <EntitlementPill key={e.serviceLine} entitlement={e} />
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No pipelines selected
                        </span>
                      )}
                    </td>

                    {/* Assessment */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {lic.hasCompletedAssessment ? (
                        <div>
                          <span style={badge('#dcfce7', '#15803d')}>
                            Completed
                          </span>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem' }}>
                            {lic.totalFrameworksRecommended} framework{lic.totalFrameworksRecommended !== 1 ? 's' : ''}
                            {' '}({lic.mandatoryFrameworksCount} mandatory)
                          </div>
                        </div>
                      ) : (
                        <span style={badge('#f1f5f9', '#64748b')}>Intake Pending</span>
                      )}
                    </td>

                    {/* Preparation Progress */}
                    <td style={{ padding: '0.9rem 1rem', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {lic.readinessPercentage}%
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                          {lic.completedChecklistItems}/{lic.totalChecklistItems}
                        </span>
                      </div>
                      <ProgressBar pct={lic.readinessPercentage} />
                    </td>

                    {/* Audit Ingestion */}
                    <td style={{ padding: '0.9rem 1rem' }}>
                      {isReady ? (
                        <span style={badge('#dcfce7', '#166534', true)}>READY</span>
                      ) : isPending ? (
                        <span style={badge('#f1f5f9', '#64748b')}>AWAITING INTAKE</span>
                      ) : (
                        <span style={badge('#fef3c7', '#92400e')}>GATHERING</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                      <button
                        id={`inspect-${lic.licenseeId}`}
                        type="button"
                        onClick={() => handleInspectLicensee(lic)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#1e293b',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dossier Inspection Modal */}
      {checklistModalOpen && selectedLicensee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Dossier: {selectedLicensee.licenseeName}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {selectedLicensee.licenseeId} &bull; {selectedLicensee.country}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChecklistModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Service Line Entitlements in modal */}
            {selectedLicensee.serviceEntitlements.length > 0 && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.55rem' }}>
                  Pipeline Entitlements
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedLicensee.serviceEntitlements.map((e) => (
                    <div key={e.serviceLine} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem' }}>
                      <EntitlementPill entitlement={e} />
                      {e.grantedAt && (
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', paddingLeft: '0.3rem' }}>
                          Granted {new Date(e.grantedAt).toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Framework summary */}
            {selectedLicensee.frameworks.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.55rem' }}>
                  Recommended Frameworks ({selectedLicensee.frameworks.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {selectedLicensee.frameworks.map((f) => (
                    <span
                      key={f.frameworkCode}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: f.isReadyToIngest ? '#dcfce7' : f.clientAccepted ? '#eff6ff' : '#f8fafc',
                        color: f.isReadyToIngest ? '#166534' : f.clientAccepted ? '#1d4ed8' : '#64748b',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: f.isReadyToIngest ? '#bbf7d0' : f.clientAccepted ? '#bfdbfe' : '#e2e8f0',
                      }}
                      title={`${f.completedItems}/${f.totalItems} items complete`}
                    >
                      {f.frameworkCode}
                      {f.isLegallyMandatory && <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>*</span>}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.35rem' }}>* Legally mandatory</div>
              </div>
            )}

            {/* Checklists */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Preparation Checklists
            </div>

            {checklistsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Fetching checklist items...
              </div>
            ) : clientChecklists.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                No active preparation checklists. Client has not completed onboarding.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {clientChecklists.map((chk: any) => (
                  <div key={chk.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                        {chk.recommendation?.frameworkName || 'Compliance Framework'}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: chk?.isReadyToIngest ? '#16a34a' : '#0284c7' }}>
                        {chk?.completedItems ?? 0}/{chk?.totalItems ?? 0} Items Complete
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(chk.items || []).map((item: any) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.6rem 0.85rem',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.plainEnglishLabel}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {item.isoClauseReference || 'General Conformance'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background:
                                  item.status === 'COMPLETE' ? '#dcfce7' :
                                  item.status === 'WAIVED'   ? '#fef3c7' : '#f1f5f9',
                                color:
                                  item.status === 'COMPLETE' ? '#15803d' :
                                  item.status === 'WAIVED'   ? '#b45309' : '#475569',
                                fontWeight: 700,
                              }}
                            >
                              {item.status}
                            </span>

                            {item.status !== 'WAIVED' && (
                              <button
                                type="button"
                                onClick={() => setWaivingItemId(item.id)}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  cursor: 'pointer',
                                }}
                              >
                                Waive
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Waive reason */}
            {waivingItemId && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e', marginBottom: '0.4rem' }}>
                  Auditor Waiver Justification (Required for Audit Trail)
                </div>
                <input
                  id="waive-reason-input"
                  type="text"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="e.g. Facility verified under alternate UKAS cert #10492"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    marginBottom: '0.5rem',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => { setWaivingItemId(null); setWaiveReason(''); }}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWaiveItem(waivingItemId)}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: '#d97706', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Confirm Waiver
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setChecklistModalOpen(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Style helpers ────────────────────────────────────────────────────────────

const kpiCard: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '1.25rem',
};

const kpiLabel: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const kpiValue: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 800,
  marginTop: '0.25rem',
};

const kpiSub: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 500,
  color: '#64748b',
  marginLeft: '0.35rem',
};

const th: React.CSSProperties = {
  padding: '0.85rem 1rem',
};

function badge(bg: string, color: string, bold = false): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    background: bg,
    color,
    fontSize: '0.72rem',
    fontWeight: bold ? 800 : 600,
    letterSpacing: bold ? '0.03em' : undefined,
  };
}
