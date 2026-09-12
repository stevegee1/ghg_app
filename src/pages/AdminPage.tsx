import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';

export const AdminPage: React.FC = () => {
  const { token, isAdmin } = useAuth();

  // Active top-level admin tab
  const [activeAdminTab, setActiveAdminTab] = useState<'DEMOS' | 'SPLITS'>('DEMOS');

  // Demo Inquiries state
  const [demoBookings, setDemoBookings] = useState<any[]>([]);
  const [loadingDemos, setLoadingDemos] = useState<boolean>(true);
  const [demoSearch, setDemoSearch] = useState<string>('');
  const [demoFilterScope, setDemoFilterScope] = useState<string>('ALL');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Split configuration state
  const [history, setHistory] = useState<any[]>([]);
  const [royaltyBps, setRoyaltyBps] = useState<number>(8500); // 85% default
  const [licenseeId, setLicenseeId] = useState<string>(''); // empty = platform default

  // Split charities
  const [charities, setCharities] = useState<Array<{ charityId: string; charityName: string; bps: number }>>([
    { charityId: 'charity_green_earth', charityName: 'Green Earth Foundation', bps: 5000 },
    { charityId: 'charity_ocean_clean', charityName: 'Clean Oceans Trust', bps: 5000 },
  ]);

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch Demo Bookings
  const loadDemoBookings = async () => {
    if (!token) return;
    setLoadingDemos(true);
    try {
      const res = await api.getDemoBookings(token);
      setDemoBookings(res.bookings || []);
    } catch (err: any) {
      console.error('Failed to load demo inquiries:', err);
    } finally {
      setLoadingDemos(false);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'DEMOS') {
      loadDemoBookings();
    }
  }, [token, activeAdminTab]);

  // Fetch Split History
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      if (!token) return;
      setLoadingHistory(true);
      try {
        const res = await api.getSplitConfigHistory(token, licenseeId || undefined);
        if (isMounted) setHistory(res.history || []);
      } catch (err: any) {
        if (isMounted) setError('Failed to load split configuration history');
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }
    if (activeAdminTab === 'SPLITS') {
      loadHistory();
    }
    return () => { isMounted = false; };
  }, [token, licenseeId, activeAdminTab]);

  const charityBpsSum = charities.reduce((sum, c) => sum + c.bps, 0);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (charityBpsSum !== 10000) {
      setError(`Charity allocation basis points must sum to exactly 10000 (100.0%). Current sum: ${charityBpsSum} bps.`);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    setShowConfirmModal(false);

    try {
      await api.createSplitConfig(token, {
        licenseeId: licenseeId.trim() || null,
        royaltyBps,
        charityAllocationBps: charities.map((c) => ({ charityId: c.charityId, bps: c.bps })),
      });
      setSuccessMsg('New versioned split configuration successfully created and activated.');

      // Refresh history
      const res = await api.getSplitConfigHistory(token, licenseeId || undefined);
      setHistory(res.history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to submit split configuration');
    } finally {
      setSubmitting(false);
    }
  };

  // Export demo bookings to CSV
  const handleExportCsv = () => {
    if (demoBookings.length === 0) return;

    const headers = ['ID', 'Full Name', 'Work Email', 'Company Name', 'Facilities', 'Scope', 'Requested Slot', 'NDA Requested', 'Status', 'Submitted At'];
    const rows = demoBookings.map((b) => [
      b.id,
      `"${(b.fullName || '').replace(/"/g, '""')}"`,
      b.workEmail,
      `"${(b.companyName || '').replace(/"/g, '""')}"`,
      `"${(b.facilityCount || '').replace(/"/g, '""')}"`,
      b.primaryScope,
      new Date(b.requestedSlot).toISOString(),
      b.ndaRequested ? 'YES' : 'NO',
      b.status,
      new Date(b.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ghg_demo_inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyLeadEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Filter demo bookings
  const filteredBookings = demoBookings.filter((b) => {
    const matchesSearch =
      demoSearch === '' ||
      b.fullName?.toLowerCase().includes(demoSearch.toLowerCase()) ||
      b.workEmail?.toLowerCase().includes(demoSearch.toLowerCase()) ||
      b.companyName?.toLowerCase().includes(demoSearch.toLowerCase());
    const matchesScope = demoFilterScope === 'ALL' || b.primaryScope === demoFilterScope;
    return matchesSearch && matchesScope;
  });

  if (!isAdmin) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <h2 className="card-title" style={{ color: 'var(--status-failed-text)' }}>Access Denied</h2>
        <p className="card-subtitle" style={{ margin: '1rem 0' }}>
          Your user account does not have <strong>ADMIN</strong> privileges. Administration is restricted to system administrators.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Executive Administration Console
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage enterprise demo inquiries, inbound pipeline, and versioned statutory royalty configurations.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-subtle, #111726)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={() => setActiveAdminTab('DEMOS')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: activeAdminTab === 'DEMOS' ? 'var(--cerebrium-magenta, #ff2d8d)' : 'transparent',
              color: '#ffffff',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Demo Inquiries & Leads</span>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.22)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>
              {demoBookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('SPLITS')}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              backgroundColor: activeAdminTab === 'SPLITS' ? 'var(--cerebrium-magenta, #ff2d8d)' : 'transparent',
              color: '#ffffff',
              transition: 'all 0.15s ease',
            }}
          >
            Split Configuration
          </button>
        </div>
      </div>

      {/* TAB 1: DEMO INQUIRIES & LEADS */}
      {activeAdminTab === 'DEMOS' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, maxWidth: '600px' }}>
              <input
                type="text"
                placeholder="Search by lead name, company, or email..."
                value={demoSearch}
                onChange={(e) => setDemoSearch(e.target.value)}
                className="form-input"
                style={{ flex: 1, minWidth: '220px' }}
              />

              <select
                value={demoFilterScope}
                onChange={(e) => setDemoFilterScope(e.target.value)}
                className="form-select"
                style={{ width: 'auto' }}
              >
                <option value="ALL">All Statutory Scopes</option>
                <option value="CARBON_EMISSION">Carbon & Energy (ISO)</option>
                <option value="JOB_REPORTING">Section 106 Workforce</option>
                <option value="DUAL_SCOPE">Dual-Scope</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={loadDemoBookings}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                title="Refresh inquiries list"
              >
                ↻ Refresh
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={demoBookings.length === 0}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>Export to CSV</span>
                <span>↓</span>
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loadingDemos ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading enterprise demo bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {demoBookings.length === 0 ? (
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Inquiries Yet</h3>
                    <p style={{ fontSize: '0.875rem' }}>Bookings submitted via the "Book Demo" modal or page will appear here instantly.</p>
                  </div>
                ) : (
                  <p>No bookings matching your search query.</p>
                )}
              </div>
            ) : (
              <div className="table-container" style={{ margin: 0 }}>
                <table className="ledger-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Requested Session</th>
                      <th>Lead Contact & Title</th>
                      <th>Organization & Facilities</th>
                      <th>Work Email</th>
                      <th>Statutory Scope</th>
                      <th>NDA</th>
                      <th style={{ textAlign: 'right' }}>Direct Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const slotDate = new Date(b.requestedSlot);
                      const formattedDate = slotDate.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={b.id}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: b.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                color: b.status === 'CONFIRMED' ? '#10b981' : 'var(--text-muted)',
                              }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: b.status === 'CONFIRMED' ? '#10b981' : '#888' }} />
                              {b.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--cerebrium-ice-accent, #67e8f9)', whiteSpace: 'nowrap' }}>
                            {formattedDate} UTC
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{b.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Submitted {new Date(b.createdAt).toLocaleDateString('en-GB')}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{b.companyName}</div>
                            {b.facilityCount && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.facilityCount}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <a
                                href={`mailto:${b.workEmail}?subject=GHGEmissionLogs%20Statutory%20Assurance%20Demonstration`}
                                style={{ color: 'var(--cerebrium-magenta, #ff2d8d)', textDecoration: 'none', fontWeight: 600 }}
                              >
                                {b.workEmail}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyLeadEmail(b.workEmail)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  padding: '1px 4px',
                                }}
                                title="Copy email address"
                              >
                                {copiedEmail === b.workEmail ? '✓' : '⎘'}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}>
                              {b.primaryScope === 'CARBON_EMISSION' ? 'Carbon (ISO)' : b.primaryScope === 'JOB_REPORTING' ? 'Section 106' : b.primaryScope}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', color: b.ndaRequested ? '#4ade80' : 'var(--text-muted)' }}>
                              {b.ndaRequested ? 'Requested' : 'Standard'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <a
                              href={`mailto:${b.workEmail}?subject=GHGEmissionLogs%20Statutory%20Assurance%20Session&body=Hi%20${encodeURIComponent(b.fullName)},%0A%0AThank%20you%20for%20scheduling%20an%20architectural%20walkthrough%20for%20${encodeURIComponent(b.companyName)}.%0A%0AWe%20look%20forward%20to%20meeting%20you.`}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Email Lead</span>
                              <span>✉</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SPLIT CONFIGURATION */}
      {activeAdminTab === 'SPLITS' && (
        <div>
          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          <div className="responsive-grid-2">
            {/* Form Column */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Configure New Active Split</h2>
                <p className="card-subtitle">Changes financial routing rules for future transactions only</p>
              </div>

              <form onSubmit={handleOpenConfirm}>
                <div className="form-group">
                  <label className="form-label" htmlFor="licenseeScope">Target Scope</label>
                  <select
                    id="licenseeScope"
                    value={licenseeId}
                    onChange={(e) => setLicenseeId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Platform Default (licenseeId IS NULL)</option>
                    <option value="lic_itm_power">ITM Power Test (lic_itm_power)</option>
                    <option value="lic_jcb_test">JCB Test (lic_jcb_test)</option>
                    <option value="lic_arsenal_fc">Arsenal FC Test (lic_arsenal_fc)</option>
                  </select>
                  <div className="form-help">Select whether this split applies platform-wide or overrides a specific licensee.</div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="royaltyBps">
                    Licensor Royalty Basis Points (bps)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      id="royaltyBps"
                      type="number"
                      min="0"
                      max="10000"
                      step="50"
                      value={royaltyBps}
                      onChange={(e) => setRoyaltyBps(parseInt(e.target.value, 10) || 0)}
                      className="form-input"
                      style={{ width: '140px' }}
                    />
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      = {(royaltyBps / 100).toFixed(1)}% Royalty / {((10000 - royaltyBps) / 100).toFixed(1)}% Charity
                    </div>
                  </div>
                </div>

                {/* Split Visualization */}
                <div style={{ margin: '1rem 0', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Split Ratio Preview:</div>
                  <FinancialSplitBar
                    grossAmountCents={10000}
                    licensorRoyaltyCents={Math.round((10000 * royaltyBps) / 10000)}
                    charityGiftCents={10000 - Math.round((10000 * royaltyBps) / 10000)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Approved Charity Beneficiary Allocations</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {charities.map((ch, idx) => (
                      <div key={ch.charityId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{ch.charityName}</div>
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          step="100"
                          value={ch.bps}
                          onChange={(e) => {
                            const newBps = parseInt(e.target.value, 10) || 0;
                            const updated = [...charities];
                            updated[idx].bps = newBps;
                            setCharities(updated);
                          }}
                          className="form-input"
                          style={{ width: '90px' }}
                        />
                        <div style={{ width: '60px', fontSize: '0.8125rem', textAlign: 'right' }}>
                          {(ch.bps / 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: charityBpsSum === 10000 ? 'var(--status-settled-text)' : 'var(--status-failed-text)' }}>
                    Total Charity Pool Allocated: {charityBpsSum} / 10000 bps ({charityBpsSum === 10000 ? 'Valid 100%' : 'Must equal 10000 bps'})
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={charityBpsSum !== 10000}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Review & Activate Configuration
                </button>
              </form>
            </div>

            {/* Audit History Column */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Split Configuration Audit History</h2>
                <p className="card-subtitle">
                  Insert-only chain of active and deactivated configurations for scope: <code>{licenseeId || 'PLATFORM DEFAULT'}</code>
                </p>
              </div>

              {loadingHistory ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit history...</div>
              ) : history.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit history records found.</div>
              ) : (
                <div className="table-container">
                  <table className="ledger-table" style={{ fontSize: '0.8125rem' }}>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Royalty Bps</th>
                        <th>Changed At</th>
                        <th>Changed By</th>
                        <th>Prev Config ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((cfg) => (
                        <tr key={cfg.id} style={{ backgroundColor: cfg.isActive ? 'var(--status-settled-bg)' : 'transparent' }}>
                          <td>
                            {cfg.isActive ? (
                              <span className="badge badge-settled">ACTIVE</span>
                            ) : (
                              <span className="badge badge-reversed">INACTIVE</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>{cfg.royaltyBps} bps ({(cfg.royaltyBps / 100).toFixed(1)}%)</td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {new Date(cfg.changedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td><code>{cfg.changedByUserId}</code></td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <code>{cfg.previousConfigId || 'ROOT'}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Explicit Confirmation Modal */}
          {showConfirmModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Confirm Financial Split Routing Change
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                  You are about to activate a new split configuration for scope <code>{licenseeId || 'PLATFORM DEFAULT'}</code>:
                </p>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                  <div>• <strong>Licensor Royalty:</strong> {royaltyBps} bps ({(royaltyBps / 100).toFixed(1)}%)</div>
                  <div>• <strong>Charity Gift Share:</strong> {10000 - royaltyBps} bps ({((10000 - royaltyBps) / 100).toFixed(1)}%)</div>
                  <div>• <strong>Previous Active Config:</strong> Will be deactivated (`isActive = false`) and chained in audit history.</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {submitting ? 'Applying Change...' : 'Confirm & Apply Change'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
