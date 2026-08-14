import React, { useState } from 'react';

interface SoftwareEmbedBuilderProps {
  licenseeId: string;
  partnerName: string;
}

export const SoftwareEmbedBuilder: React.FC<SoftwareEmbedBuilderProps> = ({
  licenseeId,
  partnerName,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState(false);

  const apiKey = `ghg_live_${licenseeId.replace('lic_', '')}_99882233`;
  const embedCode = `<div id="ghg-logo-drop" data-api-key="${apiKey}" data-theme="${theme}"></div>\n<script src="https://cdn.ghglogodrop.com/embed.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div className="card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">🌐 Website & Software HTML Logo Embed Generator</h3>
            <p className="card-subtitle">Deploy dynamic verified GHG Logo Drop badges directly on your website or SaaS platform</p>
          </div>
          <span className="badge badge-settled">LIVE API KEY ACTIVE</span>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Your Unique B2B API Integration Key:</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace' }}>{apiKey}</div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label className="form-label" style={{ margin: 0 }}>Copyable HTML Embed Snippet</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span>Theme:</span>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: theme === 'dark' ? '#0f172a' : 'var(--bg-subtle)', color: theme === 'dark' ? '#fff' : 'var(--text-main)' }}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: theme === 'light' ? '#fff' : 'var(--bg-subtle)', color: '#0f172a' }}
            >
              Light
            </button>
          </div>
        </div>

        <div className="embed-code-box">
          <button type="button" onClick={copyToClipboard} className="btn-copy-code">
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
          <pre>{embedCode}</pre>
        </div>
      </div>

      {/* Live Widget Simulation Box */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '1rem' }}>
        <label className="form-label" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Live Website Render Simulation (How it appears on your website)
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{partnerName}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Verified GHG Logo Drop Partner • 1-Year Active Warranty
              </div>
            </div>
          </div>

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
            ✓ ON-CHAIN AUDITED
          </div>
        </div>
      </div>
    </div>
  );
};
