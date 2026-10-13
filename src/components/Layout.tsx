import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Footer } from './Footer';
import { ScrollManager } from './ScrollManager';
import { useProfileLogo } from './portal/useProfileLogo';

/** The four solutions, in the order the landing page presents them. */
const SOLUTION_LINKS = [
  { href: '/#ghg', title: 'GHG & Carbon Emissions', description: 'Scope 1 to 3 reporting, reviewed and credentialed', colour: 'var(--color-green)' },
  { href: '/#fleet', title: 'Fleet Emissions & Telematics', description: 'One dashboard for every machine and vehicle', colour: 'var(--accent-primary)' },
  { href: '/#workforce', title: 'Social & Workforce', description: 'Section 106 and social value evidence', colour: 'var(--google-amber)' },
  { href: '/merch', title: 'Merch & Frenzy Studio', description: 'Printed merch, delivered by local partners', colour: '#9334e6' },
];

export const Layout: React.FC = () => {
  const { isAuthenticated, isAdmin, user, logout, token } = useAuth();
  const logoSrc = useProfileLogo(token, user?.logoUrl);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'SOLUTIONS' | null>(null);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  const location = useLocation();
  const navContainerRef = useRef<HTMLElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // In Google SaaS standard, when inside the console/dashboard, the top bar is focused (no marketing links)
  const isConsoleView = Boolean(
    isAuthenticated &&
    (location.pathname.startsWith('/portal') || location.pathname.startsWith('/admin')) &&
    !location.pathname.includes('/login')
  );
  // Only the client portal has a navigation drawer, so only it gets the menu button.
  const hasPortalDrawer = isConsoleView && /^\/portal\/?$/.test(location.pathname);

  const displayName = user?.companyName || (user?.email ? user.email.split('@')[0] : 'User');
  const userInitial = (user?.companyName?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const avatarContent = logoSrc ? <img src={logoSrc} alt="" /> : userInitial;

  const copyAccountId = () => {
    if (user?.licenseeId) {
      navigator.clipboard.writeText(user.licenseeId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Close menus on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  // Click-outside and Escape key handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDropdown = (menu: 'SOLUTIONS') => {
    setActiveDropdown(prev => (prev === menu ? null : menu));
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  };

  return (
    <div className="app-container">
      <header className={`navbar ${isConsoleView ? 'navbar-console-mode' : 'navbar-cerebrium'}`} ref={navContainerRef}>
        <div className="navbar-inner">
          
          {/* 1. Left Brand Identity */}
          <div className="brand-wrapper">
            {hasPortalDrawer && (
              <button
                type="button"
                className="console-mobile-drawer-toggle"
                aria-label="Open portal navigation drawer"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toggle-portal-sidebar'));
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            <Link
              to="/"
              className={isConsoleView ? 'brand' : 'brand cerebrium-brand-link'}
              onClick={closeDropdowns}
              aria-label="NFTYLOGS Home"
            >
              <img
                src="/images/nfty-logs-logo.png"
                alt="NFTYLOGS Official Logo"
                style={{ width: '28px', height: '28px', objectFit: 'contain' }}
              />
              <span className={!isConsoleView ? 'brand-text-white' : ''}>NFTYLOGS</span>
            </Link>
            {isConsoleView && (
              <span className="console-mode-badge">Console</span>
            )}
          </div>

          {/* Mobile Menu Toggle Button (Public site only) */}
          {!isConsoleView && (
            <button
              className="mobile-menu-toggle"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? 'CLOSE' : 'MENU'}
            </button>
          )}

          {/* 2. Center Nav Menu (Desktop Interactive Mega-Menu Flow - Public site only) */}
          {!isConsoleView && (
            <nav className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
              <ul className="nav-links cerebrium-capsule-inner">
                
                {/* Solutions: the four services, as a dropdown on desktop and an accordion on mobile */}
                <li className="nav-item-dropdown">
                  <button
                    className={`cerebrium-capsule-link mega-menu-trigger-btn desktop-only-solutions ${activeDropdown === 'SOLUTIONS' ? 'active' : ''}`}
                    onClick={() => toggleDropdown('SOLUTIONS')}
                    aria-expanded={activeDropdown === 'SOLUTIONS'}
                    aria-haspopup="true"
                  >
                    <span>Solutions</span>
                  </button>

                  <button className="mobile-accordion-toggle mobile-only-solutions" onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)} aria-expanded={mobileSolutionsOpen}>
                    <span>Solutions</span>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{mobileSolutionsOpen ? '−' : '+'}</span>
                  </button>

                  {mobileSolutionsOpen && (
                    <div className="mobile-accordion-content mobile-only-solutions">
                      {SOLUTION_LINKS.map((item) => (
                        <Link key={item.href} to={item.href} className="mobile-sublink" onClick={closeDropdowns}>
                          <div className="mobile-sublink-title">{item.title}</div>
                          <div className="mobile-sublink-desc">{item.description}</div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {activeDropdown === 'SOLUTIONS' && (
                    <div className="mega-menu-panel desktop-only-solutions nav-solutions-panel" role="region" aria-label="Solutions">
                      <div className="nav-solutions-grid">
                        {SOLUTION_LINKS.map((item) => (
                          <Link key={item.href} to={item.href} className="nav-solution-link" onClick={closeDropdowns}>
                            <span className="nav-solution-dot" style={{ background: item.colour }} aria-hidden="true" />
                            <span>
                              <span className="nav-solution-title">{item.title}</span>
                              <span className="nav-solution-desc">{item.description}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>

                <li>
                  <NavLink to="/partners" className={({ isActive }) => (isActive ? 'cerebrium-capsule-link active' : 'cerebrium-capsule-link')} onClick={closeDropdowns}>
                    Partners
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/merch" className={({ isActive }) => (isActive ? 'cerebrium-capsule-link active' : 'cerebrium-capsule-link')} onClick={closeDropdowns}>
                    Merch
                  </NavLink>
                </li>

              {/* Mobile Only: Auth Links */}
              <li className="mobile-only-auth">
                {isAuthenticated ? (
                  <div className="mobile-account-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="google-avatar-circle" style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>
                        {avatarContent}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user?.companyName || (isAdmin ? 'GHG Platform Administration' : user?.email)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user?.email}
                        </div>
                        {user?.licenseeId && (
                          <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ID: {user.licenseeId}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {isAdmin ? (
                        <>
                          <NavLink to="/admin" className="nav-link" onClick={closeDropdowns}>
                            Admin Console
                          </NavLink>
                        </>
                      ) : (
                        <>
                          <NavLink to="/portal" className="nav-link" onClick={closeDropdowns}>
                            My Dashboard
                          </NavLink>
                        </>
                      )}
                      <button
                        onClick={() => { closeDropdowns(); logout(); }}
                        className="google-signout-btn"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <Link
                      to="/portal/login"
                      className="cerebrium-nav-btn-ice"
                      style={{ flex: 1, textAlign: 'center', padding: '0.65rem 1rem' }}
                      onClick={closeDropdowns}
                    >
                      Sign in to console
                    </Link>
                    <Link
                      to="/book-demo"
                      className="cerebrium-nav-btn-magenta"
                      style={{ flex: 1, textAlign: 'center', padding: '0.65rem 1rem' }}
                      onClick={(e) => {
                        e.preventDefault();
                        closeDropdowns();
                        window.dispatchEvent(new CustomEvent('open-book-demo-modal'));
                      }}
                    >
                      <span>Book Demo</span>
                    </Link>
                  </div>
                )}
              </li>

            </ul>
          </nav>
        )}

          {/* 3. Right Action Area */}
          <div className="navbar-actions-desktop">
            {isConsoleView ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {/* Google Account Profile Button */}
                <div className="google-account-container" ref={accountMenuRef}>
                  <button
                    type="button"
                    className={`google-avatar-btn ${accountMenuOpen ? 'active' : ''}`}
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    aria-label={`Account: ${user?.companyName || user?.email}`}
                    aria-expanded={accountMenuOpen}
                    title={user?.companyName ? `${user.companyName} (${user.email})` : (user?.email || 'Account Profile')}
                  >
                    <div className="google-avatar-circle">{avatarContent}</div>
                  </button>

                  {accountMenuOpen && (
                    <div className="google-account-popover" role="dialog" aria-label="Account details">
                      <div className="google-popover-header">
                        <div className="google-popover-avatar">{avatarContent}</div>
                        <div className="google-popover-identity">
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.3 }}>
                            {user?.companyName || (isAdmin ? 'GHG Platform Administration' : user?.email)}
                          </div>
                          <div className="google-popover-email" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {user?.email}
                          </div>
                          {user?.licenseeId && (
                            <div className="google-popover-client-id">
                              <span>Client ID: </span>
                              <code>{user.licenseeId}</code>
                              <button
                                type="button"
                                onClick={copyAccountId}
                                className="google-copy-btn"
                                title="Copy Client ID"
                              >
                                {copiedId ? '✓' : 'Copy'}
                              </button>
                            </div>
                          )}
                          <div className="google-popover-badge">
                            {isAdmin ? 'Administrator' : 'Active Licensee'}
                          </div>
                        </div>
                      </div>

                      <div className="google-popover-menu">
                        {isAdmin ? (
                          <>
                            <NavLink
                              to="/admin"
                              className={({ isActive }) => `google-popover-link ${isActive ? 'active' : ''}`}
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <span>Admin Console</span>
                            </NavLink>
                          </>
                        ) : (
                          <>
                            <NavLink
                              to="/portal"
                              className={({ isActive }) => `google-popover-link ${isActive ? 'active' : ''}`}
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <span>My Dashboard</span>
                            </NavLink>
                          </>
                        )}
                        <Link to="/" className="google-popover-link" onClick={() => setAccountMenuOpen(false)}>
                          <span>Go to website</span>
                        </Link>
                      </div>

                      <div className="google-popover-footer">
                        <button
                          type="button"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            logout();
                          }}
                          className="google-signout-btn"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                          </svg>
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <NavLink
                  to={isAdmin ? '/admin' : '/portal'}
                  className="btn btn-primary"
                  style={{ padding: '0.42rem 1rem', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  {isAdmin ? 'Admin Console →' : 'My Dashboard →'}
                </NavLink>

                {/* Google Account Profile Button */}
                <div className="google-account-container" ref={accountMenuRef}>
                  <button
                    type="button"
                    className={`google-avatar-btn ${accountMenuOpen ? 'active' : ''}`}
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    aria-label={`Account: ${user?.companyName || user?.email}`}
                    aria-expanded={accountMenuOpen}
                    title={user?.companyName ? `${user.companyName} (${user.email})` : (user?.email || 'Account Profile')}
                  >
                    <div className="google-avatar-circle">{avatarContent}</div>
                  </button>

                  {accountMenuOpen && (
                    <div className="google-account-popover" role="dialog" aria-label="Account details">
                      <div className="google-popover-header">
                        <div className="google-popover-avatar">{avatarContent}</div>
                        <div className="google-popover-identity">
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.3 }}>
                            {user?.companyName || (isAdmin ? 'GHG Platform Administration' : user?.email)}
                          </div>
                          <div className="google-popover-email" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {user?.email}
                          </div>
                          {user?.licenseeId && (
                            <div className="google-popover-client-id">
                              <span>Client ID: </span>
                              <code>{user.licenseeId}</code>
                              <button
                                type="button"
                                onClick={copyAccountId}
                                className="google-copy-btn"
                                title="Copy Client ID"
                              >
                                {copiedId ? '✓' : 'Copy'}
                              </button>
                            </div>
                          )}
                          <div className="google-popover-badge">
                            {isAdmin ? 'Administrator' : 'Active Licensee'}
                          </div>
                        </div>
                      </div>

                      <div className="google-popover-menu">
                        {isAdmin ? (
                          <>
                            <NavLink
                              to="/admin"
                              className="google-popover-link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <span>Admin Console</span>
                            </NavLink>
                          </>
                        ) : (
                          <>
                            <NavLink
                              to="/portal"
                              className="google-popover-link"
                              onClick={() => setAccountMenuOpen(false)}
                            >
                              <span>My Dashboard</span>
                            </NavLink>
                          </>
                        )}
                      </div>

                      <div className="google-popover-footer">
                        <button
                          type="button"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            logout();
                          }}
                          className="google-signout-btn"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                          </svg>
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <NavLink
                  to="/portal/login"
                  className="cerebrium-nav-btn-ice"
                  title="Sign In to Console"
                >
                  Sign In
                </NavLink>
                <Link
                  to="/book-demo"
                  className="cerebrium-nav-btn-magenta"
                  title="Book Compliance Demo"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open-book-demo-modal'));
                  }}
                >
                  <span>Book Demo</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </header>

      <main className="main-content">
        <ScrollManager />
        <Outlet />
      </main>

      {isConsoleView ? (
        <footer className="console-minimal-footer">
          <div className="console-minimal-footer-inner">
            <div className="console-footer-left">
              <span className="console-status-dot" />
              <span>NFTYLOGS</span>
            </div>
            <div className="console-footer-right">
              <span>© {new Date().getFullYear()} NFTYLOGS Limited. Registered in England and Wales, company no. 15230476.</span>
            </div>
          </div>
        </footer>
      ) : (
        <Footer />
      )}
    </div>
  );
};

