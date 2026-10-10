import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { FleetAsset, FleetProject } from '../../api/fleet.types';
import { formatDate } from './fleetFormat';

interface Props {
  token: string;
  onSubscribe: () => void;
}

const money = (pence: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(pence / 100);

/** Turns "2,500,000.50" into whole pence, or null when it is not a positive amount. */
function parseAmount(text: string): number | null {
  const clean = text.replace(/[,\s£]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const pence = Math.round(Number(clean) * 100);
  return pence > 0 && Number.isSafeInteger(pence) ? pence : null;
}

const ProjectForm: React.FC<{ token: string; currency: string; onCreated: (p: FleetProject) => void }> = ({ token, currency, onCreated }) => {
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [value, setValue] = useState('');
  const [margin, setMargin] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pence = parseAmount(value);
    if (pence === null) return setError('Enter the contract value as an amount, for example 2500000.');
    if (!/^-?\d+(\.\d{1,2})?$/.test(margin.trim())) return setError('Enter the budgeted margin as a percentage, for example 12.');
    setBusy(true);
    setError(null);
    try {
      const res = await api.createFleetProject(token, {
        name: name.trim(),
        reference: reference.trim() || null,
        contractValuePence: pence,
        budgetedMarginBps: Math.round(Number(margin) * 100),
        currency,
        startDate: start,
        endDate: end || null,
      });
      onCreated(res.project);
      setName('');
      setReference('');
      setValue('');
      setMargin('');
      setStart('');
      setEnd('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="fleet-panel fleet-form" onSubmit={submit}>
      <h3 className="fleet-panel-title">Add a project</h3>
      <div className="fleet-form-grid">
        <label>
          Project name
          <input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Contract reference (optional)
          <input value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
        </label>
        <label>
          Contract value ({currency})
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required />
        </label>
        <label>
          Budgeted margin (%)
          <input inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} required />
        </label>
        <label>
          Start date
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label>
          End date (optional)
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      <div className="fleet-form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : 'Add project'}
        </button>
      </div>
    </form>
  );
};

const ProjectCard: React.FC<{ token: string; project: FleetProject; assets: FleetAsset[]; onChanged: (p: FleetProject) => void }> = ({
  token,
  project,
  assets,
  onChanged,
}) => {
  const [assetId, setAssetId] = useState('');
  const [from, setFrom] = useState(project.startDate);
  const [to, setTo] = useState(project.endDate ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (fn: () => Promise<{ project: FleetProject }>) => {
    setBusy(true);
    setError(null);
    try {
      onChanged((await fn()).project);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const assign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) return setError('Choose a machine.');
    void act(() => api.assignFleetProjectAsset(token, project.id, { assetId, fromDate: from, toDate: to || null }));
  };

  const isClosed = project.status === 'CLOSED';

  return (
    <article className="fleet-panel fleet-project">
      <header className="fleet-project-head">
        <div>
          <h3 className="fleet-panel-title">
            {project.name} {isClosed && <span className="fleet-muted">· Closed</span>}
          </h3>
          <p className="fleet-muted">
            {project.reference ? `${project.reference} · ` : ''}
            {money(project.contractValuePence, project.currency)} · budgeted margin {(project.budgetedMarginBps / 100).toFixed(2)}% ·{' '}
            {formatDate(project.startDate)} to {project.endDate ? formatDate(project.endDate) : 'open'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => act(() => api.updateFleetProject(token, project.id, { status: isClosed ? 'ACTIVE' : 'CLOSED' }))}
        >
          {isClosed ? 'Reopen' : 'Close project'}
        </button>
      </header>

      {project.assignments.length === 0 ? (
        <p className="fleet-muted">No machines on this project yet.</p>
      ) : (
        <ul className="fleet-project-assignments">
          {project.assignments.map((a) => (
            <li key={a.id}>
              <span>
                <strong>{a.asset.assetTag}</strong> {a.asset.name}
              </span>
              <span className="fleet-muted">
                {formatDate(a.fromDate)} to {a.toDate ? formatDate(a.toDate) : 'now'}
              </span>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act(() => api.removeFleetProjectAssignment(token, project.id, a.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isClosed && (
        <form className="fleet-form fleet-project-assign" onSubmit={assign}>
          <label>
            Machine
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Choose a machine</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input type="date" value={from} min={project.startDate} max={project.endDate ?? undefined} onChange={(e) => setFrom(e.target.value)} required />
          </label>
          <label>
            To {project.endDate ? '' : '(optional)'}
            <input type="date" value={to} min={from} max={project.endDate ?? undefined} onChange={(e) => setTo(e.target.value)} required={Boolean(project.endDate)} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Add machine
          </button>
        </form>
      )}
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
    </article>
  );
};

/** Contracts the client runs machines on. Costs per contract are added from the market inputs. */
export const FleetProjects: React.FC<Props> = ({ token, onSubscribe }) => {
  const [projects, setProjects] = useState<FleetProject[] | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [assets, setAssets] = useState<FleetAsset[]>([]);
  const [error, setError] = useState<{ message: string; needsSubscription: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, a] = await Promise.all([api.listFleetProjects(token), api.listFleetAssets(token)]);
      setProjects(p.projects);
      setCurrency(p.defaultCurrency);
      setAssets(a.assets.filter((x) => x.active));
    } catch (err) {
      const e = err as Error & { status?: number };
      setError({ message: e.message, needsSubscription: e.status === 402 });
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const replace = (p: FleetProject) => setProjects((prev) => (prev ? prev.map((x) => (x.id === p.id ? p : x)) : prev));

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
  if (!projects || !currency) return <div className="fleet-panel fleet-state">Loading projects...</div>;

  return (
    <div className="fleet-stack">
      <ProjectForm token={token} currency={currency} onCreated={(p) => setProjects((prev) => [p, ...(prev ?? [])])} />
      {projects.length === 0 && <div className="fleet-panel fleet-muted">No projects yet. Add a contract above, then put machines on it.</div>}
      {projects.map((p) => (
        <ProjectCard key={p.id} token={token} project={p} assets={assets} onChanged={replace} />
      ))}
    </div>
  );
};
