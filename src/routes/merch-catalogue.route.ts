import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import {
  MerchCatalogueError,
  listActiveProducts,
  parseProductUpdate,
  toPublicProduct,
  updateProduct,
} from '../services/merch-catalogue.service';

export function createMerchCatalogueRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * GET /api/merch/products
   * Public: active catalogue items and custom garments with their current prices.
   */
  router.get('/api/merch/products', async (_req: Request, res: Response) => {
    try {
      const products = await listActiveProducts(prisma);
      return res.status(200).json({ products: products.map(toPublicProduct) });
    } catch (err) {
      console.error('[MERCH PRODUCTS ERROR]', err);
      return res.status(500).json({ error: 'Products are unavailable right now.' });
    }
  });

  /**
   * GET /api/admin/merch/products
   * Admin: every product, including inactive ones and supplier cost.
   */
  router.get('/api/admin/merch/products', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
    try {
      const products = await prisma.merchProduct.findMany({ orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }] });
      return res.status(200).json({ products });
    } catch (err) {
      console.error('[ADMIN MERCH PRODUCTS ERROR]', err);
      return res.status(500).json({ error: 'Failed to load products.' });
    }
  });

  /**
   * PATCH /api/admin/merch/products/:id
   * Admin: change a product's title, description, price (null for enquiry only), visibility or order.
   */
  router.patch('/api/admin/merch/products/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const parsed = parseProductUpdate((req.body || {}) as Record<string, unknown>);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    try {
      const product = await updateProduct(prisma, req.params.id, parsed.value, req.user!.userId);
      return res.status(200).json({ product });
    } catch (err) {
      if (err instanceof MerchCatalogueError) return res.status(err.status).json({ error: err.message });
      console.error('[ADMIN MERCH PRODUCT UPDATE ERROR]', err);
      return res.status(500).json({ error: 'Failed to update the product.' });
    }
  });

  return router;
}
