import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { validateWorkEmail } from '../utils/emailValidation';

export interface BookDemoCardProps {
  onSuccess?: (booking: any) => void;
  onClose?: () => void;
  isModal?: boolean;
}

interface SlotOption {
  iso: string;
  formatted: string;
  available: boolean;
}

export const BookDemoCard: React.FC<BookDemoCardProps> = ({
  onSuccess,
  onClose,
  isModal = false,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [countryRegion, setCountryRegion] = useState('United Kingdom');
  const [industrySector, setIndustrySector] = useState('Energy & Utilities');
  const [facilityCount, setFacilityCount] = useState('1 - 5 Facilities');
  const [primaryScope, setPrimaryScope] = useState<'CARBON_EMISSION' | 'JOB_REPORTING' | 'DUAL_SCOPE' | 'WEATHER_RESILIENCE'>('CARBON_EMISSION');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [ndaRequested, setNdaRequested] = useState(true);

  const [availableSlots, setAvailableSlots] = useState<SlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState<string>('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ isValid: boolean; error?: string }>({ isValid: false });

  // Fetch available slots from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch('/api/demo/slots');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.slots && data.slots.length > 0) {
            setAvailableSlots(data.slots);
            const firstAvailable = data.slots.find((s: SlotOption) => s.available);
            if (firstAvailable) {
              setSelectedSlot(firstAvailable.iso);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch dynamic slots, falling back to local slots', err);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time email validation feedback
  const handleEmailChange = (val: string) => {
    setWorkEmail(val);
    if (!emailTouched) setEmailTouched(true);
    const result = validateWorkEmail(val.trim().toLowerCase());
    setEmailStatus(result);
  };

  const handleSubmit = async (e?: React.FormEvent, provider: string = 'FORM') => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName || fullName.length < 2) {
      setErrorMsg('Please enter your first and last name.');
      return;
    }

    // Client-side corporate work email check (blocks Gmail, Yahoo, etc.)
    const emailValidation = validateWorkEmail(workEmail.trim().toLowerCase());
    if (!emailValidation.isValid) {
      setErrorMsg(emailValidation.error || 'Please provide an official corporate or organizational work email address.');
      return;
    }

    if (!companyName || companyName.trim().length < 2) {
      setErrorMsg('Please enter your company or authority name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/demo/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          workEmail: workEmail.trim().toLowerCase(),
          companyName: companyName.trim(),
          facilityCount: `${facilityCount} (${industrySector}, ${countryRegion})`,
          primaryScope,
          requestedSlot: selectedSlot || undefined,
          ndaRequested,
          bookingMethod: provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to book demo. Please verify your details.');
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
    } catch (err: any) {
      setErrorMsg('Network error connecting to assurance server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION STATE
  if (confirmedBooking) {
    const slotDate = new Date(confirmedBooking.requestedSlot);
    const formattedDate = slotDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = slotDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return (
      <div className="book-demo-card confirmation-view">
        {isModal && onClose && (
          <button
            type="button"
            className="book-demo-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        )}

        <div className="confirmation-header">
          <div className="confirmation-check-badge">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="book-demo-title" style={{ marginTop: '0.75rem' }}>Enterprise Walkthrough Confirmed</h2>
          <p className="book-demo-subtitle">
            Thank you, {confirmedBooking.fullName}. We have received your walkthrough request for{' '}
            <strong style={{ color: 'var(--text-main)' }}>{confirmedBooking.companyName}</strong>. Our Lead Statutory Auditor will review your facility profile and email your official Google Meet invitation to{' '}
            <strong style={{ color: 'var(--text-main)' }}>{confirmedBooking.workEmail}</strong> shortly.
          </p>
        </div>

        <div className="confirmation-details-box">
          <div className="detail-row">
            <span className="detail-label">Session:</span>
            <span className="detail-value">25-Min Continuous Statutory Assurance Walkthrough</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Requested Time:</span>
            <span className="detail-value highlight">
              {formattedDate} at {formattedTime}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Lead Auditor:</span>
            <span className="detail-value">GHGEmissionLogs Assurance Principal (ISO 19011 Certified)</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Assurance Target:</span>
            <span className="detail-value">
              {primaryScope === 'CARBON_EMISSION' && 'Scope 1 & 2 Continuous Telemetry & CEMS Ingestion'}
              {primaryScope === 'JOB_REPORTING' && 'Section 106 & UK Social Value Workforce Covenant'}
              {primaryScope === 'DUAL_SCOPE' && 'Dual-Scope Statutory (ISO 14064 + Section 106)'}
              {primaryScope === 'WEATHER_RESILIENCE' && 'ISO 50001 Energy Management & Climate Resilience'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="confirmation-actions">
          {googleCalendarUrl && (
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-add-btn google-cal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Add Reminder to Google Calendar</span>
            </a>
          )}
        </div>

        {/* Live demonstrator bridge */}
        <div className="confirmation-bridge">
          <span className="bridge-text">While you wait for your session:</span>
          <Link
            to="/portal?scope=CARBON_EMISSION&tab=diagnostic"
            className="bridge-link"
            onClick={onClose}
          >
            Launch Interactive Continuous Assurance Diagnostic &rarr;
          </Link>
        </div>
      </div>
    );
  }

  // STANDARD SPLIT BENTO VIEW (Persefoni style)
  return (
    <div className={`book-demo-split-wrapper ${isModal ? 'is-modal-layout' : ''}`}>
      {isModal && onClose && (
        <button
          type="button"
          className="book-demo-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>
      )}

      {/* LEFT COLUMN: THE HIGH-CONVERTING ENTERPRISE FORM */}
      <div className="book-demo-form-col">
        <div className="book-demo-header">
          <div className="book-demo-badge-row">
            <span className="pe-live-beacon" />
            <span className="book-demo-badge-text">SPEAK TO A LEAD STATUTORY AUDITOR</span>
          </div>
          <h2 className="book-demo-title">Request a Live Demonstration</h2>
          <p className="book-demo-subtitle">
            See how GHGEmissionLogs delivers continuous, sensor-verified assurance with the same accuracy, transparency, and control as audited financial accounts.
          </p>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'FORM')} className="book-demo-form" noValidate>
          {/* Error Alert */}
          {errorMsg && (
            <div className="book-demo-error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* First Name & Last Name (2 columns) */}
          <div className="book-demo-form-row">
            <div className="book-demo-field-group">
              <label htmlFor="demo-first-name" className="book-demo-field-label">
                First Name <span className="req">*</span>
              </label>
              <input
                id="demo-first-name"
                type="text"
                className="book-demo-input"
                placeholder="Eleanor"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div className="book-demo-field-group">
              <label htmlFor="demo-last-name" className="book-demo-field-label">
                Last Name <span className="req">*</span>
              </label>
              <input
                id="demo-last-name"
                type="text"
                className="book-demo-input"
                placeholder="Vance"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          {/* Corporate Work Email with Live Feedback */}
          <div className="book-demo-field-group">
            <div className="book-demo-label-flex">
              <label htmlFor="demo-work-email" className="book-demo-field-label">
                Official Corporate Email <span className="req">*</span>
              </label>
              {emailTouched && (
                <span className={`email-feedback-pill ${emailStatus.isValid ? 'valid' : 'invalid'}`}>
                  {emailStatus.isValid ? '✓ Corporate domain verified' : 'Corporate email required'}
                </span>
              )}
            </div>
            <input
              id="demo-work-email"
              type="email"
              className={`book-demo-input ${emailTouched ? (emailStatus.isValid ? 'is-valid' : 'is-invalid') : ''}`}
              placeholder="e.vance@company.com"
              value={workEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              autoComplete="email"
            />
            <span className="field-hint">
              Personal webmail (@gmail, @yahoo, @outlook) is blocked by statutory security policy.
            </span>
          </div>

          {/* Company Name & Country/Region (2 columns) */}
          <div className="book-demo-form-row">
            <div className="book-demo-field-group">
              <label htmlFor="demo-company-name" className="book-demo-field-label">
                Company / Organization <span className="req">*</span>
              </label>
              <input
                id="demo-company-name"
                type="text"
                className="book-demo-input"
                placeholder="Acme Industrial Holdings"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoComplete="organization"
              />
            </div>
            <div className="book-demo-field-group">
              <label htmlFor="demo-country-region" className="book-demo-field-label">
                Country / Territory <span className="req">*</span>
              </label>
              <select
                id="demo-country-region"
                className="book-demo-input book-demo-select"
                value={countryRegion}
                onChange={(e) => setCountryRegion(e.target.value)}
              >
                <option value="United Kingdom">United Kingdom (UK)</option>
                <option value="European Union">European Union (EU)</option>
                <option value="United States">United States (USA)</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia &amp; APAC</option>
                <option value="Global">Other International Region</option>
              </select>
            </div>
          </div>

          {/* Industry Sector & Facility Count */}
          <div className="book-demo-form-row">
            <div className="book-demo-field-group">
              <label htmlFor="demo-industry" className="book-demo-field-label">
                Industry Sector
              </label>
              <select
                id="demo-industry"
                className="book-demo-input book-demo-select"
                value={industrySector}
                onChange={(e) => setIndustrySector(e.target.value)}
              >
                <option value="Energy & Utilities">Energy, Power &amp; Utilities</option>
                <option value="Heavy Manufacturing">Manufacturing &amp; Industrial</option>
                <option value="Financial Services & PE">Financial Services &amp; Private Equity</option>
                <option value="Transportation & Logistics">Transportation &amp; Logistics</option>
                <option value="Commercial Real Estate">Real Estate &amp; Construction</option>
                <option value="Technology & SaaS">Technology, Data Centers &amp; Cloud</option>
                <option value="Public Sector & Council">Public Sector &amp; Local Authorities</option>
              </select>
            </div>
            <div className="book-demo-field-group">
              <label htmlFor="demo-facilities" className="book-demo-field-label">
                Reporting Scope Scale
              </label>
              <select
                id="demo-facilities"
                className="book-demo-input book-demo-select"
                value={facilityCount}
                onChange={(e) => setFacilityCount(e.target.value)}
              >
                <option value="1 - 5 Facilities">1 – 5 Operating Facilities</option>
                <option value="6 - 25 Facilities">6 – 25 Operating Facilities</option>
                <option value="26 - 100 Facilities">26 – 100 Operating Facilities</option>
                <option value="Enterprise / Multi-National">Enterprise (100+ Facilities / Global)</option>
              </select>
            </div>
          </div>

          {/* Primary Assurance Target (Interactive Pill Selector) */}
          <div className="book-demo-field-group">
            <label className="book-demo-field-label">Primary Statutory Target</label>
            <div className="scope-pill-selector">
              <button
                type="button"
                className={`scope-pill-btn ${primaryScope === 'CARBON_EMISSION' ? 'active' : ''}`}
                onClick={() => setPrimaryScope('CARBON_EMISSION')}
              >
                Scope 1-2 Continuous CEMS
              </button>
              <button
                type="button"
                className={`scope-pill-btn ${primaryScope === 'JOB_REPORTING' ? 'active' : ''}`}
                onClick={() => setPrimaryScope('JOB_REPORTING')}
              >
                Section 106 Workforce Audit
              </button>
              <button
                type="button"
                className={`scope-pill-btn ${primaryScope === 'DUAL_SCOPE' ? 'active' : ''}`}
                onClick={() => setPrimaryScope('DUAL_SCOPE')}
              >
                Dual-Scope Statutory (ISO + S106)
              </button>
              <button
                type="button"
                className={`scope-pill-btn ${primaryScope === 'WEATHER_RESILIENCE' ? 'active' : ''}`}
                onClick={() => setPrimaryScope('WEATHER_RESILIENCE')}
              >
                ISO 50001 Energy Resilience
              </button>
            </div>
          </div>

          {/* Preferred Demonstration Slot */}
          <div className="book-demo-field-group">
            <label htmlFor="demo-time-slot" className="book-demo-field-label">
              Requested Session Time Slot
            </label>
            <select
              id="demo-time-slot"
              className="book-demo-input book-demo-select"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => (
                  <option key={slot.iso} value={slot.iso} disabled={!slot.available}>
                    {slot.formatted} {!slot.available ? '(Booked)' : '- Available'}
                  </option>
                ))
              ) : (
                <option value="">Next Business Day &bull; 14:00 UTC (Auditor Available)</option>
              )}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="book-demo-options-row">
            <label className="book-demo-checkbox-label">
              <input
                type="checkbox"
                className="book-demo-checkbox"
                checked={ndaRequested}
                onChange={(e) => setNdaRequested(e.target.checked)}
              />
              <span className="checkbox-text">
                Include Pre-Audit Mutual NDA &amp; Statutory Assurance Briefing packet
              </span>
            </label>
          </div>

          {/* Enterprise Submit CTA */}
          <button
            type="submit"
            disabled={submitting}
            className="book-demo-primary-btn"
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="demo-spinner" /> Verifying Auditor Availability...
              </span>
            ) : (
              <span>Confirm Enterprise Walkthrough &rarr;</span>
            )}
          </button>

          {/* Security & Confidentiality Trust Footnote */}
          <div className="book-demo-security-footnote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              256-bit TLS Encryption &bull; ISO 27001 &amp; SOC 2 Aligned &bull; Confidentiality Guaranteed
            </span>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: PERSEFONI-STYLE LIVE SHOWCASE & PROOF BENTO */}
      <div className="book-demo-showcase-col">
        {/* Card 1: Real-Time Assurance Engine Status */}
        <div className="showcase-bento-card engine-card">
          <div className="showcase-card-header">
            <div className="engine-status-badge">
              <span className="engine-pulse-dot" />
              <span>CONTINUOUS ASSURANCE ENGINE ONLINE</span>
            </div>
            <span className="engine-block-tag">BLOCK #2,841,902</span>
          </div>

          <div className="showcase-metrics-grid">
            <div className="metric-box">
              <div className="metric-number">2.84M+</div>
              <div className="metric-label">Tonnes CO2e Assured</div>
            </div>
            <div className="metric-box">
              <div className="metric-number highlight-emerald">99.98%</div>
              <div className="metric-label">Cryptographic Provenance</div>
            </div>
            <div className="metric-box">
              <div className="metric-number">&lt; 15%</div>
              <div className="metric-label">Drift Gatekeeper SLA</div>
            </div>
            <div className="metric-box">
              <div className="metric-number highlight-blue">100%</div>
              <div className="metric-label">Audit Trail Immutability</div>
            </div>
          </div>

          {/* Live Waveform Pulse Animation */}
          <div className="engine-waveform-box">
            <div className="waveform-label">
              <span>LIVE INGESTION WAVEFORM</span>
              <span>1 Hz &bull; ACTIVE</span>
            </div>
            <svg className="engine-waveform-svg" viewBox="0 0 400 60" fill="none">
              <path
                d="M0 30 Q 25 10, 50 30 T 100 30 T 150 15 T 200 45 T 250 20 T 300 35 T 350 25 T 400 30"
                stroke="#059669"
                strokeWidth="2.5"
                fill="none"
                className="pe-waveform-line"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Infinite Client & Audit Partner Marquee */}
        <div className="showcase-bento-card marquee-card">
          <div className="marquee-card-label">TRUSTED BY GLOBAL STATUTORY &amp; INDUSTRIAL LEADERS</div>
          <div className="demo-logo-marquee-wrapper">
            <div className="demo-logo-marquee-track">
              {[
                'Snowflake',
                'Elevance Health',
                'Under Armour',
                'Xerox',
                'Aramark',
                'Revlon',
                'Caliber',
                'SGX Group',
                'TPG Capital',
                'Viasat',
                // Duplicate for seamless loop
                'Snowflake',
                'Elevance Health',
                'Under Armour',
                'Xerox',
                'Aramark',
                'Revlon',
                'Caliber',
                'SGX Group',
                'TPG Capital',
                'Viasat',
              ].map((client, cIdx) => (
                <div key={cIdx} className="demo-marquee-item">
                  <span>{client}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Independent Accreditation & Statutory Leadership */}
        <div className="showcase-bento-card accreditation-card">
          <div className="accreditation-badge-top">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
            <span>RECOGNIZED FOR CONTINUOUS ASSURANCE LEADERSHIP</span>
          </div>
          <h4 className="accreditation-title">
            Evaluated Against 24 Rigorous Statutory ESG Audit Criteria
          </h4>
          <p className="accreditation-body">
            GHGEmissionLogs received highest rankings for automated sensor calibration, 15% drift anomaly suppression, and ISAE 3410 immutable provenance ledgers.
          </p>
          <div className="accreditation-pills">
            <span>&bull; ISO 14064-3</span>
            <span>&bull; ISAE 3410</span>
            <span>&bull; UK Section 106</span>
            <span>&bull; Polygon PoS</span>
          </div>
        </div>

        {/* Card 4: What You'll Experience in the 25-Minute Session */}
        <div className="showcase-bento-card session-card">
          <div className="session-card-title">What Your 25-Minute Walkthrough Covers:</div>
          <ol className="session-steps-list">
            <li>
              <strong>1. Continuous Sensor Ingestion:</strong> Connect live CEMS and IoT telemetry streams in under 5 minutes.
            </li>
            <li>
              <strong>2. Automated Calibration:</strong> Watch the 15% drift gatekeeper quarantine and normalize noisy instrumentation.
            </li>
            <li>
              <strong>3. Cryptographic Sealing:</strong> Generate an official Polygon ERC-1155 statutory verification stamp ready for external audit.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
