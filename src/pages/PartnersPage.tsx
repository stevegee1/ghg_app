import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { validateWorkEmail } from '../utils/emailValidation';

const COUNTRY_OPTIONS = [
  { code: 'GB', name: 'United Kingdom (GB)' },
  { code: 'US', name: 'United States (US)' },
  { code: 'DE', name: 'Germany (DE)' },
  { code: 'FR', name: 'France (FR)' },
  { code: 'IT', name: 'Italy (IT)' },
  { code: 'ES', name: 'Spain (ES)' },
  { code: 'NL', name: 'Netherlands (NL)' },
  { code: 'PT', name: 'Portugal (PT)' },
  { code: 'PL', name: 'Poland (PL)' },
  { code: 'CA', name: 'Canada (CA)' },
  { code: 'AU', name: 'Australia (AU)' },
  { code: 'JP', name: 'Japan (JP)' },
  { code: 'SE', name: 'Sweden (SE)' },
  { code: 'NO', name: 'Norway (NO)' },
  { code: 'DK', name: 'Denmark (DK)' },
  { code: 'CH', name: 'Switzerland (CH)' },
  { code: 'IE', name: 'Ireland (IE)' },
  { code: 'OTHER', name: 'Other International Jurisdiction' },
];

const FULFILLMENT_CAPABILITIES = [
  { id: 'EMBROIDERY', label: 'Precision Industrial Embroidery' },
  { id: 'DTG', label: 'Sustainable Direct-to-Garment (DTG)' },
  { id: 'WATER_BASED_SCREEN', label: 'Water-Based Screen Printing' },
  { id: 'CUT_SEW', label: 'Cut & Sew Custom Apparel' },
  { id: 'ECO_WAREHOUSING', label: 'Eco-Friendly Warehousing & Pick-Pack' },
  { id: 'LOCAL_DISPATCH', label: 'Carbon-Neutral Local Courier Dispatch' },
];

const CERTIFICATIONS_LIST = [
  { id: 'GOTS', label: 'GOTS (Global Organic Textile Standard)' },
  { id: 'OEKO_TEX', label: 'OEKO-TEX Standard 100' },
  { id: 'B_CORP', label: 'B Corp Certified' },
  { id: 'ISO_14001', label: 'ISO 14001 Environmental Management' },
  { id: 'FAIR_WEAR', label: 'Fair Wear / Ethical Trading Initiative' },
  { id: 'SUSTAINABLE_IN_PROGRESS', label: 'Sustainable Production (Audits in Progress)' },
];

const CHARITY_FOCUS_AREAS = [
  { id: 'EXTREME_WEATHER_RELIEF', label: 'Extreme Weather Disaster Relief' },
  { id: 'REFORESTATION', label: 'Native Reforestation & Agroforestry' },
  { id: 'OCEAN_CLEANUP', label: 'Ocean & Freshwater Plastic Interception' },
  { id: 'BIODIVERSITY', label: 'Biodiversity & Endangered Habitat Protection' },
  { id: 'COMMUNITY_CLIMATE', label: 'Community Climate Resilience & Urban Greening' },
  { id: 'CLEAN_WATER', label: 'Clean Water Infrastructure & Watershed Restoration' },
];

const FAQ_ITEMS = [
  {
    q: 'Why does GHGEmissionLogs work with regional fulfillment studios instead of centralized global manufacturing?',
    a: 'Centralized mega-factories require long-distance air and maritime freight that accounts for up to 60% of an apparel product total lifecycle emissions. By distributing production to verified studios within 500km of the customer, we eliminate excessive transit mileage, cut delivery times to 48 hours, and ensure zero-waste on-demand assembly.',
  },
  {
    q: 'What quality and operational standards are required for fulfillment studios?',
    a: 'All partner studios must utilize commercial-grade machinery (such as Tajima/Barudan embroidery or Kornit DTG systems), use certified non-toxic inks and organic or recycled base garments, maintain fair living wages for artisans, and agree to digital carbon telemetry reporting.',
  },
  {
    q: 'How does the statutory 15% charity split work in practice?',
    a: 'On every item ordered through GHGEmissionLogs and our official licensees, Stripe programmatic splits automatically route 15% of the transaction value directly to designated environmental non-profits. The payout is executed immediately at checkout and permanently timestamped on the public provenance ledger.',
  },
  {
    q: 'What is the review and onboarding timeline after application submission?',
    a: 'Fulfillment applications receive initial screening within 2 business days, followed by a video call technical review and test batch evaluation. Charity partner applications are reviewed by our compliance committee within 3 business days, including charity commission or 501(c)(3) verification.',
  },
  {
    q: 'Can a studio or organization operate in multiple countries?',
    a: 'Yes. If your operation has multi-facility regional footprints across the UK, EU, North America, or Asia-Pacific, indicate your primary hub in the form and detail your satellite locations in the notes dossier.',
  },
];

export const PartnersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fulfillment' | 'charity'>('fulfillment');

  // Fulfillment Form State
  const [fCompanyName, setFCompanyName] = useState('');
  const [fWorkEmail, setFWorkEmail] = useState('');
  const [fCountryCode, setFCountryCode] = useState('GB');
  const [fRegion, setFRegion] = useState('');
  const [fCapabilities, setFCapabilities] = useState<string[]>(['EMBROIDERY']);
  const [fCapacity, setFCapacity] = useState('500_2000');
  const [fCertifications, setFCertifications] = useState<string[]>(['OEKO_TEX']);
  const [fMessage, setFMessage] = useState('');
  const [fLoading, setFLoading] = useState(false);
  const [fError, setFError] = useState<string | null>(null);
  const [fSuccessData, setFSuccessData] = useState<{ id: string; message: string } | null>(null);

  // Charity Form State
  const [cOrgName, setCOrgName] = useState('');
  const [cWorkEmail, setCWorkEmail] = useState('');
  const [cCountryCode, setCCountryCode] = useState('GB');
  const [cRegNumber, setCRegNumber] = useState('');
  const [cOrgType, setCOrgType] = useState('REGISTERED_CHARITY');
  const [cFocusAreas, setCFocusAreas] = useState<string[]>(['EXTREME_WEATHER_RELIEF']);
  const [cAnnualReportUrl, setCAnnualReportUrl] = useState('');
  const [cWebsite, setCWebsite] = useState('');
  const [cMessage, setCMessage] = useState('');
  const [cLoading, setCLoading] = useState(false);
  const [cError, setCError] = useState<string | null>(null);
  const [cSuccessData, setCSuccessData] = useState<{ id: string; message: string } | null>(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleCapability = (id: string) => {
    setFCapabilities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleCertification = (id: string) => {
    setFCertifications((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleFocusArea = (id: string) => {
    setCFocusAreas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Submit Fulfillment Form
  const handleFulfillmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFError(null);

    if (!fCompanyName.trim()) {
      setFError('Company legal name is required.');
      return;
    }
    if (!fWorkEmail.trim()) {
      setFError('Corporate work email is required.');
      return;
    }

    const emailCheck = validateWorkEmail(fWorkEmail);
    if (!emailCheck.isValid) {
      setFError(emailCheck.error || 'Please enter a valid official corporate work email.');
      return;
    }

    if (!fRegion.trim()) {
      setFError('Primary operating region or city is required.');
      return;
    }

    if (fCapabilities.length === 0) {
      setFError('Please select at least one manufacturing capability.');
      return;
    }

    setFLoading(true);
    try {
      const res = await api.applyFulfillmentPartner({
        companyName: fCompanyName.trim(),
        workEmail: fWorkEmail.trim(),
        countryCode: fCountryCode,
        regionOfOperation: fRegion.trim(),
        capabilities: fCapabilities,
        monthlyCapacityUnits: fCapacity,
        certifications: fCertifications,
        message: fMessage.trim() || undefined,
      });

      setFSuccessData({
        id: res.applicationId,
        message: res.message,
      });
    } catch (err: any) {
      setFError(err.message || 'Failed to submit fulfillment partner application. Please try again.');
    } finally {
      setFLoading(false);
    }
  };

  // Submit Charity Form
  const handleCharitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCError(null);

    if (!cOrgName.trim()) {
      setCError('Organization legal name is required.');
      return;
    }
    if (!cWorkEmail.trim()) {
      setCError('Official organization email is required.');
      return;
    }

    const emailCheck = validateWorkEmail(cWorkEmail);
    if (!emailCheck.isValid) {
      setCError(emailCheck.error || 'Please provide an official organizational email address.');
      return;
    }

    if (cFocusAreas.length === 0) {
      setCError('Please select at least one climate focus area.');
      return;
    }

    setCLoading(true);
    try {
      const res = await api.applyCharityPartner({
        orgName: cOrgName.trim(),
        workEmail: cWorkEmail.trim(),
        countryCode: cCountryCode,
        registrationNumber: cRegNumber.trim() || undefined,
        orgType: cOrgType,
        focusAreas: cFocusAreas,
        annualReportUrl: cAnnualReportUrl.trim() || undefined,
        website: cWebsite.trim() || undefined,
        message: cMessage.trim() || undefined,
      });

      setCSuccessData({
        id: res.applicationId,
        message: res.message,
      });
    } catch (err: any) {
      setCError(err.message || 'Failed to submit charity partner application. Please try again.');
    } finally {
      setCLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#08040c',
        minHeight: '100vh',
        color: 'var(--text-main)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background radial ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '900px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(255, 45, 141, 0.08) 0%, rgba(8, 4, 12, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Navigation Breadcrumb */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(8, 4, 12, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <Link to="/" style={{ color: 'var(--text-light)', textDecoration: 'none', fontWeight: 500 }}>
              GHGEmissionLogs
            </Link>
            <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>/</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Global Partner Network</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              to="/merch"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-light)',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.15s ease',
              }}
            >
              Merchandise Store
            </Link>
            <Link
              to="/portal"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--border-light)',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Enterprise Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '3.5rem 1.5rem 6rem 1.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Hero Section */}
        <section style={{ textAlign: 'center', maxWidth: '880px', margin: '0 auto 3.5rem auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 45, 141, 0.1)',
              border: '1px solid rgba(255, 45, 141, 0.3)',
              color: '#ff2d8d',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
            }}
          >
            Decentralized Low-Emission Production & Impact Alliances
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.25rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              color: 'var(--text-main)',
              letterSpacing: '-0.025em',
              marginBottom: '1.25rem',
            }}
          >
            Join the Global Network for Zero-Landfill Merchandise & Verified Climate Grants
          </h1>

          <p
            style={{
              fontSize: '1.0625rem',
              lineHeight: 1.6,
              color: 'var(--text-light)',
              margin: '0 auto 2.25rem auto',
              maxWidth: '740px',
            }}
          >
            We are expanding our worldwide guild of regional embroidery and textile studios to fulfill certified low-emission merchandise locally, alongside certified non-profits receiving direct 15% statutory checkout allocations on every piece.
          </p>

          {/* Tab Selector */}
          <div
            role="tablist"
            aria-label="Partner Application Tracks"
            style={{
              display: 'inline-flex',
              padding: '0.35rem',
              backgroundColor: 'var(--bg-page)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              gap: '0.35rem',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'fulfillment'}
              onClick={() => setActiveTab('fulfillment')}
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'fulfillment' ? '#ff2d8d' : 'transparent',
                color: activeTab === 'fulfillment' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Fulfillment Studios & Production Hubs
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'charity'}
              onClick={() => setActiveTab('charity')}
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'charity' ? '#ff2d8d' : 'transparent',
                color: activeTab === 'charity' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Charities & Environmental NGOs
            </button>
          </div>
        </section>

        {/* Tab 1: Fulfillment Studios Form & Value Proposition */}
        {activeTab === 'fulfillment' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
            {/* Left Column: Why Partner as a Studio */}
            <div
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '2.25rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#ff2d8d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                }}
              >
                Local Manufacturing Guild
              </div>
              <h2
                style={{
                  fontSize: '1.625rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  lineHeight: 1.25,
                  marginBottom: '1rem',
                }}
              >
                Manufacture Official Enterprise & Event Merchandise Locally
              </h2>
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--text-light)',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                }}
              >
                We route customized keepsake hoodies, caps, and garments to verified studios located closest to the buyer. You receive steady high-margin volume with guaranteed digital payouts and automated shipping labels.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 45, 141, 0.12)',
                      border: '1px solid rgba(255, 45, 141, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff2d8d',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Cut Freight Emissions by Up to 80%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.45, marginTop: '0.2rem' }}>
                      Produce within national or regional boundaries, avoiding high-emission air freight while delivering faster to corporate buyers and event attendees.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 45, 141, 0.12)',
                      border: '1px solid rgba(255, 45, 141, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff2d8d',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Automated Batch Payouts via Stripe Connect
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.45, marginTop: '0.2rem' }}>
                      No 60-day invoice delays. Production fees and material allowances are credited automatically to your studio corporate bank account upon dispatch scan.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 45, 141, 0.12)',
                      border: '1px solid rgba(255, 45, 141, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff2d8d',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      ISO 14064 Telemetry Integration
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.45, marginTop: '0.2rem' }}>
                      Our dispatch platform logs energy usage, stitch counts, and eco-packaging data into verifiable audit packs, elevating your studio ESG profile.
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '2.25rem',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  backgroundColor: '#0d121c',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Minimum Partner Eligibility
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', lineHeight: 1.5 }}>
                  Active industrial embroidery or DTG equipment, minimum monthly production capacity of 250 units, registered corporate tax entity, and commitment to zero plastic single-use packaging.
                </div>
              </div>
            </div>

            {/* Right Column: Application Form */}
            <div
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '2.25rem',
              }}
            >
              <h3
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: '0.5rem',
                }}
              >
                Fulfillment Partner Application
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-light)',
                  lineHeight: 1.5,
                  marginBottom: '1.75rem',
                }}
              >
                Complete your studio technical profile. Our supply chain team responds within 2 business days to schedule an introductory machinery assessment.
              </p>

              {fSuccessData ? (
                <div
                  style={{
                    backgroundColor: '#0d121c',
                    border: '1px solid rgba(255, 45, 141, 0.4)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 45, 141, 0.15)',
                      border: '1px solid #ff2d8d',
                      color: '#ff2d8d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      margin: '0 auto 1.25rem auto',
                    }}
                  >
                    ✓
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                    Partner Application Submitted
                  </h4>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-light)',
                      marginBottom: '1.25rem',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      display: 'inline-block',
                    }}
                  >
                    Application Reference ID: {fSuccessData.id}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                    {fSuccessData.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFSuccessData(null);
                      setFCompanyName('');
                      setFWorkEmail('');
                      setFRegion('');
                      setFMessage('');
                    }}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-page)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--text-main)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Submit Another Application
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFulfillmentSubmit} noValidate>
                  {fError && (
                    <div
                      role="alert"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        color: '#f87171',
                        fontSize: '0.85rem',
                        lineHeight: 1.45,
                        marginBottom: '1.25rem',
                      }}
                    >
                      {fError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Company Legal Name */}
                    <div>
                      <label
                        htmlFor="f_company_name"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                      >
                        Company Legal Name *
                      </label>
                      <input
                        id="f_company_name"
                        type="text"
                        value={fCompanyName}
                        onChange={(e) => setFCompanyName(e.target.value)}
                        placeholder="e.g. Apex Sustainable Garment Studios Ltd"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0d121c',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Corporate Work Email */}
                    <div>
                      <label
                        htmlFor="f_work_email"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                      >
                        Corporate Work Email *
                      </label>
                      <input
                        id="f_work_email"
                        type="email"
                        value={fWorkEmail}
                        onChange={(e) => setFWorkEmail(e.target.value)}
                        placeholder="operations@apexgarments.co.uk"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0d121c',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                        Must be a corporate domain. Free consumer addresses (Gmail, Yahoo, Outlook) are rejected.
                      </span>
                    </div>

                    {/* Country & Region Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label
                          htmlFor="f_country"
                          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                        >
                          Country / Territory *
                        </label>
                        <select
                          id="f_country"
                          value={fCountryCode}
                          onChange={(e) => setFCountryCode(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '8px',
                            backgroundColor: '#0d121c',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        >
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c.code} value={c.code} style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="f_region"
                          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                        >
                          Region / State / City *
                        </label>
                        <input
                          id="f_region"
                          type="text"
                          value={fRegion}
                          onChange={(e) => setFRegion(e.target.value)}
                          placeholder="e.g. Manchester, Greater Manchester"
                          required
                          style={{
                            width: '100%',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '8px',
                            backgroundColor: '#0d121c',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    {/* Capabilities Multi-Select Pills */}
                    <div>
                      <label
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}
                      >
                        Manufacturing & Dispatch Capabilities (Select all that apply) *
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {FULFILLMENT_CAPABILITIES.map((cap) => {
                          const selected = fCapabilities.includes(cap.id);
                          return (
                            <button
                              type="button"
                              key={cap.id}
                              onClick={() => toggleCapability(cap.id)}
                              style={{
                                padding: '0.45rem 0.8rem',
                                borderRadius: '6px',
                                border: selected
                                  ? '1px solid #ff2d8d'
                                  : '1px solid rgba(255, 255, 255, 0.12)',
                                backgroundColor: selected ? 'rgba(255, 45, 141, 0.15)' : '#0d121c',
                                color: selected ? '#ffffff' : '#94a3b8',
                                fontSize: '0.78rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                              }}
                            >
                              {selected ? '✓ ' : '+ '}
                              {cap.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Monthly Production Capacity */}
                    <div>
                      <label
                        htmlFor="f_capacity"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                      >
                        Current Monthly Capacity (Garment / Keepsake Units) *
                      </label>
                      <select
                        id="f_capacity"
                        value={fCapacity}
                        onChange={(e) => setFCapacity(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0d121c',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="UNDER_500" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                          Under 500 units / month (Boutique Artisan Studio)
                        </option>
                        <option value="500_2000" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                          500 – 2,000 units / month (Mid-tier Production Hub)
                        </option>
                        <option value="2000_10000" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                          2,000 – 10,000 units / month (High-volume Commercial Facility)
                        </option>
                        <option value="OVER_10000" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                          Over 10,000 units / month (Industrial Scaled Operation)
                        </option>
                      </select>
                    </div>

                    {/* Certifications Multi-Select */}
                    <div>
                      <label
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}
                      >
                        Eco, Textile & Labor Certifications
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {CERTIFICATIONS_LIST.map((cert) => {
                          const selected = fCertifications.includes(cert.id);
                          return (
                            <button
                              type="button"
                              key={cert.id}
                              onClick={() => toggleCertification(cert.id)}
                              style={{
                                padding: '0.45rem 0.8rem',
                                borderRadius: '6px',
                                border: selected
                                  ? '1px solid #ff2d8d'
                                  : '1px solid rgba(255, 255, 255, 0.12)',
                                backgroundColor: selected ? 'rgba(255, 45, 141, 0.15)' : '#0d121c',
                                color: selected ? '#ffffff' : '#94a3b8',
                                fontSize: '0.78rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                              }}
                            >
                              {selected ? '✓ ' : '+ '}
                              {cert.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Equipment & Capabilities Dossier Notes */}
                    <div>
                      <label
                        htmlFor="f_message"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                      >
                        Studio Machinery & Operational Notes (Optional)
                      </label>
                      <textarea
                        id="f_message"
                        rows={3}
                        value={fMessage}
                        onChange={(e) => setFMessage(e.target.value)}
                        placeholder="Detail machinery specs (e.g. Tajima 6-head, Brother GTXpro DTG), turnaround SLAs, and warehouse handling capabilities..."
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0d121c',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={fLoading}
                      style={{
                        padding: '0.85rem 1.5rem',
                        borderRadius: '8px',
                        backgroundColor: '#ff2d8d',
                        border: 'none',
                        color: 'var(--text-main)',
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        cursor: fLoading ? 'not-allowed' : 'pointer',
                        opacity: fLoading ? 0.7 : 1,
                        transition: 'opacity 0.15s ease',
                        boxShadow: '0 4px 14px rgba(255, 45, 141, 0.35)',
                      }}
                    >
                      {fLoading ? 'Submitting Partner Dossier...' : 'Submit Studio Application for Review'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {/* Tab 2: Charities & Environmental NGOs Form & Value Proposition */}
        {activeTab === 'charity' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
            {/* Left Column: Why Partner as a Charity */}
            <div
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '2.25rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#ff2d8d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                }}
              >
                Direct Impact Allocation
              </div>
              <h2
                style={{
                  fontSize: '1.625rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  lineHeight: 1.25,
                  marginBottom: '1rem',
                }}
              >
                Statutory 15% Checkout Allocation on Every Item Sold
              </h2>
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--text-light)',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                }}
              >
                GHGEmissionLogs and our licensed retail partners bind 15% of all gross merchandise transactions to verified environmental foundations. Every pound and dollar is settled programmatically with complete cryptographic transparency.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 45, 141, 0.12)',
                      border: '1px solid rgba(255, 45, 141, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff2d8d',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Programmatic Stripe Split Transfers
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.45, marginTop: '0.2rem' }}>
                      Donations are split atomically at checkout and wired directly into your registered non-profit merchant account, bypassing third-party pledge aggregators and platform deductions.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 45, 141, 0.12)',
                      border: '1px solid rgba(255, 45, 141, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff2d8d',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Public Provenance Audit Ledger
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.45, marginTop: '0.2rem' }}>
                      Every disbursement is accompanied by an open cryptographic receipt showing the transaction ID, order identifier, and verifiable allocation for your board and donors.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 45, 141, 0.12)',
                      border: '1px solid rgba(255, 45, 141, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff2d8d',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Featured Global Partner Status
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: 1.45, marginTop: '0.2rem' }}>
                      Approved charity partners receive dedicated attribution badges in our merchandise store and during checkout so customers know precisely which climate mission they are championing.
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '2.25rem',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  backgroundColor: '#0d121c',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Governance & Compliance Standard
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', lineHeight: 1.5 }}>
                  Applications are accepted from officially registered charities, NGOs, and environmental community funds. Annual accounts and public reporting verification are required before allocation activation.
                </div>
              </div>
            </div>

            {/* Right Column: Charity Application Form */}
            <div
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '2.25rem',
              }}
            >
              <h3
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: '0.5rem',
                }}
              >
                Charity & NGO Allocation Application
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-light)',
                  lineHeight: 1.5,
                  marginBottom: '1.75rem',
                }}
              >
                Register your organization to join the verified beneficiary network. Our compliance committee reviews applications within 3 business days.
              </p>

              {cSuccessData ? (
                <div
                  style={{
                    backgroundColor: '#0d121c',
                    border: '1px solid rgba(255, 45, 141, 0.4)',
                    borderRadius: '12px',
                    padding: '2rem',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 45, 141, 0.15)',
                      border: '1px solid #ff2d8d',
                      color: '#ff2d8d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      margin: '0 auto 1.25rem auto',
                    }}
                  >
                    ✓
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                    Organization Dossier Submitted
                  </h4>
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-light)',
                      marginBottom: '1.25rem',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      display: 'inline-block',
                    }}
                  >
                    Application Reference ID: {cSuccessData.id}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                    {cSuccessData.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCSuccessData(null);
                      setCOrgName('');
                      setCWorkEmail('');
                      setCRegNumber('');
                      setCAnnualReportUrl('');
                      setCWebsite('');
                      setCMessage('');
                    }}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-page)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--text-main)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Submit Another Application
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCharitySubmit} noValidate>
                  {cError && (
                    <div
                      role="alert"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        color: '#f87171',
                        fontSize: '0.85rem',
                        lineHeight: 1.45,
                        marginBottom: '1.25rem',
                      }}
                    >
                      {cError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Organization Legal Name */}
                    <div>
                      <label
                        htmlFor="c_org_name"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                      >
                        Organization Legal Name *
                      </label>
                      <input
                        id="c_org_name"
                        type="text"
                        value={cOrgName}
                        onChange={(e) => setCOrgName(e.target.value)}
                        placeholder="e.g. Atlantic Canopy Reforestation Trust"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0d121c',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Official Work Email */}
                    <div>
                      <label
                        htmlFor="c_work_email"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                      >
                        Official Representative Email *
                      </label>
                      <input
                        id="c_work_email"
                        type="email"
                        value={cWorkEmail}
                        onChange={(e) => setCWorkEmail(e.target.value)}
                        placeholder="trustees@atlanticcanopy.org"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0d121c',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.25rem', display: 'block' }}>
                        Must belong to the official non-profit organizational domain.
                      </span>
                    </div>

                    {/* Country & Legal Structure Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label
                          htmlFor="c_country"
                          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                        >
                          Registration Country *
                        </label>
                        <select
                          id="c_country"
                          value={cCountryCode}
                          onChange={(e) => setCCountryCode(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '8px',
                            backgroundColor: '#0d121c',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        >
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c.code} value={c.code} style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="c_org_type"
                          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                        >
                          Legal Entity Type *
                        </label>
                        <select
                          id="c_org_type"
                          value={cOrgType}
                          onChange={(e) => setCOrgType(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '8px',
                            backgroundColor: '#0d121c',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        >
                          <option value="REGISTERED_CHARITY" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                            Registered Charity
                          </option>
                          <option value="NGO" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                            Non-Governmental Org (NGO)
                          </option>
                          <option value="TRUST" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                            Charitable Trust
                          </option>
                          <option value="FOUNDATION" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                            Environmental Foundation
                          </option>
                          <option value="COMMUNITY_FUND" style={{ backgroundColor: '#0d121c', color: 'var(--text-main)' }}>
                            Community Climate Fund
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Registration Number */}
                    <div>
                      <label
                        htmlFor="c_reg_number"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                      >
                        Official Charity / Tax Registration Number
                      </label>
                      <input
                        id="c_reg_number"
                        type="text"
                        value={cRegNumber}
                        onChange={(e) => setCRegNumber(e.target.value)}
                        placeholder="e.g. UK Charity No. 1198421 or US EIN 84-XXXXXXX"
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0d121c',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Climate Focus Areas Multi-Select */}
                    <div>
                      <label
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}
                      >
                        Primary Climate & Ecological Focus Areas *
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {CHARITY_FOCUS_AREAS.map((focus) => {
                          const selected = cFocusAreas.includes(focus.id);
                          return (
                            <button
                              type="button"
                              key={focus.id}
                              onClick={() => toggleFocusArea(focus.id)}
                              style={{
                                padding: '0.45rem 0.8rem',
                                borderRadius: '6px',
                                border: selected
                                  ? '1px solid #ff2d8d'
                                  : '1px solid rgba(255, 255, 255, 0.12)',
                                backgroundColor: selected ? 'rgba(255, 45, 141, 0.15)' : '#0d121c',
                                color: selected ? '#ffffff' : '#94a3b8',
                                fontSize: '0.78rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                              }}
                            >
                              {selected ? '✓ ' : '+ '}
                              {focus.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Website and Annual Report URL Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label
                          htmlFor="c_website"
                          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                        >
                          Official Website URL
                        </label>
                        <input
                          id="c_website"
                          type="url"
                          value={cWebsite}
                          onChange={(e) => setCWebsite(e.target.value)}
                          placeholder="https://atlanticcanopy.org"
                          style={{
                            width: '100%',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '8px',
                            backgroundColor: '#0d121c',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="c_report_url"
                          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                        >
                          Audited Report / Accounts URL
                        </label>
                        <input
                          id="c_report_url"
                          type="url"
                          value={cAnnualReportUrl}
                          onChange={(e) => setCAnnualReportUrl(e.target.value)}
                          placeholder="https://atlanticcanopy.org/audit2025.pdf"
                          style={{
                            width: '100%',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '8px',
                            backgroundColor: '#0d121c',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    {/* Mission Statement */}
                    <div>
                      <label
                        htmlFor="c_message"
                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}
                      >
                        Impact Mission & Allocation Objective (Optional)
                      </label>
                      <textarea
                        id="c_message"
                        rows={3}
                        value={cMessage}
                        onChange={(e) => setCMessage(e.target.value)}
                        placeholder="Briefly state your organization's core projects and how the 15% checkout disbursements will be deployed..."
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0d121c',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={cLoading}
                      style={{
                        padding: '0.85rem 1.5rem',
                        borderRadius: '8px',
                        backgroundColor: '#ff2d8d',
                        border: 'none',
                        color: 'var(--text-main)',
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        cursor: cLoading ? 'not-allowed' : 'pointer',
                        opacity: cLoading ? 0.7 : 1,
                        transition: 'opacity 0.15s ease',
                        boxShadow: '0 4px 14px rgba(255, 45, 141, 0.35)',
                      }}
                    >
                      {cLoading ? 'Submitting Organization Dossier...' : 'Submit Organization Application'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {/* Global Partner Architecture Pillars */}
        <section style={{ marginTop: '5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '4rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem auto' }}>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#ff2d8d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
              }}
            >
              Enterprise Provenance Architecture
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
              How the Sustainable Fulfillment Network Works
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-light)', lineHeight: 1.6 }}>
              A closed-loop system connecting customers, regional artisanal manufacturers, and verified climate non-profits with end-to-end telemetry.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.75rem',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.75rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#ff2d8d',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                Track 01
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Algorithmic Geo-Routing
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.55 }}>
                Incoming customer orders are programmatically assigned to certified studios located closest to the destination address, minimizing transit kilometers and avoiding intercontinental air freight.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.75rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#ff2d8d',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                Track 02
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Production Telemetry Logging
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.55 }}>
                Studios verify garment origin, organic thread weight, packaging materials, and machine power usage. Data is compiled into ISO 14064 Scope 1, 2, and 3 emission certificates.
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.75rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#ff2d8d',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                Track 03
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Statutory Direct Split Settlement
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.55 }}>
                Stripe payment split mechanisms instantly execute the 15% charity allocation alongside the studio fulfillment compensation, generating a verifiable public transaction ledger.
              </p>
            </div>
          </div>
        </section>

        {/* Global Operational FAQ Accordion */}
        <section style={{ marginTop: '5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '4rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem auto' }}>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: '#ff2d8d',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
              }}
            >
              Network Guidance & Operations
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-light)', lineHeight: 1.6 }}>
              Key technical and commercial answers regarding partner onboarding, qualification criteria, and settlement.
            </p>
          </div>

          <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'var(--bg-page)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span>{faq.q}</span>
                    <span
                      style={{
                        color: '#ff2d8d',
                        fontSize: '1.125rem',
                        transform: isOpen ? 'rotate(45deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      +
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: '0 1.5rem 1.25rem 1.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-light)',
                        lineHeight: 1.6,
                        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                        paddingTop: '0.85rem',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section
          style={{
            marginTop: '5rem',
            backgroundColor: 'var(--bg-page)',
            border: '1px solid rgba(255, 45, 141, 0.3)',
            borderRadius: '14px',
            padding: '3rem 2rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(255, 45, 141, 0.08) 0%, rgba(17, 23, 38, 0) 70%)',
              pointerEvents: 'none',
            }}
          />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', position: 'relative' }}>
            Ready to Verify Your Impact With Enterprise Provenance?
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-light)', maxWidth: '600px', margin: '0 auto 1.75rem auto', lineHeight: 1.6, position: 'relative' }}>
            Explore our live merchandise collection or access the institutional portal to view real-time cryptographic transaction telemetry.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', position: 'relative' }}>
            <Link
              to="/merch"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                backgroundColor: '#ff2d8d',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(255, 45, 141, 0.35)',
              }}
            >
              Browse Merchandise
            </Link>
            <Link
              to="/transparency"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                backgroundColor: '#0d121c',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Public Audit Ledger
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};
