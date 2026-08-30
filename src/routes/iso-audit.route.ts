import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditScoringService } from '../services/audit-scoring.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { UserAuthScope } from '../db/rls';

export function createIsoAuditRouter(prisma: PrismaClient): Router {
  const router = Router();
  const auditService = new AuditScoringService(prisma);

  /**
   * GET /api/iso/audits/templates/:facilityType
   * Returns standard 5-Pillar ISO questionnaire rows for the specified vertical.
   */
  router.get('/api/iso/audits/templates/:facilityType', (req: Request, res: Response) => {
    const { facilityType } = req.params;
    const templateRows = AuditScoringService.getTemplateRowsForFacility(facilityType);
    return res.status(200).json({
      facilityType: facilityType.toUpperCase(),
      pillarCount: templateRows.length,
      templateRows,
    });
  });

  /**
   * POST /api/iso/audits/evaluate
   * Submits audit questionnaire findings, calculates weighted score, and stores report.
   */
  router.post('/api/iso/audits/evaluate', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }

      const {
        licenseeId,
        auditRefId,
        facilityType,
        leadAuditorName,
        evaluationDate,
        summaryNotes,
        rows,
      } = req.body || {};

      if (!licenseeId || typeof licenseeId !== 'string') {
        return res.status(400).json({ error: 'Invalid input: licenseeId is required.' });
      }

      if (user.role === 'PARTNER' && user.licenseeId !== licenseeId) {
        return res.status(403).json({ error: 'Forbidden: Cannot create audit reports for other licensees.' });
      }

      if (!auditRefId || typeof auditRefId !== 'string') {
        return res.status(400).json({ error: 'Invalid input: auditRefId is required.' });
      }

      if (!facilityType || typeof facilityType !== 'string') {
        return res.status(400).json({ error: 'Invalid input: facilityType is required.' });
      }

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Invalid input: rows must be a non-empty array of questionnaire findings.' });
      }

      const report = await auditService.evaluateAuditReport({
        licenseeId: licenseeId.trim(),
        auditRefId: auditRefId.trim(),
        facilityType: facilityType.trim(),
        leadAuditorName: leadAuditorName || user.userId || 'Lead Assurance Officer, GMC, LL.B.',
        evaluationDate: evaluationDate ? new Date(evaluationDate) : new Date(),
        summaryNotes,
        rows,
      });

      return res.status(201).json({
        message: 'Audit inspection report successfully evaluated and registered.',
        report,
      });
    } catch (err: any) {
      const isConflict = err.code === 'P2002' || err.message?.includes('Unique constraint');
      const statusCode = isConflict ? 409 : 400;
      return res.status(statusCode).json({ error: err.message || 'Failed to evaluate audit report.' });
    }
  });

  /**
   * GET /api/iso/audits/:id
   * Retrieves an audit report by ID with full matrix rows.
   */
  router.get('/api/iso/audits/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }

      const userScope: UserAuthScope = {
        role: user.role,
        licenseeId: user.licenseeId,
      };

      const report = await auditService.getAuditReportById(req.params.id, userScope);

      // Security check for PARTNER role
      if (user.role === 'PARTNER' && report.licenseeId !== user.licenseeId) {
        return res.status(403).json({ error: 'Forbidden: Cannot access audit reports of other licensees.' });
      }

      return res.status(200).json({ report });
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'Audit report not found.' });
    }
  });

  /**
   * GET /api/iso/audits
   * Lists audit reports for a licensee.
   */
  router.get('/api/iso/audits', authenticateToken, async (req: Request, res: Response) => {
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
        return res.status(403).json({ error: 'Forbidden: Cannot access audit reports of other licensees.' });
      }

      const userScope: UserAuthScope = {
        role: user.role,
        licenseeId: user.licenseeId,
      };

      const reports = await auditService.listAuditReports(queryLicenseeId, userScope);
      return res.status(200).json({
        licenseeId: queryLicenseeId,
        totalReports: reports.length,
        reports,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to list audit reports.' });
    }
  });

  return router;
}
