import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { validateWorkEmail } from '../utils/emailValidation';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValidation = validateWorkEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Please enter a valid work email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while processing your request.');
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
              alt="NFTYLOGS Logo"
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
            <span className="cerebrium-auth-brand-name">NFTYLOGS</span>
          </Link>

          <h1 className="cerebrium-auth-title">Reset your password</h1>
          <p className="cerebrium-auth-subtitle">
            Enter your verified work email and we will dispatch secure password reset instructions.
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

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#090d1a', marginBottom: '0.75rem' }}>
              Check your inbox
            </h2>

            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              If an account is registered with <strong style={{ color: '#090d1a' }}>{email}</strong>, a secure password reset link valid for <strong>1 hour</strong> has been dispatched.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/portal/login" className="cerebrium-auth-btn-magenta" style={{ textDecoration: 'none', margin: 0 }}>
                Return to Sign In →
              </Link>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="calendar-add-btn"
                style={{ width: '100%', cursor: 'pointer' }}
              >
                Try another email
              </button>
            </div>
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={loading}
              className="cerebrium-auth-btn-magenta"
            >
              {loading ? 'Sending Instructions...' : 'Send Reset Link →'}
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
