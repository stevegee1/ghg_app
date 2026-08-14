import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isUsingMockData } from '../api/client';

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
      {isUsingMockData && (
        <div className="demo-banner">
          <span>ⓘ DEMO DATA MODE ACTIVE — Mock client active for presentation preview.</span>
        </div>
      )}

      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="brand" onClick={() => setMobileMenuOpen(false)}>
            <div className="brand-mark">⚡</div>
            <span>GHG Logo Drop</span>
          </Link>

          <button
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <nav className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <ul className="nav-links">
              <li>
                <NavLink
                  to="/licensing"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Annual Licensing
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/souvenirs"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Event Souvenirs
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/public-tracker"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Dropshipping Tracker
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/merch"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Merch Store
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/transparency"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Transparency Registry
                </NavLink>
              </li>
              {isAuthenticated ? (
                <>
                  <li>
                    <NavLink
                      to="/portal"
                      className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                      Partner Portal
                    </NavLink>
                  </li>
                  {isAdmin && (
                    <li>
                      <NavLink
                        to="/admin"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                      >
                        Admin Config
                      </NavLink>
                    </li>
                  )}
                  <li className="mobile-user-item">
                    <div className="user-badge">
                      <span className="user-email">{user?.email}</span>
                      <span style={{ fontWeight: 600 }}>({user?.role})</span>
                      <button onClick={logout} className="btn-logout">
                        Logout
                      </button>
                    </div>
                  </li>
                </>
              ) : (
                <li>
                  <NavLink
                    to="/portal/login"
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  >
                    Portal Login
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
