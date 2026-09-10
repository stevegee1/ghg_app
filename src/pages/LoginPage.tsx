import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminRoute = location.pathname.includes('admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password);
      login(res.token, res.user);
      
      const fromState = (location.state as any)?.from;
      let targetPath = res.user.role === 'ADMIN' ? '/admin' : '/portal';
      if (fromState?.pathname && fromState.pathname !== '/portal/login') {
        targetPath = `${fromState.pathname}${fromState.search || ''}${fromState.hash || ''}`;
      }
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      setError('Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '560px', margin: '3rem auto 5rem auto', padding: '0 1.5rem' }}>
      
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
          <img
            src="/images/nfty-logs-logo.png"
            alt="GHGEmissionLogs Logo"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            GHGEmissionLogs
          </span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
          {isAdminRoute ? 'Admin Console Login' : 'Sign in to your account'}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          {isAdminRoute
            ? 'Authenticate as System Administrator to manage audit trails.'
            : 'Access your continuous climate telemetry and assurance console.'}
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="persefoni-card" style={{ padding: '1.75rem' }}>
        
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Work Email Address <span style={{ color: 'var(--google-red)' }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="form-input"
          />
        </div>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Password <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <Link
              to="/portal/forgot-password"
              style={{ fontSize: '0.8rem', color: 'var(--color-sky)', fontWeight: 600, textDecoration: 'none' }}
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
              className="form-input"
              style={{ paddingRight: '2.75rem' }}
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
                color: 'var(--text-muted)',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showPassword ? (
                // Eye-slash icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                // Eye icon
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
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.8rem 1.5rem', fontSize: '0.95rem', marginBottom: '1.5rem' }}
        >
          {loading ? 'Authenticating...' : 'Sign In →'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/create-account" style={{ color: 'var(--color-sky)', fontWeight: 700, textDecoration: 'none' }}>
            Create your free account
          </Link>
        </div>

      </form>

    </div>
  );
};
