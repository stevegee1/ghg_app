/**
 * dual-logo-composite.service.ts
 * Server-side canvas compositor for the GHG Audit Warranty Badge.
 *
 * Produces a 1024×1024 PNG compositing:
 *  1. Client corporate logo (PNG/JPG/SVG, max 400×200 px region)
 *  2. Official NFTYLOGS (right panel)
 *  3. Client short message (max 120 chars)
 *  4. ISO 19011:2026 stamp
 *  5. 1-Year Warranty validity date
 *
 * Fallback: If node-canvas is unavailable (e.g. CI without libcairo),
 * returns a structured SVG string instead of a PNG buffer, so the rest
 * of the pipeline degrades gracefully without crashing.
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export interface CompositeInput {
  /** Absolute path to the client's uploaded logo file */
  clientLogoPath: string;
  /** Attestation message, up to 200 characters */
  clientMessage: string;
  /** Licensee name for labelling */
  licenseeName: string;
  /** Optional array of audited framework IDs or titles */
  selectedFrameworks?: string[];
}

export interface CompositeResult {
  /** Base64-encoded PNG (data:image/png;base64,…) or SVG fallback */
  dataUri: string;
  /** Output format: 'png' or 'svg' */
  format: 'png' | 'svg';
  /** SHA-256 integrity hash of the raw buffer/string */
  sha256Hash: string;
  /** ISO 8601 date-time string one year from now */
  warrantyExpiresAt: string;
  /** Verification seal (SHA-256 of combined inputs) */
  verificationSeal: string;
}

const GHG_LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'nfty-logs-logo.png');

function buildVerificationSeal(licenseeeName: string, message: string, ts: string): string {
  return crypto
    .createHash('sha256')
    .update(`${licenseeeName}::${message}::${ts}`)
    .digest('hex');
}

function warrantyExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Truncate message to 200 chars hard limit */
function truncate(msg: string): string {
  return msg.length > 200 ? msg.substring(0, 197) + '...' : msg;
}

/**
 * Attempt to use node-canvas for full PNG compositing.
 * Falls back to SVG if native binaries are absent.
 */
export async function compositeAuditBadge(input: CompositeInput): Promise<CompositeResult> {
  const { clientLogoPath, clientMessage, licenseeName, selectedFrameworks } = input;
  const safeMessage = truncate(clientMessage);
  const expiresAt = warrantyExpiry();
  const seal = buildVerificationSeal(licenseeName, safeMessage, expiresAt);
  const frameworkText = (selectedFrameworks && selectedFrameworks.length > 0)
    ? selectedFrameworks.join(' / ')
    : 'ISO 14064-1 / ISO 50001 / ISO 19011:2026';

  try {
    // Dynamic import: node-canvas is optional; if absent, falls to SVG path
    const { createCanvas, loadImage } = await import('canvas');

    const WIDTH = 1024;
    const HEIGHT = 512;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // ── Background ────────────────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, '#0c1929');
    grad.addColorStop(1, '#0a2540');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // ── Thin green top stripe ──────────────────────────────────────────────────
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, WIDTH, 4);

    // ── Dividing centre line ──────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 40);
    ctx.lineTo(WIDTH / 2, HEIGHT - 40);
    ctx.stroke();

    // ── Left panel: Client Logo ───────────────────────────────────────────────
    const leftCenterX = WIDTH / 4;
    try {
      const clientImg = await loadImage(clientLogoPath);
      const maxW = 320;
      const maxH = 180;
      const scale = Math.min(maxW / clientImg.width, maxH / clientImg.height, 1);
      const dw = clientImg.width * scale;
      const dh = clientImg.height * scale;
      const dx = leftCenterX - dw / 2;
      const dy = 80;
      ctx.drawImage(clientImg, dx, dy, dw, dh);
    } catch {
      // If logo load fails, draw a labelled placeholder
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(leftCenterX - 100, 90, 200, 100, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CLIENT LOGO', leftCenterX, 145);
    }

    // ── Right panel: GHG Mark ─────────────────────────────────────────────────
    const rightCenterX = (3 * WIDTH) / 4;
    try {
      const ghgImg = await loadImage(GHG_LOGO_PATH);
      const maxW = 280;
      const maxH = 180;
      const scale = Math.min(maxW / ghgImg.width, maxH / ghgImg.height, 1);
      const dw = ghgImg.width * scale;
      const dh = ghgImg.height * scale;
      const dx = rightCenterX - dw / 2;
      const dy = 80;
      ctx.drawImage(ghgImg, dx, dy, dw, dh);
    } catch {
      ctx.fillStyle = 'rgba(16,185,129,0.1)';
      ctx.beginPath();
      ctx.roundRect(rightCenterX - 100, 90, 200, 100, 12);
      ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NFTYLOGS', rightCenterX, 145);
    }

    // ── Client message ─────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'italic 18px sans-serif';
    ctx.textAlign = 'center';
    // Word-wrap at WIDTH - 80
    const words = safeMessage.split(' ');
    let line = '';
    const lines: string[] = [];
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > WIDTH - 120) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const msgY = 310;
    lines.forEach((l, i) => ctx.fillText(l, WIDTH / 2, msgY + i * 26));

    // Footer row
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${frameworkText}`, 40, HEIGHT - 40);
    ctx.textAlign = 'right';
    ctx.fillText(`Valid to: ${formatDate(expiresAt)}`, WIDTH - 40, HEIGHT - 40);

    // Seal line
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SHA-256: ${seal.substring(0, 40)}...`, WIDTH / 2, HEIGHT - 18);

    const buffer = canvas.toBuffer('image/png');
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;

    return { dataUri, format: 'png', sha256Hash, warrantyExpiresAt: expiresAt, verificationSeal: seal };
  } catch (canvasErr) {
    // SVG fallback (no libcairo)
    console.warn('[COMPOSITE] node-canvas unavailable, using SVG fallback:', (canvasErr as Error).message);

    // Encode logos as base64 data URIs inside SVG
    let clientLogoDataUri = '';
    let ghgLogoDataUri = '';
    try {
      const clientBuf = fs.readFileSync(clientLogoPath);
      const ext = path.extname(clientLogoPath).toLowerCase().replace('.', '');
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      clientLogoDataUri = `data:${mime};base64,${clientBuf.toString('base64')}`;
    } catch { /* skip if unreadable */ }

    try {
      const ghgBuf = fs.readFileSync(GHG_LOGO_PATH);
      ghgLogoDataUri = `data:image/png;base64,${ghgBuf.toString('base64')}`;
    } catch { /* skip if unreadable */ }

    const escapedMsg = safeMessage.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedName = licenseeName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedFramework = frameworkText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="512" viewBox="0 0 1024 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1929"/>
      <stop offset="100%" stop-color="#0a2540"/>
    </linearGradient>
    <clipPath id="leftClip"><rect x="20" y="60" width="462" height="380"/></clipPath>
    <clipPath id="rightClip"><rect x="542" y="60" width="462" height="380"/></clipPath>
  </defs>
  <!-- Background -->
  <rect width="1024" height="512" fill="url(#bg)"/>
  <!-- Top green stripe -->
  <rect width="1024" height="4" fill="#10b981"/>
  <!-- Centre divider -->
  <line x1="512" y1="40" x2="512" y2="472" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <!-- Left panel: Client Logo -->
  ${clientLogoDataUri ? `<image clip-path="url(#leftClip)" href="${clientLogoDataUri}" x="100" y="90" width="322" height="180" preserveAspectRatio="xMidYMid meet"/>` : `<rect x="152" y="90" width="200" height="100" rx="12" fill="rgba(255,255,255,0.06)"/><text x="252" y="145" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.4)" text-anchor="middle">CLIENT LOGO</text>`}
  <!-- Client name -->
  <text x="252" y="296" font-family="sans-serif" font-size="13" font-weight="700" fill="rgba(255,255,255,0.6)" text-anchor="middle">${escapedName}</text>
  <!-- Right panel: GHG Mark -->
  ${ghgLogoDataUri ? `<image clip-path="url(#rightClip)" href="${ghgLogoDataUri}" x="592" y="90" width="280" height="180" preserveAspectRatio="xMidYMid meet"/>` : `<rect x="660" y="90" width="200" height="100" rx="12" fill="rgba(16,185,129,0.1)"/><text x="760" y="145" font-family="sans-serif" font-size="14" font-weight="700" fill="#10b981" text-anchor="middle">NFTYLOGS</text>`}
  <!-- Client message -->
  <foreignObject x="60" y="300" width="904" height="100">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif;font-size:17px;font-style:italic;color:rgba(255,255,255,0.85);text-align:center;word-break:break-word;">${escapedMsg}</div>
  </foreignObject>
  <!-- Footer -->
  <text x="40" y="472" font-family="sans-serif" font-size="11" fill="rgba(255,255,255,0.35)">${escapedFramework}</text>
  <text x="984" y="472" font-family="sans-serif" font-size="11" fill="rgba(255,255,255,0.35)" text-anchor="end">Valid to: ${formatDate(expiresAt)}</text>
  <!-- Seal -->
  <text x="512" y="494" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.20)" text-anchor="middle">SHA-256: ${seal.substring(0, 40)}...</text>
</svg>`;

    const sha256Hash = crypto.createHash('sha256').update(svg).digest('hex');
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return { dataUri, format: 'svg', sha256Hash, warrantyExpiresAt: expiresAt, verificationSeal: seal };
  }
}
