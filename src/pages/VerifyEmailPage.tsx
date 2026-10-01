import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { validateWorkEmail } from '../utils/emailValidation';

type VerificationState = 'VERIFYING' | 'SUCCESS' | 'ERROR' | 'IDLE';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [state, setState] = useState<VerificationState>(token ? 'VERIFYING' : 'IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  
  // Resend state
  const [resendEmail, setResendEmail] = useState<string>(user?.email || '');
  const [resending, setResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('IDLE');
      return;
    }

    let isCurrent = true;

    const performVerification = async () => {
      setState('VERIFYING');
      setErrorMessage('');

      try {
        const res = await api.verifyEmail(token);
        if (!isCurrent) return;

        setVerifiedEmail(res.user?.email || '');
        setState('SUCCESS');

        // Refresh authenticated session if credentials returned
        if (res.token && res.user) {
          login(res.token, res.user);
        }
      } catch (err: any) {
        if (!isCurrent) return;
        setState('ERROR');
        setErrorMessage(
          err.message || 'The verification link is invalid, expired, or has already been used.'
        );
      }
    };

    performVerification();

    return () => {
      isCurrent = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendError(null);
    setResendSuccess(null);

    const emailToUse = resendEmail.trim().toLowerCase();
    if (!emailToUse) {
      setResendError('Corporate work email address is required.');
      return;
    }

    const validation = validateWorkEmail(emailToUse);
    if (!validation.isValid) {
      setResendError(validation.error || 'Please enter a valid corporate work email address.');
      return;
    }

    setResending(true);
    try {
      const res = await api.resendVerificationEmail(emailToUse);
      setResendSuccess(res.message || 'A fresh verification link has been dispatched to your work email.');
    } catch (err: any) {
      setResendError(err.message || 'Failed to dispatch verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-page)',
        minHeight: '100vh',
        color: 'var(--text-main)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, rgba(248, 250, 252, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 45, 141, 0.12)',
              border: '1px solid rgba(255, 45, 141, 0.3)',
              color: '#ff2d8d',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            Sovereign Identity Protocol
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Work Email Verification
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            Cryptographic domain ownership assurance under ISO statutory guidelines.
          </p>
        </div>

        {/* State 1: Verifying */}
        {state === 'VERIFYING' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                border: '3px solid rgba(255, 45, 141, 0.2)',
                borderTopColor: '#ff2d8d',
                margin: '0 auto 1.5rem auto',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Validating Security Token...
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-light)' }}>
              Authenticating domain ownership and issuing updated tenant credentials.
            </div>
          </div>
        )}

        {/* State 2: Success */}
        {state === 'SUCCESS' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                margin: '0 auto 1.25rem auto',
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Email Address Verified
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.55, marginBottom: '1.75rem' }}>
              Corporate email ownership for <strong style={{ color: 'var(--text-main)' }}>{verifiedEmail || 'your account'}</strong> has been confirmed. You now hold full evidence-signing and audit authority.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => navigate('/portal')}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#ff2d8d',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 45, 141, 0.35)',
                }}
              >
                Access Sovereign Portal →
              </button>
              <Link
                to="/"
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-light)',
                  textDecoration: 'none',
                  padding: '0.5rem',
                  fontWeight: 500,
                }}
              >
                Return to GHGEmissionLogs Home
              </Link>
            </div>
          </div>
        )}

        {/* State 3: Error */}
        {state === 'ERROR' && (
          <div>
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '1rem',
                color: '#f87171',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Verification Link Expired or Invalid</div>
              <div>{errorMessage}</div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Request a New Verification Link
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-light)', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                Enter your official corporate work email to receive a fresh secure verification email.
              </p>

              {resendSuccess && (
                <div
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#4ade80',
                    fontSize: '0.8125rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {resendSuccess}
                </div>
              )}

              {resendError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#f87171',
                    fontSize: '0.8125rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {resendError}
                </div>
              )}

              <form onSubmit={handleResend} noValidate>
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    htmlFor="resend_email_input"
                    style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                  >
                    Corporate Work Email
                  </label>
                  <input
                    id="resend_email_input"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="compliance@enterprise.com"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={resending}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#ff2d8d',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: resending ? 'not-allowed' : 'pointer',
                    opacity: resending ? 0.7 : 1,
                  }}
                >
                  {resending ? 'Dispatching Link...' : 'Resend Verification Link'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* State 4: Direct Idle Visit (No Token in URL) */}
        {state === 'IDLE' && (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.55, marginBottom: '1.5rem' }}>
              To verify your corporate email or dispatch a fresh verification link, provide the official work email associated with your tenant organization.
            </p>

            {resendSuccess && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#4ade80',
                  fontSize: '0.8125rem',
                  marginBottom: '1.25rem',
                }}
              >
                {resendSuccess}
              </div>
            )}

            {resendError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#f87171',
                  fontSize: '0.8125rem',
                  marginBottom: '1.25rem',
                }}
              >
                {resendError}
              </div>
            )}

            <form onSubmit={handleResend} noValidate>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="idle_resend_email"
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                >
                  Corporate Work Email
                </label>
                <input
                  id="idle_resend_email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="compliance@enterprise.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={resending}
                style={{
                  width: '100%',
                  padding: '0.8rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#ff2d8d',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: resending ? 'not-allowed' : 'pointer',
                  opacity: resending ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(255, 45, 141, 0.35)',
                }}
              >
                {resending ? 'Dispatching Verification Email...' : 'Send Verification Email'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
              <Link to="/portal/login" style={{ fontSize: '0.8125rem', color: 'var(--text-light)', textDecoration: 'none' }}>
                Back to Portal Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
