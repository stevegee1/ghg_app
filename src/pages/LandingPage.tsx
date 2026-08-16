import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Typewriter } from '../components/Typewriter';

interface LandingPageProps {
  verificationLive?: boolean;
  jobReportingLive?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchLedger() {
      try {
        const res = await api.getTransparencyLedger();
        if (isMounted) setLedgerData(res);
      } catch (err) {
        if (isMounted) setLedgerData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLedger();
    return () => { isMounted = false; };
  }, []);

  const charityPercentage = ledgerData?.charityPercentage ?? 15;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* 50/50 Two-Column Hero Split Section with Clean All-Black Headline & Large Showcase Image */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-light)', padding: '3.5rem 1.5rem 4rem 1.5rem' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div className="responsive-grid-2" style={{ gap: '3rem', alignItems: 'center' }}>
            
            {/* Left Column: All-Black Headline, Subtitle & Dual CTAs */}
            <div>
              {/* Category Pill Tag */}
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#0f766e',
                  marginBottom: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#ccfbf1',
                  padding: '0.375rem 0.875rem',
                  borderRadius: '9999px',
                  border: '1px solid #99f6e4',
                }}
              >
                <span>GHG PROTOCOL ALIGNED CLIMATE ACTION INTERVENTION</span>
              </div>

              {/* Main Headline — 100% Solid Black, No Green Box Highlights */}
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.85rem, 3.8vw, 2.75rem)',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  marginBottom: '1.25rem',
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                }}
              >
                Manage Emissions, Authenticate Climate Actions & License Job Creation Reports
              </h1>

              {/* Subtitle Typewriter Section */}
              <div
                style={{
                  fontSize: '1.0625rem',
                  color: '#475569',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                  maxWidth: '540px',
                  minHeight: '4.2em',
                }}
              >
                <Typewriter
                  phrases={[
                    'While engaged… at the TIME in different geographical locations…',
                    'some are experiencing the devastating impacts of greenhouse gas emissions… flash floods, heat waves, extreme weather…',
                    'caused by the prolonged retention of carbon dioxide in the atmosphere…',
                    'transforming feelings of deep concern into a carbon-footprint culture…'
                  ]}
                  typeSpeedMs={45}
                  deleteSpeedMs={25}
                  holdMs={3500}
                  loop={true}
                  style={{ color: '#0f172a', fontWeight: 600 }}
                />
              </div>

              {/* Dual Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  to="/licensing"
                  className="btn btn-primary"
                  style={{
                    borderRadius: '9999px',
                    fontSize: '1rem',
                    padding: '0.875rem 2.25rem',
                    fontWeight: 600,
                    backgroundColor: '#0f766e',
                    borderColor: '#0f766e',
                    boxShadow: '0 4px 14px rgba(15, 118, 110, 0.35)',
                  }}
                >
                  Explore Corporate Licensing →
                </Link>

                <Link
                  to="/about"
                  className="btn btn-secondary"
                  style={{
                    borderRadius: '9999px',
                    fontSize: '1rem',
                    padding: '0.875rem 2.25rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    borderColor: '#cbd5e1',
                  }}
                >
                  Read About Us & Our Mission
                </Link>
              </div>
            </div>

            {/* Right Column: Prominent Larger Showcase Image Card */}
            <div>
              <div
                className="hero-showcase-card"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '480px',
                  borderRadius: '1.25rem',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.22)',
                  backgroundColor: '#0f172a',
                  border: '1px solid var(--border-medium)',
                  backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.15), rgba(15, 23, 42, 0.4)), url("/images/sky-hero.png")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Official Trademark Badge Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '1.25rem',
                    left: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.82)',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <img src="/images/nfty-logs-logo.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}></span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* GHG Protocol Inspired Dual Feature Cards */}
      <div style={{ maxWidth: '1080px', margin: '3rem auto 0 auto', padding: '0 1.5rem' }}>
        <div className="responsive-grid-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
          {/* Card 1: Companies and Organizations */}
          <div
            className="card"
            style={{
              marginBottom: 0,
              padding: '2.25rem',
              borderRadius: '1.25rem',
              boxShadow: '0 12px 30px -5px rgba(15, 23, 42, 0.08)',
              borderTop: '4px solid #0f766e',
              backgroundColor: '#ffffff',
            }}
          >
            <div className="greenly-tag" style={{ marginBottom: '0.875rem' }}>
              SCOPE 1, 2 & 3 FOOTPRINT PROOF
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Companies and Organizations
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Corporate innovations under licensing authentication with our GHG logo drop digital and physical optics—including electrolyser green hydrogen technologies replacing grey hydrogen.
            </p>
            <Link to="/licensing" className="btn btn-secondary" style={{ width: '100%', borderRadius: '9999px', padding: '0.75rem 1.5rem' }}>
              Corporate Emissions Proof & Licensing →
            </Link>
          </div>

          {/* Card 2: Countries, Cities & Public Sector */}
          <div
            className="card"
            style={{
              marginBottom: 0,
              padding: '2.25rem',
              borderRadius: '1.25rem',
              boxShadow: '0 12px 30px -5px rgba(15, 23, 42, 0.08)',
              borderTop: '4px solid #0284c7',
              backgroundColor: '#ffffff',
            }}
          >
            <div className="greenly-tag" style={{ marginBottom: '0.875rem', color: '#0284c7', borderColor: '#bae6fd' }}>
              PUBLIC GOVERNANCE & TRANSPARENCY
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Countries, Cities and Public Sector
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Logging government policies, municipal decarbonisation goals, and public sector developments to deliver lower costs, fail-safe outcomes, and verified gift routing.
            </p>
            <Link to="/transparency" className="btn btn-secondary" style={{ width: '100%', borderRadius: '9999px', padding: '0.75rem 1.5rem' }}>
              Audit Public Transparency Registry →
            </Link>
          </div>
        </div>
      </div>

      {/* Job Creation Reporting & Licensing Showcase Card */}
      <div style={{ maxWidth: '1080px', margin: '0 auto 3rem auto', padding: '0 1.5rem' }}>
        <div
          className="card"
          style={{
            padding: '2.5rem',
            borderRadius: '1.25rem',
            boxShadow: '0 15px 35px -5px rgba(15, 23, 42, 0.1)',
            borderLeft: '5px solid #0f766e',
            backgroundColor: '#ffffff',
          }}
        >
          <div className="responsive-grid-2" style={{ gap: '2rem', alignItems: 'center' }}>
            <div>
              <div className="greenly-tag" style={{ marginBottom: '0.875rem' }}>
                PARALLEL LICENSING CATEGORY
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>
                Job Creation Reporting & Licensed Claims
              </h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Partners report employment creation figures quarterly or annually via self-submitted portal forms or automated server-to-server B2B API integrations—displaying authenticated licensed claims on the public transparency ledger.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/portal/login" className="btn btn-primary" style={{ borderRadius: '9999px', padding: '0.625rem 1.5rem', fontSize: '0.875rem', backgroundColor: '#0f766e', borderColor: '#0f766e' }}>
                  Submit Job Report in Portal →
                </Link>
                <Link to="/transparency" className="btn btn-secondary" style={{ borderRadius: '9999px', padding: '0.625rem 1.5rem', fontSize: '0.875rem' }}>
                  Audit Public Transparency Ledger →
                </Link>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                DUAL INGESTION PATHWAYS
              </div>
              
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: '#ccfbf1', color: '#0f766e', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8125rem', flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Partner Portal Self-Submission</h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
                    Logged-in enterprise licensees submit period-based job creation figures directly through the partner portal form.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8125rem', flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Automated B2B API Trigger</h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.4 }}>
                    Server-to-server JSON API endpoint (<code>POST /api/b2b/job-report</code>) with secure API key authentication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Partner & Disaster Aid Split Banner */}
      <section
        style={{
          backgroundColor: '#0d9488',
          color: '#ffffff',
          padding: '2.75rem 1.5rem',
          textAlign: 'center',
          marginBottom: '3.5rem',
          borderRadius: '1rem',
          maxWidth: '1080px',
          margin: '0 auto 3.5rem auto',
        }}
      >
        <div style={{ maxWidth: '920px', margin: '0 auto' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
            Every licensed Logo Drop automatically routes a published <strong style={{ fontWeight: 800, fontSize: '1.5rem', textDecoration: 'underline' }}>{charityPercentage}%</strong> split directly to verified disaster relief partners and climate survivor aid, powering transparent decarbonisation worldwide.
          </p>
        </div>
      </section>

      {/* Four Pillars of Climate Action Section */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 1.5rem' }}>
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
            <div className="greenly-tag" style={{ marginBottom: '0.75rem' }}>CLIMATE ACTION PLATFORM</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700 }}>Four Climate Action Pillars</h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
              Logging, authenticating, and amplifying decarbonisation efforts across every sector of the energy transition
            </p>
          </div>

          <div className="responsive-grid-2" style={{ gap: '1.5rem' }}>
            {/* Pillar 01 */}
            <div className="card" style={{ padding: '2rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  PILLAR 01
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.625rem' }}>
                  Energy Transition & Electrolysers
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Authenticating corporate innovations in electrolyser technologies to produce green hydrogen, aiding the global move away from hydrocarbon-derived grey hydrogen.
                </p>
              </div>
              <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <Link to="/licensing" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                  Annual Emissions Proof & Licensing →
                </Link>
              </div>
            </div>

            {/* Pillar 02 */}
            <div className="card" style={{ padding: '2rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  PILLAR 02
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.625rem' }}>
                  Government Policies & Standards
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Logging public sector policies, municipal decarbonisation goals, and regional emissions standards to deliver lower costs and fail-safe outcomes.
                </p>
              </div>
              <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <Link to="/transparency" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                  Audit Public Transparency Ledger →
                </Link>
              </div>
            </div>

            {/* Pillar 03 */}
            <div className="card" style={{ padding: '2rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  PILLAR 03
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.625rem' }}>
                  ALL Sports & Celebration Souvenirs
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Authenticating athletic events and euphoric sports moments. Custom souvenir merchandise printed with the GHG Mark triggers immediate disaster relief funding.
                </p>
              </div>
              <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <Link to="/souvenirs" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                  Order Physical Event Souvenirs →
                </Link>
              </div>
            </div>

            {/* Pillar 04 */}
            <div className="card" style={{ padding: '2rem', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  PILLAR 04
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.625rem' }}>
                  Individual Gifts ("Whatever We Do")
                </h3>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Birthday presents and gifts carrying succinct climate warning messages with our GHG Logo Drop—transforming everyday merchandise into direct aid for climate survivors.
                </p>
              </div>
              <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <Link to="/merch" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                  Browse GHG Verified Merch →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Operational Workflow */}
        <section style={{ borderTop: '1px solid var(--border-light)', paddingTop: '3.5rem', marginBottom: '3.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700 }}>Platform Operating Workflow</h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
              Three steps powering financial compliance, Web3 provenance, and environmental gift routing
            </p>
          </div>

          <div className="responsive-grid-3" style={{ gap: '1.5rem', marginBottom: '3rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '2rem', borderRadius: '1.25rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.625rem' }}>01</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>License & Log Mark</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Corporates, governments, or individuals license official Logo Drops for software, physical products, or custom event merchandise.
              </p>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: '2rem', borderRadius: '1.25rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.625rem' }}>02</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Automated 85/15 Split</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Every transaction automatically routes a published 15% directly to disaster relief and environmental charity partners via Stripe Connect.
              </p>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: '2rem', borderRadius: '1.25rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.625rem' }}>03</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Web3 Provenance</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Transactions are permanently recorded on the public transparency registry and authenticated on OpenSea and Rarible marketplaces.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
