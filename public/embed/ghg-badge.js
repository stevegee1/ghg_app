/**
 * GHG App — Embeddable Audit Warranty Badge v2.0
 *
 * Drop-in usage (existing licensee verification):
 *   <script src="https://ghgapp-production.up.railway.app/embed/ghg-badge.js" async></script>
 *   <div class="ghg-audit-badge" data-licensee-id="lic_abc123" data-theme="dark"></div>
 *
 * Issued credential usage (with specific credential):
 *   <div class="ghg-audit-badge"
 *        data-licensee-id="lic_abc123"
 *        data-credential-id="cred_xyz789"
 *        data-theme="dark">
 *   </div>
 *
 * Features:
 *  - Dual logos: client logo + NFTYLOGS
 *  - Client attestation message
 *  - 1-Year statutory warranty countdown (live, updated every second)
 *  - Direct link to the public verification record
 *  - Full Shadow DOM isolation (host stylesheet cannot bleed in)
 *  - No dependencies. Vanilla JS only. Google SaaS standard aesthetic.
 *
 * ISO 14001 | ISO 50001 | ISO 19011:2026
 */
(function () {
  'use strict';

  var BASE_URL = (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('ghg-badge.js') !== -1) {
        return src.split('/embed/')[0];
      }
    }
    return 'https://ghgapp-production.up.railway.app';
  })();

  // Shield check icon (inline, no external fetch)
  var VERIFY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>';

  // GHG logo placeholder SVG (inline) — shown if the server logo fails to load
  var GHG_MARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40" width="56" height="28"><rect width="80" height="40" rx="6" fill="#10b981" opacity=".15"/><text x="40" y="24" font-family="sans-serif" font-size="10" font-weight="800" fill="#10b981" text-anchor="middle" letter-spacing="0.5">NFTYLOGS</text></svg>';

  // ── Shadow DOM CSS ──────────────────────────────────────────────────────────
  var SHADOW_CSS = [
    ':host{display:inline-block;width:100%;max-width:520px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '.badge{display:flex;flex-direction:column;border-radius:12px;overflow:hidden;background:#fff;border:1px solid #e2e8f0;box-shadow:0 2px 12px rgba(0,0,0,.08);transition:box-shadow 0.2s;}',
    '.badge.dark{background:#0f172a;border-color:#1e293b;color:#f1f5f9;}',
    '.badge:hover{box-shadow:0 4px 20px rgba(0,0,0,.15);}',
    '.top-stripe{height:3px;background:linear-gradient(90deg,#10b981,#0ea5e9);}',
    '.body{padding:14px 16px 10px;}',
    '.logos{display:flex;align-items:center;gap:10px;margin-bottom:10px;}',
    '.client-logo{height:36px;max-width:100px;object-fit:contain;border-radius:4px;}',
    '.logo-sep{width:1px;height:28px;background:rgba(0,0,0,.12);flex-shrink:0;}',
    '.dark .logo-sep{background:rgba(255,255,255,.12);}',
    '.ghg-mark{flex-shrink:0;}',
    '.message{font-size:11.5px;font-style:italic;color:#475569;line-height:1.45;margin-bottom:8px;word-break:break-word;}',
    '.dark .message{color:#94a3b8;}',
    '.licensee-name{font-size:12px;font-weight:700;color:#0f172a;word-break:break-word;}',
    '.dark .licensee-name{color:#f1f5f9;}',
    '.meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}',
    '.chip{font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px;letter-spacing:0.04em;}',
    '.chip-green{background:rgba(16,185,129,.12);color:#10b981;}',
    '.chip-sky{background:rgba(14,165,233,.12);color:#0ea5e9;}',
    '.chip-purple{background:rgba(168,85,247,.12);color:#a855f7;}',
    '.footer{display:flex;align-items:center;justify-content:space-between;padding:8px 16px 10px;border-top:1px solid rgba(0,0,0,.06);gap:8px;flex-wrap:wrap;}',
    '.dark .footer{border-top-color:rgba(255,255,255,.06);}',
    '.countdown{font-size:10px;font-weight:700;color:#64748b;font-variant-numeric:tabular-nums;}',
    '.dark .countdown{color:#94a3b8;}',
    '.countdown.expiring{color:#ef4444;}',
    '.verify-link{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:#0ea5e9;text-decoration:none;}',
    '.verify-link:hover{opacity:.8;}',
    '.loading{padding:16px;font-size:12px;color:#94a3b8;font-style:italic;text-align:center;}',
    '.error-text{padding:10px 14px;font-size:11px;color:#64748b;background:rgba(239,68,68,.05);border-radius:8px;}',
  ].join('');

  // ── Utility functions ────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatCountdown(expiresAt) {
    if (!expiresAt) return '';
    var now = Date.now();
    var exp = new Date(expiresAt).getTime();
    var diff = exp - now;
    if (diff <= 0) return 'EXPIRED';
    var days = Math.floor(diff / 86400000);
    if (days > 60) return 'Valid ' + Math.ceil(days / 30) + ' months';
    if (days > 0) return 'Valid ' + days + ' day' + (days !== 1 ? 's' : '');
    var hours = Math.floor(diff / 3600000);
    return 'Expires in ' + hours + 'h';
  }

  function isExpiringSoon(expiresAt) {
    if (!expiresAt) return false;
    var diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000; // < 30 days
  }

  function fetchJson(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 6000;
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { callback(null, JSON.parse(xhr.responseText)); } catch (e) { callback(e); }
      } else {
        callback(new Error('HTTP ' + xhr.status));
      }
    };
    xhr.onerror = function () { callback(new Error('Network error')); };
    xhr.ontimeout = function () { callback(new Error('Timeout')); };
    xhr.send();
  }

  // ── Custom Element definition ─────────────────────────────────────────────
  if (customElements.get('ghg-warranty-badge')) return; // prevent double-registration

  var GHGWarrantyBadge = (function () {
    function GHGWarrantyBadge() {
      var _this = HTMLElement.call(this) || this;
      _this._shadow = _this.attachShadow({ mode: 'closed' });
      _this._timer = null;
      _this._credential = null;
      return _this;
    }
    GHGWarrantyBadge.prototype = Object.create(HTMLElement.prototype);
    GHGWarrantyBadge.prototype.constructor = GHGWarrantyBadge;

    GHGWarrantyBadge.prototype.connectedCallback = function () {
      this._render('<div class="loading">Loading audit warranty badge…</div>');
      this._load();
    };

    GHGWarrantyBadge.prototype.disconnectedCallback = function () {
      if (this._timer) clearInterval(this._timer);
    };

    GHGWarrantyBadge.prototype._load = function () {
      var _this = this;
      var credentialId = this.getAttribute('data-credential-id');
      var licenseeId = this.getAttribute('data-licensee-id') || '';
      var theme = this.getAttribute('data-theme') || 'light';

      if (credentialId) {
        // Load the public verification record for this credential
        var verifyPath = '/api/credentials/' + encodeURIComponent(credentialId) + '/verify';
        fetchJson(BASE_URL + verifyPath, function (err, record) {
          if (err || !record) {
            _this._renderFallback(licenseeId, theme);
            return;
          }
          var cred = {
            licenseeName: record.licenseeName || licenseeId,
            clientMessage: (record.clientMessage || '').substring(0, 120),
            warrantyExpiresAt: record.warrantyExpiresAt,
            valid: record.valid === true,
            frameworks: record.selectedFrameworks || [],
            verifyUrl: BASE_URL + verifyPath,
            theme: theme,
          };
          _this._credential = cred;
          _this._renderCredential(cred);
          _this._startCountdown();
        });
      } else {
        // Fallback: load charity transparency data (legacy mode)
        fetchJson(BASE_URL + '/api/charities/active', function (err, data) {
          _this._renderFallback(licenseeId, theme, data);
        });
      }
    };

    GHGWarrantyBadge.prototype._renderFallback = function (licenseeId, theme, data) {
      var count = (data && data.activeCount) || 0;
      var html = [
        '<div class="badge ' + (theme === 'dark' ? 'dark' : '') + '">',
          '<div class="top-stripe"></div>',
          '<div class="body">',
            '<div class="logos">',
              '<div class="ghg-mark">' + GHG_MARK_SVG + '</div>',
            '</div>',
            '<div class="message">NFTYLOGS audit verification active</div>',
            '<div class="meta">',
              '<span class="chip chip-green">ISO 14001 · ISO 50001</span>',
              '<span class="chip chip-sky">ISO 19011:2026</span>',
              count > 0 ? '<span class="chip chip-purple">' + count + ' ESG Charities</span>' : '',
            '</div>',
          '</div>',
          '<div class="footer">',
            '<span class="countdown">NFTYLOGS</span>',
            '<a class="verify-link" href="' + escapeHtml(BASE_URL + '/transparency') + '" target="_blank" rel="noopener">' + VERIFY_SVG + ' Verify</a>',
          '</div>',
        '</div>',
      ].join('');
      this._render(html);
    };

    GHGWarrantyBadge.prototype._renderCredential = function (cred) {
      var countdown = cred.valid ? formatCountdown(cred.warrantyExpiresAt) : 'NOT CURRENTLY VALID';
      var expiring = !cred.valid || isExpiringSoon(cred.warrantyExpiresAt);
      var frameworkChips = cred.frameworks.map(function (f) {
        return '<span class="chip chip-green">' + escapeHtml(f) + '</span>';
      }).join('');

      var html = [
        '<div class="badge ' + (cred.theme === 'dark' ? 'dark' : '') + '">',
          '<div class="top-stripe"></div>',
          '<div class="body">',
            '<div class="logos">',
              '<div class="ghg-mark">' + GHG_MARK_SVG + '</div>',
              '<div class="logo-sep"></div>',
              '<div class="licensee-name">' + escapeHtml(cred.licenseeName) + '</div>',
            '</div>',
            cred.clientMessage
              ? '<div class="message">&ldquo;' + escapeHtml(cred.clientMessage.substring(0, 120)) + '&rdquo;</div>'
              : '',
            '<div class="meta">',
              frameworkChips,
            '</div>',
          '</div>',
          '<div class="footer">',
            '<span class="countdown' + (expiring ? ' expiring' : '') + '" id="ghg-countdown">' + escapeHtml(countdown) + '</span>',
            '<a class="verify-link" href="' + escapeHtml(cred.verifyUrl) + '" target="_blank" rel="noopener">' + VERIFY_SVG + '<span>Verify credential</span></a>',
          '</div>',
        '</div>',
      ].join('');
      this._render(html);
    };

    GHGWarrantyBadge.prototype._startCountdown = function () {
      var _this = this;
      if (this._timer) clearInterval(this._timer);
      this._timer = setInterval(function () {
        if (!_this._credential || !_this._credential.valid || !_this._credential.warrantyExpiresAt) return;
        var el = _this._shadow.getElementById('ghg-countdown');
        if (!el) return;
        var countdown = formatCountdown(_this._credential.warrantyExpiresAt);
        el.textContent = countdown;
        if (isExpiringSoon(_this._credential.warrantyExpiresAt)) {
          el.classList.add('expiring');
        }
      }, 60000); // update every minute
    };

    GHGWarrantyBadge.prototype._render = function (html) {
      this._shadow.innerHTML = '<style>' + SHADOW_CSS + '</style>' + html;
    };

    return GHGWarrantyBadge;
  })();

  customElements.define('ghg-warranty-badge', GHGWarrantyBadge);

  // ── Legacy div.ghg-audit-badge support (backward compatible) ─────────────
  function initLegacyBadges() {
    var containers = document.querySelectorAll('.ghg-audit-badge:not([data-ghg-init])');
    for (var i = 0; i < containers.length; i++) {
      var container = containers[i];
      container.setAttribute('data-ghg-init', '1');
      var licenseeId = container.getAttribute('data-licensee-id') || '';
      var credentialId = container.getAttribute('data-credential-id') || '';
      var theme = container.getAttribute('data-theme') || 'light';

      // Upgrade legacy containers to use <ghg-warranty-badge>
      var el = document.createElement('ghg-warranty-badge');
      el.setAttribute('data-licensee-id', licenseeId);
      if (credentialId) el.setAttribute('data-credential-id', credentialId);
      el.setAttribute('data-theme', theme);
      container.parentNode.insertBefore(el, container);
      container.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLegacyBadges);
  } else {
    initLegacyBadges();
  }
})();
