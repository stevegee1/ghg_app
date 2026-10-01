import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const isLengthValid = password.length >= 8;
  const isMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      setError('Invalid password reset link. Please request a new link from the forgot password page.');
      return;
    }
    if (!isLengthValid) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!isMatch) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.resetPassword({
        token,
        email,
        password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

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
              alt="GHGEmissionLogs Logo"
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
            <span className="cerebrium-auth-brand-name">GHGEmissionLogs</span>
          </Link>

          <h1 className="cerebrium-auth-title">Create new password</h1>
          <p className="cerebrium-auth-subtitle">
            {email ? (
              <>
                Enter a secure password for your console account <strong style={{ color: '#ffffff' }}>{email}</strong>.
              </>
            ) : (
              'Enter your new credentials to restore access to your assurance console.'
            )}
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

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#090d1a', marginBottom: '0.75rem' }}>
              Password Reset Complete!
            </h2>

            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Your password has been securely updated. You can now sign in to your assurance console.
            </p>

            <button
              onClick={() => navigate('/portal/login')}
              className="cerebrium-auth-btn-magenta"
              style={{ margin: '0 auto' }}
            >
              Sign In to Console →
            </button>
          </div>
        ) : !token ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Missing or invalid password reset token. Please request a fresh reset link.
            </p>
            <Link
              to="/forgot-password"
              className="cerebrium-auth-btn-magenta"
              style={{ display: 'inline-block', textDecoration: 'none', margin: 0 }}
            >
              Request New Reset Link →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="cerebrium-auth-form" noValidate>
            {/* New Password Field */}
            <div className="cerebrium-auth-field">
              <label className="cerebrium-auth-label" htmlFor="password">
                New Password (min. 8 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="cerebrium-auth-input"
                  style={{ paddingRight: '2.75rem' }}
                  autoComplete="new-password"
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

            {/* Confirm Password Field */}
            <div className="cerebrium-auth-field">
              <label className="cerebrium-auth-label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="cerebrium-auth-input"
                  style={{ paddingRight: '2.75rem' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                  {showConfirmPassword ? (
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

            {/* Validation Checklist */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
                fontSize: '0.82rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: isLengthValid ? '#10b981' : '#94a3b8',
                  marginBottom: '0.35rem',
                }}
              >
                <span>{isLengthValid ? '✓' : '○'}</span>
                <span>Minimum 8 characters</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: isMatch ? '#10b981' : '#94a3b8',
                }}
              >
                <span>{isMatch ? '✓' : '○'}</span>
                <span>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isLengthValid || !isMatch}
              className="cerebrium-auth-btn-magenta"
            >
              {loading ? 'Updating Password...' : 'Save New Password →'}
            </button>

            <div className="cerebrium-auth-footer-text">
              Remember your password?{' '}
              <Link to="/portal/login" className="cerebrium-auth-link">
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
