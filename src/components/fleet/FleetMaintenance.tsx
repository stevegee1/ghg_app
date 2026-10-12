import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { MaintenanceInsights, MaintenanceRecords } from '../../api/fleet.types';
import { MAINTENANCE_EVENT_LABELS } from '../../api/fleet.types';
import { MaintenanceMachineCard } from './MaintenanceMachineCard';
import { MaintenanceHistoryImport, TrainingConsentCard } from './MaintenanceSidePanels';

/** Predictive maintenance for the client's machines: what needs attention, why, and what is coming up. */
export const FleetMaintenance: React.FC<{ token: string }> = ({ token }) => {
  const [insights, setInsights] = useState<MaintenanceInsights | null>(null);
  const [records, setRecords] = useState<MaintenanceRecords | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.getMaintenanceInsights(token), api.getMaintenanceRecords(token)])
      .then(([i, r]) => {
        setInsights(i);
        setRecords(r);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);
  useEffect(load, [load]);

  if (error) {
    return (
      <div className="fleet-panel fleet-state fleet-state-error" role="alert">
        <span>{error}</span>
        <button type="button" className="btn btn-secondary" onClick={load}>
          Try again
        </button>
      </div>
    );
  }
  if (!insights || !records) return <div className="fleet-panel fleet-state">Loading maintenance...</div>;

  const plans = new Map(records.plans.map((p) => [p.assetId, p]));
  const conditions = insights.configured ? insights.conditions : [];
  const count = (priority: string) => conditions.filter((c) => c.priority === priority).length;
  const servicesDue = conditions.filter((c) => c.findings.some((f) => f.code === 'SERVICE_OVERDUE' || f.code === 'SERVICE_DUE_SOON')).length;
  const modelAlerts = conditions.filter((c) => c.prediction?.alert).length;

  return (
    <div className="fleet-stack">
      <div className="fleet-panel">
        <h3 className="fleet-panel-title">How priorities are set</h3>
        {!insights.configured && <p className="fleet-muted">The maintenance check is being set up. You can already set service intervals and log records below.</p>}
        {insights.configured && (
          <p className="fleet-muted">
            Checked against thresholds {insights.ruleSet.version} ({insights.ruleSet.source}).{' '}
            {insights.model
              ? `Breakdown risk comes from predictive model ${insights.model.version}, trained on real breakdown records and checked on recent data it had not seen. It estimates the chance of a breakdown within ${insights.model.horizonDays} days. These are estimates, not guarantees.`
              : 'The predictive model will be added once enough breakdown records exist to train and check it. Until then, priorities come from the readings above.'}
          </p>
        )}
      </div>

      {insights.configured && (
        <div className="fleet-tiles">
          <div className="fleet-tile">
            <span className="fleet-tile-label">Act now</span>
            <span className="fleet-tile-value">{count('HIGH')}</span>
          </div>
          <div className="fleet-tile">
            <span className="fleet-tile-label">Plan soon</span>
            <span className="fleet-tile-value">{count('MEDIUM')}</span>
          </div>
          <div className="fleet-tile">
            <span className="fleet-tile-label">Services due or overdue</span>
            <span className="fleet-tile-value">{servicesDue}</span>
          </div>
          <div className="fleet-tile">
            <span className="fleet-tile-label">High breakdown risk</span>
            <span className="fleet-tile-value">{insights.model ? modelAlerts : 'Model not yet published'}</span>
          </div>
        </div>
      )}

      <div className="maint-layout">
        <div className="fleet-stack">
          {insights.configured && conditions.length === 0 && <div className="fleet-panel fleet-empty">Register machines to see their condition here.</div>}
          {conditions.length > 0 && (
            <ul className="maint-list">
              {conditions.map((c) => (
                <MaintenanceMachineCard key={c.assetId} token={token} machine={c} plan={plans.get(c.assetId) ?? null} onChanged={load} />
              ))}
            </ul>
          )}
          <div className="fleet-panel">
            <h3 className="fleet-panel-title">Recent records</h3>
            {records.events.length === 0 && <p className="fleet-muted">No services or breakdowns recorded yet.</p>}
            {records.events.length > 0 && (
              <ul className="fleet-split-list">
                {records.events.slice(0, 15).map((e) => (
                  <li key={e.id}>
                    <span>
                      <strong>{MAINTENANCE_EVENT_LABELS[e.type]}</strong> · {e.asset.assetTag} · {new Date(e.occurredAt).toLocaleDateString('en-GB')}
                    </span>
                    <span className="fleet-muted">
                      {[e.operatingHours && `${Number(e.operatingHours)} engine hours`, e.downtimeHours && `${Number(e.downtimeHours)} h out of use`, e.component, e.description]
                        .filter(Boolean)
                        .join(' · ') || (e.source === 'CSV_IMPORT' ? 'Imported' : 'Logged in the portal')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="fleet-stack">
          <MaintenanceHistoryImport token={token} onImported={load} />
          <TrainingConsentCard token={token} />
        </div>
      </div>
    </div>
  );
};
