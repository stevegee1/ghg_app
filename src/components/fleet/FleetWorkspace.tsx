import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetOverview } from '../../api/fleet.types';
import { FleetDashboard } from './FleetDashboard';
import { FleetAssets } from './FleetAssets';
import { FleetUploads } from './FleetUploads';
import { FleetSubscription } from './FleetSubscription';
import { FleetApiAccess } from './FleetApiAccess';
import { FleetProjects } from './FleetProjects';
import { FleetWeather } from './FleetWeather';
import { FleetValue } from './FleetValue';

export type FleetTab = 'dashboard' | 'assets' | 'projects' | 'weather' | 'value' | 'uploads' | 'api' | 'subscription';

const TABS: { id: FleetTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'assets', label: 'Assets' },
  { id: 'projects', label: 'Projects' },
  { id: 'weather', label: 'Weather' },
  { id: 'value', label: 'Value' },
  { id: 'uploads', label: 'Data uploads' },
  { id: 'api', label: 'API access' },
  { id: 'subscription', label: 'Subscription' },
];

interface Props {
  token: string;
  initialTab?: FleetTab;
  returnedFromCheckout?: boolean;
}

export const FleetWorkspace: React.FC<Props> = ({ token, initialTab = 'dashboard', returnedFromCheckout = false }) => {
  const [tab, setTab] = useState<FleetTab>(initialTab);
  const [overview, setOverview] = useState<FleetOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadOverview = useCallback(async () => {
    setError(null);
    try {
      setOverview(await api.getFleetOverview(token));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  const isActive = overview?.entitlementStatus === 'ACTIVE';
  const steps = overview
    ? [
        { done: overview.activeAssets > 0, label: 'Register your assets', tab: 'assets' as FleetTab },
        { done: overview.activeAssets > 0 && overview.unconfirmedAssets === 0, label: 'Confirm how each machine connects', tab: 'assets' as FleetTab },
        { done: isActive, label: 'Subscribe per active asset', tab: 'subscription' as FleetTab },
        { done: overview.lastImportAt !== null || overview.lastTelemetryAt !== null, label: 'Send fuel data (upload or API)', tab: 'uploads' as FleetTab },
      ]
    : [];
  const setupComplete = steps.length > 0 && steps.every((s) => s.done);

  return (
    <section className="fleet-workspace" aria-labelledby="fleet-title">
      <header className="fleet-header">
        <div>
          <h2 id="fleet-title">Fleet Emissions</h2>
          <p className="fleet-muted">Fuel, engine hours and CO2 for your equipment and vehicles, reported by GHG Protocol scope.</p>
        </div>
      </header>

      {returnedFromCheckout && !isActive && overview && (
        <div className="fleet-panel fleet-notice" role="status">
          Payment received. Your subscription activates as soon as Stripe confirms it, usually within a minute.
          <button type="button" className="btn btn-secondary btn-small" onClick={refresh}>Refresh</button>
        </div>
      )}

      {error && (
        <div className="fleet-panel fleet-state fleet-state-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={refresh}>Try again</button>
        </div>
      )}

      {overview && !setupComplete && (
        <ol className="fleet-steps">
          {steps.map((s, i) => (
            <li key={s.label} className={s.done ? 'is-done' : ''}>
              <button type="button" onClick={() => setTab(s.tab)}>
                <span className="fleet-step-number" aria-hidden="true">{s.done ? '✓' : i + 1}</span>
                <span>{s.label}</span>
                <span className="visually-hidden">{s.done ? ' (done)' : ' (to do)'}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="fleet-tabs" role="tablist" aria-label="Fleet sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`fleet-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`fleet-panel-${t.id}`}
            className={`fleet-tab${tab === t.id ? ' is-selected' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`fleet-panel-${tab}`} aria-labelledby={`fleet-tab-${tab}`}>
        {!overview && !error && <div className="fleet-panel fleet-state">Loading Fleet...</div>}
        {overview && tab === 'dashboard' && <FleetDashboard key={refreshKey} token={token} onSubscribe={() => setTab('subscription')} />}
        {overview && tab === 'assets' && <FleetAssets token={token} onChanged={refresh} />}
        {overview && tab === 'projects' && <FleetProjects token={token} onSubscribe={() => setTab('subscription')} />}
        {overview && tab === 'value' && <FleetValue token={token} onSubscribe={() => setTab('subscription')} />}
        {overview && tab === 'weather' && <FleetWeather token={token} onSubscribe={() => setTab('subscription')} />}
        {overview && tab === 'uploads' && <FleetUploads token={token} onSubscribe={() => setTab('subscription')} onImported={refresh} />}
        {overview && tab === 'api' && <FleetApiAccess token={token} />}
        {overview && tab === 'subscription' && <FleetSubscription token={token} overview={overview} onAddAssets={() => setTab('assets')} />}
      </div>
    </section>
  );
};
