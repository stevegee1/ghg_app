import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { WorkflowStatus } from '../../api/pipeline.types';
import { formatDate } from '../pipeline/pipelineFormat';
import { REVIEW_STATUS_LABELS, reviewStatusTone } from './review/reviewFormat';

type ServiceLine = 'GHG' | 'CARBON' | 'JOB' | 'MERCH' | 'FLEET';

interface SubmissionSummary {
  id: string;
  status: WorkflowStatus;
  answeredCount: number;
  questionCount: number;
  missingEvidenceCount: number;
  updatedAt: string;
  submittedAt: string | null;
}

interface TrackerRow {
  licenseeId: string;
  licenseeName: string;
  country: string;
  industrySector: string | null;
  hasCompletedAssessment: boolean;
  assessmentCompletedAt: string | null;
  primaryContact: { email: string; firstName: string | null; lastName: string | null; jobTitle: string | null } | null;
  serviceEntitlements: { serviceLine: ServiceLine; status: string }[];
  frameworks: { frameworkCode: string; frameworkName: string; isLegallyMandatory: boolean; workflowType: string; submission: SubmissionSummary | null }[];
}

const SERVICE_LABELS: Record<ServiceLine, string> = {
  GHG: 'GHG',
  CARBON: 'Carbon claims',
  JOB: 'Workforce',
  MERCH: 'Merch',
  FLEET: 'Fleet',
};

const SERVICE_FILTERS: { id: 'ALL' | 'GHG' | 'JOB' | 'FLEET'; label: string }[] = [
  { id: 'ALL', label: 'All clients' },
  { id: 'GHG', label: 'GHG & Carbon' },
  { id: 'JOB', label: 'Workforce' },
  { id: 'FLEET', label: 'Fleet' },
];

const IN_REVIEW: WorkflowStatus[] = ['SUBMITTED', 'AI_SCREENED', 'UNDER_REVIEW'];
const IN_PROGRESS: WorkflowStatus[] = ['DRAFT', 'REJECTED'];

const matchesFilter = (row: TrackerRow, filter: (typeof SERVICE_FILTERS)[number]['id']) => {
  if (filter === 'ALL') return true;
  const lines = row.serviceEntitlements.filter((e) => e.status === 'ACTIVE').map((e) => e.serviceLine);
  return filter === 'GHG' ? lines.includes('GHG') || lines.includes('CARBON') : lines.includes(filter);
};

/** Where one framework stands for one client, in a line the admin can read at a glance. */
const FrameworkProgress: React.FC<{ framework: TrackerRow['frameworks'][number] }> = ({ framework }) => {
  const sub = framework.submission;
  return (
    <li className="tracker-framework">
      <div className="tracker-framework-name">
        {framework.frameworkName}
        {framework.isLegallyMandatory && <span className="pipeline-muted"> · required by law</span>}
      </div>
      {!sub ? (
        <span className="pipeline-muted">Not started</span>
      ) : (
        <div className="tracker-framework-status">
          <span className={`pipeline-chip tone-${reviewStatusTone(sub.status)}`}>{REVIEW_STATUS_LABELS[sub.status]}</span>
          {IN_PROGRESS.includes(sub.status) && (
            <span className="pipeline-muted">
              {sub.answeredCount} of {sub.questionCount} answered
              {sub.missingEvidenceCount > 0 ? ` · ${sub.missingEvidenceCount} required file${sub.missingEvidenceCount === 1 ? '' : 's'} missing` : ''}
            </span>
          )}
          {IN_REVIEW.includes(sub.status) && (
            <Link to={`/admin?tab=SUBMISSIONS&review=${encodeURIComponent(sub.id)}`} className="pipeline-link">
              Open review
            </Link>
          )}
          <span className="pipeline-muted">Updated {formatDate(sub.updatedAt)}</span>
        </div>
      )}
    </li>
  );
};

/**
 * Every client account and, for each framework it reports against, how far its submission has
 * got: not started, answering (with missing evidence), in review, or decided. Read from the
 * submissions themselves, so it always matches the Review Queue.
 */
export const AdminReadinessTracker: React.FC = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<TrackerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof SERVICE_FILTERS)[number]['id']>('ALL');

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await api.getAdminReadinessTracker(token);
      setRows(res.licensees as TrackerRow[]);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="pipeline-panel pipeline-state-error" role="alert">
        <span>{error}</span>
        <button type="button" className="btn btn-secondary" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }
  if (!rows) return <div className="pipeline-panel pipeline-muted">Loading client accounts...</div>;

  const submissions = rows.flatMap((r) => r.frameworks.map((f) => f.submission).filter((s): s is SubmissionSummary => s !== null));
  const kpis = [
    { label: 'Client accounts', value: rows.length, hint: 'Every organisation with a client account.' },
    { label: 'Onboarded', value: rows.filter((r) => r.hasCompletedAssessment).length, hint: 'Answered the sign-up questions that pick their frameworks.' },
    {
      label: 'Answering questions',
      value: submissions.filter((s) => IN_PROGRESS.includes(s.status)).length,
      hint: 'Submissions a client is still answering, or revising after your feedback.',
    },
    { label: 'Awaiting your review', value: submissions.filter((s) => IN_REVIEW.includes(s.status)).length, hint: 'Submitted and waiting for a Lead Auditor decision.' },
    {
      label: 'Approved',
      value: submissions.filter((s) => s.status === 'APPROVED' || s.status === 'PAID' || s.status === 'BADGE_ISSUED').length,
      hint: 'Approved submissions, including those with a credential issued.',
    },
  ];

  const needle = search.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      matchesFilter(r, filter) &&
      (!needle ||
        r.licenseeName.toLowerCase().includes(needle) ||
        (r.primaryContact?.email ?? '').toLowerCase().includes(needle) ||
        (r.industrySector ?? '').toLowerCase().includes(needle))
  );

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <h2 id="tracker-title" className="visually-hidden">
        Readiness Tracker
      </h2>
      <ul className="tracker-kpis">
        {kpis.map((k) => (
          <li key={k.label} className="pipeline-panel tracker-kpi">
            <span className="tracker-kpi-label">{k.label}</span>
            <strong className="tracker-kpi-value">{k.value}</strong>
            <span className="pipeline-muted">{k.hint}</span>
          </li>
        ))}
      </ul>

      <div className="tracker-controls">
        <div className="tracker-filters" role="group" aria-label="Show clients with">
          {SERVICE_FILTERS.map((f) => (
            <button key={f.id} type="button" className={`tracker-filter${filter === f.id ? ' is-active' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="tracker-search">
          <span className="visually-hidden">Search clients</span>
          <input type="search" className="pipeline-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company, contact email or sector" />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="pipeline-panel pipeline-muted">No client accounts match.</div>
      ) : (
        <ul className="tracker-rows">
          {visible.map((r) => (
            <li key={r.licenseeId} className="pipeline-panel tracker-row">
              <div className="tracker-client">
                <h3>{r.licenseeName}</h3>
                <p className="pipeline-muted">{[r.industrySector?.replace(/_/g, ' ').toLowerCase(), r.country].filter(Boolean).join(' · ')}</p>
                {r.primaryContact && (
                  <p className="pipeline-muted">
                    {[r.primaryContact.firstName, r.primaryContact.lastName].filter(Boolean).join(' ')}
                    {r.primaryContact.jobTitle ? `, ${r.primaryContact.jobTitle}` : ''} · {r.primaryContact.email}
                  </p>
                )}
                <div className="tracker-services">
                  {r.serviceEntitlements.length === 0 ? (
                    <span className="pipeline-muted">No services yet</span>
                  ) : (
                    r.serviceEntitlements.map((e) => (
                      <span key={e.serviceLine} className={`pipeline-chip ${e.status === 'ACTIVE' ? 'tone-success' : 'tone-neutral'}`}>
                        {SERVICE_LABELS[e.serviceLine]}
                        {e.status === 'ACTIVE' ? '' : ` (${e.status.toLowerCase()})`}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="tracker-progress">
                {!r.hasCompletedAssessment ? (
                  <p className="pipeline-muted">Has not finished the sign-up questions yet, so no frameworks are assigned.</p>
                ) : r.frameworks.length === 0 ? (
                  <p className="pipeline-muted">No GHG or Workforce frameworks (for example a Fleet-only client).</p>
                ) : (
                  <ul className="tracker-frameworks">
                    {r.frameworks.map((f) => (
                      <FrameworkProgress key={f.frameworkCode} framework={f} />
                    ))}
                  </ul>
                )}
                {r.assessmentCompletedAt && <p className="pipeline-muted">Onboarded {formatDate(r.assessmentCompletedAt)}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
