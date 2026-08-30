import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CmaValidatorService } from '../services/cma-validator.service';
import { LegalContractsService } from '../services/legal-contracts.service';
import { authenticateToken } from '../middleware/auth.middleware';

export function createIsoLegalRouter(prisma: PrismaClient): Router {
  const router = Router();
  const cmaValidator = new CmaValidatorService();
  const legalService = new LegalContractsService(prisma);

  /**
   * POST /api/iso/cma/validate
   * Scans text for greenwashing buzzwords and returns CMA Green Claims Code compliance analysis.
   */
  router.post('/api/iso/cma/validate', (req: Request, res: Response) => {
    try {
      const { text } = req.body || {};
      if (typeof text !== 'string') {
        return res.status(400).json({ error: 'Invalid input: text is required as a string.' });
      }

      const result = cmaValidator.validateText(text);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'CMA validation failed.' });
    }
  });

  /**
   * GET /api/iso/legal/addendum-b
   * Generates pre-filled Master Services Agreement Addendum B for a licensee.
   */
  router.get('/api/iso/legal/addendum-b', authenticateToken, async (req: Request, res: Response) => {
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
        return res.status(403).json({ error: 'Forbidden: Cannot generate legal addenda for other licensees.' });
      }

      const licensee = await prisma.licensee.findUnique({
        where: { id: queryLicenseeId },
      });

      if (!licensee) {
        return res.status(404).json({ error: `Licensee '${queryLicenseeId}' not found.` });
      }

      const signatoryName = (req.query.signatoryName as string) || user.userId || 'Authorized Officer';
      const addendum = legalService.generateAddendumB({
        licenseeId: licensee.id,
        clientLegalName: licensee.name,
        authorizedSignatoryName: signatoryName,
      });

      return res.status(200).json({ addendum });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to generate Addendum B.' });
    }
  });

  /**
   * GET /api/iso/consulting/onboarding-roadmap
   * Returns structured 30-60-90 Day Consultant Onboarding Roadmap.
   */
  router.get('/api/iso/consulting/onboarding-roadmap', authenticateToken, async (req: Request, res: Response) => {
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
        return res.status(403).json({ error: 'Forbidden: Cannot access roadmap of other licensees.' });
      }

      const roadmap = legalService.generateOnboardingRoadmap(queryLicenseeId);
      return res.status(200).json({ roadmap });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to generate onboarding roadmap.' });
    }
  });

  return router;
}
