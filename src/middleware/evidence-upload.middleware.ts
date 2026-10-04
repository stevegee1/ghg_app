import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { EVIDENCE_MAX_BYTES, isAllowedEvidenceFile } from '../services/evidence-file.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: EVIDENCE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedEvidenceFile(file.originalname, file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported evidence file. Allowed: PDF, images, Word, Excel and CSV.'));
  },
});

/** Accepts one evidence file in the "file" field and requires it to be present. */
export function evidenceUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'Evidence files must be 25 MB or smaller.'
        : (err as Error).message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'Attach the evidence file in the "file" field.' });
    next();
  });
}
