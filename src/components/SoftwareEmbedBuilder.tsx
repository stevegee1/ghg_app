import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

interface SoftwareEmbedBuilderProps {
  licenseeId: string;
  partnerName?: string;
  allowedOrigins?: string[];
  token?: string;
  onSaveOrigins?: (origins: string[]) => Promise<void> | void;
}

export const SoftwareEmbedBuilder: React.FC<SoftwareEmbedBuilderProps> = ({
  licenseeId,
  partnerName = 'Enterprise Partner',
  allowedOrigins = [],
  token,
  onSaveOrigins,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [originsInput, setOriginsInput] = useState<string>(
    allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '*'
  );
  const [activeOrigins, setActiveOrigins] = useState<string[]>(
    allowedOrigins.length > 0 ? allowedOrigins : ['*']
  );
  const [isSavingOrigins, setIsSavingOrigins] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Live status data fetched from the real API
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    if (!licenseeId) return;
    let isMounted = true;
    setIsLoadingStatus(true);
    api.getBadgeStatus(licenseeId)
      .then((data) => {
        if (isMounted && data && data.success) {
          setLiveStatus(data);
        }
      })
      .catch((err) => {
        console.warn('[EmbedBuilder] Unable to fetch real-time seal status:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingStatus(false);
      });
    return () => { isMounted = false; };
  }, [licenseeId]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ghgapp-production.up.railway.app';
  const embedCode = `<!-- GHG Trust Seal Embed Start -->
<div id="ghg-trust-seal" data-licensee-id="${licenseeId}" data-theme="${theme}"></div>
<script src="${originUrl}/embed/seal.js" async></script>
<!-- GHG Trust Seal Embed End -->`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const copyLicenseeId = () => {
    navigator.clipboard.writeText(licenseeId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2200);
  };

  const handleSaveOrigins = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSavingOrigins(true);

    const parsed = originsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const targetOrigins = parsed.length > 0 ? parsed : ['*'];

    try {
      if (onSaveOrigins) {
        await onSaveOrigins(targetOrigins);
      } else if (token) {
        await api.updateAllowedOrigins(token, targetOrigins);
      }
      setActiveOrigins(targetOrigins);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to persist origin whitelist');
    } finally {
      setIsSavingOrigins(false);
    }
  };

  const displayName = liveStatus?.licenseeName || partnerName || licenseeId;
  const displayFramework = liveStatus?.frameworkText || 'ISO 14064-1 & UK SECR Assured';
  const isCompliant = liveStatus?.status === 'ACTIVE_COMPLIANT' || !liveStatus?.status;
  const isWarning = liveStatus?.status === 'CALIBRATION_WARNING';
  const statusColor = isCompliant ? '#10b981' : (isWarning ? '#f59e0b' : '#ef4444');
  const statusLabel = isCompliant ? 'VERIFIED AUDIT-READY' : (isWarning ? 'CALIBRATION NOTICE' : 'STATUS SUSPENDED');

  return (
    <div className="persefoni-card embed-builder-card" style={{ padding: '2rem', marginTop: '1.5rem' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Statutory Web Integration
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Live Website &amp; Application Trust Seal Embed
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, maxWidth: '680px' }}>
            Deploy zero-dependency JavaScript snippets pointing to <code style={{ color: 'var(--color-sky)' }}>/embed/seal.js</code> to display verified ISO 19011:2026 audit assurance on your corporate sites.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-settled" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>
            CDN EDGE READY
          </span>
        </div>
      </div>

      {/* Account Details & Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
            Licensee Client ID
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-main)', wordBreak: 'break-all' }}>
              {licenseeId}
            </span>
            <button
              type="button"
              onClick={copyLicenseeId}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', flexShrink: 0 }}
              title="Copy Client ID"
            >
              {copiedId ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
            Live Audit Health Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }}></span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: statusColor }}>
              {statusLabel}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({isLoadingStatus ? 'Resolving...' : displayFramework})
            </span>
          </div>
        </div>
      </div>

      {/* Whitelisted Hostnames Form */}
      <div style={{ marginBottom: '1.75rem', padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
            Whitelisted Hostnames (Anti-Spoofing Origin Protection)
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            CORS Origin Filtering Active
          </span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.85rem 0', lineHeight: 1.5 }}>
          Specify the hostnames authorized to render this trust badge (comma-separated). Requests originating from unlisted domains are blocked with HTTP 403. Use <code style={{ color: 'var(--color-sky)' }}>*</code> to permit all domains during staging.
        </p>

        <form onSubmit={handleSaveOrigins} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            value={originsInput}
            onChange={(e) => setOriginsInput(e.target.value)}
            placeholder="e.g. yourcompany.com, ir.yourcompany.com"
            style={{ flex: 1, minWidth: '240px', fontSize: '0.85rem' }}
          />
          <button
            type="submit"
            disabled={isSavingOrigins}
            className="btn btn-secondary"
            style={{ minWidth: '130px', fontSize: '0.85rem' }}
          >
            {isSavingOrigins ? 'Saving...' : (savedSuccess ? 'Saved' : 'Update Whitelist')}
          </button>
        </form>

        {saveError && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--google-red, #ef4444)' }}>
            {saveError}
          </div>
        )}

        {activeOrigins.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Authorized domains:</span>
            {activeOrigins.map((orig, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-medium, #cbd5e1)',
                  color: 'var(--text-main)',
                }}
              >
                {orig === '*' ? '* (All Domains Allowed)' : orig}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Copyable HTML Embed Snippet Box */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Client HTML Integration Script
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Paste this block into your corporate website header or footer markup.
            </div>
          </div>

          {/* Theme Segmented Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Theme:</span>
            <div
              style={{
                display: 'inline-flex',
                padding: '3px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
              }}
            >
              <button
                type="button"
                onClick={() => setTheme('dark')}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: theme === 'dark' ? '#0f172a' : 'transparent',
                  color: theme === 'dark' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: theme === 'light' ? '#ffffff' : 'transparent',
                  color: theme === 'light' ? '#0f172a' : 'var(--text-muted)',
                  boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Light
              </button>
            </div>
          </div>
        </div>

        {/* Formatted Code Block */}
        <div
          style={{
            position: 'relative',
            borderRadius: '10px',
            backgroundColor: '#0a0f1d',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
              HTML5 SNIPPET
            </span>
            <button
              type="button"
              onClick={copyEmbedCode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: copiedCode ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copiedCode ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Snippet
                </>
              )}
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '1.25rem',
              overflowX: 'auto',
              fontSize: '0.825rem',
              lineHeight: 1.65,
              fontFamily: 'var(--font-mono, monospace)',
              color: '#e2e8f0',
            }}
          >
            <code>{embedCode}</code>
          </pre>
        </div>
      </div>

      {/* Live Website Render Simulation */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Live Widget Render Simulation
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Exact interactive DOM component rendered by <code style={{ color: 'var(--color-sky)' }}>seal.js</code> on your live website.
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Interactive Preview
          </span>
        </div>

        {/* Live Simulation Frame */}
        <div
          style={{
            padding: '2.5rem 1.5rem',
            borderRadius: '12px',
            backgroundColor: theme === 'dark' ? '#070b14' : '#f8fafc',
            border: '1px dashed var(--border-medium)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          {/* Simulated Badge matching seal.js output exactly */}
          <div
            onClick={() => {
              const url = liveStatus?.verificationUrl || `${originUrl}/transparency?licenseeId=${encodeURIComponent(licenseeId)}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '10px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '13px',
              backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#0f172a',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
              boxShadow: theme === 'dark' ? '0 4px 14px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            title="Click to view public transparency audit ledger"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '10px',
                  letterSpacing: '0.04em',
                }}
              >
                GHG
              </div>
              <div>
                <div style={{ fontWeight: 700, lineHeight: 1.25, fontSize: '0.85rem' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.72rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                  {displayFramework}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: 700,
                color: statusColor,
                backgroundColor: `${statusColor}18`,
                border: `1px solid ${statusColor}45`,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                }}
              ></span>
              {statusLabel}
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Clicking this seal in production directs visitors to your verified public audit ledger on the transparency portal.
          </div>
        </div>
      </div>
    </div>
  );
};
