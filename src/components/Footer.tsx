import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '3rem', paddingBottom: '2.5rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div className="responsive-grid-2-1" style={{ gap: '2rem', marginBottom: '2.5rem' }}>
          {/* Column 1: Brand, Mission & Social Icons */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <img src="/images/nfty-logs-logo.png" alt="Official Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>GHGEmissionLogs</span>
            </div>

            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#94a3b8', maxWidth: '440px', margin: '0 0 1.25rem 0' }}>
              GHGEmissionlogs climate action authentication platform. Logging, authenticating, and amplifying greenhouse gas reduction efforts across energy transition, corporate licensing, government policies, sports, and individual celebrations.
            </p>

            {/* Social Media SVG Vector Icons Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Follow Us:
              </span>

              {/* TikTok Icon Link */}
              <a
                href="https://tiktok.com/@nftylogs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  transition: 'background-color 0.2s, transform 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68a6.34 6.34 0 0 0 10.86 4.49 6.26 6.26 0 0 0 1.91-4.5V9.11a8.16 8.16 0 0 0 4.82 1.56V7.22a4.84 4.84 0 0 1-1-.53z"/>
                </svg>
              </a>

              {/* Instagram Icon Link */}
              <a
                href="https://instagram.com/nftylogs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  transition: 'background-color 0.2s, transform 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* X (Twitter) Icon Link */}
              <a
                href="https://x.com/nftylogs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (formerly Twitter)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  transition: 'background-color 0.2s, transform 0.2s',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links & Marketplaces */}
          <div className="responsive-grid-2" style={{ gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Platform Navigation
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <li><Link to="/licensing" style={{ color: '#cbd5e1' }}>Annual Licensing</Link></li>
                <li><Link to="/souvenirs" style={{ color: '#cbd5e1' }}>Event Souvenirs</Link></li>
                <li><Link to="/public-tracker" style={{ color: '#cbd5e1' }}>Dropshipping Tracker</Link></li>
                <li><Link to="/merch" style={{ color: '#cbd5e1' }}>Merch Store</Link></li>
                <li><Link to="/transparency" style={{ color: '#cbd5e1' }}>Transparency Registry</Link></li>
                <li><Link to="/blog" style={{ color: '#38bdf8', fontWeight: 600 }}>Read our blogs →</Link></li>
                <li><Link to="/about" style={{ color: '#cbd5e1' }}>About Us</Link></li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Web3 Marketplaces
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <li><a href="https://www.opensea.io" target="_blank" rel="noopener noreferrer" style={{ color: '#cbd5e1' }}>OpenSea Marketplace ↗</a></li>
                <li><a href="https://www.rarible.com" target="_blank" rel="noopener noreferrer" style={{ color: '#cbd5e1' }}>Rarible Marketplace ↗</a></li>
                <li><Link to="/portal/login" style={{ color: '#cbd5e1' }}>Partner Portal Login</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer & Bottom Bar */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem' }}>
          <div>
            © 2026 NFTYLOGS LTD (Company No. 15230476, Inc. 24 Oct 2023). All rights reserved.<br />
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Registered Address: 20 Wenlock Road, London, England, N1 7GU</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ color: '#64748b' }}>Paris Agreement Aligned</span>
            <span style={{ color: '#64748b' }}>GHG Protocol Scope 1-3 Infrastructure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
