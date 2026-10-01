import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const AdminReadinessTracker: React.FC = () => {
  const { token } = useAuth();
  const [licensees, setLicensees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedLicensee, setSelectedLicensee] = useState<any | null>(null);
  const [checklistModalOpen, setChecklistModalOpen] = useState<boolean>(false);
  const [clientChecklists, setClientChecklists] = useState<any[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState<boolean>(false);
  const [waiveReason, setWaiveReason] = useState<string>('');
  const [waivingItemId, setWaivingItemId] = useState<string | null>(null);

  const fetchTrackerData = async () => {
    if (!token) return;
    try {
      setLoading(true);
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

  const handleInspectLicensee = async (lic: any) => {
    setSelectedLicensee(lic);
    setChecklistModalOpen(true);
    if (!token) return;
    try {
      setChecklistsLoading(true);
      // Fetch checklists for licensee
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
      if (selectedLicensee) {
        handleInspectLicensee(selectedLicensee);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to waive checklist item');
    }
  };

  const filteredLicensees = licensees.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.licenseeName.toLowerCase().includes(q) ||
      (l.primaryContact?.email || '').toLowerCase().includes(q) ||
      (l.industrySector || '').toLowerCase().includes(q)
    );
  });

  // KPI Calculations
  const totalCount = licensees.length;
  const completedAssessmentCount = licensees.filter((l) => l.hasCompletedAssessment).length;
  const fullyReadyCount = licensees.filter((l) => l.readyFrameworksCount > 0).length;
  const inPreparationCount = licensees.filter(
    (l) => l.hasCompletedAssessment && l.readinessPercentage > 0 && l.readinessPercentage < 100
  ).length;

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Client Accounts
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {totalCount}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', textTransform: 'uppercase' }}>
            Assessments Completed
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', marginTop: '0.25rem' }}>
            {completedAssessmentCount}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginLeft: '0.35rem' }}>
              / {totalCount}
            </span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
            In Data Gathering
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
            {inPreparationCount}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', textTransform: 'uppercase' }}>
            Audit-Ready Dossiers
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
            {fullyReadyCount}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Search Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Client Readiness & Onboarding Mirror
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Real-time mirror of every licensee data gathering progress, mandatory statutory duties, and audit readiness.
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by company, contact email, sector..."
          style={{
            padding: '0.6rem 0.95rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.85rem',
            minWidth: '280px',
          }}
        />
      </div>

      {/* Tracker Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Client Organization</th>
              <th style={{ padding: '0.85rem 1rem' }}>Sector & Country</th>
              <th style={{ padding: '0.85rem 1rem' }}>Primary Contact</th>
              <th style={{ padding: '0.85rem 1rem' }}>Assessment State</th>
              <th style={{ padding: '0.85rem 1rem' }}>Preparation Progress</th>
              <th style={{ padding: '0.85rem 1rem' }}>Audit Ingestion</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicensees.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No client accounts matched your filter.
                </td>
              </tr>
            ) : (
              filteredLicensees.map((lic) => {
                const isReady = lic.readyFrameworksCount > 0;
                const isPending = !lic.hasCompletedAssessment;

                return (
                  <tr key={lic.licenseeId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#0f172a' }}>
                      <div>{lic.licenseeName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>
                        ID: {lic.licenseeId}
                      </div>
                    </td>

                    <td style={{ padding: '1rem', color: '#475569' }}>
                      <div>{lic.industrySector || 'General'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{lic.country}</div>
                    </td>

                    <td style={{ padding: '1rem', color: '#334155' }}>
                      {lic.primaryContact ? (
                        <>
                          <div style={{ fontWeight: 500 }}>
                            {lic.primaryContact.firstName} {lic.primaryContact.lastName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {lic.primaryContact.email}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {lic.primaryContact.jobTitle || lic.primaryContact.primaryRole}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Unassigned</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      {lic.hasCompletedAssessment ? (
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>
                          12 Qs Completed
                        </span>
                      ) : (
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>
                          Intake Pending
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{lic.readinessPercentage}%</span>
                        <span style={{ color: '#64748b' }}>
                          {lic.completedChecklistItems}/{lic.totalChecklistItems} items
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${lic.readinessPercentage}%`,
                            height: '100%',
                            background: lic.readinessPercentage === 100 ? '#16a34a' : '#0284c7',
                          }}
                        />
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      {isReady ? (
                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 700 }}>
                          READY TO INGEST
                        </span>
                      ) : isPending ? (
                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                          AWAITING INTAKE
                        </span>
                      ) : (
                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: 600 }}>
                          DATA GATHERING
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
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

      {/* Dossier Modal */}
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
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Dossier Inspection: {selectedLicensee.licenseeName}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Licensee ID: {selectedLicensee.licenseeId} • Country: {selectedLicensee.country}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setChecklistModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {checklistsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Fetching client checklist items...
              </div>
            ) : clientChecklists.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                No active preparation checklists for this account. Client has not completed onboarding.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {clientChecklists.map((chk: any) => (
                  <div key={chk.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                        {chk.recommendation?.frameworkName || 'Compliance Framework'}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: chk.isReadyToIngest ? '#16a34a' : '#0284c7' }}>
                        {chk.completedItems}/{chk.totalItems} Items Complete
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
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              {item.plainEnglishLabel}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              ISO Ref: {item.isoClauseReference || 'General Conformance'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background:
                                  item.status === 'COMPLETE'
                                    ? '#dcfce7'
                                    : item.status === 'WAIVED'
                                    ? '#fef3c7'
                                    : '#f1f5f9',
                                color:
                                  item.status === 'COMPLETE'
                                    ? '#15803d'
                                    : item.status === 'WAIVED'
                                    ? '#b45309'
                                    : '#475569',
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

            {/* Waive reason prompt */}
            {waivingItemId && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e', marginBottom: '0.4rem' }}>
                  Auditor Waiver Justification (Required for Audit Trail)
                </div>
                <input
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
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setWaivingItemId(null);
                      setWaiveReason('');
                    }}
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
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
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
