import React, { useState } from 'react';

interface SoftwareEmbedBuilderProps {
  licenseeId: string;
  partnerName?: string;
  allowedOrigins?: string[];
  onSaveOrigins?: (origins: string[]) => void;
}

export const SoftwareEmbedBuilder: React.FC<SoftwareEmbedBuilderProps> = ({
  licenseeId,
  partnerName = 'Enterprise Partner',
  allowedOrigins = [],
  onSaveOrigins,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState(false);
  const [originsInput, setOriginsInput] = useState<string>(
    allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'example.com, portal.example.com'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ghgapp-production.up.railway.app';
  const embedCode = `<!-- GHG Trust Seal Embed Start -->\n<div id="ghg-trust-seal" data-licensee-id="${licenseeId}" data-theme="${theme}"></div>\n<script src="${originUrl}/embed/seal.js" async></script>\n<!-- GHG Trust Seal Embed End -->`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveOrigins = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = originsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (onSaveOrigins) {
      onSaveOrigins(parsed);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div className="card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 className="card-title">Live Website and Software HTML Seal Embed</h3>
            <p className="card-subtitle">
              Embed a dynamic ISO 19011:2026 and carbon compliance verification badge directly on your web properties.
            </p>
          </div>
          <span className="badge badge-settled">SEAL CDN READY</span>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
          Licensee Identifier (Client Id):
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>
          {licenseeId}
        </div>
      </div>

      <form onSubmit={handleSaveOrigins} style={{ marginBottom: '1.25rem' }}>
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          Whitelisted Hostnames (Origin Protection)
        </label>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Enter the allowed domains where this trust badge may be rendered (comma separated). Requests from unlisted domains will be flagged as untrusted.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            value={originsInput}
            onChange={(e) => setOriginsInput(e.target.value)}
            placeholder="e.g. yourcompany.com, app.yourcompany.com"
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button type="submit" className="btn btn-secondary">
            {savedSuccess ? 'Saved' : 'Update Whitelist'}
          </button>
        </div>
      </form>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <label className="form-label" style={{ margin: 0 }}>
            Copyable HTML Embed Script
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span>Theme:</span>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className="btn btn-secondary"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: theme === 'dark' ? '#0f172a' : 'var(--bg-subtle)',
                color: theme === 'dark' ? '#fff' : 'var(--text-main)',
              }}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="btn btn-secondary"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: theme === 'light' ? '#fff' : 'var(--bg-subtle)',
                color: '#0f172a',
              }}
            >
              Light
            </button>
          </div>
        </div>

        <div className="embed-code-box" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={copyToClipboard}
            className="btn-copy-code"
            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
          >
            {copied ? 'Copied' : 'Copy Snippet'}
          </button>
          <pre style={{ margin: 0, padding: '1rem', overflowX: 'auto', fontSize: '0.8125rem' }}>
            {embedCode}
          </pre>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '1rem' }}>
        <label className="form-label" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Live Website Render Simulation (Widget Preview)
        </label>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#0f172a',
            border: '1px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#ffffff',
                fontSize: '0.875rem',
              }}
            >
              ISO
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{partnerName}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                ISO 14064-1 & SECR Assured | ISO 19011:2026 Annex A Audited
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid #10b981',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              AUDIT-READY VERIFIED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
