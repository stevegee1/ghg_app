import React, { useState } from 'react';
import type { MachineConditionView } from '../../api/fleet.types';
import { MaintenanceEventForm, MaintenancePlanForm } from './MaintenanceForms';

const PRIORITY_LABELS = { HIGH: 'Act now', MEDIUM: 'Plan soon', LOW: 'No action needed' } as const;

interface Props {
  token: string;
  machine: MachineConditionView;
  plan: { serviceIntervalHours: string; intervalSource: string } | null;
  onChanged: () => void;
}

/** One machine: its priority, the readings behind it, the service forecast and the model's prediction. */
export const MaintenanceMachineCard: React.FC<Props> = ({ token, machine, plan, onChanged }) => {
  const [open, setOpen] = useState<'event' | 'plan' | null>(null);
  const done = () => {
    setOpen(null);
    onChanged();
  };
  const p = machine.prediction;

  return (
    <li className={`maint-card priority-${machine.priority.toLowerCase()}`}>
      <div className="maint-card-head">
        <div>
          <p className="maint-card-title">
            {machine.assetTag} <span>{machine.name}</span>
          </p>
          {machine.nextService && (
            <p className="merch-note">
              {machine.nextService.hoursRemaining > 0
                ? `Next service in ${machine.nextService.hoursRemaining} engine hours${machine.nextService.projectedDate ? `, around ${new Date(machine.nextService.projectedDate).toLocaleDateString('en-GB')}` : ''}.`
                : `Service overdue by ${Math.abs(machine.nextService.hoursRemaining)} engine hours.`}
            </p>
          )}
        </div>
        <span className={`maint-priority priority-${machine.priority.toLowerCase()}`}>{PRIORITY_LABELS[machine.priority]}</span>
      </div>

      {p && (
        <div className="maint-prediction">
          <div className="maint-prediction-row">
            <span>Breakdown risk, next {p.horizonDays} days</span>
            <strong className={p.alert ? 'maint-risk-alert' : undefined}>{Math.round(p.probability * 100)}%</strong>
          </div>
          <div className="maint-bar" role="img" aria-label={`${Math.round(p.probability * 100)} percent`}>
            <span className={p.alert ? 'is-alert' : undefined} style={{ width: `${Math.max(2, Math.round(p.probability * 100))}%` }} />
          </div>
          {p.factors.length > 0 && <p className="merch-note">Main factors: {p.factors.map((f) => f.label.toLowerCase()).join(', ')}.</p>}
        </div>
      )}

      {machine.findings.length > 0 && (
        <ul className="maint-findings">
          {machine.findings.map((f) => (
            <li key={f.code} className={`priority-${f.priority.toLowerCase()}`}>
              {f.message}
            </li>
          ))}
        </ul>
      )}

      <div className="maint-card-actions">
        <button type="button" className="btn btn-secondary btn-small" aria-expanded={open === 'event'} onClick={() => setOpen(open === 'event' ? null : 'event')}>
          Log service or breakdown
        </button>
        <button type="button" className="btn btn-secondary btn-small" aria-expanded={open === 'plan'} onClick={() => setOpen(open === 'plan' ? null : 'plan')}>
          {plan ? `Service interval: ${Number(plan.serviceIntervalHours)} h` : 'Set service interval'}
        </button>
      </div>
      {open === 'event' && <MaintenanceEventForm token={token} assetId={machine.assetId} onSaved={done} onCancel={() => setOpen(null)} />}
      {open === 'plan' && <MaintenancePlanForm token={token} assetId={machine.assetId} current={plan} onSaved={done} onCancel={() => setOpen(null)} />}
    </li>
  );
};
