import { Router, Request, Response } from 'express';
import { PrismaClient, EvidenceCategory } from '@prisma/client';
import { EvidenceLockerService } from '../services/evidence-locker.service';
import { IsoPdfReportService } from '../services/iso-pdf-report.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { UserAuthScope, runWithRls } from '../db/rls';
import { evidenceUpload } from '../middleware/evidence-upload.middleware';
import { storeEvidenceFile } from '../services/evidence-file.service';

export function createIsoEvidenceRouter(prisma: PrismaClient): Router {
  const router = Router();
  const evidenceService = new EvidenceLockerService(prisma);
  const pdfReportService = new IsoPdfReportService(prisma);

  /**
   * POST /api/portal/iso/evidence/upload-file
   * Uploads one evidence file into private storage and records the SHA-256 of its contents.
   * Partners upload for their own organisation; administrators must name an existing licensee.
   */
  router.post('/api/portal/iso/evidence/upload-file', authenticateToken, evidenceUpload, async (req: Request, res: Response) => {
    const user = req.user!;
    const requested = typeof req.body?.licenseeId === 'string' ? req.body.licenseeId.trim() : '';
    const licenseeId = user.role === 'ADMIN' ? requested : user.licenseeId;

    if (!licenseeId) {
      return res.status(400).json({ error: 'licenseeId is required.' });
    }
    if (user.role !== 'ADMIN' && requested && requested !== user.licenseeId) {
      return res.status(403).json({ error: 'Forbidden: Cannot upload evidence for other licensees.' });
    }
    if (!(await prisma.licensee.findUnique({ where: { id: licenseeId }, select: { id: true } }))) {
      return res.status(400).json({ error: 'Unknown licensee.' });
    }

    const rawCategory = req.body?.category;
    if (rawCategory && !Object.values(EvidenceCategory).includes(rawCategory)) {
      return res.status(400).json({ error: `category must be one of: ${Object.values(EvidenceCategory).join(', ')}` });
    }

    try {
      const evidenceDoc = await runWithRls(prisma, user, (tx) =>
        storeEvidenceFile(tx, {
          licenseeId,
          uploadedBy: user.userId,
          file: req.file!,
          category: (rawCategory as EvidenceCategory | undefined) ?? EvidenceCategory.OTHER_AUDIT_PROOF,
          matrixRowId: typeof req.body?.matrixRowId === 'string' ? req.body.matrixRowId : typeof req.body?.questionId === 'string' ? req.body.questionId : null,
          reportId: typeof req.body?.reportId === 'string' ? req.body.reportId : null,
        })
      );
      return res.status(201).json({ message: 'Evidence uploaded.', evidenceDoc });
    } catch (err: unknown) {
      console.error('[EVIDENCE UPLOAD ERROR]', err);
      return res.status(500).json({ error: 'Failed to upload the evidence file.' });
    }
  });

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
      if (err.statusCode === 423 || err.message?.includes('export locked') || err.message?.includes('Transparency export locked')) {
        return res.status(423).json({
          error: {
            code: 423,
            status: 'RESOURCE_LOCKED',
            message: err.message,
            details: err.details,
          },
        });
      }
      const isForbidden = err.message?.includes('Forbidden');
      const statusCode = isForbidden ? 403 : 404;
      return res.status(statusCode).json({ error: err.message || 'Failed to generate PDF audit report.' });
    }
  });

  return router;
}
