import fs from 'fs';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { discardLogoOnFailure } from '../middleware/logo-upload.middleware';
import { MERCH_IMAGE_MAX_BYTES, merchImageUpload } from '../middleware/merch-image-upload.middleware';
import { scanUploadedFile } from '../middleware/virus-scan.middleware';
import {
  MerchCatalogueError,
  createProduct,
  listActiveProducts,
  parseProductCreate,
  parseProductUpdate,
  productImageFile,
  setProductImage,
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
   * GET /api/merch/products/:id/image
   * Public: a product photo uploaded by an administrator. The URL carries a version, so it caches.
   */
  router.get('/api/merch/products/:id/image', async (req: Request, res: Response) => {
    try {
      const image = await productImageFile(prisma, req.params.id);
      if (!image) return res.status(404).json({ error: 'No photo for this product.' });
      res.setHeader('Content-Type', image.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return fs.createReadStream(image.absolute).pipe(res);
    } catch (err) {
      console.error('[MERCH IMAGE GET ERROR]', err);
      return res.status(500).json({ error: 'The photo could not be loaded.' });
    }
  });

  /**
   * POST /api/admin/merch/products
   * Admin: add a shop item or Frenzy Studio garment, with a price or as contact for order (pricePence null).
   */
  router.post('/api/admin/merch/products', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const parsed = parseProductCreate((req.body || {}) as Record<string, unknown>);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    try {
      const product = await createProduct(prisma, parsed.value, req.user!.userId);
      return res.status(201).json({ product });
    } catch (err) {
      console.error('[ADMIN MERCH PRODUCT CREATE ERROR]', err);
      return res.status(500).json({ error: 'Failed to add the product.' });
    }
  });

  /**
   * PUT /api/admin/merch/products/:id/image
   * Admin: multipart { image }: PNG, JPG or WEBP up to 8 MB. Replaces the product's photo.
   */
  router.put(
    '/api/admin/merch/products/:id/image',
    authenticateToken,
    requireAdmin,
    (req: Request, res: Response, next: NextFunction) =>
      merchImageUpload.single('image')(req, res, (err: unknown) => {
        if (err) {
          const message =
            err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
              ? `Photos must be ${MERCH_IMAGE_MAX_BYTES / (1024 * 1024)} MB or smaller.`
              : (err as Error).message;
          return res.status(400).json({ error: message });
        }
        next();
      }),
    scanUploadedFile,
    discardLogoOnFailure,
    async (req: Request, res: Response) => {
      if (!req.file) return res.status(400).json({ error: 'Attach the photo in the "image" field.' });
      try {
        const product = await setProductImage(prisma, req.params.id, req.file.path, req.user!.userId);
        return res.status(200).json({ product });
      } catch (err) {
        if (err instanceof MerchCatalogueError) return res.status(err.status).json({ error: err.message });
        console.error('[ADMIN MERCH IMAGE ERROR]', err);
        return res.status(500).json({ error: 'The photo could not be saved.' });
      }
    }
  );

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
   * Admin: change a product's title, description, category, price (null for enquiry only), visibility or order.
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
