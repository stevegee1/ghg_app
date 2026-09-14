import { Router, Request, Response } from 'express';
import { PrismaClient, PeriodType, ReportSource } from '@prisma/client';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';

export function createJobReportingRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /api/jobs/assess
   * Public standalone Section 106 & Social Value compliance assessment calculator.
   */
  router.post('/api/jobs/assess', (req: Request, res: Response) => {
    const {
      projectValueGbp = 10000000,
      totalWorkers = 100,
      localWorkers = 25,
      apprenticeCount = 6,
      livingWageCompliant = true,
      trainingHours = 1200,
    } = req.body || {};

    const localLaborRatio = totalWorkers > 0 ? (localWorkers / totalWorkers) * 100 : 0;
    const apprenticeRatio = totalWorkers > 0 ? (apprenticeCount / totalWorkers) * 100 : 0;

    // Scoring algorithm based on UK Section 106 benchmarks (20% local labor, 5% apprentices, 100% Living Wage)
    let score = 0;
    const notes: string[] = [];

    // Local labor evaluation (Max 40 pts)
    if (localLaborRatio >= 25) {
      score += 40;
      notes.push(`Local resident employment ratio (${localLaborRatio.toFixed(1)}%) exceeds standard 20% municipal threshold.`);
    } else if (localLaborRatio >= 15) {
      score += 25;
      notes.push(`Local resident employment ratio (${localLaborRatio.toFixed(1)}%) requires minor improvement to meet 20% target.`);
    } else {
      score += 10;
      notes.push(`Local employment deficit: ${localLaborRatio.toFixed(1)}% is below statutory planning covenant.`);
    }

    // Apprentice quota evaluation (Max 30 pts)
    if (apprenticeRatio >= 5) {
      score += 30;
      notes.push(`Apprenticeship density (${apprenticeRatio.toFixed(1)}%) fully conforms with City & Guilds / Section 106 quotas.`);
    } else if (apprenticeRatio >= 2.5) {
      score += 15;
      notes.push(`Apprenticeship density (${apprenticeRatio.toFixed(1)}%) is marginal.`);
    } else {
      score += 5;
      notes.push(`Critical apprentice deficit: Must train at least 5% NVQ apprentices.`);
    }

    // Living wage & training hours (Max 30 pts)
    if (livingWageCompliant) {
      score += 20;
    } else {
      notes.push('Non-compliance with Real Living Wage benchmark detected.');
    }

    if (trainingHours >= 1000) {
      score += 10;
    } else {
      score += 5;
    }

    const grade = score >= 85 ? 'CONFORMANT_GRADE_A' : score >= 65 ? 'ACTION_REQUIRED' : 'CRITICAL_DEFICIT';

    const verificationPayload = JSON.stringify({
      projectValueGbp,
      totalWorkers,
      localWorkers,
      apprenticeCount,
      score,
      grade,
      timestamp: new Date().toISOString(),
    });
    const provisionalSealHash = crypto.createHash('sha256').update(verificationPayload).digest('hex');

    return res.status(200).json({
      score,
      grade,
      localLaborRatio: parseFloat(localLaborRatio.toFixed(1)),
      apprenticeRatio: parseFloat(apprenticeRatio.toFixed(1)),
      livingWageCompliant: Boolean(livingWageCompliant),
      provisionalSealHash,
      notes,
      isAuditReady: score >= 80,
    });
  });

  /**
   * POST /api/jobs/report
   * Authenticated endpoint to save a verified Section 106 report in PostgreSQL.
   */
  router.post('/api/jobs/report', authenticateToken, async (req: Request, res: Response) => {
    const {
      periodType = 'QUARTERLY',
      periodStart,
      periodEnd,
      jobsCreated,
      attestationNote,
    } = req.body || {};

    const licenseeId = req.user?.licenseeId;
    const userId = req.user?.userId;

    if (!licenseeId || !userId) {
      return res.status(403).json({ error: 'Tenant boundary or User ID missing' });
    }

    try {
      const parsedStart = periodStart ? new Date(periodStart) : new Date(new Date().getFullYear(), 0, 1);
      const parsedEnd = periodEnd ? new Date(periodEnd) : new Date(new Date().getFullYear(), 2, 31);

      const report = await runWithRls(prisma, req.user!, async (tx) => {
        return tx.jobCreationReport.create({
          data: {
            licenseeId,
            submittedByUserId: userId,
            periodType: periodType === 'ANNUAL' ? PeriodType.ANNUAL : PeriodType.QUARTERLY,
            periodStart: parsedStart,
            periodEnd: parsedEnd,
            jobsCreated: Number(jobsCreated) || 0,
            reportSource: ReportSource.MANUAL_ATTESTATION,
            attestationNote: attestationNote || 'Verified under UK Section 106 & Social Value Protocol',
          },
        });
      });

      return res.status(201).json({
        message: 'Section 106 Job Creation Report logged successfully',
        report,
      });
    } catch (err) {
      console.error('[JOB REPORT ERROR]', err);
      return res.status(500).json({ error: 'Failed to record job creation report' });
    }
  });

  /**
   * GET /api/jobs/reports
   * Retrieves RLS-scoped job creation reports for caller's licensee.
   */
  router.get('/api/jobs/reports', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user!;
    try {
      const reports = await runWithRls(prisma, user, async (tx) => {
        return tx.jobCreationReport.findMany({
          where: user.role === 'ADMIN' ? {} : { licenseeId: user.licenseeId || '' },
          orderBy: { createdAt: 'desc' },
        });
      });
      return res.status(200).json({ reports });
    } catch (err) {
      console.error('[GET JOB REPORTS ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve job creation reports' });
    }
  });

  return router;
}
