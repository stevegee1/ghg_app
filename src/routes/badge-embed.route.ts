/**
 * badge-embed.route.ts
 * Serves embeddable dynamic HTML trust seal script and real-time status API.
 *
 * Endpoints:
 *  GET /embed/seal.js           - Zero-dependency client-side embed snippet
 *  GET /api/v1/badges/status   - Public CORS endpoint resolving real-time license health
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
    res.setHeader('Cache-Control', 'public, max-age=3600'); // CDN cache

    const script = `
(function() {
  var containers = document.querySelectorAll('[data-licensee], [data-licensee-id], #ghg-trust-seal');
  if (!containers || containers.length === 0) return;

  var baseUrl = (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf('/embed/seal.js') !== -1) {
        var a = document.createElement('a');
        a.href = scripts[i].src;
        return a.protocol + '//' + a.host;
      }
    }
    return window.location.origin;
  })();

  containers.forEach(function(el) {
    var licenseeId = el.getAttribute('data-licensee') || el.getAttribute('data-licensee-id');
    if (!licenseeId) return;
    var theme = el.getAttribute('data-theme') || 'light';

    var statusUrl = baseUrl + '/api/v1/badges/status?licenseeId=' + encodeURIComponent(licenseeId);

    fetch(statusUrl)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.success) return;

        var isCompliant = data.status === 'ACTIVE_COMPLIANT';
        var isWarning = data.status === 'CALIBRATION_WARNING';
        var statusColor = isCompliant ? '#10b981' : (isWarning ? '#f59e0b' : '#ef4444');
        var statusText = isCompliant ? 'VERIFIED AUDIT-READY' : (isWarning ? 'CALIBRATION NOTICE' : 'STATUS SUSPENDED');
        var bg = theme === 'dark' ? '#0f172a' : '#ffffff';
        var textMain = theme === 'dark' ? '#ffffff' : '#0f172a';
        var textMuted = theme === 'dark' ? '#94a3b8' : '#64748b';
        var border = theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0';

        var badge = document.createElement('div');
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:13px;background:' + bg + ';color:' + textMain + ';border:1px solid ' + border + ';box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;text-decoration:none;';
        
        var ghgLogoUrl = baseUrl + '/images/nfty-logs-logo.png';
        var nameText = data.licenseeName || licenseeId;
        var clientInitials = nameText.substring(0, 2).toUpperCase();
        var clientLogoHtml = data.logoUrl
          ? '<img src="' + data.logoUrl + '" alt="' + nameText + '" style="width:20px;height:20px;object-fit:contain;border-radius:3px;" />'
          : '<div style="width:20px;height:20px;border-radius:3px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:9px;">' + clientInitials + '</div>';

        badge.innerHTML = 
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:6px;background:' + (theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9') + ';">' +
              '<img src="' + ghgLogoUrl + '" alt="GHG" style="width:20px;height:20px;object-fit:contain;" />' +
              '<span style="font-size:10px;font-weight:700;color:' + textMuted + ';">\u00d7</span>' +
              clientLogoHtml +
            '</div>' +
            '<div>' +
              '<div style="font-weight:700;line-height:1.2;">' + nameText + '</div>' +
              '<div style="font-size:11px;color:' + textMuted + ';">' + (data.frameworkText || 'ISO 14064-1 & ISO 19011:2026 Assured') + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:9999px;font-size:10px;font-weight:700;color:' + statusColor + ';background:' + statusColor + '15;border:1px solid ' + statusColor + '40;">' +
            '<span style="width:6px;height:6px;border-radius:50%;background:' + statusColor + ';"></span>' +
            statusText +
          '</div>';

        badge.addEventListener('click', function() {
          window.open(data.verificationUrl || (baseUrl + '/transparency?licenseeId=' + encodeURIComponent(licenseeId)), '_blank', 'noopener,noreferrer');
        });

        el.innerHTML = '';
        el.appendChild(badge);
      })
      .catch(function(err) {
        console.warn('[GHG SEAL] Failed to load verification badge:', err);
      });
  });
})();
    `;

    return res.send(script);
  });

  /**
   * GET /api/v1/badges/status
   * Public CORS endpoint resolving real-time license health for web seal.
   */
  router.get('/api/v1/badges/status', async (req: Request, res: Response) => {
    // Set permissive CORS headers for public badge resolution
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const licenseeId = req.query.licenseeId as string;
    if (!licenseeId || typeof licenseeId !== 'string') {
      return res.status(400).json({ error: 'licenseeId query parameter is required.' });
    }

    try {
      const evaluation = await warrantyService.evaluateLicenseHealth(licenseeId.trim());
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;

      // Check for most recent credential to get framework text & allowed origins
      const credential = await prisma.auditWarrantyCredential.findFirst({
        where: { licenseeId: licenseeId.trim(), status: 'ISSUED' },
        orderBy: { createdAt: 'desc' },
      });

      // Origin domain verification check
      const origin = req.get('Origin');
      if (origin && credential?.allowedOrigins && credential.allowedOrigins.length > 0) {
        const isWildcard = credential.allowedOrigins.includes('*');
        const isAllowed = isWildcard || credential.allowedOrigins.some((allowed) => {
          try {
            const allowedHost = new URL(allowed.startsWith('http') ? allowed : `https://${allowed}`).host;
            const reqHost = new URL(origin).host;
            return reqHost === allowedHost || reqHost.endsWith(`.${allowedHost}`);
          } catch {
            return origin.includes(allowed);
          }
        });

        if (!isAllowed) {
          return res.status(403).json({
            error: `Origin domain not authorized for licensee trust seal: ${origin}`,
            code: 'ORIGIN_UNAUTHORIZED',
          });
        }
      }

      const frameworkText = credential?.selectedFrameworks && credential.selectedFrameworks.length > 0
        ? credential.selectedFrameworks.join(' / ')
        : 'ISO 14064-1 & UK SECR';

      return res.status(200).json({
        success: true,
        licenseeId: evaluation.licenseeId,
        licenseeName: evaluation.licenseeName,
        status: evaluation.status,
        badgeStatus: evaluation.status,
        statutoryEpochExpiresAt: evaluation.statutoryExpiresAt,
        frameworkText,
        validThrough: evaluation.statutoryExpiresAt,
        daysRemaining: evaluation.daysRemainingInEpoch,
        statusHeadline: evaluation.statusHeadline,
        logoUrl: credential?.clientLogoUrl || null,
        verificationUrl: `${baseUrl}/transparency?licenseeId=${encodeURIComponent(evaluation.licenseeId)}`,
      });
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'Licensee not found or unverified.' });
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
