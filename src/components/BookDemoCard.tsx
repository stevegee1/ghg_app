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
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [facilityCount, setFacilityCount] = useState('');
  const [primaryScope, setPrimaryScope] = useState<'CARBON_EMISSION' | 'JOB_REPORTING' | 'DUAL_SCOPE' | 'WEATHER_RESILIENCE'>('CARBON_EMISSION');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [ndaRequested, setNdaRequested] = useState(true);

  const [availableSlots, setAvailableSlots] = useState<SlotOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

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


  const handleSubmit = async (e?: React.FormEvent, provider: string = 'FORM') => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    // Client-side corporate work email check (blocks Gmail, Yahoo, etc.)
    const emailValidation = validateWorkEmail(workEmail);
    if (!emailValidation.isValid) {
      setErrorMsg(emailValidation.error || 'Please provide an official corporate or organizational work email address.');
      return;
    }
    if (!fullName || fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name and corporate title.');
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
          fullName: fullName.trim(),
          workEmail: workEmail.trim().toLowerCase(),
          companyName: companyName.trim(),
          facilityCount: facilityCount.trim() || undefined,
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

  const copyMeetUrl = () => {
    if (confirmedBooking?.meetUrl) {
      navigator.clipboard.writeText(confirmedBooking.meetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="book-demo-title" style={{ marginTop: '0.75rem' }}>Demo Request Received</h2>
          <p className="book-demo-subtitle">
            Thank you, {confirmedBooking.fullName}. We have received your walkthrough request for{' '}
            <span style={{ color: '#fff', fontWeight: 600 }}>{confirmedBooking.companyName}</span>. Our Lead Auditor will review your details and email your official Google Meet invitation to{' '}
            <span style={{ color: '#fff', fontWeight: 600 }}>{confirmedBooking.workEmail}</span> shortly.
          </p>
        </div>

        <div className="confirmation-details-box">
          <div className="detail-row">
            <span className="detail-label">Session:</span>
            <span className="detail-value" style={{ color: '#ffffff' }}>25-Min Continuous Assurance Walkthrough</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Requested Time:</span>
            <span className="detail-value" style={{ color: '#ffffff' }}>
              {formattedDate} at {formattedTime}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Lead Auditor:</span>
            <span className="detail-value" style={{ color: '#ffffff' }}>GHGEmissionLogs Assurance Principal</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Next Step:</span>
            <span className="detail-value" style={{ color: '#ffffff' }}>
              Invitation & meeting link will be emailed shortly
            </span>
          </div>
        </div>

        {/* Action buttons - Single Google Calendar reminder */}
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
            Launch Interactive Continuous Assurance Diagnostic →
          </Link>
        </div>
      </div>
    );
  }

  // STANDARD FORM VIEW (Matches provided design)
  return (
    <div className="book-demo-card">
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

      {/* Header: Clean Google SaaS Standard - NO unnecessary pill badge */}
      <div className="book-demo-header">
        <h2 className="book-demo-title">Book a Demo</h2>
        <p className="book-demo-subtitle">Enter your details below.</p>
      </div>


      {/* Form */}
      <form onSubmit={(e) => handleSubmit(e, 'FORM')} className="book-demo-form" noValidate>
        {/* Error Alert */}
        {errorMsg && (
          <div className="book-demo-error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Work Email */}
        <div className="book-demo-field-group">
          <input
            id="demo-work-email"
            type="email"
            className="book-demo-input"
            placeholder="Official work email (name@company.com)"
            value={workEmail}
            onChange={(e) => setWorkEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {/* Full Name & Title */}
        <div className="book-demo-field-group">
          <input
            id="demo-full-name"
            type="text"
            className="book-demo-input"
            placeholder="Full name & title"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        {/* Company Name & Facilities */}
        <div className="book-demo-field-group">
          <input
            id="demo-company-name"
            type="text"
            className="book-demo-input"
            placeholder="Organization name & facilities"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            autoComplete="organization"
          />
        </div>

        {/* Preferred Date & Time Slot */}
        <div className="book-demo-field-group">
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
              <option value="">Next Available Slot (Tomorrow 14:00 UTC)</option>
            )}
          </select>
        </div>

        {/* Checkbox and right link row (matches screenshot) */}
        <div className="book-demo-options-row">
          <label className="book-demo-checkbox-label">
            <input
              type="checkbox"
              className="book-demo-pink-checkbox"
              checked={ndaRequested}
              onChange={(e) => setNdaRequested(e.target.checked)}
            />
            <span className="checkbox-text">Request pre-audit NDA & checklist</span>
          </label>

        </div>

        {/* Glowing Magenta Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="book-demo-primary-btn"
        >
          {submitting ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="demo-spinner"></span> Confirming Slot...
            </span>
          ) : (
            'Confirm & Book Demo →'
          )}
        </button>
      </form>
    </div>
  );
};
