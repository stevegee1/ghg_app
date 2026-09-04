import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="navbar-inner">
          
          {/* 1. Left Brand Identity */}
          <Link
            to="/"
            className="brand"
            onClick={() => setMobileMenuOpen(false)}
          >
            <img
              src="/images/nfty-logs-logo.png"
              alt="GHGEmissionLogs Official Logo"
              style={{ width: '30px', height: '30px', objectFit: 'contain' }}
            />
            <span>GHGEmissionLogs</span>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? 'CLOSE' : 'MENU'}
          </button>

          {/* 2. Center Nav Menu (Clean Google B2B Architecture) */}
          <nav className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <ul className="nav-links">
              <li>
                <NavLink
                  to="/licensing"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Assurance Suite
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/job-reporting"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Workforce & Jobs
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/souvenirs"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Event Keepsakes
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merch"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Survivors Donation Keepsake
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/transparency"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Transparency
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  About
                </NavLink>
              </li>

              {/* Mobile Only Auth Links */}
              <li className="mobile-only-auth">
                {isAuthenticated ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <NavLink to="/portal" className="nav-link">
                      Partner Console ({user?.email})
                    </NavLink>
                    {isAdmin && (
                      <NavLink to="/admin" className="nav-link">
                        Admin Config
                      </NavLink>
                    )}
                    <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.45rem 1rem', width: 'fit-content' }}>
                      Logout
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <Link to="/portal/login" className="nav-link" style={{ alignSelf: 'center' }}>
                      Portal Login
                    </Link>
                    <Link
                      to="/create-account"
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                    >
                      <span>Sign Up Free</span>
                      <span>→</span>
                    </Link>
                  </div>
                )}
              </li>
            </ul>
          </nav>

          {/* 3. Right Action Area (Desktop) */}
          <div className="navbar-actions-desktop">
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <NavLink
                  to="/portal"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Console
                </NavLink>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  >
                    Admin
                  </NavLink>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-subtle)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{user?.email}</span>
                  <button
                    onClick={logout}
                    style={{ background: 'none', border: 'none', color: 'var(--google-red)', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Exit
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                <NavLink
                  to="/portal/login"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Portal Login
                </NavLink>
                <Link
                  to="/create-account"
                  style={{
                    backgroundColor: 'var(--color-sky)',
                    color: '#ffffff',
                    padding: '0.5rem 1.25rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <span>Sign Up Free</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
