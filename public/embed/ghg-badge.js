/**
 * GHG App — Embeddable Audit Warranty Badge v2.0
 *
 * Drop-in usage (existing licensee verification):
 *   <script src="https://ghgapp-production.up.railway.app/embed/ghg-badge.js" async></script>
 *   <div class="ghg-audit-badge" data-licensee-id="lic_abc123" data-theme="dark"></div>
 *
 * ERC-1155 Credential usage (with specific credential):
 *   <div class="ghg-audit-badge"
 *        data-licensee-id="lic_abc123"
 *        data-credential-id="cred_xyz789"
 *        data-theme="dark">
 *   </div>
 *
 * Features:
 *  - Dual logos: client logo + GHG Emissions Registered Trade Mark
 *  - Client attestation message
 *  - 1-Year statutory warranty countdown (live, updated every second)
 *  - Direct link to Polygon OpenSea token
 *  - Full Shadow DOM isolation (host stylesheet cannot bleed in)
 *  - No dependencies. Vanilla JS only. Google SaaS standard aesthetic.
 *
 * UKIPO Nice Classes 25 & 35 | ISO 14001 | ISO 50001 | ISO 19011:2026
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

  // Official OpenSea logo SVG (inline, no external fetch)
  var OPENSEA_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="16" height="16"><path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm-1.2 16.3l-.6 1.9L31.1 66.5h-.2l-1.4-3.5c-1.7-4.3-.8-9.1 2.4-12.5L48.8 16.3zm2.4 0L68 50.5c3.2 3.4 4.1 8.2 2.4 12.5l-1.4 3.5h-.2L51.2 18.2l-.6-1.9zm-14 54.9l-5.9-15.1h30.6l-5.9 15.1a4.3 4.3 0 0 1-8.9 0H37.2z" fill="#2081E2"/></svg>';

  // GHG logo placeholder SVG (inline) — shown if the server logo fails to load
  var GHG_MARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40" width="56" height="28"><rect width="80" height="40" rx="6" fill="#10b981" opacity=".15"/><text x="40" y="14" font-family="sans-serif" font-size="7" font-weight="800" fill="#10b981" text-anchor="middle" letter-spacing="0.5">GHG EMISSIONS</text><text x="40" y="24" font-family="sans-serif" font-size="6" font-weight="700" fill="#10b981" text-anchor="middle">REGISTERED TRADE MARK</text><text x="40" y="35" font-family="sans-serif" font-size="5.5" fill="#10b981" text-anchor="middle" opacity=".7">UKIPO Classes 25 &amp; 35</text></svg>';

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
    '.opensea-link{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:#2081e2;text-decoration:none;}',
    '.opensea-link:hover{opacity:.8;}',
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
        // Load specific credential metadata
        var url = BASE_URL + '/api/credentials/' + credentialId + '/metadata.json';
        fetchJson(url, function (err, meta) {
          if (err || !meta) {
            _this._renderFallback(licenseeId, theme);
            return;
          }
          var cred = {
            licenseeName: meta.name || licenseeId,
            clientMessage: (meta.description || '').substring(0, 120),
            warrantyExpiresAt: (meta.attributes || []).find(function (a) { return a.trait_type === 'Warranty Expiry'; })?.value,
            openSeaUrl: meta.external_url || '',
            compositeBadgeUrl: meta.image || '',
            verificationSeal: (meta.attributes || []).find(function (a) { return a.trait_type === 'Verification Seal'; })?.value || '',
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
            '<div class="message">GHG Emissions Registered Trade Mark — Audit Verification Active</div>',
            '<div class="meta">',
              '<span class="chip chip-green">ISO 14001 · ISO 50001</span>',
              '<span class="chip chip-sky">ISO 19011:2026</span>',
              count > 0 ? '<span class="chip chip-purple">' + count + ' ESG Charities</span>' : '',
            '</div>',
          '</div>',
          '<div class="footer">',
            '<span class="countdown">UKIPO Classes 25 &amp; 35</span>',
            '<a class="opensea-link" href="' + escapeHtml(BASE_URL + '/transparency') + '" target="_blank" rel="noopener">' + OPENSEA_SVG + ' Verify</a>',
          '</div>',
        '</div>',
      ].join('');
      this._render(html);
    };

    GHGWarrantyBadge.prototype._renderCredential = function (cred) {
      var countdown = formatCountdown(cred.warrantyExpiresAt);
      var expiring = isExpiringSoon(cred.warrantyExpiresAt);
      var clientLogoHtml = cred.compositeBadgeUrl && cred.compositeBadgeUrl.indexOf('data:') === 0
        ? '<img class="client-logo" src="' + escapeHtml(cred.compositeBadgeUrl.substring(0, 300)) + '" alt="Credential badge" />'
        : '';

      var html = [
        '<div class="badge ' + (cred.theme === 'dark' ? 'dark' : '') + '">',
          '<div class="top-stripe"></div>',
          '<div class="body">',
            '<div class="logos">',
              clientLogoHtml || '',
              clientLogoHtml ? '<div class="logo-sep"></div>' : '',
              '<div class="ghg-mark">' + GHG_MARK_SVG + '</div>',
            '</div>',
            cred.clientMessage
              ? '<div class="message">&ldquo;' + escapeHtml(cred.clientMessage.substring(0, 120)) + '&rdquo;</div>'
              : '',
            '<div class="meta">',
              '<span class="chip chip-green">ISO 14001 · ISO 50001</span>',
              '<span class="chip chip-sky">ISO 19011:2026</span>',
              '<span class="chip chip-purple">UKIPO Classes 25 &amp; 35</span>',
            '</div>',
          '</div>',
          '<div class="footer">',
            '<span class="countdown' + (expiring ? ' expiring' : '') + '" id="ghg-countdown">' + escapeHtml(countdown) + '</span>',
            cred.openSeaUrl
              ? '<a class="opensea-link" href="' + escapeHtml(cred.openSeaUrl) + '" target="_blank" rel="noopener">' + OPENSEA_SVG + '<span>View on OpenSea</span></a>'
              : '<span class="countdown">Polygon ERC-1155</span>',
          '</div>',
        '</div>',
      ].join('');
      this._render(html);
    };

    GHGWarrantyBadge.prototype._startCountdown = function () {
      var _this = this;
      if (this._timer) clearInterval(this._timer);
      this._timer = setInterval(function () {
        if (!_this._credential || !_this._credential.warrantyExpiresAt) return;
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
