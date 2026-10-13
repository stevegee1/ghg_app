import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { validateWorkEmail } from '../utils/emailValidation';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminRoute = location.pathname.includes('admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side corporate work email check (blocks Gmail, Yahoo, etc.)
    const emailValidation = validateWorkEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Please provide an official corporate or organizational work email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.login(email.trim(), password);
      login(res.token, res.user);
      
      const fromState = (location.state as any)?.from;
      let targetPath = res.user.role === 'ADMIN' ? '/admin' : '/portal';
      if (res.user.role === 'ADMIN') {
        // Administrators are strictly routed to the Admin Console unless deep-linking into an /admin sub-route
        if (fromState?.pathname?.startsWith('/admin')) {
          targetPath = `${fromState.pathname}${fromState.search || ''}${fromState.hash || ''}`;
        }
      } else {
        // Partners/Licensees are strictly routed to the Partner Portal
        if (fromState?.pathname && !fromState.pathname.includes('/login') && !fromState.pathname.startsWith('/admin')) {
          targetPath = `${fromState.pathname}${fromState.search || ''}${fromState.hash || ''}`;
        }
      }
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };

  // Already signed in (the saved session is checked with the server on load): go straight to the dashboard.
  if (isAuthenticated && !loading) {
    return <Navigate to={isAdmin ? '/admin' : '/portal'} replace />;
  }

  return (
    <div className="cerebrium-auth-page">
      {/* Background ambient neon glow */}
      <div className="book-demo-ambient-glow" aria-hidden="true" />

      <div className="cerebrium-auth-card">
        {/* Brand Header */}
        <div className="cerebrium-auth-header">
          <Link to="/" className="cerebrium-auth-brand">
            <img
              src="/images/nfty-logs-logo.png"
              alt="NFTYLOGS Logo"
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
            <span className="cerebrium-auth-brand-name">NFTYLOGS</span>
          </Link>

          <h1 className="cerebrium-auth-title">
            {isAdminRoute ? 'Admin Console Login' : 'Sign in to your account'}
          </h1>
          <p className="cerebrium-auth-subtitle">
            {isAdminRoute
              ? 'Authenticate as System Administrator to manage audit trails.'
              : 'Access your continuous climate telemetry and assurance console.'}
          </p>
        </div>

        {error && (
          <div className="cerebrium-auth-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="cerebrium-auth-form" noValidate>
          <div className="cerebrium-auth-field">
            <label className="cerebrium-auth-label" htmlFor="email">
              Work Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="cerebrium-auth-input"
              autoComplete="email"
            />
          </div>

          <div className="cerebrium-auth-field">
            <div className="cerebrium-auth-label-row">
              <label className="cerebrium-auth-label" htmlFor="password" style={{ margin: 0 }}>
                Password
              </label>
              <Link
                to="/portal/forgot-password"
                className="cerebrium-auth-link"
                style={{ fontSize: '0.8rem' }}
              >
                Forgot password?
              </Link>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="cerebrium-auth-input"
                style={{ paddingRight: '2.75rem' }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cerebrium-auth-btn-magenta"
          >
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>

          <div className="cerebrium-auth-footer-text">
            Don&apos;t have an account?{' '}
            <Link to="/create-account" className="cerebrium-auth-link">
              Create your free account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
