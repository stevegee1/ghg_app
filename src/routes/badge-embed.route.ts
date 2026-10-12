/**
 * badge-embed.route.ts
 * Serves embeddable dynamic HTML trust seal script and real-time status API.
 *
 * Endpoints:
 *  GET /embed/seal.js           - Optional script embed; the portal also offers a script-free snippet
 *  GET /api/v1/badges/status   - Public CORS endpoint: VERIFIED only with a valid credential
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LicenseWarrantyService } from '../services/license-warranty.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';

export function createBadgeEmbedRouter(prisma: PrismaClient): Router {
  const router = Router();
  const warrantyService = new LicenseWarrantyService(prisma);

  /**
   * GET /embed/seal.js
   * Lightweight CDN script that clients paste on their corporate website.
   */
  router.get('/embed/seal.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    // Built with DOM methods and textContent only: nothing from the API is parsed as HTML on the
    // client's website. A company without a valid credential gets no badge at all.
    const script = `
(function () {
  var containers = document.querySelectorAll('[data-licensee-id], [data-licensee]');
  if (!containers.length) return;
  var base = (function () {
    var current = document.currentScript || document.querySelector('script[src*="/embed/seal.js"]');
    try { return new URL(current.src).origin; } catch (e) { return ''; }
  })();
  if (!base) return;
  function text(tag, value, css) { var n = document.createElement(tag); n.textContent = value; if (css) n.style.cssText = css; return n; }
  Array.prototype.forEach.call(containers, function (el) {
    var id = el.getAttribute('data-licensee-id') || el.getAttribute('data-licensee');
    if (!id) return;
    fetch(base + '/api/v1/badges/status?licenseeId=' + encodeURIComponent(id))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || data.status !== 'VERIFIED' || !data.credentialId) return;
        var link = document.createElement('a');
        link.href = base + '/verify/credential/' + encodeURIComponent(data.credentialId);
        link.target = '_blank';
        link.rel = 'noopener';
        link.style.cssText = 'display:inline-flex;flex-direction:column;gap:4px;max-width:320px;text-decoration:none;color:inherit;font:13px/1.4 system-ui,sans-serif';
        if (data.badgeImageUrl) {
          var img = document.createElement('img');
          img.src = base + data.badgeImageUrl;
          img.alt = 'Verified by NFTYLOGS';
          img.style.cssText = 'max-width:100%;height:auto;border-radius:8px';
          link.appendChild(img);
        }
        link.appendChild(text('span', data.message, 'font-weight:600'));
        link.appendChild(text('span', 'Verify this credential', 'color:#1a73e8;font-size:12px'));
        el.textContent = '';
        el.appendChild(link);
      })
      .catch(function () {});
  });
})();
`;
    return res.send(script);
  });

  /**
   * GET /api/v1/badges/status?licenseeId=...
   * Public. VERIFIED only while the company holds a valid credential (issued, unexpired, and its
   * calibration and telemetry checks pass); otherwise NOT_VERIFIED, and the embed shows nothing.
   */
  router.get('/api/v1/badges/status', async (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const licenseeId = typeof req.query.licenseeId === 'string' ? req.query.licenseeId.trim() : '';
    if (!licenseeId) {
      return res.status(400).json({ error: 'licenseeId query parameter is required.' });
    }

    try {
      const licensee = await prisma.licensee.findUnique({ where: { id: licenseeId }, select: { id: true, name: true } });
      if (!licensee) return res.status(404).json({ error: 'Not found.' });

      const credential = await prisma.auditWarrantyCredential.findFirst({
        where: { licenseeId, status: 'ISSUED', warrantyExpiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      const origin = req.get('Origin');
      if (origin && credential?.allowedOrigins && credential.allowedOrigins.length > 0) {
        const isWildcard = credential.allowedOrigins.includes('*');
        const isAllowed = isWildcard || credential.allowedOrigins.some((allowed) => {
          try {
            const allowedHost = new URL(allowed.startsWith('http') ? allowed : `https://${allowed}`).host;
            const reqHost = new URL(origin).host;
            return reqHost === allowedHost || reqHost.endsWith(`.${allowedHost}`);
          } catch {
            return false;
          }
        });
        if (!isAllowed) {
          return res.status(403).json({ error: `Origin domain not authorized for licensee trust seal: ${origin}`, code: 'ORIGIN_UNAUTHORIZED' });
        }
      }

      const health = credential ? await warrantyService.evaluateLicenseHealth(licenseeId) : null;
      const verified = Boolean(credential && health && (health.status === 'ACTIVE_COMPLIANT' || health.status === 'CALIBRATION_WARNING'));
      res.setHeader('Cache-Control', 'public, max-age=300');

      if (!verified || !credential) {
        return res.status(200).json({ success: true, licenseeId, licenseeName: licensee.name, status: 'NOT_VERIFIED' });
      }

      const frameworks = credential.selectedFrameworks.join(' / ');
      return res.status(200).json({
        success: true,
        licenseeId,
        licenseeName: licensee.name,
        status: 'VERIFIED',
        credentialId: credential.id,
        frameworks: credential.selectedFrameworks,
        validThrough: credential.warrantyExpiresAt?.toISOString() ?? null,
        message: frameworks ? `${licensee.name}: ${frameworks} readiness reviewed by NFTYLOGS` : `${licensee.name}: readiness reviewed by NFTYLOGS`,
        badgeImageUrl: credential.compositeBadgeUrl ? `/api/credentials/${encodeURIComponent(credential.id)}/badge.png` : null,
        verificationPath: `/verify/credential/${encodeURIComponent(credential.id)}`,
      });
    } catch (err: unknown) {
      console.error('[BADGE STATUS ERROR]', err);
      return res.status(500).json({ error: 'Badge status is unavailable.' });
    }
  });

  /**
   * POST /api/v1/badges/origins
   * Updates allowed origin domains for dynamic embed seal verification.
   */
  router.post('/api/v1/badges/origins', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.licenseeId) {
      return res.status(403).json({ error: 'Licensee account required.' });
    }
    const { allowedOrigins } = req.body as { allowedOrigins: string[] };
    if (!Array.isArray(allowedOrigins)) {
      return res.status(400).json({ error: 'allowedOrigins array required.' });
    }

    try {
      const updated = await runWithRls(prisma, user, async (tx) => {
        return warrantyService.updateAllowedOrigins(user.licenseeId, allowedOrigins, tx);
      });
      return res.status(200).json({ success: true, allowedOrigins: updated.allowedOrigins });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update allowed origins.' });
    }
  });

  return router;
}
