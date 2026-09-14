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
import { runWithRls } from '../db/rls';

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
    const allowedExts = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    const allowedMimes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (allowedExts.includes(ext) && (allowedMimes.includes(mime) || mime.startsWith('image/'))) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported logo format or MIME: ${ext} (${file.mimetype}). Allowed: PNG, JPG, SVG, WEBP.`));
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
    : '-';
  const tokenId = credential.tokenId || 'pending';
  const opensea = credential.openSeaUrl || '';
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="140" viewBox="0 0 480 140" role="img" aria-label="GHG Emissions Registered Trade Mark: Audit Warranty Badge">
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
  <text x="20" y="118" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.35)">Polygon ERC-1155 Token #${safe(tokenId)} | UKIPO Statutory Trade Mark</text>
  <!-- OpenSea link -->
  ${opensea ? `<a href="${safe(opensea)}" target="_blank"><text x="20" y="134" font-family="system-ui,sans-serif" font-size="9" fill="#2081E2" text-decoration="underline">View on OpenSea</text></a>` : ''}
</svg>`;
}

// ── OpenSea ERC-1155 metadata schema ──────────────────────────────────────────
function buildOpenSeaMetadata(credential: any, licenseeName: string, baseUrl: string) {
  return {
    name: `GHG Audit Warranty: ${licenseeName}`,
    description:
      `ISO 14001 / ISO 50001 / ISO 19011:2026 Audit-Readiness Warranty issued by GHG Emissions Registered Trade Mark. ` +
      `Attestation: "${(credential.clientMessage || '').substring(0, 120)}". ` +
      `UKIPO Statutory Trade Mark. Valid to: ${credential.warrantyExpiresAt ? new Date(credential.warrantyExpiresAt).toISOString().split('T')[0] : 'TBD'}.`,
    image: credential.compositeBadgeUrl || `${baseUrl}/api/credentials/${credential.id}/badge.svg`,
    external_url: credential.openSeaUrl || `${baseUrl}/api/credentials/${credential.id}/metadata.json`,
    attributes: [
      { trait_type: 'Standard Framework', value: 'ISO 14001 / ISO 50001 / ISO 19011:2026' },
      { trait_type: 'Statutory Mark', value: 'UKIPO Registered Mark' },
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
      if (clientMessage.length > 200) {
        return res.status(400).json({ error: 'clientMessage must not exceed 200 characters.' });
      }

      let selectedFrameworks: string[] | undefined;
      // Gate 2 Enforcement: Verify this licensee has a settled, paid submission (or is ADMIN)
      if (user.role !== 'ADMIN') {
        const paidSubmission = await runWithRls(prisma, user, async (tx) => {
          return tx.isoReadinessSubmission.findFirst({
            where: {
              licenseeId: user.licenseeId,
              paidAt: { not: null },
              ...(submissionId ? { id: submissionId } : {}),
            },
          });
        });
        if (!paidSubmission) {
          return res.status(403).json({
            error: 'Gate 2 Blocked: A paid statutory license submission is required before compositing credentials.',
            code: 'PAYMENT_REQUIRED',
          });
        }
        selectedFrameworks = paidSubmission.selectedFrameworks;
      }

      // Look up licensee name
      const licensee = await prisma.licensee.findUnique({ where: { id: user.licenseeId } });
      const licenseeName = licensee?.name || user.licenseeId;

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
      if (clientMessage.length > 200) {
        return res.status(400).json({ error: 'clientMessage must not exceed 200 characters.' });
      }
      if (!submissionId) {
        return res.status(400).json({ error: 'submissionId is required.' });
      }

      // Verify paid and approved submission (Gates 2 and 3)
      const submission = await runWithRls(prisma, user, async (tx) => {
        return tx.isoReadinessSubmission.findUnique({ where: { id: submissionId } });
      });
      if (!submission || (submission.licenseeId !== user.licenseeId && user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Submission not found or access denied.' });
      }
      if (
        submission.status !== 'AUDIT_READY' &&
        submission.status !== 'APPROVED' &&
        user.role !== 'ADMIN'
      ) {
        return res.status(403).json({ error: 'Audit diagnostic must be formally approved before credential minting.' });
      }
      if (!submission.paidAt && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Licensing payment required before credential minting.' });
      }

      // Prevent duplicate credentials for the same submission
      const existingCredential = await runWithRls(prisma, user, async (tx) => {
        return tx.auditWarrantyCredential.findUnique({
          where: { submissionId },
        });
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
        // 1. Generate composite badge with framework chips
        const composite = await compositeAuditBadge({
          clientLogoPath: file.path,
          clientMessage: clientMessage.trim(),
          licenseeName,
          selectedFrameworks: submission.selectedFrameworks,
        });

        // 2. Create or update credential record (COMPOSITED status)
        let credential = await runWithRls(prisma, user, async (tx) => {
          return existingCredential
            ? tx.auditWarrantyCredential.update({
                where: { id: existingCredential.id },
                data: {
                  clientMessage: clientMessage.trim(),
                  clientLogoUrl: file.path,
                  compositeBadgeUrl: composite.dataUri.substring(0, 2000), // truncate for DB storage
                  selectedFrameworks: submission.selectedFrameworks,
                  verificationSeal: composite.verificationSeal,
                  warrantyExpiresAt: new Date(composite.warrantyExpiresAt),
                  status: CredentialStatus.COMPOSITED,
                },
              })
            : tx.auditWarrantyCredential.create({
                data: {
                  licenseeId: user.licenseeId,
                  submissionId,
                  clientMessage: clientMessage.trim(),
                  clientLogoUrl: file.path,
                  compositeBadgeUrl: composite.dataUri.substring(0, 2000),
                  selectedFrameworks: submission.selectedFrameworks,
                  verificationSeal: composite.verificationSeal,
                  warrantyExpiresAt: new Date(composite.warrantyExpiresAt),
                  status: CredentialStatus.COMPOSITED,
                },
              });
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
        credential = await runWithRls(prisma, user, async (tx) => {
          return tx.auditWarrantyCredential.update({
            where: { id: credential.id },
            data: {
              tokenId: mintResult.tokenId,
              contractAddress: mintResult.contractAddress,
              transactionHash: mintResult.transactionHash,
              openSeaUrl: mintResult.openSeaUrl,
              status: CredentialStatus.MINTED,
            },
          });
        });

        // 5. Build embeddable snippet
        const scriptUrl = `${baseUrl}/embed/ghg-badge.js`;
        const embedSnippet = `<!-- GHG Audit Warranty Badge: place anywhere on your website -->
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
          network: 'Polygon PoS',
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
      const credentials = await runWithRls(prisma, user, async (tx) => {
        return tx.auditWarrantyCredential.findMany({
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
      });

      return res.status(200).json({ success: true, credentials });
    } catch (err: any) {
      console.error('[CREDENTIALS LIST ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch credentials.' });
    }
  });

  return router;
}
