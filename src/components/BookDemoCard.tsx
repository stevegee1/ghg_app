import React, { useState } from 'react';
import { validateWorkEmail } from '../utils/emailValidation';

export interface BookDemoCardProps {
  onSuccess?: (booking: any) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const BookDemoCard: React.FC<BookDemoCardProps> = ({
  onSuccess,
  onClose,
  isModal = false,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [corporateEmail, setCorporateEmail] = useState('');
  const [countryRegion, setCountryRegion] = useState('');
  const [industry, setIndustry] = useState('');
  const [interestReason, setInterestReason] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState<string>('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ isValid: boolean; error?: string }>({ isValid: true });

  const handleEmailChange = (val: string) => {
    setCorporateEmail(val);
    if (emailTouched) {
      const result = validateWorkEmail(val.trim().toLowerCase());
      setEmailStatus(result);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (corporateEmail.trim()) {
      const result = validateWorkEmail(corporateEmail.trim().toLowerCase());
      setEmailStatus(result);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim()) {
      setErrorMsg('Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      setErrorMsg('Please enter your last name.');
      return;
    }
    if (!company.trim()) {
      setErrorMsg('Please enter your company name.');
      return;
    }

    const emailValidation = validateWorkEmail(corporateEmail.trim().toLowerCase());
    if (!emailValidation.isValid) {
      setErrorMsg(emailValidation.error || 'Please provide an official corporate work email address.');
      setEmailTouched(true);
      setEmailStatus(emailValidation);
      return;
    }

    if (!countryRegion || countryRegion === 'Please Select') {
      setErrorMsg('Please select your country or region.');
      return;
    }

    if (!industry || industry === 'Please Select') {
      setErrorMsg('Please select your industry.');
      return;
    }

    if (!interestReason || interestReason === 'Please Select') {
      setErrorMsg('Please indicate why you are interested in GHG Ledger.');
      return;
    }

    if (!agreedToPolicy) {
      setErrorMsg('Please accept the privacy policy to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await fetch('/api/demo/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          workEmail: corporateEmail.trim().toLowerCase(),
          companyName: company.trim(),
          facilityCount: `${countryRegion} • ${industry}`,
          primaryScope: 'CARBON_EMISSION',
          bookingMethod: 'FORM',
          ndaRequested: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit request. Please verify your details.');
        setSubmitting(false);
        return;
      }

      setConfirmedBooking(data.booking);
      if (data.googleCalendarUrl) {
        setGoogleCalendarUrl(data.googleCalendarUrl);
      }
      if (onSuccess) {
        onSuccess(data.booking);
      }
    } catch {
      setErrorMsg('Network error connecting to assurance server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (confirmedBooking) {
    return (
      <div className="persefoni-form-card persefoni-success-view">
        {isModal && onClose && (
          <button
            type="button"
            className="persefoni-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        )}
        <div className="persefoni-success-header">
          <h2 className="persefoni-success-title">Thank you for your interest.</h2>
          <p className="persefoni-success-desc">
            Your demonstration request has been received. Our enterprise assurance team has dispatched a calendar confirmation and pre-audit briefing dossier to <strong>{confirmedBooking.workEmail}</strong>.
          </p>
        </div>

        <div className="persefoni-success-summary">
          <div className="persefoni-summary-item">
            <span className="summary-label">Contact</span>
            <span className="summary-val">{confirmedBooking.fullName}</span>
          </div>
          <div className="persefoni-summary-item">
            <span className="summary-label">Company</span>
            <span className="summary-val">{confirmedBooking.companyName}</span>
          </div>
          <div className="persefoni-summary-item">
            <span className="summary-label">Status</span>
            <span className="summary-val">Assurance Session Scheduled</span>
          </div>
        </div>

        <div className="persefoni-success-actions">
          {googleCalendarUrl && (
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="persefoni-submit-btn"
              style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
            >
              Add to Google Calendar
            </a>
          )}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="persefoni-secondary-btn"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`persefoni-form-card ${isModal ? 'is-modal' : ''}`}>
      {isModal && onClose && (
        <button
          type="button"
          className="persefoni-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ✕
        </button>
      )}

      <form onSubmit={handleSubmit} className="persefoni-form" noValidate>
        {errorMsg && (
          <div className="persefoni-form-error" role="alert">
            {errorMsg}
          </div>
        )}

        {/* Row 1: First Name* | Last Name* */}
        <div className="persefoni-form-row two-cols">
          <div className="persefoni-field">
            <label htmlFor="first-name" className="persefoni-label">
              First Name*
            </label>
            <input
              id="first-name"
              type="text"
              className="persefoni-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div className="persefoni-field">
            <label htmlFor="last-name" className="persefoni-label">
              Last Name*
            </label>
            <input
              id="last-name"
              type="text"
              className="persefoni-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        {/* Row 2: Company* */}
        <div className="persefoni-field full-width">
          <label htmlFor="company" className="persefoni-label">
            Company*
          </label>
          <input
            id="company"
            type="text"
            className="persefoni-input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            autoComplete="organization"
          />
        </div>

        {/* Row 3: Corporate Email* */}
        <div className="persefoni-field full-width">
          <label htmlFor="corporate-email" className="persefoni-label">
            Corporate Email*
          </label>
          <input
            id="corporate-email"
            type="email"
            className={`persefoni-input ${emailTouched && !emailStatus.isValid ? 'is-invalid' : ''}`}
            value={corporateEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            required
            autoComplete="email"
          />
          {emailTouched && !emailStatus.isValid && emailStatus.error && (
            <span className="persefoni-field-hint">{emailStatus.error}</span>
          )}
        </div>

        {/* Row 4: Country/Region* | Industry* */}
        <div className="persefoni-form-row two-cols">
          <div className="persefoni-field">
            <label htmlFor="country-region" className="persefoni-label">
              Country/Region*
            </label>
            <select
              id="country-region"
              className="persefoni-select"
              value={countryRegion}
              onChange={(e) => setCountryRegion(e.target.value)}
              required
            >
              <option value="">Please Select</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
              <option value="European Union">European Union</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia &amp; APAC</option>
              <option value="Other">Other Region</option>
            </select>
          </div>
          <div className="persefoni-field">
            <label htmlFor="industry" className="persefoni-label">
              Industry*
            </label>
            <select
              id="industry"
              className="persefoni-select"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
            >
              <option value="">Please Select</option>
              <option value="Energy & Utilities">Energy &amp; Utilities</option>
              <option value="Manufacturing & Heavy Industry">Manufacturing &amp; Heavy Industry</option>
              <option value="Financial Services">Financial Services &amp; Banking</option>
              <option value="Technology & Software">Technology &amp; Software</option>
              <option value="Real Estate & Construction">Real Estate &amp; Construction</option>
              <option value="Transportation & Logistics">Transportation &amp; Logistics</option>
              <option value="Public Sector & Government">Public Sector &amp; Government</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Row 5: Why are you interested in GHG Ledger?* */}
        <div className="persefoni-field full-width">
          <label htmlFor="interest-reason" className="persefoni-label">
            Why are you interested in GHG Ledger?*
          </label>
          <select
            id="interest-reason"
            className="persefoni-select"
            value={interestReason}
            onChange={(e) => setInterestReason(e.target.value)}
            required
          >
            <option value="">Please Select</option>
            <option value="Scope 1, 2, & 3 Carbon Accounting">Scope 1, 2, &amp; 3 Carbon Accounting</option>
            <option value="Regulatory Compliance (CSRD, SEC, UK SECR)">Regulatory Compliance (CSRD, SEC, UK SECR)</option>
            <option value="Supply Chain Decarbonization">Supply Chain Decarbonization</option>
            <option value="Audit-Grade Statutory Verification">Audit-Grade Statutory Verification</option>
            <option value="Section 106 & Social Value Reporting">Section 106 &amp; Social Value Reporting</option>
            <option value="Evaluating Multiple Solutions">Evaluating Multiple Solutions</option>
          </select>
        </div>

        {/* Row 6: Checkbox */}
        <div className="persefoni-consent-row">
          <label className="persefoni-checkbox-label">
            <input
              type="checkbox"
              className="persefoni-checkbox"
              checked={agreedToPolicy}
              onChange={(e) => setAgreedToPolicy(e.target.checked)}
              required
            />
            <span className="persefoni-checkbox-text">
              I agree to the{' '}
              <a
                href="/transparency"
                target="_blank"
                rel="noopener noreferrer"
                className="persefoni-link"
              >
                privacy policy
              </a>
              , including GHG Ledger using my contact details to contact me for marketing purposes.*
            </span>
          </label>
        </div>

        {/* Row 7: Submit button */}
        <div className="persefoni-submit-wrapper">
          <button
            type="submit"
            disabled={submitting}
            className="persefoni-submit-btn"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};
