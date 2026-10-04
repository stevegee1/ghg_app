import crypto from 'crypto';
import path from 'path';
import { EvidenceCategory, Prisma, PrismaClient } from '@prisma/client';
import { storeFile } from './file-storage.service';

type Db = PrismaClient | Prisma.TransactionClient;

export const EVIDENCE_MAX_BYTES = 25 * 1024 * 1024;

export const EVIDENCE_TYPES: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.csv': ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
};

export function isAllowedEvidenceFile(originalName: string, mimeType: string): boolean {
  const allowed = EVIDENCE_TYPES[path.extname(originalName).toLowerCase()];
  return Boolean(allowed && allowed.includes(mimeType.toLowerCase()));
}

export interface EvidenceUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * Stores an uploaded evidence file in private storage and records it with the SHA-256 of its
 * actual contents. The record links to the authenticated download endpoint, never a public path.
 */
export async function storeEvidenceFile(
  db: Db,
  input: {
    licenseeId: string;
    uploadedBy: string;
    file: EvidenceUpload;
    category?: EvidenceCategory;
    reportId?: string | null;
    matrixRowId?: string | null;
  }
) {
  const stored = storeFile('evidence', input.licenseeId, input.file.buffer, input.file.originalname);
  const id = crypto.randomUUID();
  return db.auditEvidenceDocument.create({
    data: {
      id,
      licenseeId: input.licenseeId,
      reportId: input.reportId ?? null,
      matrixRowId: input.matrixRowId ?? null,
      fileName: path.basename(input.file.originalname).slice(0, 255),
      category: input.category ?? EvidenceCategory.OTHER_AUDIT_PROOF,
      fileUrl: `/api/evidence/${id}/file`,
      storageKey: stored.storageKey,
      fileSizeBytes: stored.sizeBytes,
      mimeType: input.file.mimetype,
      sha256Hash: stored.sha256,
      uploadedBy: input.uploadedBy,
    },
  });
}
