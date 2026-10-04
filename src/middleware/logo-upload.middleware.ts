import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { areaDirectory } from '../services/file-storage.service';

/**
 * Accepts a single client logo image (PNG, JPG, SVG or WEBP, at most 5 MB) and stores it in
 * private storage under logos/<licensee> with a server-generated name. Paths supplied by clients
 * are never read, and logos are only read back by the badge compositor.
 */

export const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        cb(null, areaDirectory('logos', req.user?.licenseeId || 'platform'));
      } catch (err) {
        cb(err as Error, '');
      }
    },
    filename: (_req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    const allowedMimes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (allowedExts.includes(ext) && allowedMimes.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported logo format. Allowed: PNG, JPG, SVG, WEBP.'));
    }
  },
});
