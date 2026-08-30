import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', marginTop: 'auto', padding: '4.5rem 1.5rem 2.5rem 1.5rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Main 2-Column Desktop Grid: Left Brand & Newsletter (1.2fr) | Right 4 Link Columns (2.8fr) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '3.5rem', marginBottom: '3.5rem' }}>
          
          {/* Left Column: Brand, Mission & Social Icons */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
              <img src="/images/nfty-logs-logo.png" alt="Official Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>GHGEmissionLogs</span>
            </div>

            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: '1.25rem', maxWidth: '380px' }}>
              The continuous climate assurance and dual-impact governance engine. Ingesting calibrated OT telemetry, enforcing 15% baseline anomaly locks, and automating exact 15% ESG charitable routing.
            </p>

            {/* Social Vector Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* TikTok */}
              <a
                href="https://tiktok.com/@nftylogs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-light)',
                  textDecoration: 'none',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68a6.34 6.34 0 0 0 10.86 4.49 6.26 6.26 0 0 0 1.91-4.5V9.11a8.16 8.16 0 0 0 4.82 1.56V7.22a4.84 4.84 0 0 1-1-.53z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/nftylogs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-light)',
                  textDecoration: 'none',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* X (Twitter) */}
              <a
                href="https://x.com/nftylogs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (formerly Twitter)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-light)',
                  textDecoration: 'none',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Right 4 Horizontal Columns Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '2rem' }}>
            
            {/* Column 1: Platform */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Platform
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.84rem', lineHeight: 2.2 }}>
                <li><Link to="/licensing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Assurance Engine</Link></li>
                <li><Link to="/merch" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Keepsake Studio</Link></li>
                <li><Link to="/souvenirs" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Event Souvenirs</Link></li>
                <li><Link to="/public-tracker" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Public Tracker</Link></li>
              </ul>
            </div>

            {/* Column 2: Solutions */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Solutions
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.84rem', lineHeight: 2.2 }}>
                <li><Link to="/licensing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Hyperscale Data Centres</Link></li>
                <li><Link to="/licensing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Green Hydrogen & DRI</Link></li>
                <li><Link to="/licensing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Commercial Fleet</Link></li>
                <li><Link to="/merch" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Merch Store</Link></li>
              </ul>
            </div>

            {/* Column 3: Compliance & Legal */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Compliance
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.84rem', lineHeight: 2.2 }}>
                <li><Link to="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Nice Class 35 Scope</Link></li>
                <li><Link to="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>ISO 14065 Readiness</Link></li>
                <li><Link to="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>UK CMA Code</Link></li>
                <li><Link to="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Addendum B Contract</Link></li>
              </ul>
            </div>

            {/* Column 4: Web3 & Portals */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Portals & Web3
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.84rem', lineHeight: 2.2 }}>
                <li><Link to="/transparency" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Transparency Registry</Link></li>
                <li><Link to="/portal/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Partner Portal Login</Link></li>
                <li><a href="https://opensea.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>OpenSea Marketplace ↗</a></li>
                <li><a href="https://rarible.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Rarible Marketplace ↗</a></li>
              </ul>
            </div>

          </div>

        </div>

        {/* Bottom Horizontal Legal & Copyright Line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2rem', borderTop: '1px solid var(--border-light)', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            © 2026 GHG Emission Logs (NFTY LOGS®). Registered Nice Class 35 Trademark. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Legal & Class 35</Link>
            <Link to="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Security</Link>
            <Link to="/about" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link to="/transparency" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>System Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
