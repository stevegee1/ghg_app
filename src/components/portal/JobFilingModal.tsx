import React from 'react';

interface JobFilingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submittingJob: boolean;
  jobFormError: string | null;
  periodType: string;
  setPeriodType: (val: string) => void;
  periodStart: string;
  setPeriodStart: (val: string) => void;
  periodEnd: string;
  setPeriodEnd: (val: string) => void;
  jobsCreatedInput: string;
  setJobsCreatedInput: (val: string) => void;
  customNoteInput: string;
  setCustomNoteInput: (val: string) => void;
}

export const JobFilingModal: React.FC<JobFilingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submittingJob,
  jobFormError,
  periodType,
  setPeriodType,
  periodStart,
  setPeriodStart,
  periodEnd,
  setPeriodEnd,
  jobsCreatedInput,
  setJobsCreatedInput,
  customNoteInput,
  setCustomNoteInput,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="persefoni-card portal-card-pad"
        style={{ maxWidth: '520px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '0.75rem',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Submit Section 106 Job Filing
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {jobFormError && (
          <div
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1px solid var(--google-red)',
              color: 'var(--google-red)',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {jobFormError}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Period Type
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="form-input"
            >
              <option value="QUARTERLY">Quarterly (Section 106 Standard)</option>
              <option value="ANNUAL">Annual Corporate Filing</option>
            </select>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Period Start
              </label>
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Period End
              </label>
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Verified Jobs Created
            </label>
            <input
              type="number"
              required
              min={1}
              value={jobsCreatedInput}
              onChange={(e) => setJobsCreatedInput(e.target.value)}
              className="form-input"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Attestation / Auditor Note
            </label>
            <textarea
              value={customNoteInput}
              onChange={(e) => setCustomNoteInput(e.target.value)}
              placeholder="e.g. Local authority Section 106 covenant for artisan embroidery workforce"
              className="form-input"
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submittingJob} className="btn btn-primary">
              {submittingJob ? 'Submitting...' : 'Confirm Filing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
