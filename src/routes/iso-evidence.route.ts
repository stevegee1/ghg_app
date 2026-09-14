import { Router, Request, Response } from 'express';
import { PrismaClient, EvidenceCategory } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { EvidenceLockerService } from '../services/evidence-locker.service';
import { IsoPdfReportService } from '../services/iso-pdf-report.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { UserAuthScope } from '../db/rls';

const EVIDENCE_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'evidence-proofs');
fs.mkdirSync(EVIDENCE_UPLOAD_DIR, { recursive: true });

const evidenceUpload = multer({
  storage: multer.diskStorage({
    destination: EVIDENCE_UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const stamp = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${stamp}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'];
    const allowedMimes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      'application/octet-stream',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (allowedExts.includes(ext) && (allowedMimes.includes(mime) || allowedMimes.some((m) => mime.startsWith(m)))) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type or MIME: ${ext} (${file.mimetype}). Allowed formats: PNG, JPG, WEBP, PDF, DOC, DOCX, XLS, XLSX, CSV.`));
    }
  },
});

export function createIsoEvidenceRouter(prisma: PrismaClient): Router {
  const router = Router();
  const evidenceService = new EvidenceLockerService(prisma);
  const pdfReportService = new IsoPdfReportService(prisma);

  /**
   * POST /api/portal/iso/evidence/upload
   * Registers an evidence proof document into the Evidence Locker.
   */
  router.post('/api/portal/iso/evidence/upload', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }

      const {
        licenseeId,
        reportId,
        matrixRowId,
        fileName,
        category,
        fileUrl,
        fileSizeBytes,
        mimeType,
        providedHash,
      } = req.body || {};

      const targetLicenseeId = licenseeId || user.licenseeId;
      if (!targetLicenseeId) {
        return res.status(400).json({ error: 'Invalid input: licenseeId is required.' });
      }

      if (user.role === 'PARTNER' && user.licenseeId !== targetLicenseeId) {
        return res.status(403).json({ error: 'Forbidden: Cannot upload evidence for other licensees.' });
      }

      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({ error: 'Invalid input: fileName is required.' });
      }

      if (category && !Object.values(EvidenceCategory).includes(category)) {
        return res.status(400).json({
          error: `Invalid input: category must be one of: ${Object.values(EvidenceCategory).join(', ')}`,
        });
      }

      const validCategory = category || EvidenceCategory.OTHER_AUDIT_PROOF;

      const evidenceDoc = await evidenceService.registerEvidenceDocument({
        licenseeId: targetLicenseeId,
        reportId,
        matrixRowId,
        fileName: fileName.trim(),
        category,
        fileUrl,
        fileSizeBytes: fileSizeBytes || 2048,
        mimeType: mimeType || 'application/pdf',
        providedHash,
        uploadedBy: user.userId || 'PARTNER_USER',
        userScope: { role: user.role, licenseeId: targetLicenseeId },
      });

      return res.status(201).json({
        message: 'Evidence proof document successfully registered with SHA-256 checksum.',
        evidenceDoc,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to upload evidence document.' });
    }
  });

  /**
   * POST /api/portal/iso/evidence/upload-file
   * Direct multipart file upload endpoint for proof documents (images, PDFs, docs).
   * Computes SHA-256 integrity hash from the file buffer and registers into the Evidence Locker.
   */
  router.post(
    '/api/portal/iso/evidence/upload-file',
    authenticateToken,
    (req: Request, res: Response, next: any) => {
      evidenceUpload.single('file')(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({ error: err.message || 'File upload failed.' });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
        }

        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'Invalid input: file is required.' });
        }

        let targetLicenseeId = (req.body?.licenseeId as string) || user.licenseeId;
        if (!targetLicenseeId) {
          const defaultLic = await prisma.licensee.findFirst();
          if (defaultLic) targetLicenseeId = defaultLic.id;
        }

        if (!targetLicenseeId) {
          return res.status(400).json({ error: 'Invalid input: licenseeId is required.' });
        }

        // Verify licensee exists in database to avoid foreign key errors
        const licExists = await prisma.licensee.findUnique({ where: { id: targetLicenseeId } });
        if (!licExists) {
          const fallbackLic = await prisma.licensee.findFirst();
          if (fallbackLic) targetLicenseeId = fallbackLic.id;
        }

        if (user.role === 'PARTNER' && user.licenseeId && user.licenseeId !== targetLicenseeId) {
          return res.status(403).json({ error: 'Forbidden: Cannot upload evidence for other licensees.' });
        }

        const fileBuffer = fs.readFileSync(file.path);
        const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const rawCategory = req.body?.category;
        const category = (rawCategory && Object.values(EvidenceCategory).includes(rawCategory as any))
          ? (rawCategory as EvidenceCategory)
          : EvidenceCategory.OTHER_AUDIT_PROOF;
        const matrixRowId = (req.body?.matrixRowId as string) || (req.body?.questionId as string) || undefined;
        const reportId = (req.body?.reportId as string) || undefined;
        const fileUrl = `/uploads/evidence-proofs/${path.basename(file.path)}`;

        const evidenceDoc = await evidenceService.registerEvidenceDocument({
          licenseeId: targetLicenseeId,
          reportId,
          matrixRowId,
          fileName: file.originalname,
          category,
          fileUrl,
          fileSizeBytes: file.size,
          mimeType: file.mimetype,
          providedHash: sha256Hash,
          uploadedBy: user.userId || 'PARTNER_USER',
          userScope: { role: user.role, licenseeId: targetLicenseeId },
        });

        return res.status(201).json({
          message: 'Evidence proof document successfully uploaded and registered with SHA-256 integrity hash.',
          evidenceDoc: {
            ...evidenceDoc,
            sha256Hash,
            fileUrl,
          },
        });
      } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Failed to upload proof document.' });
      }
    }
  );

  /**
   * GET /api/portal/iso/evidence
   * Retrieves RLS-scoped evidence documents from the Evidence Locker.
   */
  router.get('/api/portal/iso/evidence', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }

      const queryLicenseeId = (req.query.licenseeId as string) || user.licenseeId;
      if (!queryLicenseeId) {
        return res.status(400).json({ error: 'Invalid query: licenseeId is required.' });
      }

      if (user.role === 'PARTNER' && user.licenseeId !== queryLicenseeId) {
        return res.status(403).json({ error: 'Forbidden: Cannot access evidence of other licensees.' });
      }

      const categoryFilter = req.query.category as EvidenceCategory | undefined;
      const userScope: UserAuthScope = {
        role: user.role,
        licenseeId: user.licenseeId,
      };

      const documents = await evidenceService.getEvidenceDocuments(queryLicenseeId, userScope, categoryFilter);
      return res.status(200).json({
        licenseeId: queryLicenseeId,
        totalDocuments: documents.length,
        documents,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve evidence documents.' });
    }
  });

  /**
   * GET /api/portal/iso/reports/:id/pdf
   * Generates and streams the boardroom-grade ISO 14001 / 50001 PDF report with SHA-256 watermarking.
   */
  router.get('/api/portal/iso/reports/:id/pdf', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }

      const userScope: UserAuthScope = {
        role: user.role,
        licenseeId: user.licenseeId,
      };

      const { pdfBuffer, docHash, auditRefId } = await pdfReportService.generateAuditReportPdf({
        reportId: req.params.id,
        user: userScope,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ISO_Audit_Report_${auditRefId}.pdf"`);
      res.setHeader('X-Document-Integrity-SHA256', docHash);

      return res.status(200).send(pdfBuffer);
    } catch (err: any) {
      const isForbidden = err.message?.includes('Forbidden');
      const statusCode = isForbidden ? 403 : 404;
      return res.status(statusCode).json({ error: err.message || 'Failed to generate PDF audit report.' });
    }
  });

  return router;
}
