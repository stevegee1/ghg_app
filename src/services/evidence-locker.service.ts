import { PrismaClient, EvidenceCategory } from '@prisma/client';
import { runWithRls, UserAuthScope } from '../db/rls';

export class EvidenceLockerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Retrieves RLS-scoped evidence documents for a licensee with optional category filtering.
   */
  async getEvidenceDocuments(licenseeId: string, user: UserAuthScope, category?: EvidenceCategory) {
    return runWithRls(this.prisma, user, async (tx) => {
      const whereClause: any = { licenseeId };
      if (category) {
        whereClause.category = category;
      }

      return tx.auditEvidenceDocument.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      });
    });
  }
}
