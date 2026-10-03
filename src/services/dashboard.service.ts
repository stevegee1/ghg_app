import { PrismaClient, WorkflowType, WorkflowStatus, CredentialStatus } from '@prisma/client';

export interface ActivityItem {
  id: string;
  date: string;
  type: 'WORKFLOW_SUBMISSION' | 'PAYMENT' | 'CHARITY_PAYOUT' | 'MERCH_ORDER';
  title: string;
  amountCents?: number | null;
  currency?: string | null;
  status: string;
  isDraftOrPending: boolean;
  link: string;
}

export interface CredentialItem {
  id: string;
  type: 'AUDIT_BADGE' | 'CHARITY_PARTNERSHIP';
  title: string;
  frameworkOrScope: string;
  issuedAt: string;
  status: string;
  badgeImageUrl?: string | null;
  verifyUrl?: string | null;
  pdfDownloadUrl: string;
}

export interface ClientDashboardData {
  profile: {
    userId: string;
    email: string;
    name: string;
    organizationName: string;
    logoUrl?: string | null;
    accountRoles: ('AUDIT_CLIENT' | 'CHARITY_PARTNER' | 'MERCH_BUYER')[];
  };
  auditCards: {
    carbon: {
      activeSubmissions: number;
      approvedBadges: number;
      latestDraftId?: string | null;
    };
    job: {
      activeSubmissions: number;
      approvedBadges: number;
      latestDraftId?: string | null;
    };
  };
  recentActivity: ActivityItem[];
  credentials: CredentialItem[];
  telemetryApi: {
    isEnabled: boolean;
    maskedApiKey?: string | null;
    docsUrl: string;
    telemetryCount: number;
  } | null;
}

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Compiles the standard shared client profile dashboard data for an authenticated user.
   */
  async getDashboardData(userId: string, targetLicenseeId?: string | null): Promise<ClientDashboardData> {
    const user = await this.prisma.portalUser.findUnique({
      where: { id: userId },
      include: { licensee: true },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const effectiveLicenseeId = targetLicenseeId || user.licenseeId;
    const email = user.email.toLowerCase().trim();

    // 1. Resolve Account Roles (an entity can hold more than one role at once)
    const accountRoles: ('AUDIT_CLIENT' | 'CHARITY_PARTNER' | 'MERCH_BUYER')[] = [];

    // Audit Client check
    if (effectiveLicenseeId) {
      accountRoles.push('AUDIT_CLIENT');
    }

    // Charity Partner check
    const matchedCharity = await this.prisma.charity.findFirst({
      where: { contactEmail: email },
      include: { allocations: { include: { financialSplit: { include: { transaction: true } } } } },
    });
    if (matchedCharity) {
      accountRoles.push('CHARITY_PARTNER');
    }

    // Merch Buyer check
    const matchedOrders = await this.prisma.souvenirOrder.findMany({
      where: { customerEmail: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (matchedOrders.length > 0) {
      accountRoles.push('MERCH_BUYER');
    }

    // Fallback if no roles matched
    if (accountRoles.length === 0) {
      accountRoles.push('AUDIT_CLIENT');
    }

    // 2. Audit Cards (Carbon & Job)
    let carbonActive = 0;
    let carbonBadges = 0;
    let carbonLatestDraft: string | null = null;
    let jobActive = 0;
    let jobBadges = 0;
    let jobLatestDraft: string | null = null;

    if (effectiveLicenseeId) {
      const submissions = await this.prisma.workflowSubmission.findMany({
        where: { licenseeId: effectiveLicenseeId },
        orderBy: { createdAt: 'desc' },
      });

      for (const s of submissions) {
        const isBadged = s.status === WorkflowStatus.BADGE_ISSUED;
        const isActive = !isBadged;

        // The GHG pipeline covers both GHG inventory and carbon claims frameworks.
        if (s.workflowType === WorkflowType.GHG || s.workflowType === WorkflowType.CARBON) {
          if (isActive) carbonActive++;
          if (isBadged) carbonBadges++;
          if (!carbonLatestDraft && s.status === WorkflowStatus.DRAFT) {
            carbonLatestDraft = s.id;
          }
        } else if (s.workflowType === WorkflowType.JOB) {
          if (isActive) jobActive++;
          if (isBadged) jobBadges++;
          if (!jobLatestDraft && s.status === WorkflowStatus.DRAFT) {
            jobLatestDraft = s.id;
          }
        }
      }

      // Also count ISO legacy submissions if present
      const legacyIsoSubs = await this.prisma.isoReadinessSubmission.findMany({
        where: { licenseeId: effectiveLicenseeId },
        include: { credential: true },
      });
      for (const iso of legacyIsoSubs) {
        if (iso.credential && (iso.credential.status === CredentialStatus.COMPOSITED || iso.credential.status === CredentialStatus.ISSUED)) {
          carbonBadges++;
        } else {
          carbonActive++;
        }
      }
    }

    // 3. Unified Reverse-Chronological Recent Activity Feed
    const activityItems: ActivityItem[] = [];

    // 3a. Workflow Submissions (including DRAFT and in-progress items with clear chips)
    if (effectiveLicenseeId) {
      const submissions = await this.prisma.workflowSubmission.findMany({
        where: { licenseeId: effectiveLicenseeId },
        include: { framework: true },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      });

      for (const s of submissions) {
        const isDraft = s.status === WorkflowStatus.DRAFT || s.status === WorkflowStatus.REJECTED;
        activityItems.push({
          id: `sub_${s.id}`,
          date: s.updatedAt.toISOString(),
          type: 'WORKFLOW_SUBMISSION',
          title: `${s.workflowType === WorkflowType.CARBON ? 'Carbon Audit' : 'Job Reporting'}: ${s.framework.name}`,
          status: s.status,
          isDraftOrPending: isDraft,
          link: `/portal?tab=workflow&submissionId=${s.id}`,
        });
      }

      // 3b. Payments & Transactions
      const transactions = await this.prisma.transaction.findMany({
        where: { licenseeId: effectiveLicenseeId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      });

      for (const t of transactions) {
        activityItems.push({
          id: `tx_${t.id}`,
          date: t.createdAt.toISOString(),
          type: 'PAYMENT',
          title: `Audit Readiness Settlement (Ref: ${t.checkoutReferenceId || t.id.slice(0, 8)})`,
          amountCents: t.grossAmountCents,
          currency: t.currency || 'GBP',
          status: t.status,
          isDraftOrPending: t.status === 'PENDING',
          link: `/portal?tab=transactions`,
        });
      }
    }

    // 3c. Charity Payouts
    if (matchedCharity) {
      for (const alloc of matchedCharity.allocations) {
        activityItems.push({
          id: `alloc_${alloc.id}`,
          date: alloc.createdAt.toISOString(),
          type: 'CHARITY_PAYOUT',
          title: `ESG Statutory Split Allocation: ${matchedCharity.name}`,
          amountCents: alloc.amountCents,
          currency: alloc.financialSplit?.transaction?.currency || 'GBP',
          status: alloc.stripeTransferId ? 'SETTLED' : alloc.transferFailed ? 'TRANSFER_FAILED' : 'PENDING_TRANSFER',
          isDraftOrPending: !alloc.stripeTransferId,
          link: `/api/charities/${matchedCharity.id}/partnership-pdf`,
        });
      }
    }

    // 3d. Merch Orders
    for (const ord of matchedOrders) {
      activityItems.push({
        id: `order_${ord.id}`,
        date: ord.createdAt.toISOString(),
        type: 'MERCH_ORDER',
        title: `Keepsake Merch Order: ${ord.eventName || ord.orderNumber}`,
        amountCents: ord.grossAmountCents,
        currency: 'GBP',
        status: ord.status,
        isDraftOrPending: ord.status === 'ORDER_PLACED',
        link: `/track/${ord.orderNumber}`,
      });
    }

    // Sort all activity reverse-chronologically
    activityItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4. Credentials Panel (Issued Badges, PDF Proofs)
    const credentials: CredentialItem[] = [];

    if (effectiveLicenseeId) {
      const credentialsList = await this.prisma.auditWarrantyCredential.findMany({
        where: { licenseeId: effectiveLicenseeId },
        orderBy: { createdAt: 'desc' },
      });

      for (const cred of credentialsList) {
        credentials.push({
          id: cred.id,
          type: 'AUDIT_BADGE',
          title: cred.clientMessage || 'Statutory ISO Audit Assurance Badge',
          frameworkOrScope: cred.selectedFrameworks.join(', ') || 'ISO 14001:2015 & ISO 50001:2018',
          issuedAt: cred.createdAt.toISOString(),
          status: cred.status,
          badgeImageUrl: cred.compositeBadgeUrl || `/api/credentials/${cred.id}/badge.svg`,
          verifyUrl: cred.status === CredentialStatus.ISSUED ? `/api/credentials/${cred.id}/verify` : null,
          pdfDownloadUrl: cred.workflowSubmissionId
            ? `/api/workflow/submissions/${cred.workflowSubmissionId}/pdf`
            : `/api/portal/iso/report/${cred.submissionId}`,
        });
      }
    }

    if (matchedCharity && matchedCharity.status === 'ACTIVE') {
      credentials.push({
        id: `charity_${matchedCharity.id}`,
        type: 'CHARITY_PARTNERSHIP',
        title: `${matchedCharity.name} Statutory ESG Partnership`,
        frameworkOrScope: 'Statutory 15% ESG Direct Split Program',
        issuedAt: (matchedCharity.contractStartDate || matchedCharity.createdAt).toISOString(),
        status: 'ACTIVE_1_YEAR_CONTRACT',
        pdfDownloadUrl: `/api/charities/${matchedCharity.id}/partnership-pdf`,
      });
    }

    // 5. Telemetry API Panel (only shown post-badge issuance or for licensees with telemetry)
    let telemetryApi: ClientDashboardData['telemetryApi'] = null;

    if (effectiveLicenseeId) {
      const telemetryCount = await this.prisma.telemetryLog.count({
        where: { licenseeId: effectiveLicenseeId },
      });

      const hasBadge = credentials.some((c) => c.type === 'AUDIT_BADGE');

      if (hasBadge || telemetryCount > 0 || user.licensee?.b2bApiKeyHash) {
        telemetryApi = {
          isEnabled: true,
          maskedApiKey: user.licensee?.b2bApiKeyHash
            ? `ghg_live_••••${user.licensee.id.slice(-4)}`
            : `ghg_live_••••${effectiveLicenseeId.slice(-4)}`,
          docsUrl: '/portal?tab=telemetry-docs',
          telemetryCount,
        };
      }
    }

    const organizationName =
      user.licensee?.name ||
      matchedCharity?.name ||
      matchedOrders[0]?.customerName ||
      'Authorized Entity';

    return {
      profile: {
        userId: user.id,
        email: user.email,
        name: user.licensee?.name || user.email.split('@')[0],
        organizationName,
        logoUrl: null,
        accountRoles,
      },
      auditCards: {
        carbon: {
          activeSubmissions: carbonActive,
          approvedBadges: carbonBadges,
          latestDraftId: carbonLatestDraft,
        },
        job: {
          activeSubmissions: jobActive,
          approvedBadges: jobBadges,
          latestDraftId: jobLatestDraft,
        },
      },
      recentActivity: activityItems.slice(0, 20),
      credentials,
      telemetryApi,
    };
  }
}
