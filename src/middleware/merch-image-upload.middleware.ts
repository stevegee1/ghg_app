import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { areaDirectory } from '../services/file-storage.service';

/**
 * Accepts one merch product photo (PNG, JPG or WEBP, at most 8 MB) into storage under
 * merch/products with a server-generated name. SVG is refused because these photos are served
 * publicly on the shop. Pair with discardLogoOnFailure so refused uploads leave no file behind.
 */
export const MERCH_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export const merchImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        cb(null, areaDirectory('merch', 'products'));
      } catch (err) {
        cb(err as Error, '');
      }
    },
    filename: (_req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MERCH_IMAGE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowedExts.includes(path.extname(file.originalname).toLowerCase()) && allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported photo format. Allowed: PNG, JPG, WEBP.'));
    }
  },
});
