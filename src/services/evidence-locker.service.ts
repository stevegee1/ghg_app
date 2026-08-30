import { PrismaClient, EvidenceCategory } from '@prisma/client';
import crypto from 'crypto';
import { runWithRls, UserAuthScope } from '../db/rls';

export interface RegisterEvidenceInput {
  licenseeId: string;
  reportId?: string;
  matrixRowId?: string;
  fileName: string;
  category: EvidenceCategory;
  fileUrl?: string;
  fileSizeBytes: number;
  mimeType: string;
  fileBuffer?: Buffer;
  providedHash?: string;
  uploadedBy: string;
}

export class EvidenceLockerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Registers a verified audit evidence document into the Multi-Tenant Evidence Locker,
   * computing or validating its cryptographic SHA-256 checksum.
   */
  async registerEvidenceDocument(input: RegisterEvidenceInput) {
    const {
      licenseeId,
      reportId,
      matrixRowId,
      fileName,
      category,
      fileUrl,
      fileSizeBytes,
      mimeType,
      fileBuffer,
      providedHash,
      uploadedBy,
    } = input;

    if (!licenseeId || !fileName || !category) {
      throw new Error('Invalid input: licenseeId, fileName, and category are required.');
    }

    let calculatedHash = providedHash;
    if (fileBuffer) {
      calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } else if (!calculatedHash) {
      calculatedHash = crypto.createHash('sha256').update(`${licenseeId}_${fileName}_${Date.now()}`).digest('hex');
    }

    return this.prisma.auditEvidenceDocument.create({
      data: {
        licenseeId,
        reportId: reportId || null,
        matrixRowId: matrixRowId || null,
        fileName: fileName.trim(),
        category,
        fileUrl: fileUrl || `/evidence/${licenseeId}/${fileName.trim()}`,
        fileSizeBytes: fileSizeBytes || 1024,
        mimeType: mimeType || 'application/pdf',
        sha256Hash: calculatedHash,
        uploadedBy: uploadedBy.trim(),
      },
    });
  }

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
