import { Router, Request, Response } from 'express';
import { PrismaClient, OrganisationSize, RevenueBand, IndustrySector, FleetAssetCategory } from '@prisma/client';
import {
  AssessmentService,
  AssessmentFlowError,
  FLEET_ASSET_COUNT_BANDS,
  FLEET_CLOUD_CONNECTION,
  IntakeAssessmentInput,
} from '../services/assessment.service';
import { CLIENT_SERVICES, ClientService, isClientService } from '../services/service-routing.service';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

type Parsed<T> = { value: T } | { error: string };

/** Yes or no questions each service asks. Unasked questions are recorded as no. */
const SERVICE_QUESTIONS: Record<ClientService, (keyof IntakeAssessmentInput)[]> = {
  GHG: ['hasPhysicalSites', 'hasProductionProcess', 'hasFleet', 'hasIoTMeters', 'isUKPublicContractor', 'makesPublicGreenClaims', 'hasGreenHydrogen'],
  WORKFORCE: ['isUKPublicContractor', 'hasPlanningConsent'],
  FLEET: [],
};

function parseOrganisation(body: Record<string, unknown>): Parsed<Pick<IntakeAssessmentInput, 'organisationCountry' | 'organisationSize' | 'annualRevenueBand' | 'industrySector'>> {
  if (typeof body.organisationCountry !== 'string' || !/^[A-Za-z]{2}$/.test(body.organisationCountry.trim())) {
    return { error: 'organisationCountry must be a 2-letter ISO country code.' };
  }
  if (!Object.values(OrganisationSize).includes(body.organisationSize as OrganisationSize)) {
    return { error: 'Valid organisationSize is required' };
  }
  if (!Object.values(RevenueBand).includes(body.annualRevenueBand as RevenueBand)) {
    return { error: 'Valid annualRevenueBand is required' };
  }
  if (!Object.values(IndustrySector).includes(body.industrySector as IndustrySector)) {
    return { error: 'Valid industrySector is required' };
  }
  return {
    value: {
      organisationCountry: body.organisationCountry.trim().toUpperCase(),
      organisationSize: body.organisationSize as OrganisationSize,
      annualRevenueBand: body.annualRevenueBand as RevenueBand,
      industrySector: body.industrySector as IndustrySector,
    },
  };
}

function parseServiceAnswers(
  service: ClientService,
  body: Record<string, unknown>
): Parsed<Partial<Omit<IntakeAssessmentInput, 'services' | 'organisationCountry' | 'organisationSize' | 'annualRevenueBand' | 'industrySector'>>> {
  const value: Record<string, unknown> = {};
  for (const question of SERVICE_QUESTIONS[service]) {
    if (typeof body[question] !== 'boolean') {
      return { error: `${question} must be answered yes or no.` };
    }
    value[question] = body[question];
  }

  if (service === 'FLEET') {
    const profile = body.fleetProfile as Record<string, unknown> | undefined;
    if (!profile || typeof profile !== 'object') {
      return { error: 'fleetProfile is required for Fleet.' };
    }
    if (!(FLEET_ASSET_COUNT_BANDS as readonly unknown[]).includes(profile.assetCountBand)) {
      return { error: `fleetProfile.assetCountBand must be one of: ${FLEET_ASSET_COUNT_BANDS.join(', ')}.` };
    }
    if (!(FLEET_CLOUD_CONNECTION as readonly unknown[]).includes(profile.cloudConnection)) {
      return { error: `fleetProfile.cloudConnection must be one of: ${FLEET_CLOUD_CONNECTION.join(', ')}.` };
    }
    const categories = profile.categories;
    if (
      !Array.isArray(categories) ||
      categories.length === 0 ||
      !categories.every((c) => (Object.values(FleetAssetCategory) as unknown[]).includes(c))
    ) {
      return { error: 'fleetProfile.categories must list at least one equipment category.' };
    }
    value.hasFleet = true;
    value.fleetProfile = {
      assetCountBand: profile.assetCountBand,
      categories: [...new Set(categories as FleetAssetCategory[])],
      cloudConnection: profile.cloudConnection,
    };
  }

  return { value };
}

export function createAssessmentRouter(prisma: PrismaClient): Router {
  const router = Router();
  const assessmentService = new AssessmentService(prisma);

  /**
   * POST /api/assessment
   * Completes onboarding: the organisation questions, the chosen services and each service's
   * questions. Each service gets its own pipeline; the client lands on the first.
   */
  router.post('/api/assessment', requireAuth, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?.licenseeId) {
      return res.status(403).json({ error: 'Licensee context required' });
    }
    const body = (req.body || {}) as Record<string, unknown>;

    const org = parseOrganisation(body);
    if ('error' in org) return res.status(400).json({ error: org.error });
    // One or more services; each still runs in its own pipeline. A single `service` is accepted too.
    const requested = Array.isArray(body.services) ? body.services : body.service !== undefined ? [body.service] : [];
    if (requested.length === 0 || !requested.every(isClientService)) {
      return res.status(400).json({ error: 'services must list one or more of GHG, WORKFORCE or FLEET.' });
    }
    const services = CLIENT_SERVICES.filter((s) => (requested as ClientService[]).includes(s));
    let serviceAnswers: Partial<IntakeAssessmentInput> = {};
    for (const service of services) {
      const answers = parseServiceAnswers(service, body);
      if ('error' in answers) return res.status(400).json({ error: answers.error });
      serviceAnswers = { ...serviceAnswers, ...answers.value };
    }

    try {
      const result = await assessmentService.submitAssessment(
        user.licenseeId,
        { ...org.value, ...serviceAnswers, services },
        user.userId
      );
      return res.status(200).json({
        message: 'Onboarding completed',
        assessment: result.assessment,
        recommendations: result.recommendations,
        destination: result.destination,
      });
    } catch (err: unknown) {
      console.error('[ASSESSMENT SUBMIT ERROR]', err);
      return res.status(500).json({ error: 'Failed to complete onboarding.' });
    }
  });

  /**
   * POST /api/assessment/services
   * Adds another service for an onboarded client, with that service's questions.
   */
  router.post('/api/assessment/services', requireAuth, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?.licenseeId) {
      return res.status(403).json({ error: 'Licensee context required' });
    }
    const body = (req.body || {}) as Record<string, unknown>;
    if (!isClientService(body.service)) {
      return res.status(400).json({ error: 'service must be one of GHG, WORKFORCE or FLEET.' });
    }
    const answers = parseServiceAnswers(body.service, body);
    if ('error' in answers) return res.status(400).json({ error: answers.error });

    try {
      const result = await assessmentService.addService(user.licenseeId, body.service, answers.value, user.userId);
      return res.status(200).json({ message: 'Service added', destination: result.destination });
    } catch (err: unknown) {
      if (err instanceof AssessmentFlowError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[ADD SERVICE ERROR]', err);
      return res.status(500).json({ error: 'Failed to add the service.' });
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
