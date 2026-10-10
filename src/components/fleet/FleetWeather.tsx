import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetWeatherSummary } from '../../api/fleet.types';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const pct = (part: string, whole: string) => (Number(whole) > 0 ? `${((Number(part) / Number(whole)) * 100).toFixed(1)}%` : '-');

/** Hours each machine worked in heat, frost, heavy rain and high wind, from located telemetry and hourly weather. */
export const FleetWeather: React.FC<{ token: string; onSubscribe: () => void }> = ({ token, onSubscribe }) => {
  const now = new Date();
  const [from, setFrom] = useState(isoDay(new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(isoDay(now));
  const [data, setData] = useState<FleetWeatherSummary | null>(null);
  const [error, setError] = useState<{ message: string; needsSubscription: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.getFleetWeather(token, from, to));
    } catch (err) {
      const e = err as Error & { status?: number };
      setError({ message: e.message, needsSubscription: e.status === 402 });
    }
  }, [token, from, to]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="fleet-panel">
        <p className="fleet-error-text" role="alert">
          {error.message}
        </p>
        {error.needsSubscription && (
          <button type="button" className="btn btn-primary" onClick={onSubscribe}>
            View subscription
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fleet-stack">
      <div className="fleet-panel fleet-form">
        <h3 className="fleet-panel-title">Weather exposure</h3>
        <p className="fleet-muted">
          Operating hours from telemetry with location, matched to the hourly weather where each machine was working. Measured daily; location history is
          kept for 90 days.
        </p>
        <div className="fleet-project-assign">
          <label>
            From
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>
      {!data && <div className="fleet-panel fleet-state">Loading weather exposure...</div>}
      {data && !data.configured && <div className="fleet-panel fleet-muted">Weather measurement is not switched on for the platform yet.</div>}
      {data && data.configured && !data.activeThresholds && (
        <div className="fleet-panel fleet-muted">Weather thresholds have not been published yet, so nothing is measured.</div>
      )}
      {data && data.activeThresholds && (
        <p className="fleet-muted">
          Thresholds {data.activeThresholds.version}: heat above {data.activeThresholds.heatAboveC} °C, frost below {data.activeThresholds.frostBelowC} °C, heavy rain from{' '}
          {data.activeThresholds.heavyRainMmPerHour} mm/h, high wind from {data.activeThresholds.highWindKmh} km/h ({data.activeThresholds.source}).
        </p>
      )}
      {data && data.assets.length === 0 && data.configured && data.activeThresholds && (
        <div className="fleet-panel fleet-muted">No measured days in this period. Exposure needs telemetry with location (API or connected machines).</div>
      )}
      {data && data.assets.length > 0 && (
        <div className="fleet-panel">
          <div className="transparency-table-wrap">
            <table className="transparency-table">
              <thead>
                <tr>
                  <th scope="col">Machine</th>
                  <th scope="col">Days</th>
                  <th scope="col">Operating hours</th>
                  <th scope="col">Heat</th>
                  <th scope="col">Frost</th>
                  <th scope="col">Heavy rain</th>
                  <th scope="col">High wind</th>
                </tr>
              </thead>
              <tbody>
                {data.assets.map((a) => (
                  <tr key={a.assetId}>
                    <td>
                      <strong>{a.assetTag}</strong> {a.name}
                    </td>
                    <td>{a.daysMeasured}</td>
                    <td>{a.operatingHours}</td>
                    <td>
                      {a.heatHours} h ({pct(a.heatHours, a.operatingHours)})
                    </td>
                    <td>
                      {a.frostHours} h ({pct(a.frostHours, a.operatingHours)})
                    </td>
                    <td>
                      {a.heavyRainHours} h ({pct(a.heavyRainHours, a.operatingHours)})
                    </td>
                    <td>
                      {a.highWindHours} h ({pct(a.highWindHours, a.operatingHours)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fleet-muted">Source: {data.source}. Threshold versions used: {data.thresholdVersions.join(', ')}.</p>
        </div>
      )}
    </div>
  );
};
