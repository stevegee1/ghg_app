import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
      // Security rule: Always display generic 401 response to prevent user enumeration
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => {
    setEmail('admin@ghglogodrop.com');
    setPassword('SecurePassword123!');
    setError(null);
  };

  const fillPartner = () => {
    setEmail('partner@itm-power.com');
    setPassword('SecurePassword123!');
    setError(null);
  };

  return (
    <div style={{ maxWidth: '440px', margin: '2rem auto' }}>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            {isAdminRoute ? 'Admin Portal Login' : 'Partner Portal Login'}
          </h1>
          <p className="card-subtitle">
            {isAdminRoute
              ? 'Authenticate as System Administrator to manage split configurations and audit trails'
              : 'Authenticate to access scoped transaction ledgers and compliance reports'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@ghglogodrop.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Quick Fill Demo Credentials:</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={fillAdmin}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
            >
              Fill Admin Account
            </button>
            <button
              type="button"
              onClick={fillPartner}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
            >
              Fill Partner Account
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
            <div>• <strong>Admin:</strong> <code>admin@ghglogodrop.com</code></div>
            <div>• <strong>Partner:</strong> <code>partner@itm-power.com</code></div>
          </div>
        </div>
      </div>
    </div>
  );
};
