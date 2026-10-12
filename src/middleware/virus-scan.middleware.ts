import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ScannerUnavailableError, scanBuffer, scanFile } from '../services/virus-scan.service';

/**
 * Scans the uploaded file (memory or disk) before the route handles it. Place straight after the
 * upload middleware. An infected file is deleted and refused; while the scanner is unavailable,
 * uploads are refused rather than stored unscanned. A no-op when scanning is off.
 */
export async function scanUploadedFile(req: Request, res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) return next();
  const discard = () => {
    if (file.path) fs.unlink(file.path, () => undefined);
  };
  try {
    const result = file.buffer ? await scanBuffer(file.buffer) : await scanFile(file.path);
    if (result.clean) return next();
    console.error('[VIRUS SCAN] Upload refused, malware detected:', result.signature);
    discard();
    return res.status(422).json({ error: 'This file was refused because it contains malware. Please check the file and try again.' });
  } catch (err) {
    discard();
    if (err instanceof ScannerUnavailableError) {
      console.error('[VIRUS SCAN] Scanner unavailable:', err.message);
      return res.status(503).json({ error: 'Uploads are paused while the virus scanner is unavailable. Please try again shortly.' });
    }
    return next(err);
  }
}
