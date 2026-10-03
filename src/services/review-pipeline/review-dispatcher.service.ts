import { PrismaClient, IsoReadinessStatus } from '@prisma/client';
import { IAuditReviewer, AuditReviewResult, StandardAuditReviewer } from './audit-reviewer.interface';
import { AiAuditReviewer } from './ai-audit-reviewer.service';

export type ReviewMode = 'MANUAL' | 'AI_COPILOT' | 'AI_AUTONOMOUS';

export interface SubmissionQueueItem {
  id: string;
  licenseeId: string;
  licenseeName: string;
  tierSelected: string | null;
  selectedFrameworks: string[];
  complianceScore: number | null;
  status: IsoReadinessStatus;
  answersCount: number;
  reviewerNotes: string | null;
  paidAt: Date | null;
  auditReadyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ReviewDispatcherService {
  private prisma: PrismaClient;
  private customReviewer?: IAuditReviewer;

  constructor(prisma: PrismaClient, customReviewer?: IAuditReviewer) {
    this.prisma = prisma;
    this.customReviewer = customReviewer;
  }

  /**
   * Sets or updates the active audit reviewer strategy (e.g. AI Co-Pilot / Autonomous worker)
   */
  public setReviewer(reviewer: IAuditReviewer): void {
    this.customReviewer = reviewer;
  }

  /**
   * Evaluates a submission using the active reviewer strategy.
   * Defaults to AiAuditReviewer (Gemini > Anthropic > OpenAI > deterministic rules).
   */
  public async evaluateSubmission(submissionId: string): Promise<AuditReviewResult> {
    const reviewer = this.customReviewer ?? new AiAuditReviewer(this.prisma);
    return reviewer.evaluateSubmission(submissionId);
  }


  /**
   * Retrieves paginated submissions for the Lead Auditor / Admin review queue
   */
  public async getSubmissionsQueue(options?: {
    status?: IsoReadinessStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: SubmissionQueueItem[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(100, options?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.search) {
      where.licensee = {
        name: { contains: options.search, mode: 'insensitive' },
      };
    }

    const [submissions, total] = await Promise.all([
      this.prisma.isoReadinessSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          licensee: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.isoReadinessSubmission.count({ where }),
    ]);

    const items: SubmissionQueueItem[] = submissions.map((sub) => {
      const answersArray = Array.isArray(sub.answers) ? sub.answers : [];
      return {
        id: sub.id,
        licenseeId: sub.licenseeId,
        licenseeName: sub.licensee?.name || sub.licenseeId,
        tierSelected: sub.tierSelected,
        selectedFrameworks: sub.selectedFrameworks || [],
        complianceScore: sub.complianceScore,
        status: sub.status,
        answersCount: answersArray.length,
        reviewerNotes: sub.reviewerNotes,
        paidAt: sub.paidAt,
        auditReadyAt: sub.auditReadyAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      };
    });

    return { items, total, page, limit };
  }

  /**
   * Applies an auditor or AI review decision to a submission, transitioning status and unlocking Gate 1.
   */
  public async applyReviewDecision(params: {
    submissionId: string;
    decision: 'APPROVE' | 'REQUIRE_REVISION';
    reviewerNotes: string;
    complianceScore?: number;
    auditorName?: string;
  }): Promise<{ success: boolean; submission: any }> {
    const { submissionId, decision, reviewerNotes, complianceScore, auditorName } = params;

    const isApproved = decision === 'APPROVE';
    const targetStatus = isApproved ? IsoReadinessStatus.AUDIT_READY : IsoReadinessStatus.REVISION_REQUIRED;

    const updated = await this.prisma.isoReadinessSubmission.update({
      where: { id: submissionId },
      data: {
        status: targetStatus,
        reviewerNotes: reviewerNotes || (isApproved ? 'ISO 19011:2026 Annex A remote verification approved.' : 'Revisions requested by lead auditor.'),
        auditReadyAt: isApproved ? new Date() : null,
        ...(typeof complianceScore === 'number' && { complianceScore }),
        updatedAt: new Date(),
      },
      include: {
        licensee: { select: { id: true, name: true } },
      },
    });

    return { success: true, submission: updated };
  }
}
