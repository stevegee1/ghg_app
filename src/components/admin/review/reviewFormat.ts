import type { WorkflowStatus } from '../../../api/pipeline.types';

/** Status wording for the Lead Auditor, who does see that the audit engine pre-screen has run. */
export const REVIEW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  ASSESSMENT_PENDING: 'Assessment pending',
  PREPARATION: 'Preparing',
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted, not screened',
  AI_SCREENED: 'Engine screened, awaiting you',
  UNDER_REVIEW: 'In your review',
  APPROVED: 'Approved, awaiting payment',
  REJECTED: 'Revision requested',
  PAID: 'Paid',
  BADGE_ISSUED: 'Credential issued',
};

export function reviewStatusTone(status: WorkflowStatus): 'neutral' | 'progress' | 'attention' | 'success' {
  if (status === 'SUBMITTED' || status === 'AI_SCREENED' || status === 'UNDER_REVIEW') return 'attention';
  if (status === 'APPROVED' || status === 'PAID' || status === 'BADGE_ISSUED') return 'success';
  if (status === 'REJECTED') return 'progress';
  return 'neutral';
}

export const WORKFLOW_TYPE_LABELS: Record<'GHG' | 'CARBON' | 'JOB', string> = {
  GHG: 'GHG',
  CARBON: 'GHG (carbon claims)',
  JOB: 'Workforce',
};

export const AI_FINDING_LABELS: Record<string, string> = {
  CONFORMANT: 'Conformant',
  NON_CONFORMANT: 'Non-conformant',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
};
