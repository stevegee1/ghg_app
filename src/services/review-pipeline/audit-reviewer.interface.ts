/**
 * audit-reviewer.interface.ts
 * Pluggable audit review contract supporting both human Lead Auditor review
 * and future automated AI-assisted / autonomous compliance evaluation.
 */

export interface ClauseReviewFinding {
  questionId: string;
  isoClause?: string;
  status: 'CONFORMANT' | 'NON_CONFORMANT' | 'INSUFFICIENT_EVIDENCE';
  findings: string;
  /** True when the engine supported the answer after reading the file's contents. */
  evidenceVerified: boolean;
  /** Whether the engine read the evidence file (false when there is none, or it could not be read). */
  evidenceRead?: boolean;
  /** What the file shows, any mismatch with the answer, or why it was not read. */
  evidenceNotes?: string;
}

export interface AuditReviewResult {
  decision: 'APPROVE' | 'REQUIRE_REVISION';
  targetStatus: 'AUDIT_READY' | 'REVISION_REQUIRED';
  complianceScore: number; // 0 to 100
  reviewerNotes: string;
  clauseFindings?: ClauseReviewFinding[];
  reviewedBy: string; // e.g. "Lead Auditor (Manual)" or "NFTYLOGS audit engine"
  reviewedAt: Date;
}

export interface IAuditReviewer {
  evaluateSubmission(submissionId: string): Promise<AuditReviewResult>;
}
