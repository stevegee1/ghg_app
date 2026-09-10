import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const SignUpPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        companyName: companyName.trim(),
      });

      if (res.token && res.user) {
        login(res.token, res.user);
        navigate('/portal');
      } else {
        navigate('/portal/login');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
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
          Create your account
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          Provision your continuous climate telemetry and assurance client profile.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="persefoni-card" style={{ padding: '1.75rem' }}>
        
        <div className="form-grid-2col" style={{ marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              First Name <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="form-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Last Name <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="form-input"
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Work Email <span style={{ color: 'var(--google-red)' }}>*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="form-input"
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Password (min. 8 characters) <span style={{ color: 'var(--google-red)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Company Name <span style={{ color: 'var(--google-red)' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Legal organization name"
            className="form-input"
          />
        </div>

        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            <input
              type="checkbox"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: '0.15rem', accentColor: 'var(--color-sky)' }}
            />
            <span>
              I understand and agree to the <Link to="/about#contract" style={{ color: 'var(--color-sky)', textDecoration: 'underline' }}>Terms of Service</Link> and the <Link to="/about#privacy" style={{ color: 'var(--color-sky)', textDecoration: 'underline' }}>Privacy Policy</Link> <span style={{ color: 'var(--google-red)' }}>*</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}
        >
          {loading ? 'Creating Account & Provisioning...' : 'Sign Up →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/portal/login" style={{ color: 'var(--color-sky)', fontWeight: 700, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </form>

    </div>
  );
};
