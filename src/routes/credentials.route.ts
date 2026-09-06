/**
 * credentials.route.ts
 * ERC-1155 Audit Warranty Credential lifecycle endpoints:
 *
 *  POST /api/credentials/compose      — Upload client logo + message → dual-logo preview
 *  POST /api/credentials/mint         — Finalise credential → composite + Polygon mint
 *  GET  /api/credentials/:id/metadata.json  — Dynamic OpenSea ERC-1155 metadata
 *  GET  /api/credentials/:id/badge.svg     — Vector badge asset (SVG)
 *  GET  /api/credentials/my               — List authenticated user's credentials
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { PrismaClient, CredentialStatus } from '@prisma/client';
import { compositeAuditBadge } from '../services/dual-logo-composite.service';
import { mintAuditWarrantyToken } from '../services/nft-minting.service';
import { authenticateToken } from '../middleware/auth.middleware';

// ── Multer upload config ───────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'client-logos');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const stamp = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      cb(null, `${stamp}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`));
    }
  },
});

// ── Badge SVG generation (compact vector, no canvas required) ──────────────────
function buildBadgeSvg(credential: any, licenseeName: string): string {
  const msg = (credential.clientMessage || '').substring(0, 120);
  const expiresAt = credential.warrantyExpiresAt
    ? new Date(credential.warrantyExpiresAt).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';
  const tokenId = credential.tokenId || 'pending';
  const opensea = credential.openSeaUrl || '';
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140" viewBox="0 0 480 140" role="img" aria-label="GHG Emissions Registered Trade Mark — Audit Warranty Badge">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1929"/>
      <stop offset="100%" stop-color="#0a2540"/>
    </linearGradient>
  </defs>
  <rect width="480" height="140" rx="12" fill="url(#bg)"/>
  <rect width="480" height="4" rx="2" fill="#10b981"/>
  <!-- GHG MARK label -->
  <text x="20" y="30" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#10b981" letter-spacing="1.5">GHG EMISSIONS REGISTERED TRADE MARK</text>
  <!-- Client name -->
  <text x="20" y="52" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="rgba(255,255,255,0.9)">${safe(licenseeName)}</text>
  <!-- Message -->
  <text x="20" y="70" font-family="system-ui,sans-serif" font-size="11" font-style="italic" fill="rgba(255,255,255,0.6)" textLength="440" lengthAdjust="spacingAndGlyphs">${safe(msg)}</text>
  <!-- Divider -->
  <line x1="20" y1="82" x2="460" y2="82" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <!-- Warranty line -->
  <text x="20" y="100" font-family="system-ui,sans-serif" font-size="10" fill="rgba(255,255,255,0.5)">ISO 14001 · ISO 50001 · ISO 19011:2026 | Warranty Valid To: ${expiresAt}</text>
  <!-- Token ID -->
  <text x="20" y="118" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.35)">Polygon ERC-1155 Token #${safe(tokenId)} | UKIPO Classes 25 &amp; 35</text>
  <!-- OpenSea link -->
  ${opensea ? `<a href="${safe(opensea)}" target="_blank"><text x="20" y="134" font-family="system-ui,sans-serif" font-size="9" fill="#2081E2" text-decoration="underline">View on OpenSea</text></a>` : ''}
</svg>`;
}

// ── OpenSea ERC-1155 metadata schema ──────────────────────────────────────────
function buildOpenSeaMetadata(credential: any, licenseeName: string, baseUrl: string) {
  return {
    name: `GHG Audit Warranty — ${licenseeName}`,
    description:
      `ISO 14001 / ISO 50001 / ISO 19011:2026 Audit-Readiness Warranty issued by GHG Emissions Registered Trade Mark. ` +
      `Attestation: "${(credential.clientMessage || '').substring(0, 120)}". ` +
      `UKIPO Nice Classes 25 & 35. Valid to: ${credential.warrantyExpiresAt ? new Date(credential.warrantyExpiresAt).toISOString().split('T')[0] : 'TBD'}.`,
    image: credential.compositeBadgeUrl || `${baseUrl}/api/credentials/${credential.id}/badge.svg`,
    external_url: credential.openSeaUrl || `${baseUrl}/api/credentials/${credential.id}/metadata.json`,
    attributes: [
      { trait_type: 'Standard Framework', value: 'ISO 14001 / ISO 50001 / ISO 19011:2026' },
      { trait_type: 'UKIPO Classes', value: 'Nice Class 25 & 35' },
      { trait_type: 'Issuer', value: 'GHG Emissions Registered Trade Mark' },
      { trait_type: 'Licensee', value: licenseeName },
      { trait_type: 'Warranty Status', value: credential.status },
      {
        trait_type: 'Warranty Expiry',
        value: credential.warrantyExpiresAt ? new Date(credential.warrantyExpiresAt).toISOString().split('T')[0] : 'TBD',
        display_type: 'date',
      },
      { trait_type: 'Verification Seal', value: credential.verificationSeal || 'pending' },
      { trait_type: 'Network', value: 'Polygon PoS' },
    ],
  };
}

export function createCredentialsRouter(prisma: PrismaClient): Router {
  const router = Router();

  // ── POST /api/credentials/compose ────────────────────────────────────────────
  router.post(
    '/api/credentials/compose',
    authenticateToken,
    logoUpload.single('clientLogo'),
    async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.licenseeId) {
        return res.status(403).json({ error: 'Licensee account required.' });
      }

      const { clientMessage, submissionId } = req.body as { clientMessage?: string; submissionId?: string };
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'clientLogo file is required.' });
      }
      if (!clientMessage || clientMessage.trim().length === 0) {
        return res.status(400).json({ error: 'clientMessage is required.' });
      }
      if (clientMessage.length > 120) {
        return res.status(400).json({ error: 'clientMessage must not exceed 120 characters.' });
      }

      // Verify this licensee has a paid submission (or is ADMIN)
      if (submissionId && user.role !== 'ADMIN') {
        const submission = await prisma.isoReadinessSubmission.findUnique({
          where: { id: submissionId },
        });
        if (!submission || submission.licenseeId !== user.licenseeId || !submission.paidAt) {
          return res.status(403).json({ error: 'A paid ISO readiness submission is required to compose a credential.' });
        }
      }

      // Look up licensee name
      const licensee = await prisma.licensee.findUnique({ where: { id: user.licenseeId } });
      const licenseeName = licensee?.name || user.licenseeId;

      try {
        const result = await compositeAuditBadge({
          clientLogoPath: file.path,
          clientMessage: clientMessage.trim(),
          licenseeName,
        });

        return res.status(200).json({
          success: true,
          previewDataUri: result.dataUri,
          format: result.format,
          warrantyExpiresAt: result.warrantyExpiresAt,
          verificationSeal: result.verificationSeal,
          clientLogoPath: file.path,
          message: `Composite preview generated (${result.format.toUpperCase()}). Call /api/credentials/mint to finalise and record on Polygon.`,
        });
      } catch (err: any) {
        console.error('[CREDENTIALS COMPOSE ERROR]', err);
        return res.status(500).json({ error: 'Failed to generate composite badge preview.' });
      }
    }
  );

  // ── POST /api/credentials/mint ────────────────────────────────────────────────
  router.post(
    '/api/credentials/mint',
    authenticateToken,
    logoUpload.single('clientLogo'),
    async (req: Request, res: Response) => {
      const user = (req as any).user;
      if (!user?.licenseeId) {
        return res.status(403).json({ error: 'Licensee account required.' });
      }

      const { clientMessage, submissionId, recipientAddress } = req.body as {
        clientMessage?: string;
        submissionId?: string;
        recipientAddress?: string;
      };
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'clientLogo file is required.' });
      }
      if (!clientMessage || clientMessage.trim().length === 0) {
        return res.status(400).json({ error: 'clientMessage is required.' });
      }
      if (clientMessage.length > 120) {
        return res.status(400).json({ error: 'clientMessage must not exceed 120 characters.' });
      }
      if (!submissionId) {
        return res.status(400).json({ error: 'submissionId is required.' });
      }

      // Verify paid submission
      const submission = await prisma.isoReadinessSubmission.findUnique({ where: { id: submissionId } });
      if (!submission || (submission.licenseeId !== user.licenseeId && user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Submission not found or access denied.' });
      }
      if (!submission.paidAt && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Payment required before minting a credential.' });
      }

      // Prevent duplicate credentials for the same submission
      const existingCredential = await prisma.auditWarrantyCredential.findUnique({
        where: { submissionId },
      });
      if (existingCredential && existingCredential.status === CredentialStatus.MINTED) {
        return res.status(409).json({
          error: 'A credential has already been minted for this submission.',
          openSeaUrl: existingCredential.openSeaUrl,
          tokenId: existingCredential.tokenId,
        });
      }

      const licensee = await prisma.licensee.findUnique({ where: { id: user.licenseeId } });
      const licenseeName = licensee?.name || user.licenseeId;
      const baseUrl = process.env.APP_BASE_URL || 'https://ghgapp-production.up.railway.app';

      try {
        // 1. Generate composite badge
        const composite = await compositeAuditBadge({
          clientLogoPath: file.path,
          clientMessage: clientMessage.trim(),
          licenseeName,
        });

        // 2. Create or update credential record (COMPOSITED status)
        let credential = existingCredential
          ? await prisma.auditWarrantyCredential.update({
              where: { id: existingCredential.id },
              data: {
                clientMessage: clientMessage.trim(),
                clientLogoUrl: file.path,
                compositeBadgeUrl: composite.dataUri.substring(0, 2000), // truncate for DB storage
                verificationSeal: composite.verificationSeal,
                warrantyExpiresAt: new Date(composite.warrantyExpiresAt),
                status: CredentialStatus.COMPOSITED,
              },
            })
          : await prisma.auditWarrantyCredential.create({
              data: {
                licenseeId: user.licenseeId,
                submissionId,
                clientMessage: clientMessage.trim(),
                clientLogoUrl: file.path,
                compositeBadgeUrl: composite.dataUri.substring(0, 2000),
                verificationSeal: composite.verificationSeal,
                warrantyExpiresAt: new Date(composite.warrantyExpiresAt),
                status: CredentialStatus.COMPOSITED,
              },
            });

        // 3. Mint on Polygon
        const metadataUri = `${baseUrl}/api/credentials/${credential.id}/metadata.json`;
        const mintResult = await mintAuditWarrantyToken({
          credentialId: credential.id,
          licenseeId: user.licenseeId,
          metadataUri,
          recipientAddress,
        });

        // 4. Update credential with mint result
        credential = await prisma.auditWarrantyCredential.update({
          where: { id: credential.id },
          data: {
            tokenId: mintResult.tokenId,
            contractAddress: mintResult.contractAddress,
            transactionHash: mintResult.transactionHash,
            openSeaUrl: mintResult.openSeaUrl,
            status: CredentialStatus.MINTED,
          },
        });

        // 5. Build embeddable snippet
        const scriptUrl = `${baseUrl}/embed/ghg-badge.js`;
        const embedSnippet = `<!-- GHG Audit Warranty Badge — place anywhere on your website -->
<script src="${scriptUrl}" async></script>
<div class="ghg-audit-badge"
     data-licensee-id="${user.licenseeId}"
     data-credential-id="${credential.id}"
     data-theme="dark">
</div>`;

        return res.status(201).json({
          success: true,
          credentialId: credential.id,
          tokenId: mintResult.tokenId,
          contractAddress: mintResult.contractAddress,
          transactionHash: mintResult.transactionHash,
          openSeaUrl: mintResult.openSeaUrl,
          isOnChain: mintResult.isOnChain,
          metadataUrl: metadataUri,
          badgeUrl: `${baseUrl}/api/credentials/${credential.id}/badge.svg`,
          warrantyExpiresAt: composite.warrantyExpiresAt,
          verificationSeal: composite.verificationSeal,
          embedSnippet,
          preMintReceiptSeal: mintResult.preMintReceiptSeal,
        });
      } catch (err: any) {
        console.error('[CREDENTIALS MINT ERROR]', err);
        return res.status(500).json({ error: err.message || 'Failed to mint credential.' });
      }
    }
  );

  // ── GET /api/credentials/:id/metadata.json ─────────────────────────────────
  router.get('/api/credentials/:id/metadata.json', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const credential = await prisma.auditWarrantyCredential.findUnique({
        where: { id },
        include: { licensee: { select: { name: true } } },
      });

      if (!credential) {
        return res.status(404).json({ error: 'Credential not found.' });
      }

      const baseUrl = process.env.APP_BASE_URL || 'https://ghgapp-production.up.railway.app';
      const licenseeName = credential.licensee?.name || credential.licenseeId;
      const metadata = buildOpenSeaMetadata(credential, licenseeName, baseUrl);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json(metadata);
    } catch (err: any) {
      console.error('[CREDENTIALS METADATA ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch credential metadata.' });
    }
  });

  // ── GET /api/credentials/:id/badge.svg ────────────────────────────────────
  router.get('/api/credentials/:id/badge.svg', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const credential = await prisma.auditWarrantyCredential.findUnique({
        where: { id },
        include: { licensee: { select: { name: true } } },
      });

      if (!credential) {
        return res.status(404).send('Credential not found.');
      }

      const licenseeName = credential.licensee?.name || credential.licenseeId;
      const svg = buildBadgeSvg(credential, licenseeName);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(svg);
    } catch (err: any) {
      console.error('[CREDENTIALS BADGE SVG ERROR]', err);
      return res.status(500).send('Failed to generate badge.');
    }
  });

  // ── GET /api/credentials/my ───────────────────────────────────────────────
  router.get('/api/credentials/my', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.licenseeId) {
      return res.status(403).json({ error: 'Licensee account required.' });
    }

    try {
      const credentials = await prisma.auditWarrantyCredential.findMany({
        where: { licenseeId: user.licenseeId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          status: true,
          tokenId: true,
          contractAddress: true,
          transactionHash: true,
          openSeaUrl: true,
          warrantyExpiresAt: true,
          verificationSeal: true,
          clientMessage: true,
          createdAt: true,
        },
      });

      return res.status(200).json({ success: true, credentials });
    } catch (err: any) {
      console.error('[CREDENTIALS LIST ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch credentials.' });
    }
  });

  return router;
}
