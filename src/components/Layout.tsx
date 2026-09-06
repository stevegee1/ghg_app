import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Footer } from './Footer';

export const Layout: React.FC = () => {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'SOLUTIONS' | null>(null);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  
  const location = useLocation();
  const navContainerRef = useRef<HTMLElement>(null);

  // Close menus on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  // Click-outside and Escape key handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
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
  };

  return (
    <div className="app-container">
      <header className="navbar" ref={navContainerRef}>
        <div className="navbar-inner">
          
          {/* 1. Left Brand Identity */}
          <div className="brand-wrapper">
            <Link
              to="/"
              className="brand"
              onClick={closeDropdowns}
              aria-label="GHGEmissionLogs Home"
            >
              <img
                src="/images/nfty-logs-logo.png"
                alt="GHGEmissionLogs Official Logo"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <span>GHGEmissionLogs</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? 'CLOSE' : 'MENU'}
          </button>

          {/* 2. Center Nav Menu (Desktop Interactive Mega-Menu Flow) */}
          <nav className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <ul className="nav-links">
              
              {/* Solutions Dropdown / Mobile Accordion */}
              <li className="nav-item-dropdown">
                {/* Desktop Trigger */}
                <button
                  className={`mega-menu-trigger-btn desktop-only-solutions ${activeDropdown === 'SOLUTIONS' ? 'active' : ''}`}
                  onClick={() => toggleDropdown('SOLUTIONS')}
                  aria-expanded={activeDropdown === 'SOLUTIONS'}
                  aria-haspopup="true"
                >
                  <span>Solutions</span>
                  <svg
                    className={`mega-chevron ${activeDropdown === 'SOLUTIONS' ? 'open' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {/* Mobile Accordion Trigger */}
                <button
                  className="mobile-accordion-toggle mobile-only-solutions"
                  onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)}
                >
                  <span>Solutions</span>
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{mobileSolutionsOpen ? '−' : '+'}</span>
                </button>

                {/* Mobile Accordion Expanded Content */}
                {mobileSolutionsOpen && (
                  <div className="mobile-accordion-content mobile-only-solutions">
                    <div>
                      <div className="mobile-subheading">01 Software</div>
                      <Link to="/portal?tab=telemetry" className="mobile-sublink" onClick={closeDropdowns}>
                        <div className="mobile-sublink-title">Telemetry Ingestion</div>
                        <div className="mobile-sublink-desc">Real-time IoT & meter streams</div>
                      </Link>
                      <Link to="/portal?tab=telemetry" className="mobile-sublink" onClick={closeDropdowns}>
                        <div className="mobile-sublink-title">Calibration Gatekeeper</div>
                        <div className="mobile-sublink-desc">Tamper-resistant screening</div>
                      </Link>
                    </div>

                    <div>
                      <div className="mobile-subheading">02 Assurance</div>
                      <Link to="/portal?scope=CARBON_EMISSION&tab=diagnostic" className="mobile-sublink" onClick={closeDropdowns}>
                        <div className="mobile-sublink-title">ISO Diagnostic Scorecard</div>
                        <div className="mobile-sublink-desc">5-pillar readiness evaluation</div>
                      </Link>
                      <Link to="/job-reporting" className="mobile-sublink" onClick={closeDropdowns}>
                        <div className="mobile-sublink-title">Section 106 Workforce</div>
                        <div className="mobile-sublink-desc">Council planning audit dossiers</div>
                      </Link>
                    </div>

                    <div>
                      <div className="mobile-subheading">03 Provenance</div>
                      <Link to="/portal?tab=nft" className="mobile-sublink" onClick={closeDropdowns}>
                        <div className="mobile-sublink-title">Polygon ERC-1155 NFT</div>
                        <div className="mobile-sublink-desc">On-chain tamper-evident warranty</div>
                      </Link>
                      <Link to="/portal?tab=studio" className="mobile-sublink" onClick={closeDropdowns}>
                        <div className="mobile-sublink-title">Dual-Logo Studio</div>
                        <div className="mobile-sublink-desc">Co-brand statutory credentials</div>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Desktop Mega-Menu Container */}
                {activeDropdown === 'SOLUTIONS' && (
                  <div className="mega-menu-panel desktop-only-solutions" role="region" aria-label="Solutions Overview">
                    <div className="mega-menu-grid">
                      
                      {/* Column 01: Continuous Telemetry (Software) */}
                      <div>
                        <div className="mega-col-header">
                          <div className="mega-col-number">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                              <line x1="8" y1="21" x2="16" y2="21"></line>
                              <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                            <span>01</span>
                          </div>
                          <h4 className="mega-col-title">Software</h4>
                          <p className="mega-col-subtitle">Measure and report</p>
                        </div>

                        <ul className="mega-link-list">
                          <li>
                            <Link to="/portal?tab=telemetry" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Telemetry Ingestion</span>
                              </div>
                              <div className="mega-item-desc">Real-time IoT & meter streams</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/portal?tab=telemetry" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Calibration Gatekeeper</span>
                              </div>
                              <div className="mega-item-desc">Tamper-resistant data screening</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/portal?tab=telemetry" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Anomaly Lock Engine</span>
                              </div>
                              <div className="mega-item-desc">Autonomous export freeze on &gt;15% drift</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/portal?tab=telemetry" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Telemetry Ingestion API</span>
                              </div>
                              <div className="mega-item-desc">Continuous high-frequency API gateway</div>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Column 02: Statutory Assurance (Assurance & Verification) */}
                      <div>
                        <div className="mega-col-header">
                          <div className="mega-col-number">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                              <polyline points="17 6 23 6 23 12"></polyline>
                            </svg>
                            <span>02</span>
                          </div>
                          <h4 className="mega-col-title">Assurance</h4>
                          <p className="mega-col-subtitle">Strategy and verification</p>
                        </div>

                        <ul className="mega-link-list">
                          <li>
                            <Link to="/portal?scope=CARBON_EMISSION&tab=diagnostic" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>ISO 14001 / 50001 Diagnostic</span>
                              </div>
                              <div className="mega-item-desc">Statutory 5-pillar readiness scorecard</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/job-reporting" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Section 106 Workforce</span>
                              </div>
                              <div className="mega-item-desc">Local hiring & wage covenant audit</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/portal?tab=evidence" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Executive Audit Dossiers</span>
                              </div>
                              <div className="mega-item-desc">Boardroom-ready sealed PDF evidence</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/licensing" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Statutory Trademark Licensing</span>
                              </div>
                              <div className="mega-item-desc">UKIPO statutory brand governance</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/licensing" className="mega-item-link" onClick={closeDropdowns} style={{ color: '#00f0ff', fontWeight: 700 }}>
                              <div className="mega-item-name" style={{ color: '#00f0ff' }}>
                                <span>See all assurance →</span>
                              </div>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Column 03: On-Chain Provenance (Governance & Social Endowment) */}
                      <div>
                        <div className="mega-col-header">
                          <div className="mega-col-number">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            <span>03</span>
                          </div>
                          <h4 className="mega-col-title">Provenance</h4>
                          <p className="mega-col-subtitle">Endowment & on-chain</p>
                        </div>

                        <ul className="mega-link-list">
                          <li>
                            <Link to="/portal?tab=nft" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Polygon ERC-1155 NFT</span>
                              </div>
                              <div className="mega-item-desc">Permanent tamper-evident warranty</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/portal?tab=studio" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Dual-Logo Studio</span>
                              </div>
                              <div className="mega-item-desc">Co-brand with statutory trade mark</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/merch" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>15% Relief Endowment</span>
                              </div>
                              <div className="mega-item-desc">Immutable humanitarian giving split</div>
                            </Link>
                          </li>
                          <li>
                            <Link to="/transparency" className="mega-item-link" onClick={closeDropdowns}>
                              <div className="mega-item-name">
                                <span>Transparency Ledger</span>
                              </div>
                              <div className="mega-item-desc">Public SHA-256 transaction explorer</div>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Column 04: "Where are you starting?" Intent Card */}
                      <div className="mega-intent-card">
                        <div>
                          <h4 className="mega-intent-title">Where are you starting?</h4>
                          <ul className="mega-intent-list">
                            <li>
                              <Link
                                to="/portal?scope=CARBON_EMISSION&tab=diagnostic"
                                className="mega-intent-item"
                                onClick={closeDropdowns}
                              >
                                <span>I&apos;m preparing for an ISO audit</span>
                                <span>→</span>
                              </Link>
                            </li>
                            <li>
                              <Link
                                to="/portal?scope=JOB_REPORTING&tab=diagnostic"
                                className="mega-intent-item"
                                onClick={closeDropdowns}
                              >
                                <span>I need Section 106 filing</span>
                                <span>→</span>
                              </Link>
                            </li>
                            <li>
                              <Link
                                to="/portal?tab=telemetry"
                                className="mega-intent-item"
                                onClick={closeDropdowns}
                              >
                                <span>I want continuous IoT telemetry</span>
                                <span>→</span>
                              </Link>
                            </li>
                            <li>
                              <Link
                                to="/portal?tab=nft"
                                className="mega-intent-item"
                                onClick={closeDropdowns}
                              >
                                <span>I want an audit warranty NFT</span>
                                <span>→</span>
                              </Link>
                            </li>
                          </ul>
                        </div>

                        <div className="mega-intent-footer">
                          Two statutory scopes. One platform.
                        </div>
                      </div>

                    </div>

                    {/* Bottom Ribbon */}
                    <div className="mega-menu-ribbon">
                      <div className="mega-ribbon-title">
                        BY REPORTING REQUIREMENT — CONTINUOUS CLIMATE TELEMETRY & SECTION 106 WORKFORCE COMBINED
                      </div>
                      <div className="mega-ribbon-chips">
                        <Link to="/licensing" className="mega-ribbon-chip" onClick={closeDropdowns}>
                          ISO 14001 / 50001
                        </Link>
                        <Link to="/portal?tab=telemetry" className="mega-ribbon-chip" onClick={closeDropdowns}>
                          Scope 1-3 GHG Protocol
                        </Link>
                        <Link to="/job-reporting" className="mega-ribbon-chip" onClick={closeDropdowns}>
                          Section 106 Planning Act
                        </Link>
                        <Link to="/transparency" className="mega-ribbon-chip" onClick={closeDropdowns}>
                          Statutory Registered Trade Mark
                        </Link>
                      </div>
                    </div>

                  </div>
                )}
              </li>

              {/* Direct Nav Links */}
              <li>
                <NavLink
                  to="/job-reporting"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  onClick={closeDropdowns}
                >
                  Workforce & Jobs
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merch"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  onClick={closeDropdowns}
                >
                  Support Extreme Weather with Event/Celebration
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/transparency"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  onClick={closeDropdowns}
                >
                  Transparency
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  onClick={closeDropdowns}
                >
                  About
                </NavLink>
              </li>

              {/* Mobile Only: Auth Links */}
              <li className="mobile-only-auth">
                {isAuthenticated ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <NavLink to="/portal" className="nav-link" onClick={closeDropdowns}>
                      My Dashboard ({user?.email})
                    </NavLink>
                    {isAdmin && (
                      <NavLink to="/admin" className="nav-link" onClick={closeDropdowns}>
                        Admin Config
                      </NavLink>
                    )}
                    <button
                      onClick={logout}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 1rem', width: 'fit-content' }}
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <Link to="/portal/login" className="nav-link" style={{ alignSelf: 'center' }} onClick={closeDropdowns}>
                      Portal Login
                    </Link>
                    <Link
                      to="/create-account"
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                      onClick={closeDropdowns}
                    >
                      <span>Get Audit Ready</span>
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
                  My Dashboard
                </NavLink>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  >
                    Admin
                  </NavLink>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{user?.email}</span>
                  <button
                    onClick={logout}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--google-red)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    Exit
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <NavLink
                  to="/portal/login"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Portal Login
                </NavLink>
                <Link
                  to="/portal"
                  className="btn-audit-cta"
                  title="Get Audit Ready"
                >
                  <span>Get Audit Ready</span>
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

