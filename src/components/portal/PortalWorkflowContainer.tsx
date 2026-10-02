import React from 'react';
import { ReadinessEngineWorkflow } from '../ReadinessEngineWorkflow';

type AuditScope = 'CARBON_EMISSION' | 'JOB_REPORTING';
type WorkflowStep = 1 | 2 | 3 | 4 | 5;

interface PortalWorkflowContainerProps {
  checklistsLoading: boolean;
  user: any;
  auditScope: AuditScope;
  isCurrentScopePrepReady: boolean;
  jobChecklists: any[];
  carbonChecklists: any[];
  activeStep: WorkflowStep;
  submissionId: string | null;
  token: string | null;
  onNavigateToOnboarding: () => void;
  onNavigateToOverview: () => void;
  onNavigateToChecklist: () => void;
  fetchIsoStatus: () => Promise<void>;
  onNavigateTab: (tab: string) => void;
}

export const PortalWorkflowContainer: React.FC<PortalWorkflowContainerProps> = ({
  checklistsLoading,
  user,
  auditScope,
  isCurrentScopePrepReady,
  jobChecklists,
  carbonChecklists,
  activeStep,
  submissionId,
  token,
  onNavigateToOnboarding,
  onNavigateToOverview,
  onNavigateToChecklist,
  fetchIsoStatus,
  onNavigateTab,
}) => {
  if (checklistsLoading) {
    return (
      <div
        className="persefoni-card"
        style={{
          maxWidth: '740px',
          margin: '2rem auto',
          padding: '3rem 2rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>
          Verifying statutory preparation status...
        </div>
      </div>
    );
  }

  if (!user?.hasCompletedAssessment) {
    return (
      <div
        className="persefoni-card"
        style={{
          maxWidth: '740px',
          margin: '2rem auto',
          padding: '2.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #191c1a',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>PREPARATION WORKFLOW INCOMPLETE</span>
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem 0', lineHeight: 1.3 }}>
          Statutory Intake Assessment Required
        </h2>

        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
          You cannot enter the {auditScope === 'JOB_REPORTING' ? 'Workforce & Social Value' : 'GHG & Carbon Emissions'} assurance engine without completing the Preparation Workflow. The statutory intake assessment establishes your operational boundary, identifies applicable legal frameworks (SECR, PPN 06/21, CSRD, ISO 14064-1), and generates your tailored evidence checklist.
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
            Mandatory Preparation Sequence
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#334155' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#191c1a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>1</span>
              <span><strong>Step 1: Statutory Intake Assessment</strong> (3-minute boundary, revenue, and regulatory determination)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#334155' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>2</span>
              <span><strong>Step 2: Evidence Gathering</strong> (Upload boundary invoices, smart meter intervals, payroll)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#334155' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>3</span>
              <span><strong>Step 3: Continuous Assurance &amp; Certification</strong> (Normative Conformance &amp; Dual-Mark Warranty)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onNavigateToOnboarding}
            style={{
              backgroundColor: '#191c1a',
              color: '#ffffff',
              border: '1px solid #191c1a',
              borderRadius: '8px',
              padding: '0.65rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            Start 3-Minute Intake Assessment &rarr;
          </button>
          <button
            type="button"
            onClick={onNavigateToOverview}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.65rem 1.2rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            &larr; Return to Preparation Overview
          </button>
        </div>
      </div>
    );
  }

  if (!isCurrentScopePrepReady) {
    const scopeLists = auditScope === 'JOB_REPORTING' ? jobChecklists : carbonChecklists;
    const totalMandatory = scopeLists.reduce((acc: number, c: any) => acc + (c.items ? c.items.filter((i: any) => i.isMandatory).length : 0), 0);
    const completedMandatory = scopeLists.reduce((acc: number, c: any) => acc + (c.items ? c.items.filter((i: any) => i.isMandatory && (i.status === 'COMPLETE' || i.status === 'WAIVED')).length : 0), 0);
    const pct = totalMandatory > 0 ? Math.round((completedMandatory / totalMandatory) * 100) : 0;

    return (
      <div
        className="persefoni-card"
        style={{
          maxWidth: '740px',
          margin: '2rem auto',
          padding: '2.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #b45309',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>STAGE 2 PREPARATION INCOMPLETE</span>
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem 0', lineHeight: 1.3 }}>
          Preparation Checklist Evidence Required
        </h2>

        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
          You cannot enter the {auditScope === 'JOB_REPORTING' ? 'Workforce & Social Value' : 'GHG & Carbon Emissions'} assurance diagnostic until all mandatory evidence items in your preparation checklist are marked complete or waived by an auditor.
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Mandatory Evidence Progress</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: pct === 100 ? '#16a34a' : '#b45309' }}>{completedMandatory} of {totalMandatory} complete ({pct}%)</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : '#f59e0b', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onNavigateToChecklist}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: '1px solid #0f172a',
              borderRadius: '8px',
              padding: '0.65rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            Open Preparation Workspace &rarr;
          </button>
          <button
            type="button"
            onClick={onNavigateToOverview}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.65rem 1.2rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            &larr; Return to Executive Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReadinessEngineWorkflow
      key={auditScope}
      scope={auditScope}
      user={user}
      token={token}
      initialStep={activeStep}
      submissionId={submissionId}
      isPreparationReady={isCurrentScopePrepReady}
      onNavigateToChecklist={onNavigateToChecklist}
      onRefreshStatus={fetchIsoStatus}
      onNavigateTab={onNavigateTab}
    />
  );
};
