import { Router, Request, Response } from 'express';
import { PrismaClient, OrganisationSize, RevenueBand, IndustrySector } from '@prisma/client';
import { AssessmentService, IntakeAssessmentInput } from '../services/assessment.service';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

export function createAssessmentRouter(prisma: PrismaClient): Router {
  const router = Router();
  const assessmentService = new AssessmentService(prisma);

  /**
   * POST /api/assessment
   * Submits the 12-question intake assessment for the authenticated licensee.
   */
  router.post('/api/assessment', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.licenseeId) {
        return res.status(403).json({ error: 'Licensee context required' });
      }

      const {
        organisationCountry,
        organisationSize,
        annualRevenueBand,
        industrySector,
        hasPhysicalSites,
        hasProductionProcess,
        hasFleet,
        hasIoTMeters,
        isUKPublicContractor,
        hasPlanningConsent,
        makesPublicGreenClaims,
        hasGreenHydrogen,
      } = req.body || {};

      // Validate required enum & country fields
      if (!organisationCountry || typeof organisationCountry !== 'string') {
        return res.status(400).json({ error: 'Valid ISO country code is required' });
      }
      if (!Object.values(OrganisationSize).includes(organisationSize)) {
        return res.status(400).json({ error: 'Valid organisationSize is required' });
      }
      if (!Object.values(RevenueBand).includes(annualRevenueBand)) {
        return res.status(400).json({ error: 'Valid annualRevenueBand is required' });
      }
      if (!Object.values(IndustrySector).includes(industrySector)) {
        return res.status(400).json({ error: 'Valid industrySector is required' });
      }

      const input: IntakeAssessmentInput = {
        organisationCountry: organisationCountry.trim().toUpperCase().slice(0, 2),
        organisationSize,
        annualRevenueBand,
        industrySector,
        hasPhysicalSites: Boolean(hasPhysicalSites),
        hasProductionProcess: Boolean(hasProductionProcess),
        hasFleet: Boolean(hasFleet),
        hasIoTMeters: Boolean(hasIoTMeters),
        isUKPublicContractor: Boolean(isUKPublicContractor),
        hasPlanningConsent: Boolean(hasPlanningConsent),
        makesPublicGreenClaims: Boolean(makesPublicGreenClaims),
        hasGreenHydrogen: Boolean(hasGreenHydrogen),
      };

      const result = await assessmentService.submitAssessment(user.licenseeId, input, user.id || user.userId);

      return res.status(200).json({
        message: 'Assessment completed and compliance roadmap generated',
        assessment: result.assessment,
        recommendations: result.recommendations,
      });
    } catch (err: any) {
      console.error('[ASSESSMENT SUBMIT ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to submit intake assessment' });
    }
  });

  /**
   * GET /api/assessment
   * Retrieves the current intake assessment and recommendations.
   */
  router.get('/api/assessment', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.licenseeId) {
        return res.status(403).json({ error: 'Licensee context required' });
      }

      const assessment = await assessmentService.getAssessment(user.licenseeId);
      return res.status(200).json({ assessment });
    } catch (err: any) {
      console.error('[ASSESSMENT GET ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to load assessment' });
    }
  });

  /**
   * GET /api/assessment/recommendations
   * Retrieves the recommendations list with checklist progress.
   */
  router.get('/api/assessment/recommendations', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.licenseeId) {
        return res.status(403).json({ error: 'Licensee context required' });
      }

      const recommendations = await assessmentService.getRecommendations(user.licenseeId);
      return res.status(200).json({ recommendations });
    } catch (err: any) {
      console.error('[RECOMMENDATIONS GET ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to load recommendations' });
    }
  });

  /**
   * POST /api/assessment/recommendations/:id/decide
   * Accepts or defers a specific framework recommendation.
   */
  router.post('/api/assessment/recommendations/:id/decide', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.licenseeId) {
        return res.status(403).json({ error: 'Licensee context required' });
      }

      const recommendationId = req.params.id;
      const { clientAccepted, deferredReason } = req.body || {};

      if (typeof clientAccepted !== 'boolean') {
        return res.status(400).json({ error: 'clientAccepted (boolean) is required' });
      }

      const updated = await assessmentService.acceptOrDeferRecommendation(
        user.licenseeId,
        recommendationId,
        clientAccepted,
        deferredReason
      );

      return res.status(200).json({
        message: clientAccepted ? 'Recommendation accepted' : 'Recommendation deferred',
        recommendation: updated,
      });
    } catch (err: any) {
      console.error('[RECOMMENDATION DECIDE ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to update recommendation' });
    }
  });

  /**
   * GET /api/admin/readiness-tracker
   * Admin-only overview of all licensee intake assessments and data gathering readiness.
   */
  router.get('/api/admin/readiness-tracker', requireAdmin, async (req: Request, res: Response) => {
    try {
      const overview = await assessmentService.getAdminReadinessOverview();
      return res.status(200).json({ licensees: overview });
    } catch (err: any) {
      console.error('[ADMIN READINESS TRACKER ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch admin readiness overview' });
    }
  });

  return router;
}
