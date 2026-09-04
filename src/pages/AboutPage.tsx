import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.5rem 0 4rem 0' }}>
      
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '2rem 1rem 3rem 1rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--accent-light)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            padding: '0.4rem 0.9rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-sky)',
            letterSpacing: '0.04em',
            marginBottom: '1rem',
          }}
        >
          <span className="radar-pulse" />
          <span>NICE CLASS 35 CONTINUOUS ASSURANCE & TRADEMARK AUTHENTICATION</span>
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.25, marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
          About GHG Logo Drop (NFTY LOGS®)
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '760px', margin: '0 auto 2rem auto', lineHeight: 1.55 }}>
          Leveraging digital technology, trademark optics, and continuous telemetry verification to ensure audit-readiness and trigger direct 15% ESG support for verified environmental funds.
        </p>
      </section>

      {/* Official Corporate Registration Card */}
      <section className="persefoni-card" style={{ marginBottom: '2.5rem', padding: '1.75rem', borderLeft: '4px solid var(--color-sky)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-sky)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              UNITED KINGDOM CORPORATE REGISTRATION
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
              NFTYLOGS LTD
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
              Company Number: <strong>15230476</strong> • Incorporated on <strong>24 October 2023</strong>
            </p>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <strong style={{ color: 'var(--text-main)' }}>Registered Office Address:</strong><br />
            20 Wenlock Road, London, England, N1 7GU
          </div>
        </div>
      </section>

      {/* The Core Climate Challenge & Digital Perspective */}
      <section className="persefoni-card" style={{ marginBottom: '2.5rem', padding: '2.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--color-sky)' }}>
          Our Perspective on Continuous Climate Assurance
        </h2>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>
            The issue of climate change is intensified by the unpredictable nature of greenhouse gas (GHG) emissions, which are evident in climate disasters worldwide.
          </p>
          <p>
            Achieving decarbonisation requires multifaceted empirical approaches. Under Nice Class 35 and ISO 14065 standards, we provide continuous telemetry verification, mandatory calibration gatekeepers, and immutable audit logs that protect organisations against greenwashing claims.
          </p>
          <p>
            We combine physical sensor telemetry with digital transparency to ensure corporate disclosure confidence and direct 15% funding to verified environmental initiatives.
          </p>
        </div>
      </section>

      {/* Trademark Logo Visual Symbol Explanation */}
      <section className="persefoni-card" style={{ marginBottom: '2.5rem', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/images/nfty-logs-logo.png"
              alt="NFTY LOGS Official Trademark Logo"
              style={{ width: '140px', height: '140px', objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(56, 189, 248, 0.25))' }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            TRADEMARK IDENTITY
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            The Story Behind Our Trademark Logo
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            A visual symbol of ancient Earth resilience and modern energy transition
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', marginBottom: '0.5rem' }}>
              The Green Pole
            </div>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              A straight green pole representing a pristine, ancient Earth dating back billions of years. The piercing pole illustrates human activities impacting the biosphere.
            </p>
          </div>

          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.5rem' }}>
              The Paris Agreement Pathway
            </div>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              The Paris Agreement introduced the pathway towards an energy transition to curb GHG emissions. Our optics and telemetry engines prompt a measurable culture of continuous reduction.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Core Climate Action Pillars */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            What We Offer — Continuous Climate Actions
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Auditing and authenticating greenhouse gas reductions across four core sectors:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          
          <div className="persefoni-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>PILLAR 01</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Energy Transition & Clean Tech
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Every industry within the value chain of the energy transition, including green hydrogen electrolysers, data centres, and industrial electrification under ISO 50001.
              </p>
            </div>
            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/licensing" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-sky)', textDecoration: 'none' }}>
                Explore B2B Licensing →
              </Link>
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>PILLAR 02</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Government Policy & SECR
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Logging and authenticating government policies, regional initiatives, and public sector developments to deliver lower costs and fail-safe outcomes worldwide.
              </p>
            </div>
            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/transparency" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-sky)', textDecoration: 'none' }}>
                View Transparency Ledger →
              </Link>
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>PILLAR 03</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Sports & Milestone Events
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Sports events and athletic competitions where euphoric moments are celebrated. Authenticated as physical keepsake drops with verified 15% ESG splits.
              </p>
            </div>
            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/souvenirs" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-sky)', textDecoration: 'none' }}>
                Custom Event Souvenirs →
              </Link>
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>PILLAR 04</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Keepsake Celebrations
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Birthday milestones, weddings, or personal goals on 100% organic heavyweight apparel with embedded ISO 14067 LCA carbon tags and artisan labor hours.
              </p>
            </div>
            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/merch" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-sky)', textDecoration: 'none' }}>
                Visit Keepsake Studio →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Box */}
      <section className="persefoni-card" style={{ textAlign: 'center', padding: '3rem 2rem', backgroundColor: 'var(--bg-subtle)' }}>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Ready for Continuous Climate Assurance?
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
          Ingest calibrated OT telemetry, lock baseline anomalies, and generate boardroom-ready PDF audit reports under Nice Class 35 standards.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/licensing" className="btn btn-primary">
            <span>Get Started with B2B Licensing</span>
            <span>→</span>
          </Link>
          <Link to="/portal/login" className="btn btn-secondary">
            <span>Launch Partner Console</span>
          </Link>
        </div>
      </section>

    </div>
  );
};
