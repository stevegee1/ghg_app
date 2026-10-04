import React, { useCallback, useEffect, useState } from 'react';
import { api, FleetApiError } from '../../api/client';
import type { FleetSummary } from '../../api/fleet.types';
import { FLEET_FUEL_LABELS } from '../../api/fleet.types';
import { FleetMonthlyChart } from './FleetMonthlyChart';
import { formatHours, formatLitres, formatTonnes, isoDate, saveBlob } from './fleetFormat';

type Preset = 'last12' | 'thisYear' | 'lastYear';

const PRESET_LABELS: Record<Preset, string> = {
  last12: 'Last 12 months',
  thisYear: 'This year',
  lastYear: 'Last year',
};

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  if (preset === 'thisYear') return { from: `${year}-01-01`, to: isoDate(now) };
  if (preset === 'lastYear') return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
  const start = new Date(Date.UTC(year, now.getUTCMonth() - 11, 1));
  return { from: isoDate(start), to: isoDate(now) };
}

interface Props {
  token: string;
  onSubscribe: () => void;
}

export const FleetDashboard: React.FC<Props> = ({ token, onSubscribe }) => {
  const [preset, setPreset] = useState<Preset>('last12');
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    const range = presetRange(preset);
    setLoading(true);
    setError(null);
    setNeedsSubscription(false);
    try {
      setSummary(await api.getFleetSummary(token, range.from, range.to));
    } catch (err) {
      if (err instanceof FleetApiError && err.status === 402) setNeedsSubscription(true);
      else setError((err as Error).message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [token, preset]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadReport = async () => {
    const range = presetRange(preset);
    setDownloading(true);
    try {
      const { blob, fileName } = await api.downloadFleetFile(
        token,
        `/api/fleet/report.pdf?from=${range.from}&to=${range.to}`
      );
      saveBlob(blob, fileName);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  if (needsSubscription) {
    return (
      <div className="fleet-panel fleet-empty">
        <h3>Your dashboard opens with a Fleet subscription</h3>
        <p>Register your assets, then subscribe to upload fuel data and see emissions by machine, site and month.</p>
        <button type="button" className="btn btn-primary" onClick={onSubscribe}>
          View subscription
        </button>
      </div>
    );
  }

  const hasData = summary !== null && summary.byAsset.length > 0;

  return (
    <div className="fleet-stack">
      <div className="fleet-toolbar">
        <div className="fleet-segmented" role="group" aria-label="Reporting period">
          {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`fleet-segment${preset === p ? ' is-selected' : ''}`}
              aria-pressed={preset === p}
              onClick={() => setPreset(p)}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" onClick={downloadReport} disabled={!hasData || downloading}>
          {downloading ? 'Preparing report...' : 'Download PDF report'}
        </button>
      </div>

      {loading && <div className="fleet-panel fleet-state">Loading emissions...</div>}

      {!loading && error && (
        <div className="fleet-panel fleet-state fleet-state-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && summary && !hasData && (
        <div className="fleet-panel fleet-empty">
          <h3>No fuel data for {PRESET_LABELS[preset].toLowerCase()}</h3>
          <p>Upload readings or fuel card transactions in Data uploads to see emissions here.</p>
        </div>
      )}

      {!loading && !error && summary && hasData && (
        <>
          <div className="fleet-panel fleet-hero">
            <span className="fleet-hero-label">Scope 1 mobile combustion</span>
            <span className="fleet-hero-value">
              {formatTonnes(summary.scope1.kgCo2e)} <small>t CO2e</small>
            </span>
            <span className="fleet-hero-sub">
              {summary.period.from} to {summary.period.to}, calculated from your fuel data, not independently verified
            </span>
          </div>

          <div className="fleet-tiles">
            <div className="fleet-tile">
              <span className="fleet-tile-label">Fuel used (Scope 1)</span>
              <span className="fleet-tile-value">{formatLitres(summary.scope1.fuelLitres)} L</span>
            </div>
            <div className="fleet-tile">
              <span className="fleet-tile-label">Idle share of engine hours</span>
              <span className="fleet-tile-value">{summary.scope1.idleSharePct === null ? 'Not reported' : `${summary.scope1.idleSharePct}%`}</span>
            </div>
            <div className="fleet-tile">
              <span className="fleet-tile-label">Assets reporting data</span>
              <span className="fleet-tile-value">
                {summary.coverage.assetsWithData} of {summary.coverage.activeAssets}
              </span>
            </div>
            <div className="fleet-tile">
              <span className="fleet-tile-label">Scope 3 (not under your control)</span>
              <span className="fleet-tile-value">{formatTonnes(summary.scope3.kgCo2e)} t</span>
            </div>
          </div>

          <div className="fleet-panel">
            <h3 className="fleet-panel-title">Emissions by month, tonnes CO2e (Scope 1 and 3)</h3>
            <FleetMonthlyChart data={summary.byMonth} />
          </div>

          <div className="fleet-panel">
            <h3 className="fleet-panel-title">By asset</h3>
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Site</th>
                  <th>Scope</th>
                  <th className="num">Fuel (L)</th>
                  <th className="num">Engine hours</th>
                  <th className="num">t CO2e</th>
                </tr>
              </thead>
              <tbody>
                {summary.byAsset.map((a) => (
                  <tr key={a.assetId}>
                    <td data-label="Asset">
                      <span><strong>{a.assetTag}</strong> {a.name}</span>
                    </td>
                    <td data-label="Site">{a.siteName || 'Unassigned'}</td>
                    <td data-label="Scope">{a.scope === 'SCOPE_1' ? 'Scope 1' : 'Scope 3'}</td>
                    <td data-label="Fuel (L)" className="num">{formatLitres(a.fuelLitres)}</td>
                    <td data-label="Engine hours" className="num">{formatHours(a.engineHours)}</td>
                    <td data-label="t CO2e" className="num">{formatTonnes(a.kgCo2e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="fleet-panel">
            <h3 className="fleet-panel-title">Emission factors applied</h3>
            <ul className="fleet-factor-list">
              {summary.factorsUsed.map((f) => (
                <li key={`${f.fuelType}-${f.source}-${f.publicationYear}`}>
                  <strong>{FLEET_FUEL_LABELS[f.fuelType]}</strong>: {f.kgCo2ePerUnit} kg CO2e per {f.unit} ({f.source}{' '}
                  {f.publicationYear}). <span className="fleet-muted">{f.citation}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
