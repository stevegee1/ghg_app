import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface ActiveCharityData {
  id: string;
  name: string;
  status: string;
  warrantyStart: string;
  warrantyEnd: string;
  warrantyActive: boolean;
  totalDisbursedGbp: string;
}

export const CharityApplicationPage: React.FC = () => {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number>(3);
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true);
  const [nextIntakeDate, setNextIntakeDate] = useState<string | null>(null);
  const [activeCharities, setActiveCharities] = useState<ActiveCharityData[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);

  // Form state
  const [name, setName] = useState<string>('');
  const [registeredCharityNumber, setRegisteredCharityNumber] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [statement, setStatement] = useState<string>('');
  const [agreedToAudit, setAgreedToAudit] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const loadSlots = async () => {
      try {
        const res = await api.getActiveCharities();
        if (isCurrent && res) {
          setActiveCount(res.activeCount ?? 0);
          setMaxCapacity(res.maxCapacity ?? 3);
          setRegistrationOpen(res.registrationOpen ?? (res.activeCount < (res.maxCapacity ?? 3)));
          setNextIntakeDate(res.nextIntakeDate ?? null);
          setActiveCharities(res.charities || []);
        }
      } catch (err: any) {
        console.error('Failed to load active charities status', err);
      } finally {
        if (isCurrent) setLoadingSlots(false);
      }
    };
    loadSlots();
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your organization legal name.');
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setError('Please provide a valid official contact email address.');
      return;
    }
    if (!statement.trim()) {
      setError('Please provide your organization impact and mission statement.');
      return;
    }
    if (!agreedToAudit) {
      setError('Please confirm acknowledgment of statutory audit verification to proceed.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.applyCharity({
        name: name.trim(),
        registeredCharityNumber: registeredCharityNumber.trim() || undefined,
        contactEmail: contactEmail.trim().toLowerCase(),
        statement: statement.trim(),
      });
      setSubmittedData(res);
    } catch (err: any) {
      setError(err.message || 'Application submission encountered an unexpected error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem 4rem 1rem' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
        <span>/</span>
        <Link to="/merch" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Merchandise</Link>
        <span>/</span>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Charity Partner Application</span>
      </div>

      {/* Header Section */}
      <div style={{ marginBottom: '2.5rem' }}>

        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.75rem 0', letterSpacing: '-0.02em' }}>
          Charity Partner Registration &amp; Onboarding
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '820px', margin: 0 }}>
          Under our statutory platform governance, exactly 15% of all merchandise purchases are split equally and routed directly to verified environmental restoration and extreme weather relief non-profit organizations. Apply below for auditor review and Stripe Connect distribution onboarding.
        </p>
      </div>

      {/* Slot Allocation Status Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-light)',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Statutory Charity Capacity
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {loadingSlots ? 'Checking slot capacity...' : `${activeCount} of ${maxCapacity} Statutory Positions Active`}
            </div>
          </div>

          <div
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: registrationOpen ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
              color: registrationOpen ? 'var(--color-green)' : '#ca8a04',
              border: registrationOpen ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
            }}
          >
            {registrationOpen ? 'Applications Open' : 'Positions Filled (Annual Review Waitlist)'}
          </div>
        </div>

        {activeCharities.length > 0 && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Currently Active Beneficiary Partners (1-Year Statutory Warranty):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {activeCharities.map((charity) => (
                <div
                  key={charity.id}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>{charity.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-sky)', marginTop: '0.25rem' }}>
                    Cumulative Disbursed: £{charity.totalDisbursedGbp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!registrationOpen && nextIntakeDate && (
          <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Next scheduled annual audit rotation: {new Date(nextIntakeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}. Submitted applications will be held in prioritized sequence for auditor evaluation.
          </div>
        )}
      </div>

      {/* Success Notification */}
      {submittedData ? (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--color-green)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              color: 'var(--color-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              margin: '0 auto 1.25rem auto',
            }}
          >
            ✓
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
            Application Submitted for Auditor Review
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
            Thank you for applying. Your application has been logged with status <strong style={{ color: 'var(--text-main)' }}>PENDING APPLICATION</strong> under Reference ID <code style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{submittedData.charity?.id || 'SUBMITTED'}</code>.
          </p>

          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              padding: '1.25rem',
              maxWidth: '520px',
              margin: '0 auto 2rem auto',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Next Statutory Steps:</div>
            <ol style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>Lead Auditor verifies registered charity credentials and non-profit validity.</li>
              <li>Upon approval, an automated Stripe Connect onboarding link will be sent to <strong>{submittedData.charity?.contactEmail || contactEmail}</strong>.</li>
              <li>Once Stripe Connect verification completes, statutory automated routing will disburse 15% checkout allocations.</li>
            </ol>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setSubmittedData(null);
                setName('');
                setRegisteredCharityNumber('');
                setContactEmail('');
                setStatement('');
                setAgreedToAudit(false);
              }}
              className="btn btn-secondary"
              style={{ minHeight: '48px', padding: '0.75rem 1.5rem' }}
            >
              Submit Another Application
            </button>
            <Link
              to="/merch"
              className="btn btn-primary"
              style={{ minHeight: '48px', padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
            >
              Return to Store
            </Link>
          </div>
        </div>
      ) : (
        /* Application Form */
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
              Organization Application Form
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Provide accurate legal credentials. All submitted organizations undergo formal Lead Auditor review prior to Stripe Connect onboarding.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--google-red)',
                color: 'var(--google-red)',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Organization Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extreme Weather Relief Trust"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Registered Charity / Non-Profit Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UK Charity Comm. 1198421 or IRS 501(c)(3) EIN"
                  value={registeredCharityNumber}
                  onChange={(e) => setRegisteredCharityNumber(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Official Authorized Representative Email *
              </label>
              <input
                type="email"
                required
                placeholder="contact@charity-organization.org"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="form-input"
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                The official Stripe Connect onboarding invitation will be dispatched to this email upon auditor approval.
              </span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Impact &amp; Mission Statement *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe your organization focus in climate resilience, environmental restoration, or extreme weather disaster relief."
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                className="form-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '8px', marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', fontSize: '0.8125rem', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={agreedToAudit}
                  onChange={(e) => setAgreedToAudit(e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: 'var(--color-sky)' }}
                />
                <span style={{ color: 'var(--text-main)', lineHeight: 1.5 }}>
                  I confirm that I am an authorized representative of this non-profit organization. I agree to statutory Lead Auditor verification and understand that statutory allocations are subject to Stripe Connect onboarding and 1-year annual audit warranty cycles.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !agreedToAudit}
              className="btn btn-primary"
              style={{
                width: '100%',
                minHeight: '48px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: submitting || !agreedToAudit ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting Application...' : 'Submit Application for Auditor Review'}
            </button>
          </form>
        </div>
      )}

      {/* Information Panel on Routing Architecture */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Statutory Payment &amp; Routing Specifications
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-sky)', marginBottom: '0.35rem' }}>
              15% Statutory Split
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Every customer checkout immediately routes 15% to active verified charities. If no charities are currently active, 100% routes to Stripe operational reserve.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-sky)', marginBottom: '0.35rem' }}>
              Automated Stripe Transfers
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Transfers occur automatically via Stripe Connect upon successful payment webhook settlement, eliminating manual ledger delays.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-sky)', marginBottom: '0.35rem' }}>
              Lead Auditor Governance
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              All applications are reviewed under statutory Section 106 and ISO-readiness guidelines with immutable audit trail logging.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
