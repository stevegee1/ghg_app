import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Accepts a single client logo image (PNG, JPG, SVG or WEBP, at most 5 MB) and stores it under
 * uploads/client-logos with a server-generated name. Paths supplied by clients are never read.
 */
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'client-logos');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const logoUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
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
