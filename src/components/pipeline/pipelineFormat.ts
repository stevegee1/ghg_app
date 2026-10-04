import type { PipelineFee, PipelineService, WorkflowStatus } from '../../api/pipeline.types';

export const SERVICE_TITLES: Record<PipelineService, { title: string; summary: string }> = {
  GHG: {
    title: 'GHG Assurance',
    summary: 'Answer each framework questionnaire with evidence. A Lead Auditor reviews it before your credential is issued.',
  },
  WORKFORCE: {
    title: 'Workforce Assurance',
    summary: 'Evidence your Section 106 and social value commitments. A Lead Auditor reviews them before your credential is issued.',
  },
};

/** The four stages a client sees, in order. */
export const STAGES = ['Questionnaire', 'Review', 'Payment', 'Credential'] as const;

export function stageIndex(status: WorkflowStatus): number {
  switch (status) {
    case 'SUBMITTED':
    case 'AI_SCREENED':
    case 'UNDER_REVIEW':
      return 1;
    case 'APPROVED':
      return 2;
    case 'PAID':
    case 'BADGE_ISSUED':
      return 3;
    default:
      return 0;
  }
}

/** Plain status wording for clients. AI screening is internal, so it reads as "In review". */
export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  ASSESSMENT_PENDING: 'Assessment needed',
  PREPARATION: 'Preparing',
  DRAFT: 'In progress',
  SUBMITTED: 'In review',
  AI_SCREENED: 'In review',
  UNDER_REVIEW: 'In review',
  APPROVED: 'Approved, payment due',
  REJECTED: 'Revision requested',
  PAID: 'Paid, credential to set up',
  BADGE_ISSUED: 'Credential issued',
};

export function statusTone(status: WorkflowStatus): 'neutral' | 'progress' | 'attention' | 'success' {
  if (status === 'REJECTED' || status === 'APPROVED' || status === 'PAID') return 'attention';
  if (status === 'BADGE_ISSUED') return 'success';
  if (status === 'DRAFT' || status === 'ASSESSMENT_PENDING' || status === 'PREPARATION') return 'neutral';
  return 'progress';
}

export function formatFee(fee: PipelineFee): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: fee.currency }).format(fee.amountPence / 100);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const EVIDENCE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv';
