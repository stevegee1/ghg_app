import React, { useCallback, useEffect, useState } from 'react';
import { api, MaintenanceModelView, MaintenanceRuleSetView, ModelMetrics } from '../../api/client';

type Summary = { consentingClients: number; machines: number; failureEvents: number };

const pct = (v: number | null) => (v === null ? 'n/a' : `${Math.round(v * 1000) / 10}%`);
const metricLine = (m: ModelMetrics) =>
  `AUC ${m.auc ?? 'n/a'} · precision ${pct(m.precision)} · recall ${pct(m.recall)} · ${m.positives} breakdowns in ${m.samples} examples`;

/** Maintenance thresholds (versioned) and the shared predictive model: train, check, publish. Pattern: WeatherWearAdmin. */
export const MaintenanceModelAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [sets, setSets] = useState<MaintenanceRuleSetView[]>([]);
  const [models, setModels] = useState<MaintenanceModelView[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState({
    version: '',
    source: '',
    lookbackDays: '',
    baselineDays: '',
    dueSoonHours: '',
    fuelDriftPct: '',
    idleRatioPct: '',
    faultRecurrenceCount: '',
    staleDataHours: '',
    highSeverityLabels: '',
  });
  const [training, setTraining] = useState({ version: '', horizonDays: '', sampleEveryDays: '', holdoutFraction: '', l2: '', minPositives: '', minAuc: '', alertProbability: '' });

  const load = useCallback(() => {
    api
      .getMaintenanceRuleSets(token)
      .then((r) => setSets(r.sets))
      .catch((e: Error) => setError(e.message));
    api
      .getMaintenanceModels(token)
      .then((r) => {
        setModels(r.models);
        setSummary(r.data);
      })
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

  const ruleField = (key: keyof typeof rules, label: string, hint?: string) => (
    <label>
      {label}
      <input value={rules[key]} placeholder={hint} onChange={(e) => setRules({ ...rules, [key]: e.target.value })} required />
    </label>
  );
  const trainField = (key: keyof typeof training, label: string, hint?: string) => (
    <label>
      {label}
      <input value={training[key]} placeholder={hint} inputMode="decimal" onChange={(e) => setTraining({ ...training, [key]: e.target.value })} required />
    </label>
  );
  const published = models.find((m) => m.status === 'PUBLISHED');

  return (
    <section className="fleet-stack" aria-labelledby="maintenance-admin-title">
      <header>
        <h2 id="maintenance-admin-title" className="fleet-panel-title">Predictive maintenance</h2>
        <p className="fleet-muted">
          Thresholds drive the rule-based check every client sees. The model is trained only on clients who consented, and can be published only when its
          accuracy on held-back recent data meets the minimums you set.
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
            const r = await api.publishMaintenanceRuleSet(token, {
              version: rules.version.trim(),
              source: rules.source.trim(),
              lookbackDays: Number(rules.lookbackDays),
              baselineDays: Number(rules.baselineDays),
              dueSoonHours: rules.dueSoonHours.trim(),
              fuelDriftPct: rules.fuelDriftPct.trim(),
              idleRatioPct: rules.idleRatioPct.trim(),
              faultRecurrenceCount: Number(rules.faultRecurrenceCount),
              staleDataHours: Number(rules.staleDataHours),
              highSeverityLabels: rules.highSeverityLabels.split(',').map((l) => l.trim()).filter(Boolean),
            });
            return `Thresholds ${r.set.version} published and active.`;
          });
        }}
      >
        <h3 className="fleet-panel-title">Publish thresholds</h3>
        <div className="fleet-form-grid">
          {ruleField('version', 'Version', 'e.g. 2026.1')}
          {ruleField('lookbackDays', 'Recent window (days)')}
          {ruleField('baselineDays', 'Fuel baseline window (days)')}
          {ruleField('dueSoonHours', 'Service due soon within (engine hours)')}
          {ruleField('fuelDriftPct', 'Flag fuel burn rise from (%)')}
          {ruleField('idleRatioPct', 'Flag idle share from (%)')}
          {ruleField('faultRecurrenceCount', 'Flag a fault code repeated (times)')}
          {ruleField('staleDataHours', 'Flag no data after (hours)')}
          {ruleField('highSeverityLabels', 'High-severity labels', 'comma separated, as machines report them')}
          {ruleField('source', 'Source', 'e.g. maker service guidance, fleet manager review')}
        </div>
        <div className="fleet-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Publish and activate
          </button>
        </div>
      </form>
      {sets.length > 0 && (
        <div className="fleet-panel">
          <h3 className="fleet-panel-title">Threshold versions</h3>
          <ul className="fleet-split-list">
            {sets.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.version}</strong> {s.active ? '(active)' : ''}
                </span>
                <span className="fleet-muted">
                  {s.lookbackDays}d window · baseline {s.baselineDays}d · due soon {s.dueSoonHours}h · fuel +{s.fuelDriftPct}% · idle {s.idleRatioPct}% · fault x
                  {s.faultRecurrenceCount} · stale {s.staleDataHours}h · {s.source}
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
            const r = await api.trainMaintenanceModel(token, {
              version: training.version.trim(),
              horizonDays: Number(training.horizonDays),
              sampleEveryDays: Number(training.sampleEveryDays),
              holdoutFraction: Number(training.holdoutFraction),
              l2: Number(training.l2),
              minPositives: Number(training.minPositives),
              minAuc: Number(training.minAuc),
              alertProbability: Number(training.alertProbability),
            });
            return `Model ${r.model.version} trained. ${r.model.gateNotes}`;
          });
        }}
      >
        <h3 className="fleet-panel-title">Train a model</h3>
        {summary && (
          <p className="fleet-muted">
            Available now: {summary.consentingClients} consenting client(s), {summary.machines} machine(s), {summary.failureEvents} recorded breakdown(s) or
            unplanned repair(s).
          </p>
        )}
        <div className="fleet-form-grid">
          {trainField('version', 'Version', 'e.g. pm-2026.1')}
          {trainField('horizonDays', 'Predict breakdowns within (days)')}
          {trainField('sampleEveryDays', 'Sample every (days)')}
          {trainField('holdoutFraction', 'Held-back share of the timeline', 'e.g. 0.2')}
          {trainField('l2', 'Regularisation (L2)', 'higher is more cautious')}
          {trainField('minPositives', 'Minimum held-back breakdowns')}
          {trainField('minAuc', 'Minimum held-back AUC', '0.5 to 1')}
          {trainField('alertProbability', 'Alert at probability', '0.01 to 0.99')}
        </div>
        <div className="fleet-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Training...' : 'Train'}
          </button>
        </div>
      </form>

      <div className="fleet-panel">
        <h3 className="fleet-panel-title">Models</h3>
        {published ? (
          <p className="fleet-muted">
            Published: <strong>{published.version}</strong>, predicting {published.horizonDays} days ahead.{' '}
            <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() =>
                void act(async () => {
                  await api.retireMaintenanceModel(token);
                  return 'Model withdrawn. Clients see the rule-based check only.';
                })
              }>
              Withdraw
            </button>
          </p>
        ) : (
          <p className="fleet-muted">No model is published. Clients see the rule-based check only.</p>
        )}
        {models.length === 0 && <p className="fleet-muted">No models trained yet.</p>}
        <ul className="fleet-split-list">
          {models.map((m) => (
            <li key={m.id}>
              <span>
                <strong>{m.version}</strong> ({m.status.toLowerCase()}) · {m.horizonDays} days · thresholds {m.ruleSet.version} · {m.clientCount} client(s),{' '}
                {m.machineCount} machine(s), {m.sampleCount} examples
              </span>
              <span className="fleet-muted">Held back: {metricLine(m.testMetrics)}</span>
              <span className="fleet-muted">Training: {metricLine(m.trainMetrics)}</span>
              <span className={m.passedGate ? 'fleet-muted' : 'fleet-error-text'}>{m.gateNotes}</span>
              {m.passedGate && m.status !== 'PUBLISHED' && (
                <span>
                  <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={() =>
                      void act(async () => {
                        await api.publishMaintenanceModel(token, m.id);
                        return `Model ${m.version} published.`;
                      })
                    }>
                    Publish
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
