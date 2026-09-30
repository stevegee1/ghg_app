import { Router, Request, Response } from 'express';
import { PrismaClient, ChecklistItemStatus } from '@prisma/client';
import { PreparationChecklistService } from '../services/preparation-checklist.service';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

export function createPreparationChecklistRouter(prisma: PrismaClient): Router {
  const router = Router();
  const checklistService = new PreparationChecklistService(prisma);

  /**
   * GET /api/checklists
   * Returns all preparation checklists and tasks for the current licensee.
   */
  router.get('/api/checklists', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.licenseeId) {
        return res.status(403).json({ error: 'Licensee context required' });
      }

      const checklists = await checklistService.getChecklistsForLicensee(user.licenseeId);
      return res.status(200).json({ checklists });
    } catch (err: any) {
      console.error('[CHECKLISTS GET ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch checklists' });
    }
  });

  /**
   * GET /api/checklists/:id
   * Returns a specific checklist with all items.
   */
  router.get('/api/checklists/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.licenseeId) {
        return res.status(403).json({ error: 'Licensee context required' });
      }

      const checklistId = req.params.id;
      const checklist = await checklistService.getChecklistById(checklistId, user.role === 'ADMIN' ? undefined : user.licenseeId);

      if (!checklist) {
        return res.status(404).json({ error: 'Preparation checklist not found' });
      }

      return res.status(200).json({ checklist });
    } catch (err: any) {
      console.error('[CHECKLIST GET BY ID ERROR]', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch checklist' });
    }
  });

  /**
   * PATCH /api/checklists/items/:itemId
   * Client updates item status (IN_PROGRESS or COMPLETE) and optional linked evidence document.
   */
  router.patch('/api/checklists/items/:itemId', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.licenseeId) {
        return res.status(403).json({ error: 'Licensee context required' });
      }

      const itemId = req.params.itemId;
      const { status, linkedEvidenceDocId } = req.body || {};

      if (!status || !Object.values(ChecklistItemStatus).includes(status)) {
        return res.status(400).json({ error: 'Valid ChecklistItemStatus is required' });
      }

      if (status === ChecklistItemStatus.WAIVED) {
        return res.status(403).json({ error: 'Only administrative officers may grant checklist waivers' });
      }

      const updatedChecklist = await checklistService.updateItemStatus(itemId, user.licenseeId, {
        status,
        linkedEvidenceDocId,
      });

      return res.status(200).json({
        message: 'Checklist item updated successfully',
        checklist: updatedChecklist,
      });
    } catch (err: any) {
      console.error('[CHECKLIST ITEM UPDATE ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to update checklist item' });
    }
  });

  /**
   * POST /api/admin/checklists/items/:itemId/waive
   * Admin-only: Waives a checklist item with a stated reason.
   */
  router.post('/api/admin/checklists/items/:itemId/waive', requireAdmin, async (req: Request, res: Response) => {
    try {
      const itemId = req.params.itemId;
      const { reason } = req.body || {};

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ error: 'A justification reason is required to waive a preparation item' });
      }

      const updatedChecklist = await checklistService.waiveItem(itemId, reason.trim());

      return res.status(200).json({
        message: 'Checklist item waived with audit note',
        checklist: updatedChecklist,
      });
    } catch (err: any) {
      console.error('[ADMIN WAIVE ITEM ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to waive checklist item' });
    }
  });

  return router;
}
