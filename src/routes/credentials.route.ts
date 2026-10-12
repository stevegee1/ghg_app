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
import { discardLogoOnFailure, logoUpload } from '../middleware/logo-upload.middleware';

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
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140" viewBox="0 0 480 140" role="img" aria-label="NFTYLOGS audit-readiness credential">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1929"/>
      <stop offset="100%" stop-color="#0a2540"/>
    </linearGradient>
  </defs>
  <rect width="480" height="140" rx="12" fill="url(#bg)"/>
  <rect width="480" height="4" rx="2" fill="#10b981"/>
  <text x="20" y="30" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#10b981" letter-spacing="1.5">NFTYLOGS AUDIT-READINESS CREDENTIAL</text>
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

  /**
   * GET /api/credentials/legacy-pending
   * Readiness submissions from the retired ISO pipeline that were approved and paid but never
   * received their credential. These are the only submissions /api/credentials/issue accepts.
   */
  router.get('/api/credentials/legacy-pending', authenticateToken, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user?.licenseeId) {
      return res.status(403).json({ error: 'Licensee account required.' });
    }
    try {
      const submissions = await runWithRls(prisma, user, (tx) =>
        tx.isoReadinessSubmission.findMany({
          where: {
            licenseeId: user.licenseeId!,
            paidAt: { not: null },
            status: { in: ['AUDIT_READY', 'APPROVED'] },
            OR: [{ credential: null }, { credential: { status: { not: CredentialStatus.ISSUED } } }],
          },
          select: { id: true, selectedFrameworks: true, paidAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      );
      return res.status(200).json({ submissions });
    } catch (err: unknown) {
      console.error('[CREDENTIALS LEGACY PENDING ERROR]', err);
      return res.status(500).json({ error: 'Failed to load pending credentials.' });
    }
  });

  /**
   * POST /api/credentials/issue
   * Issues the credential for a legacy readiness submission listed by /legacy-pending.
   * GHG and Workforce submissions on the workflow engine use /api/workflow/submissions/:id/badge-setup.
   */
  router.post(
    '/api/credentials/issue',
    authenticateToken,
    logoUpload.single('clientLogo'),
    discardLogoOnFailure,
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
        include: {
          licensee: { select: { name: true } },
          workflowSubmission: {
            select: {
              framework: { select: { code: true, name: true } },
              frameworkVersion: { select: { version: true, standardReference: true, effectiveFrom: true } },
            },
          },
        },
      });

      if (!credential) {
        return res.status(404).json({ error: 'Credential not found.' });
      }

      const assessed = credential.workflowSubmission;
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
        assessedAgainst: assessed
          ? {
              frameworkCode: assessed.framework.code,
              frameworkName: assessed.framework.name,
              version: assessed.frameworkVersion.version,
              standardReference: assessed.frameworkVersion.standardReference,
              versionEffectiveFrom: assessed.frameworkVersion.effectiveFrom.toISOString(),
            }
          : null,
        scopeStatement:
          'This credential records that the organisation completed a NFTYLOGS readiness review. It is not a third-party verification or certification under any ISO standard.',
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

  /**
   * GET /api/credentials/:id/badge.png: the dual-logo image issued with the credential (NFTYLOGS mark,
   * the client's logo and their message), for display on the client's own website. Only valid
   * credentials are served, so an expired or revoked badge stops showing.
   */
  router.get('/api/credentials/:id/badge.png', async (req: Request, res: Response) => {
    try {
      const credential = await prisma.auditWarrantyCredential.findUnique({
        where: { id: req.params.id },
        select: { status: true, warrantyExpiresAt: true, compositeBadgeUrl: true },
      });
      const match = credential?.compositeBadgeUrl?.match(/^data:(image\/png|image\/svg\+xml);base64,([A-Za-z0-9+/=]+)$/);
      if (!credential || !isCredentialValid(credential) || !match) {
        return res.status(404).send('Badge not available.');
      }
      res.setHeader('Content-Type', match[1]);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(Buffer.from(match[2], 'base64'));
    } catch (err: unknown) {
      console.error('[CREDENTIALS BADGE IMAGE ERROR]', err);
      return res.status(500).send('Failed to load badge.');
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
            compositeBadgeUrl: true,
          },
        });
      });

      // The image itself is served from badge.png; the list says whether one exists.
      return res.status(200).json({
        success: true,
        credentials: credentials.map(({ compositeBadgeUrl, ...c }) => ({ ...c, valid: isCredentialValid(c), hasBadgeImage: Boolean(compositeBadgeUrl) })),
      });
    } catch (err: unknown) {
      console.error('[CREDENTIALS LIST ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch credentials.' });
    }
  });

  return router;
}
