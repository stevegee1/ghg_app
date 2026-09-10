import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', minHeight: '100vh', borderBottom: '1px solid var(--border-light)' }}>
      {/* Greenly-Style Breadcrumb Bar */}
      <div className="container-x frame-bordered" style={{ borderBottom: '1px solid var(--border-light)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GHGEmissionLogs</Link>
        <span>&gt;</span>
        <span>Company</span>
        <span>&gt;</span>
        <span style={{ color: 'var(--color-sky)', fontWeight: 600 }}>About & Corporate Governance</span>
      </div>

      <div className="container-x frame-bordered" style={{ padding: '2.5rem 1.5rem 4rem 1.5rem' }}>
        
        {/* Hero Section */}
        <section style={{ textAlign: 'center', padding: '1rem 0 3rem 0', borderBottom: '1px solid var(--border-light)', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--accent-light)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-sky)',
              letterSpacing: '0.04em',
              marginBottom: '1rem',
            }}
          >
            <span className="radar-pulse" />
            <span>CONTINUOUS STATUTORY ASSURANCE & TRADEMARK AUTHENTICATION</span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '0.75rem', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            About GHG Logo Drop (NFTY LOGS®)
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '760px', margin: '0 auto', lineHeight: 1.6 }}>
            Leveraging digital technology, trademark optics, and continuous telemetry verification to ensure audit-readiness and trigger direct 15% ESG support for verified environmental funds.
          </p>
        </section>

        {/* Official Corporate Registration Card */}
        <section className="persefoni-card" style={{ marginBottom: '2.5rem', padding: '1.75rem', borderLeft: '4px solid var(--color-sky)', borderRadius: 'var(--radius-md)' }}>
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
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <strong style={{ color: 'var(--text-main)' }}>Registered Office Address:</strong><br />
              20 Wenlock Road, London, England, N1 7GU
            </div>
          </div>
        </section>

        {/* The Core Climate Challenge & Digital Perspective */}
        <section className="persefoni-card" style={{ marginBottom: '2.5rem', padding: '2rem', borderRadius: 'var(--radius-md)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--color-sky)' }}>
          Our Perspective on Continuous Climate Assurance
        </h2>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>
            The issue of climate change is intensified by the unpredictable nature of greenhouse gas (GHG) emissions, which are evident in climate disasters worldwide.
          </p>
          <p>
            Achieving decarbonisation requires multifaceted empirical approaches. Under statutory ISO 14065 standards, we provide continuous telemetry verification, mandatory calibration gatekeepers, and immutable audit logs that protect organisations against greenwashing claims.
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

      {/* 5. Statutory Compliance & Legal Framework */}
      <section id="compliance" className="persefoni-card" style={{ marginBottom: '3rem', padding: '2.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          REGULATORY COMPLIANCE & LEGAL FIREWALL
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Statutory Standards & UK CMA Governance
        </h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
          GHG Emission Logs operates strictly under international standard protocols and UK Competition and Markets Authority (CMA) Green Claims Code rules. All verified attestations require empirical, non-brokerage evidence.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>ISO 19011:2026 Remote Audit</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Annex A.16 digital data verification allows up to 80% remote audit completion, reducing travel emissions and operational friction.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>UK CMA Anti-Greenwashing</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Automated linter checks prohibit unsubstantiated claims ("100% green", "carbon neutral") and mandates transparent lifecycle data.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>Statutory 85/15 Separation</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Database triggers enforce that 85% is strictly allocated to software licensing and 15% directly to disaster relief endowments.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Security & Multi-Tenancy Architecture */}
      <section id="security" className="persefoni-card" style={{ marginBottom: '3rem', padding: '2.5rem', borderRadius: 'var(--radius-md)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          ENTERPRISE SECURITY SPECIFICATION
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Security & Cryptographic Architecture
        </h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
          Engineered to Google Cloud Console enterprise security standards. Telemetry streams and audit evidence are cryptographically sealed and isolated at the database layer.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>PostgreSQL Row-Level Security</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Tenant isolation enforced at the SQL engine level using session variables (<code style={{ fontSize: '0.75rem' }}>app.current_licensee_id</code>).
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>SHA-256 Watermark Seals</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Audit reports, calibration certificates, and evidence dockets are indexed with irreversible SHA-256 cryptographic hashes.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>End-to-End Authentication</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              JWT session tokens with bcrypt-hashed passwords, SHA-256 reset digests, and API key authentication for SCADA telemetry.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Privacy Policy & Data Retention */}
      <section id="privacy" className="persefoni-card" style={{ marginBottom: '3rem', padding: '2.5rem', borderRadius: 'var(--radius-md)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          DATA PROTECTION & PRIVACY STATEMENT
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Privacy Policy & GDPR/UK DPA 2018 Commitments
        </h2>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <p>
            NFTYLOGS LTD ("GHGEmissionLogs") adheres strictly to the UK Data Protection Act 2018 and the General Data Protection Regulation (GDPR). We collect and process corporate telemetry and authorized user account information solely to provide statutory climate assurance and workforce compliance services.
          </p>
          <p>
            <strong>Data Minimisation:</strong> We only process technical operational data (meter identifiers, kWh, gas purity, PUE metrics) and authorized auditor credentials. No consumer tracking cookies or unsolicited marketing profiling are employed.
          </p>
          <p>
            <strong>Data Retention & Rights:</strong> Raw telemetry records are maintained for statutory audit periods (7 years) in accordance with UK corporate governance standards. Organizations may request data exports or rectification via the authorized Client Console or by contacting our data protection officer at <span style={{ color: 'var(--color-sky)', fontWeight: 600 }}>compliance@nftylogslabs.com</span>.
          </p>
        </div>
      </section>

      {/* 8. Addendum B Master Licensing Contract */}
      <section id="contract" className="persefoni-card" style={{ marginBottom: '3rem', padding: '2.5rem', borderRadius: 'var(--radius-md)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          CONTRACTUAL TERMS
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Addendum B — Statutory Assurance Master Licensing Terms
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
          Enterprise licensee contracts incorporate standard Addendum B statutory provisions establishing non-brokerage separation, ISO calibration integrity requirements, and automated 15% disaster relief routing.
        </p>
        <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-main)' }}>Key Covenant: Section X Non-Brokerage Clause:</strong><br />
          "The Licensor operates solely as a statutory software and diagnostic assurance provider. The Licensor is not a carbon credit broker, trader, or financial intermediary. All assurance fees are strictly fixed under published statutory rates."
        </div>
      </section>

      {/* CTA Box */}
      <section className="persefoni-card" style={{ textAlign: 'center', padding: '3rem 2rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Ready for Continuous Climate Assurance?
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
          Ingest calibrated OT telemetry, lock baseline anomalies, and generate boardroom-ready PDF audit reports under continuous assurance standards.
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
    </div>
  );
};
