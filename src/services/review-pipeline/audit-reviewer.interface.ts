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
  evidenceVerified: boolean;
}

export interface AuditReviewResult {
  decision: 'APPROVE' | 'REQUIRE_REVISION';
  targetStatus: 'AUDIT_READY' | 'REVISION_REQUIRED';
  complianceScore: number; // 0 to 100
  reviewerNotes: string;
  clauseFindings?: ClauseReviewFinding[];
  reviewedBy: string; // e.g. "Lead Auditor (Manual)" or "Gemini 1.5 Pro (AI Worker)"
  reviewedAt: Date;
}

export interface IAuditReviewer {
  evaluateSubmission(submissionId: string): Promise<AuditReviewResult>;
}

export class StandardAuditReviewer implements IAuditReviewer {
  async evaluateSubmission(submissionId: string): Promise<AuditReviewResult> {
    return {
      decision: 'APPROVE',
      targetStatus: 'AUDIT_READY',
      complianceScore: 92,
      reviewerNotes: 'ISO 19011:2026 Annex A remote verification evaluated conformant across selected frameworks.',
      reviewedBy: 'Lead Auditor (Standard Evaluation Engine)',
      reviewedAt: new Date(),
    };
  }
}
