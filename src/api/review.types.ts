import type { WorkflowAnswerType, WorkflowStatus } from './pipeline.types';

export type ReviewQueueStage = 'awaiting' | 'decided' | 'all';

export interface ReviewQueueItem {
  id: string;
  status: WorkflowStatus;
  workflowType: 'GHG' | 'CARBON' | 'JOB';
  submittedAt: string | null;
  reviewedAt: string | null;
  complianceScore: number | null;
  licensee: { id: string; name: string };
  framework: { id: string; code: string; name: string };
  ai: { score: number | null; recommendation: string | null } | null;
  decidedBy: string | null;
}

export interface ReviewAiFinding {
  questionId: string;
  status: string;
  findings: string;
  evidenceVerified: boolean;
  confidence: number | null;
}

export interface ReviewQuestion {
  id: string;
  orderIndex: number;
  text: string;
  answerType: WorkflowAnswerType;
  evidenceRequired: boolean;
  clauseReference: string;
  guidanceNotes: string | null;
  answer: string | null;
  evidence: { id: string; fileName: string; fileUrl: string; fileSizeBytes: number; sha256Hash: string; stored: boolean } | null;
  aiFinding: ReviewAiFinding | null;
  previousDecision: { accepted: boolean; reasonIfRejected: string | null } | null;
}

export interface ReviewDossier {
  id: string;
  status: WorkflowStatus;
  workflowType: 'GHG' | 'CARBON' | 'JOB';
  submittedAt: string | null;
  reviewedAt: string | null;
  canDecide: boolean;
  canStartReview: boolean;
  canRerunAi: boolean;
  licensee: { id: string; name: string };
  framework: { id: string; code: string; name: string; governingBody: string | null };
  version: { id: string; version: string; standardReference: string };
  ai: { screenedAt: string; reviewer: string | null; score: number | null; recommendation: string | null; summary: string | null } | null;
  questions: ReviewQuestion[];
  review: {
    decision: 'APPROVED' | 'REJECTED';
    score: number;
    reviewerName: string | null;
    reviewerAccreditation: string | null;
    notes: string | null;
    decidedAt: string;
  } | null;
  history: { status: WorkflowStatus; at: string; reason: string | null }[];
}

export interface ReviewDecisionPayload {
  overallDecision: 'APPROVED' | 'REJECTED';
  overallScore: number;
  reviewerAccreditation: string;
  reviewerNotes: string | null;
  perQuestionDecisions: { questionId: string; accepted: boolean; reasonIfRejected?: string }[];
}
