export type PipelineService = 'GHG' | 'WORKFORCE';

export type WorkflowStatus =
  | 'ASSESSMENT_PENDING'
  | 'PREPARATION'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AI_SCREENED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'BADGE_ISSUED';

export type WorkflowAnswerType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';

/** A published edition of a compliance standard. */
export interface StandardVersion {
  version: string;
  standardReference: string;
  effectiveFrom: string;
}

export interface PipelineFee {
  amountPence: number;
  currency: string;
}

export interface ClientFramework {
  frameworkId: string;
  code: string;
  name: string;
  governingBody: string | null;
  workflowType: 'GHG' | 'CARBON' | 'JOB';
  questionCount: number;
  currentVersion: StandardVersion;
  isLegallyMandatory: boolean;
  plainEnglishWhy: string;
  consequenceIfSkipped: string | null;
  enforcementBody: string | null;
  estimatedEffort: string;
  entitled: boolean;
  preparation: { totalItems: number; completedItems: number; ready: boolean } | null;
  latestSubmission: {
    id: string;
    status: WorkflowStatus;
    updatedAt: string;
    open: boolean;
    version: string;
    newerVersionAvailable: boolean;
  } | null;
}

export interface ClientEvidence {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  sha256Hash: string;
  uploadedAt: string;
}

export interface ClientQuestion {
  id: string;
  orderIndex: number;
  text: string;
  answerType: WorkflowAnswerType;
  options: string[];
  evidenceRequired: boolean;
  clauseReference: string;
  guidanceNotes: string | null;
  answer: { value: string; updatedAt: string; evidence: ClientEvidence | null } | null;
  revisionReason: string | null;
}

export interface ClientSubmission {
  id: string;
  licenseeId: string;
  workflowType: 'GHG' | 'CARBON' | 'JOB';
  status: WorkflowStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  complianceScore: number | null;
  paidAt: string | null;
  clientMessage: string | null;
  createdAt: string;
  updatedAt: string;
  framework: { id: string; code: string; name: string; governingBody: string | null; description: string | null };
  version: StandardVersion & { id: string };
  questions: ClientQuestion[];
  review: {
    decision: 'APPROVED' | 'REJECTED';
    score: number;
    reviewerName: string | null;
    reviewerAccreditation: string | null;
    notes: string | null;
    decidedAt: string;
  } | null;
  history: { status: WorkflowStatus; at: string }[];
  credential: {
    id: string;
    status: string;
    verificationSeal: string | null;
    warrantyExpiresAt: string | null;
    issuedAt: string;
    verifyPath: string;
    badgePath: string;
  } | null;
}

export interface AnswerInput {
  questionId: string;
  value: string;
  evidenceDocumentId?: string | null;
}
