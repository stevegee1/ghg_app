import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { validateWorkEmail } from '../utils/emailValidation';

export const SignUpPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [primaryRole, setPrimaryRole] = useState('COMPLIANCE_OFFICER');
  const [organisationCountry, setOrganisationCountry] = useState('GB');
  const [industrySector, setIndustrySector] = useState('MANUFACTURING');
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

    const emailValidation = validateWorkEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Please provide an official corporate or organizational work email address.');
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
        jobTitle: jobTitle.trim() || undefined,
        primaryRole,
        organisationCountry,
        industrySector,
      });

      if (res.token && res.user) {
        login(res.token, res.user);
        navigate('/portal/onboarding');
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
    <div className="cerebrium-auth-page">
      {/* Background ambient neon glow */}
      <div className="book-demo-ambient-glow" aria-hidden="true" />

      <div className="cerebrium-auth-card wide">
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

          <h1 className="cerebrium-auth-title">Create your account</h1>
          <p className="cerebrium-auth-subtitle">
            Provision your continuous climate telemetry and assurance client profile.
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.15rem' }}>
            <div>
              <label className="cerebrium-auth-label" htmlFor="firstName">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="cerebrium-auth-input"
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="cerebrium-auth-label" htmlFor="lastName">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="cerebrium-auth-input"
                autoComplete="family-name"
              />
            </div>
          </div>

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
            <label className="cerebrium-auth-label" htmlFor="password">
              Password (min. 8 characters)
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

          <div className="cerebrium-auth-field">
            <label className="cerebrium-auth-label" htmlFor="companyName">
              Company or Organization Name
            </label>
            <input
              id="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Legal organization name"
              className="cerebrium-auth-input"
              autoComplete="organization"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.15rem' }}>
            <div>
              <label className="cerebrium-auth-label" htmlFor="jobTitle">
                Your Job Title
              </label>
              <input
                id="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Head of Sustainability"
                className="cerebrium-auth-input"
              />
            </div>

            <div>
              <label className="cerebrium-auth-label" htmlFor="primaryRole">
                Your Primary Role
              </label>
              <select
                id="primaryRole"
                value={primaryRole}
                onChange={(e) => setPrimaryRole(e.target.value)}
                className="cerebrium-auth-input"
                style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
              >
                <option value="COMPLIANCE_OFFICER">CSO / Sustainability Lead</option>
                <option value="FINANCE_DIRECTOR">CFO / Finance Director</option>
                <option value="OPERATIONS_DIRECTOR">COO / Operations Director</option>
                <option value="LEGAL_OFFICER">General Counsel / Legal Officer</option>
                <option value="SUSTAINABILITY_CONSULTANT">ESG Consultant / Advisor</option>
                <option value="IT_DATA_MANAGER">IT & Data Systems Lead</option>
                <option value="OTHER">Other Leadership Role</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.15rem' }}>
            <div>
              <label className="cerebrium-auth-label" htmlFor="organisationCountry">
                Headquarters Country
              </label>
              <select
                id="organisationCountry"
                value={organisationCountry}
                onChange={(e) => setOrganisationCountry(e.target.value)}
                className="cerebrium-auth-input"
                style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
              >
                <option value="GB">United Kingdom (GB)</option>
                <option value="DE">Germany (DE)</option>
                <option value="FR">France (FR)</option>
                <option value="NL">Netherlands (NL)</option>
                <option value="IE">Ireland (IE)</option>
                <option value="US">United States (US)</option>
                <option value="AU">Australia (AU)</option>
                <option value="CA">Canada (CA)</option>
              </select>
            </div>

            <div>
              <label className="cerebrium-auth-label" htmlFor="industrySector">
                Primary Industry Sector
              </label>
              <select
                id="industrySector"
                value={industrySector}
                onChange={(e) => setIndustrySector(e.target.value)}
                className="cerebrium-auth-input"
                style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
              >
                <option value="MANUFACTURING">Manufacturing</option>
                <option value="DATA_CENTRE">Data Centres & HPC</option>
                <option value="CONSTRUCTION">Construction & Built Env</option>
                <option value="LOGISTICS_TRANSPORT">Logistics & Fleet</option>
                <option value="GREEN_HYDROGEN">Green Hydrogen / Clean Fuels</option>
                <option value="RETAIL_CONSUMER_GOODS">Consumer Goods & Retail</option>
                <option value="FINANCIAL_SERVICES">Financial Services</option>
                <option value="PUBLIC_SECTOR">Public Sector / Health</option>
                <option value="EVENTS_HOSPITALITY">Events & Hospitality</option>
                <option value="REAL_ESTATE_PROPERTY">Property & Real Estate</option>
                <option value="AGRICULTURE">Agriculture</option>
                <option value="OTHER">Other Sector</option>
              </select>
            </div>
          </div>

          <div style={{ margin: '1.25rem 0 1.5rem' }}>
            <label style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
              <input
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="book-demo-pink-checkbox"
                style={{ marginTop: '0.15rem' }}
              />
              <span>
                I understand and agree to the{' '}
                <Link to="/about#contract" className="cerebrium-auth-link">Terms of Service</Link> and the{' '}
                <Link to="/about#privacy" className="cerebrium-auth-link">Privacy Policy</Link>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cerebrium-auth-btn-magenta"
          >
            {loading ? 'Creating Account...' : 'Sign Up →'}
          </button>

          <div className="cerebrium-auth-footer-text">
            Already have an account?{' '}
            <Link to="/portal/login" className="cerebrium-auth-link">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
