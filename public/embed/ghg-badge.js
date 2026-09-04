/**
 * GHG App — Embeddable Audit Verification Badge
 * Drop-in: <script src="https://ghgapp-production.up.railway.app/embed/ghg-badge.js" async></script>
 * <div class="ghg-audit-badge" data-licensee-id="lic_abc123" data-theme="dark"></div>
 *
 * No dependencies. Vanilla JS + CSS. Google SaaS standard aesthetic.
 * Uses the official OpenSea logo SVG (inline bundled).
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

  // Official OpenSea logo SVG (inline, no external fetch needed)
  var OPENSEA_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="18" height="18"><path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm-1.2 16.3l-.6 1.9L31.1 66.5h-.2l-1.4-3.5c-1.7-4.3-.8-9.1 2.4-12.5L48.8 16.3zm2.4 0L68 50.5c3.2 3.4 4.1 8.2 2.4 12.5l-1.4 3.5h-.2L51.2 18.2l-.6-1.9zm-14 54.9l-5.9-15.1h30.6l-5.9 15.1a4.3 4.3 0 0 1-8.9 0H37.2z" fill="#2081E2"/></svg>';

  var STYLE = [
    '.ghg-audit-badge{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;box-shadow:0 2px 8px rgba(0,0,0,.06);max-width:400px;width:100%;box-sizing:border-box;text-decoration:none;}',
    '.ghg-audit-badge[data-theme="dark"]{background:#0f172a;border-color:#1e293b;color:#f1f5f9;box-shadow:0 2px 12px rgba(0,0,0,.3);}',
    '.ghg-audit-badge .ghg-badge-opensea{flex-shrink:0;display:flex;align-items:center;}',
    '.ghg-audit-badge .ghg-badge-divider{width:1px;height:32px;background:#e2e8f0;flex-shrink:0;}',
    '.ghg-audit-badge[data-theme="dark"] .ghg-badge-divider{background:#1e293b;}',
    '.ghg-audit-badge .ghg-badge-body{flex:1;min-width:0;}',
    '.ghg-audit-badge .ghg-badge-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:2px;}',
    '.ghg-audit-badge[data-theme="dark"] .ghg-badge-title{color:#94a3b8;}',
    '.ghg-audit-badge .ghg-badge-name{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.ghg-audit-badge .ghg-badge-status{font-size:11px;font-weight:700;color:#16a34a;margin-top:1px;}',
    '.ghg-audit-badge .ghg-badge-verify{flex-shrink:0;font-size:11px;font-weight:700;color:#2081e2;text-decoration:none;white-space:nowrap;}',
    '.ghg-audit-badge .ghg-badge-loading{font-size:12px;color:#94a3b8;font-style:italic;}',
  ].join('');

  function injectStyle() {
    if (document.getElementById('ghg-badge-style')) return;
    var el = document.createElement('style');
    el.id = 'ghg-badge-style';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function fetchCharityData(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE_URL + '/api/charities/active', true);
    xhr.timeout = 5000;
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

  function renderBadge(container, data) {
    var theme = container.getAttribute('data-theme') || 'light';
    var licenseeId = container.getAttribute('data-licensee-id') || '';
    var activeCount = (data && data.activeCount) || 0;
    var verifyUrl = BASE_URL + '/transparency';

    container.setAttribute('data-theme', theme);

    var charityNames = data && data.charities
      ? data.charities.map(function (c) { return c.name; }).join(', ')
      : 'ESG Verified';

    container.innerHTML = [
      '<span class="ghg-badge-opensea" title="Verified on OpenSea">',
        OPENSEA_LOGO_SVG,
      '</span>',
      '<span class="ghg-badge-divider"></span>',
      '<span class="ghg-badge-body">',
        '<div class="ghg-badge-title">ISO 14064 Audit-Ready</div>',
        '<div class="ghg-badge-name">GHG Verified Platform</div>',
        '<div class="ghg-badge-status">',
          activeCount + '/3 Statutory ESG Charities Active',
        '</div>',
      '</span>',
      '<a class="ghg-badge-verify" href="', verifyUrl, '" target="_blank" rel="noopener noreferrer" title="View public transparency ledger">',
        'Verify',
      '</a>',
    ].join('');
  }

  function renderError(container) {
    container.innerHTML = '<span class="ghg-badge-loading">GHG Audit Badge unavailable</span>';
  }

  function initBadge(container) {
    container.innerHTML = '<span class="ghg-badge-loading">Loading...</span>';
    fetchCharityData(function (err, data) {
      if (err) { renderError(container); return; }
      renderBadge(container, data);
    });
  }

  function init() {
    injectStyle();
    var badges = document.querySelectorAll('.ghg-audit-badge');
    for (var i = 0; i < badges.length; i++) {
      initBadge(badges[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
