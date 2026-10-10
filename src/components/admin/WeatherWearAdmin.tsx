import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { WeatherThresholdSet } from '../../api/fleet.types';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Weather thresholds (versioned) and on-demand recalculation of weather exposure. */
export const WeatherWearAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<{ configured: boolean; sets: WeatherThresholdSet[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ version: '', heatAboveC: '', frostBelowC: '', heavyRainMmPerHour: '', highWindKmh: '', source: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const yesterday = isoDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [from, setFrom] = useState(yesterday);
  const [to, setTo] = useState(yesterday);

  const load = useCallback(() => {
    api
      .getWeatherThresholds(token)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [token]);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setNotice(await fn());
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string, hint?: string) => (
    <label>
      {label}
      <input value={form[key]} placeholder={hint} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
    </label>
  );

  return (
    <section className="fleet-stack" aria-labelledby="weather-admin-title">
      <header>
        <h2 id="weather-admin-title" className="fleet-panel-title">Weather and wear</h2>
        <p className="fleet-muted">
          {data && !data.configured ? 'Weather is off: set OPEN_METEO_ARCHIVE_URL and OPEN_METEO_API_KEY on the server. ' : ''}
          Thresholds decide which operating hours count as harsh. Each version is kept with the figures measured against it.
        </p>
      </header>
      {notice && (
        <p className="fleet-muted" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      <form
        className="fleet-panel fleet-form"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            const r = await api.createWeatherThresholds(token, form);
            return `Thresholds ${r.set.version} published and active.`;
          });
        }}
      >
        <h3 className="fleet-panel-title">Publish thresholds</h3>
        <div className="fleet-form-grid">
          {field('version', 'Version', 'e.g. 2026.1')}
          {field('heatAboveC', 'Heat above (°C)')}
          {field('frostBelowC', 'Frost below (°C)')}
          {field('heavyRainMmPerHour', 'Heavy rain from (mm per hour)')}
          {field('highWindKmh', 'High wind from (km/h)')}
          {field('source', 'Source', 'e.g. manufacturer operating limits, insurer guidance')}
        </div>
        <div className="fleet-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Publish and activate
          </button>
        </div>
      </form>
      {data && data.sets.length > 0 && (
        <div className="fleet-panel">
          <h3 className="fleet-panel-title">Versions</h3>
          <ul className="fleet-split-list">
            {data.sets.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.version}</strong> {s.active ? '(active)' : ''}
                </span>
                <span className="fleet-muted">
                  heat &gt; {s.heatAboveC} °C · frost &lt; {s.frostBelowC} °C · rain ≥ {s.heavyRainMmPerHour} mm/h · wind ≥ {s.highWindKmh} km/h · {s.source}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data?.configured && (
        <form
          className="fleet-panel fleet-form"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const r = await api.recomputeWeather(token, from, to);
              return r.skipped ? `Not calculated: ${r.skipped}` : `Calculated ${r.machineDays} machine-day(s).`;
            });
          }}
        >
          <h3 className="fleet-panel-title">Recalculate exposure</h3>
          <p className="fleet-muted">Runs daily for the previous day. Use this after publishing new thresholds; only the last 90 days can be recalculated.</p>
          <div className="fleet-project-assign">
            <label>
              From
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={to} min={from} max={yesterday} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-secondary" disabled={busy}>
              {busy ? 'Working...' : 'Recalculate'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
