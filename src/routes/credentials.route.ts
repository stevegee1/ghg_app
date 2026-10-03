/**
 * credentials.route.ts
 * Audit-readiness credential lifecycle endpoints:
 *
 *  POST /api/credentials/compose        : Upload client logo and message, return dual-logo preview
 *  POST /api/credentials/issue          : Finalise credential, store composite and verification seal
 *  GET  /api/credentials/:id/verify     : Public verification record served from the platform database
 *  GET  /api/credentials/:id/badge.svg  : Vector badge asset (SVG)
 *  GET  /api/credentials/my             : List the authenticated licensee's credentials
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, CredentialStatus } from '@prisma/client';
import { compositeAuditBadge } from '../services/dual-logo-composite.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { logoUpload } from '../middleware/logo-upload.middleware';

interface BadgeSource {
  id: string;
  clientMessage: string;
  selectedFrameworks: string[];
  warrantyExpiresAt: Date | null;
  verificationSeal: string | null;
  status: CredentialStatus;
}

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function formatDate(d: Date | null): string {
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set';
}

function isCredentialValid(c: { status: CredentialStatus; warrantyExpiresAt: Date | null }): boolean {
  return c.status === CredentialStatus.ISSUED && !!c.warrantyExpiresAt && c.warrantyExpiresAt.getTime() > Date.now();
}

function buildBadgeSvg(credential: BadgeSource, licenseeName: string): string {
  const msg = credential.clientMessage.substring(0, 120);
  const frameworks = credential.selectedFrameworks.length > 0 ? credential.selectedFrameworks.join(' | ') : 'Framework not recorded';
  const seal = credential.verificationSeal ? credential.verificationSeal.slice(0, 16) : 'pending';
  const statusLabel = isCredentialValid(credential) ? 'Readiness credential valid to' : 'Credential not currently valid. Expiry';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140" viewBox="0 0 480 140" role="img" aria-label="GHGEmissionLogs audit-readiness credential">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1929"/>
      <stop offset="100%" stop-color="#0a2540"/>
    </linearGradient>
  </defs>
  <rect width="480" height="140" rx="12" fill="url(#bg)"/>
  <rect width="480" height="4" rx="2" fill="#10b981"/>
  <text x="20" y="30" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#10b981" letter-spacing="1.5">GHGEMISSIONLOGS AUDIT-READINESS CREDENTIAL</text>
  <text x="20" y="52" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="rgba(255,255,255,0.9)">${escapeXml(licenseeName)}</text>
  <text x="20" y="70" font-family="system-ui,sans-serif" font-size="11" font-style="italic" fill="rgba(255,255,255,0.6)">${escapeXml(msg)}</text>
  <line x1="20" y1="82" x2="460" y2="82" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="20" y="100" font-family="system-ui,sans-serif" font-size="10" fill="rgba(255,255,255,0.5)">${escapeXml(frameworks)}</text>
  <text x="20" y="116" font-family="system-ui,sans-serif" font-size="10" fill="rgba(255,255,255,0.5)">${statusLabel}: ${formatDate(credential.warrantyExpiresAt)}</text>
  <text x="20" y="132" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.35)">Seal ${escapeXml(seal)} | Verify: /api/credentials/${escapeXml(credential.id)}/verify</text>
</svg>`;
}

export function createCredentialsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.post(
    '/api/credentials/compose',
    authenticateToken,
    logoUpload.single('clientLogo'),
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user?.licenseeId) {
        return res.status(403).json({ error: 'Licensee account required.' });
      }
      const licenseeId = user.licenseeId;

      const { clientMessage, submissionId } = req.body as { clientMessage?: string; submissionId?: string };
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'clientLogo file is required.' });
      }
      if (!clientMessage || clientMessage.trim().length === 0) {
        return res.status(400).json({ error: 'clientMessage is required.' });
      }
      if (clientMessage.length > 200) {
        return res.status(400).json({ error: 'clientMessage must not exceed 200 characters.' });
      }

      let selectedFrameworks: string[] | undefined;
      if (user.role !== 'ADMIN') {
        const paidSubmission = await runWithRls(prisma, user, async (tx) => {
          return tx.isoReadinessSubmission.findFirst({
            where: {
              licenseeId,
              paidAt: { not: null },
              ...(submissionId ? { id: submissionId } : {}),
            },
          });
        });
        if (!paidSubmission) {
          return res.status(403).json({
            error: 'A paid readiness submission is required before generating a credential.',
            code: 'PAYMENT_REQUIRED',
          });
        }
        selectedFrameworks = paidSubmission.selectedFrameworks;
      }

      const licensee = await prisma.licensee.findUnique({ where: { id: licenseeId } });
      const licenseeName = licensee?.name || licenseeId;

      try {
        const result = await compositeAuditBadge({
          clientLogoPath: file.path,
          clientMessage: clientMessage.trim(),
          licenseeName,
          selectedFrameworks,
        });

        return res.status(200).json({
          success: true,
          previewDataUri: result.dataUri,
          format: result.format,
          warrantyExpiresAt: result.warrantyExpiresAt,
          verificationSeal: result.verificationSeal,
        });
      } catch (err: unknown) {
        console.error('[CREDENTIALS COMPOSE ERROR]', err);
        return res.status(500).json({ error: 'Failed to generate credential preview.' });
      }
    }
  );

  router.post(
    '/api/credentials/issue',
    authenticateToken,
    logoUpload.single('clientLogo'),
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user?.licenseeId) {
        return res.status(403).json({ error: 'Licensee account required.' });
      }
      const licenseeId = user.licenseeId;

      const { clientMessage, submissionId } = req.body as { clientMessage?: string; submissionId?: string };
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'clientLogo file is required.' });
      }
      if (!clientMessage || clientMessage.trim().length === 0) {
        return res.status(400).json({ error: 'clientMessage is required.' });
      }
      if (clientMessage.length > 200) {
        return res.status(400).json({ error: 'clientMessage must not exceed 200 characters.' });
      }
      if (!submissionId) {
        return res.status(400).json({ error: 'submissionId is required.' });
      }

      const submission = await runWithRls(prisma, user, async (tx) => {
        return tx.isoReadinessSubmission.findUnique({ where: { id: submissionId } });
      });
      if (!submission || (submission.licenseeId !== licenseeId && user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Submission not found or access denied.' });
      }
      if (submission.status !== 'AUDIT_READY' && submission.status !== 'APPROVED' && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'The readiness review must be approved before a credential is issued.' });
      }
      if (!submission.paidAt && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Payment is required before a credential is issued.' });
      }

      const existingCredential = await runWithRls(prisma, user, async (tx) => {
        return tx.auditWarrantyCredential.findUnique({ where: { submissionId } });
      });
      if (existingCredential && existingCredential.status === CredentialStatus.ISSUED) {
        return res.status(409).json({
          error: 'A credential has already been issued for this submission.',
          credentialId: existingCredential.id,
        });
      }

      const licensee = await prisma.licensee.findUnique({ where: { id: submission.licenseeId } });
      const licenseeName = licensee?.name || submission.licenseeId;

      try {
        const composite = await compositeAuditBadge({
          clientLogoPath: file.path,
          clientMessage: clientMessage.trim(),
          licenseeName,
          selectedFrameworks: submission.selectedFrameworks,
        });

        const data = {
          clientMessage: clientMessage.trim(),
          clientLogoUrl: file.path,
          compositeBadgeUrl: composite.dataUri,
          selectedFrameworks: submission.selectedFrameworks,
          verificationSeal: composite.verificationSeal,
          warrantyExpiresAt: new Date(composite.warrantyExpiresAt),
          status: CredentialStatus.ISSUED,
        };

        const credential = await runWithRls(prisma, user, async (tx) => {
          return existingCredential
            ? tx.auditWarrantyCredential.update({ where: { id: existingCredential.id }, data })
            : tx.auditWarrantyCredential.create({
                data: { ...data, licenseeId: submission.licenseeId, submissionId },
              });
        });

        return res.status(201).json({
          success: true,
          credentialId: credential.id,
          status: credential.status,
          warrantyExpiresAt: composite.warrantyExpiresAt,
          verificationSeal: composite.verificationSeal,
          verifyPath: `/api/credentials/${credential.id}/verify`,
          badgePath: `/api/credentials/${credential.id}/badge.svg`,
        });
      } catch (err: unknown) {
        console.error('[CREDENTIALS ISSUE ERROR]', err);
        return res.status(500).json({ error: 'Failed to issue credential.' });
      }
    }
  );

  router.get('/api/credentials/:id/verify', async (req: Request, res: Response) => {
    try {
      const credential = await prisma.auditWarrantyCredential.findUnique({
        where: { id: req.params.id },
        include: { licensee: { select: { name: true } } },
      });

      if (!credential) {
        return res.status(404).json({ error: 'Credential not found.' });
      }

      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json({
        credentialId: credential.id,
        licenseeName: credential.licensee?.name || credential.licenseeId,
        status: credential.status,
        valid: isCredentialValid(credential),
        selectedFrameworks: credential.selectedFrameworks,
        clientMessage: credential.clientMessage,
        issuedAt: credential.updatedAt.toISOString(),
        warrantyExpiresAt: credential.warrantyExpiresAt ? credential.warrantyExpiresAt.toISOString() : null,
        verificationSeal: credential.verificationSeal,
        scopeStatement:
          'This credential records that the organisation completed a GHGEmissionLogs readiness review. It is not a third-party verification or certification under any ISO standard.',
      });
    } catch (err: unknown) {
      console.error('[CREDENTIALS VERIFY ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch credential record.' });
    }
  });

  router.get('/api/credentials/:id/badge.svg', async (req: Request, res: Response) => {
    try {
      const credential = await prisma.auditWarrantyCredential.findUnique({
        where: { id: req.params.id },
        include: { licensee: { select: { name: true } } },
      });

      if (!credential) {
        return res.status(404).send('Credential not found.');
      }

      const licenseeName = credential.licensee?.name || credential.licenseeId;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(buildBadgeSvg(credential, licenseeName));
    } catch (err: unknown) {
      console.error('[CREDENTIALS BADGE SVG ERROR]', err);
      return res.status(500).send('Failed to generate badge.');
    }
  });

  router.get('/api/credentials/my', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?.licenseeId) {
      return res.status(403).json({ error: 'Licensee account required.' });
    }
    const licenseeId = user.licenseeId;

    try {
      const credentials = await runWithRls(prisma, user, async (tx) => {
        return tx.auditWarrantyCredential.findMany({
          where: { licenseeId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            selectedFrameworks: true,
            warrantyExpiresAt: true,
            verificationSeal: true,
            clientMessage: true,
            createdAt: true,
          },
        });
      });

      return res.status(200).json({ success: true, credentials });
    } catch (err: unknown) {
      console.error('[CREDENTIALS LIST ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch credentials.' });
    }
  });

  return router;
}
