import fs from 'fs';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { discardLogoOnFailure, logoUpload } from '../middleware/logo-upload.middleware';
import { profileLogoFile, removeProfileLogo, setProfileLogo } from '../services/profile-logo.service';
import { scanUploadedFile } from '../middleware/virus-scan.middleware';

/** The signed-in client's profile logo. Pattern: evidence-file.route.ts (private, owner-only streaming). */
export function createProfileLogoRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.use('/api/portal/profile/logo', authenticateToken);

  const requireClient = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.licenseeId) return res.status(403).json({ error: 'A client account is required.' });
    next();
  };

  router.get('/api/portal/profile/logo', requireClient, async (req: Request, res: Response) => {
    try {
      const logo = await profileLogoFile(prisma, req.user!.licenseeId!);
      if (!logo) return res.status(404).json({ error: 'No logo uploaded.' });
      res.setHeader('Content-Type', logo.mimeType);
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // SVG logos must never run script when opened directly.
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      return fs.createReadStream(logo.absolute).pipe(res);
    } catch (err) {
      console.error('[PROFILE LOGO GET ERROR]', err);
      return res.status(500).json({ error: 'The logo could not be loaded.' });
    }
  });

  /** PUT multipart { logo }: PNG, JPG, SVG or WEBP up to 5 MB. Replaces any existing logo. */
  router.put(
    '/api/portal/profile/logo',
    requireClient,
    (req: Request, res: Response, next: NextFunction) =>
      logoUpload.single('logo')(req, res, (err: unknown) => {
        if (err) {
          const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 'Logos must be 5 MB or smaller.' : (err as Error).message;
          return res.status(400).json({ error: message });
        }
        next();
      }),
    scanUploadedFile,
    discardLogoOnFailure,
    async (req: Request, res: Response) => {
      if (!req.file) return res.status(400).json({ error: 'Attach the logo in the "logo" field.' });
      try {
        return res.status(200).json(await setProfileLogo(prisma, req.user!.licenseeId!, req.file.path));
      } catch (err) {
        console.error('[PROFILE LOGO SET ERROR]', err);
        return res.status(500).json({ error: 'The logo could not be saved.' });
      }
    }
  );

  router.delete('/api/portal/profile/logo', requireClient, async (req: Request, res: Response) => {
    try {
      await removeProfileLogo(prisma, req.user!.licenseeId!);
      return res.status(200).json({ logoUrl: null });
    } catch (err) {
      console.error('[PROFILE LOGO DELETE ERROR]', err);
      return res.status(500).json({ error: 'The logo could not be removed.' });
    }
  });

  return router;
}
