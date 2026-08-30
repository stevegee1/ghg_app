import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      if (res.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/portal');
      }
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

        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0', letterSpacing: '-0.03em' }}>
          {isAdminRoute ? 'Admin Console Login' : 'Sign in to your account'}
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: 0 }}>
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

      <form onSubmit={handleSubmit} className="persefoni-card" style={{ padding: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
        
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Email Address <span style={{ color: 'var(--google-red)' }}>*</span>
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
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="form-input"
          />
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
