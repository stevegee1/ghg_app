import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { WearCoefficientSetView, WeatherThresholdSet } from '../../api/fleet.types';
import { FLEET_CATEGORY_LABELS } from '../../api/fleet.types';

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

  const [wearSets, setWearSets] = useState<WearCoefficientSetView[]>([]);
  const [wearVersion, setWearVersion] = useState('');
  const [wearSource, setWearSource] = useState('');
  const [wearRows, setWearRows] = useState<Record<string, { heat: string; frost: string; rain: string; wind: string }>>({});

  const load = useCallback(() => {
    api
      .getWeatherThresholds(token)
      .then(setData)
      .catch((e: Error) => setError(e.message));
    api
      .getWearCoefficients(token)
      .then((r) => setWearSets(r.sets))
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const categories = Object.keys(FLEET_CATEGORY_LABELS) as (keyof typeof FLEET_CATEGORY_LABELS)[];
  const setWear = (category: string, key: 'heat' | 'frost' | 'rain' | 'wind', value: string) =>
    setWearRows((prev) => ({ ...prev, [category]: { ...(prev[category] ?? { heat: '', frost: '', rain: '', wind: '' }), [key]: value } }));
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
      <form
        className="fleet-panel fleet-form"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            const coefficients = Object.entries(wearRows)
              .filter(([, r]) => r.heat || r.frost || r.rain || r.wind)
              .map(([category, r]) => ({
                category,
                heatPctPerHour: r.heat || '0',
                frostPctPerHour: r.frost || '0',
                rainPctPerHour: r.rain || '0',
                windPctPerHour: r.wind || '0',
              }));
            const res = await api.publishWearCoefficients(token, { version: wearVersion.trim(), source: wearSource.trim(), coefficients });
            return `Wear coefficients ${res.set.version} published and active.`;
          });
        }}
      >
        <h3 className="fleet-panel-title">Publish wear coefficients</h3>
        <p className="fleet-muted">
          Extra wear per hour worked in each condition, as a percentage of a machine&apos;s depreciable value (purchase cost less residual). Fill in
          the equipment types your source covers; types left empty get no weather wear.
        </p>
        <div className="fleet-form-grid">
          <label>
            Version
            <input value={wearVersion} placeholder="e.g. 2026.1" onChange={(e) => setWearVersion(e.target.value)} required />
          </label>
          <label>
            Source
            <input value={wearSource} placeholder="e.g. OEM durability data, insurer guidance" onChange={(e) => setWearSource(e.target.value)} required />
          </label>
        </div>
        <div className="transparency-table-wrap">
          <table className="transparency-table">
            <thead>
              <tr>
                <th scope="col">Equipment type</th>
                <th scope="col">Heat %/h</th>
                <th scope="col">Frost %/h</th>
                <th scope="col">Heavy rain %/h</th>
                <th scope="col">High wind %/h</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c}>
                  <td>{FLEET_CATEGORY_LABELS[c]}</td>
                  {(['heat', 'frost', 'rain', 'wind'] as const).map((k) => (
                    <td key={k}>
                      <input
                        className="wear-input"
                        inputMode="decimal"
                        aria-label={`${FLEET_CATEGORY_LABELS[c]} ${k}`}
                        value={wearRows[c]?.[k] ?? ''}
                        onChange={(e) => setWear(c, k, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="fleet-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Publish and activate
          </button>
        </div>
        {wearSets.length > 0 && (
          <ul className="fleet-split-list">
            {wearSets.map((w) => (
              <li key={w.id}>
                <span>
                  <strong>{w.version}</strong> {w.active ? '(active)' : ''}
                </span>
                <span className="fleet-muted">
                  {w.coefficients.length} equipment type(s) · {w.source}
                </span>
              </li>
            ))}
          </ul>
        )}
      </form>
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
