import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';

export const AdminPage: React.FC = () => {
  const { token, isAdmin } = useAuth();

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
    loadHistory();
    return () => { isMounted = false; };
  }, [token, licenseeId]);

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

  if (!isAdmin) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <h2 className="card-title" style={{ color: 'var(--status-failed-text)' }}>Access Denied</h2>
        <p className="card-subtitle" style={{ margin: '1rem 0' }}>
          Your user account does not have <strong>ADMIN</strong> privileges. Split configuration management is restricted to system administrators.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Versioned Split Configuration Manager</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Manage royalty percentages and multi-charity allocation ratios with an insert-only audit trail.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
              <label className="form-label">
                Charity Allocation Shares (Must sum to 10000 bps = 100.0%)
              </label>
              {charities.map((c, index) => (
                <div key={c.charityId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>{c.charityName}</div>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="100"
                    value={c.bps}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      const next = [...charities];
                      next[index].bps = val;
                      setCharities(next);
                    }}
                    className="form-input"
                    style={{ width: '120px' }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', width: '60px' }}>
                    {(c.bps / 100).toFixed(1)}%
                  </span>
                </div>
              ))}
              <div style={{ fontSize: '0.8125rem', color: charityBpsSum === 10000 ? 'var(--status-settled-text)' : 'var(--status-failed-text)', fontWeight: 600, marginTop: '0.25rem' }}>
                Total Charity Share Sum: {charityBpsSum} / 10000 bps ({charityBpsSum === 10000 ? '✓ VALID' : '✕ INVALID'})
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || charityBpsSum !== 10000}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Submit Configuration Update...
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
  );
};
