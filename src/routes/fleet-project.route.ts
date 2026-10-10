import { Router, Request, Response, NextFunction } from 'express';
import { EntitlementStatus, PrismaClient, ServiceLine } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { DEFAULT_CHECKOUT_CURRENCY } from '../services/checkout.service';
import { FleetValidationError } from '../services/fleet/fleet-asset.service';
import {
  assignAsset,
  createProject,
  endAssignment,
  listProjects,
  removeAssignment,
  updateProject,
} from '../services/fleet/fleet-project.service';
import {
  calculateProjectCost,
  listCostRuns,
  listMaterialIndices,
  listProjectMaterials,
  removeProjectMaterial,
  setProjectMaterial,
} from '../services/fleet/fleet-project-cost.service';

/** Client projects (contracts) and which machines work on them. Requires an active Fleet subscription. */
export function createFleetProjectRouter(prisma: PrismaClient): Router {
  const router = Router();

  const requireFleetClient = async (req: Request, res: Response, next: NextFunction) => {
    const licenseeId = req.user?.licenseeId;
    if (!licenseeId) return res.status(403).json({ error: 'A client account is required for Fleet.' });
    const entitlement = await prisma.serviceEntitlement.findUnique({
      where: { licenseeId_serviceLine: { licenseeId, serviceLine: ServiceLine.FLEET } },
    });
    if (entitlement?.status !== EntitlementStatus.ACTIVE) {
      return res.status(402).json({ error: 'An active Fleet subscription is required.', code: 'FLEET_SUBSCRIPTION_REQUIRED' });
    }
    next();
  };
  router.use('/api/fleet/projects', authenticateToken, requireFleetClient);

  const run = (label: string, fn: (req: Request) => Promise<unknown>, status = 200) => async (req: Request, res: Response) => {
    try {
      return res.status(status).json(await fn(req));
    } catch (err) {
      if (err instanceof FleetValidationError) return res.status(err.status).json({ error: err.message });
      console.error(`[${label}]`, err);
      return res.status(500).json({ error: 'The request could not be completed.' });
    }
  };
  const lic = (req: Request) => req.user!.licenseeId!;

  router.get('/api/fleet/projects', run('FLEET PROJECTS LIST', async (req) => ({
    projects: await runWithRls(prisma, req.user!, (tx) => listProjects(tx, lic(req))),
    defaultCurrency: DEFAULT_CHECKOUT_CURRENCY,
  })));

  router.post('/api/fleet/projects', run('FLEET PROJECT CREATE', async (req) => ({
    project: await runWithRls(prisma, req.user!, (tx) => createProject(tx, lic(req), req.body || {})),
  }), 201));

  router.patch('/api/fleet/projects/:id', run('FLEET PROJECT UPDATE', async (req) => ({
    project: await runWithRls(prisma, req.user!, (tx) => updateProject(tx, lic(req), req.params.id, req.body || {})),
  })));

  router.post('/api/fleet/projects/:id/assets', run('FLEET PROJECT ASSIGN', async (req) => ({
    project: await runWithRls(prisma, req.user!, (tx) => assignAsset(tx, lic(req), req.params.id, req.body || {})),
  }), 201));

  router.patch('/api/fleet/projects/:id/assets/:assignmentId', run('FLEET PROJECT ASSIGNMENT END', async (req) => ({
    project: await runWithRls(prisma, req.user!, (tx) => endAssignment(tx, lic(req), req.params.id, req.params.assignmentId, req.body || {})),
  })));

  router.delete('/api/fleet/projects/:id/assets/:assignmentId', run('FLEET PROJECT ASSIGNMENT REMOVE', async (req) => ({
    project: await runWithRls(prisma, req.user!, (tx) => removeAssignment(tx, lic(req), req.params.id, req.params.assignmentId)),
  })));

  router.get('/api/fleet/projects/material-prices', run('FLEET MATERIAL PRICES', async (req) => ({
    indices: await runWithRls(prisma, req.user!, (tx) => listMaterialIndices(tx)),
  })));

  router.get('/api/fleet/projects/:id/materials', run('FLEET PROJECT MATERIALS', async (req) => ({
    materials: await runWithRls(prisma, req.user!, (tx) => listProjectMaterials(tx, lic(req), req.params.id)),
  })));

  router.put('/api/fleet/projects/:id/materials', run('FLEET PROJECT MATERIAL SET', async (req) => ({
    materials: await runWithRls(prisma, req.user!, (tx) => setProjectMaterial(tx, lic(req), req.params.id, req.body || {})),
  })));

  router.delete('/api/fleet/projects/:id/materials/:materialId', run('FLEET PROJECT MATERIAL REMOVE', async (req) => ({
    materials: await runWithRls(prisma, req.user!, (tx) => removeProjectMaterial(tx, lic(req), req.params.id, req.params.materialId)),
  })));

  router.get('/api/fleet/projects/:id/costs', run('FLEET PROJECT COST RUNS', async (req) => ({
    runs: await runWithRls(prisma, req.user!, (tx) => listCostRuns(tx, lic(req), req.params.id)),
  })));

  router.post('/api/fleet/projects/:id/costs', run('FLEET PROJECT COST CALCULATE', async (req) => ({
    run: await runWithRls(prisma, req.user!, (tx) => calculateProjectCost(tx, lic(req), req.params.id, req.body || {}, req.user!.userId)),
  }), 201));

  return router;
}
