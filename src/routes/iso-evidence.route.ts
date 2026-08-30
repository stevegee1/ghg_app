import { Router, Request, Response } from 'express';
import { PrismaClient, EvidenceCategory } from '@prisma/client';
import { EvidenceLockerService } from '../services/evidence-locker.service';
import { IsoPdfReportService } from '../services/iso-pdf-report.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { UserAuthScope } from '../db/rls';

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

      if (!category || !Object.values(EvidenceCategory).includes(category)) {
        return res.status(400).json({
          error: `Invalid input: category must be one of: ${Object.values(EvidenceCategory).join(', ')}`,
        });
      }

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
