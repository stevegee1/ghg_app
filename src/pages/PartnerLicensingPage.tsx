import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const PartnerLicensingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 0 5rem 0' }}>
      
      {/* 1. Hero Section (Clean Google B2B Layout — Zero Badges) */}
      <section style={{ textAlign: 'center', padding: '2.5rem 1rem 3rem 1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 auto 0.75rem auto', letterSpacing: '-0.025em', maxWidth: '780px', lineHeight: 1.25 }}>
          The continuous climate assurance platform
        </h1>
        
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '720px', margin: '0 auto 2rem auto', lineHeight: 1.55 }}>
          Natively embedded anomaly detection, mandatory ISO 17025 sensor calibration verification, and automated compliance reporting for ISO 14064, ISO 50001, UK SECR, and EU CSRD.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/create-account" className="btn btn-primary" style={{ padding: '0.65rem 1.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <span>Sign Up Free</span>
            <span>→</span>
          </Link>
          <Link to="/portal/login" className="btn btn-secondary" style={{ padding: '0.65rem 1.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <span>Sign In to Console</span>
          </Link>
        </div>
      </section>

      {/* 2. Embedded Assurance Prominence Banner */}
      <section className="persefoni-card" style={{ padding: '1.5rem 2rem', marginBottom: '3rem', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid var(--color-sky)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            Continuous Assurance <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>natively embedded and accessible in every plan.</span>
          </div>
          <div>
            <Link to="/create-account" style={{ color: 'var(--color-sky)', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}>
              Create sandbox profile →
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Core Capabilities Bento Grid */}
      <section style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            What Continuous Climate Assurance Entails
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Four interconnected engines that guarantee audit readiness before external verification.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Statistical Anomaly Detection
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                High-frequency telemetry use cases require streaming millions of data points. Our engine detects statistical drift exceeding ±15% from calibrated baselines, locking report exports under ISO Clause 10.2 to prevent greenwashing liability.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--color-sky)', fontWeight: 700 }}>
              Milestone ISO-2 Verified
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Mandatory Calibration Gatekeeper
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Under ISO 50001 Clause 6.6 and ISO 14064-1, uncalibrated sensor data is rejected at the PostgreSQL trigger level. Sensors must hold a valid ISO/IEC 17025 certificate verified with SHA-256 cryptographic hashes before telemetry ingestion.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--color-sky)', fontWeight: 700 }}>
              Milestone ISO-1 Verified
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Audit Evidence Locker
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Maintains immutable, time-stamped proof of raw telemetry payloads, meter calibration records, and non-conformance remediation logs protected by strict row-level security (RLS) and statutory non-brokerage rules.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--color-sky)', fontWeight: 700 }}>
              Milestone ISO-3 & ISO-5 Verified
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Boardroom PDF Dossier Generator
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Compiles comprehensive audit dossiers watermarked with cryptographic SHA-256 seals, designed specifically for external registrars (BSI, TÜV, DNV, KPMG) to achieve first-pass ISO 14064 and ISO 50001 certification.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--color-sky)', fontWeight: 700 }}>
              Milestone ISO-4 Verified
            </div>
          </div>

        </div>
      </section>

      {/* 4. Enterprise Continuous Assurance Plans */}
      <section style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Enterprise Continuous Assurance Plans
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Choose the assurance tier tailored to your reporting and industrial telemetry requirements.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Plan 1 */}
          <div className="persefoni-card" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Statutory Compliance
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Ideal for organizations required to file annual UK SECR, EU CSRD, California SB 253, or UAE SCA ESG disclosures.
              </p>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Included Features:</div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  <li>Annual Scope 1, 2, and 3 carbon accounting</li>
                  <li>UK SECR, EU CSRD, and UAE SCA reporting packs</li>
                  <li>ISO 14001 & ISO 50001 system readiness diagnostics</li>
                  <li>ISO 19011:2026 Annex A remote review seals</li>
                  <li>Cryptographic SHA-256 watermark seals</li>
                  <li>Boardroom PDF Report Generation</li>
                </ul>
              </div>
            </div>

            <Link to="/create-account" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
              Sign Up Free
            </Link>
          </div>

          {/* Plan 2 */}
          <div className="persefoni-card" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '2px solid var(--color-sky)' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Continuous OT Telemetry
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Continuous assurance for data centres, industrial power sub-meters, and green hydrogen electrolyzers.
              </p>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Everything in Tier 1, plus:</div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  <li>80% remote audit execution under ISO 19011:2026</li>
                  <li>Live PDU, SCADA, & sub-meter telemetry streaming</li>
                  <li>ISO 17025 Database Calibration Gatekeeper</li>
                  <li>±15% Baseline Anomaly Lock Engine (HTTP 423)</li>
                  <li>ISO Clause 10.2 non-conformance incident logs</li>
                  <li>Dedicated audit evidence locker</li>
                </ul>
              </div>
            </div>

            <Link to="/create-account" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
              Sign Up Free →
            </Link>
          </div>

          {/* Plan 3 */}
          <div className="persefoni-card" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Dual-Impact Enterprise
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Complete continuous telemetry assurance, Survivors Donation Keepsake licensing, and Section 106 job creation.
              </p>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Everything in Tier 2, plus:</div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  <li>Survivors Donation Keepsake studio licensing & LCA tags</li>
                  <li>Automated 15.00% ESG charitable routing</li>
                  <li>Section 106 green job tracking & covenants</li>
                  <li>Dedicated external auditor portal access</li>
                  <li>Custom SLA & regulatory defense advisory</li>
                </ul>
              </div>
            </div>

            <Link to="/portal/login" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
              Contact Enterprise Sales
            </Link>
          </div>

        </div>
      </section>

      {/* 4b. Preparation Services Pricing Schedule */}
      <section style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Statutory Preparation Services
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            ISO 14001/50001 & ISO 19011:2026 Preparation Pricing
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '0.5rem', maxWidth: '640px', margin: '0.5rem auto 0 auto' }}>
            Fixed-price automated preparation tiers designed for swift, uncompromised certification before external auditor arrival.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tier 1 Readiness
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.35rem 0' }}>
                Single-Site Remote Readiness
              </h3>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', margin: '0.75rem 0' }}>
                £1,250 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ assessment</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Single-site ISO 14001 / ISO 50001 energy and environmental diagnostic with remote ICT verification certificate.
              </p>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li>Baseline telemetry gap evaluation</li>
                <li>ISO 19011:2026 Annex A remote review stamp</li>
                <li>72-hour turnaround time</li>
              </ul>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/create-account" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
                Order Preparation →
              </Link>
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--color-sky)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-sky)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tier 2 Protocol (Recommended)
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.35rem 0' }}>
                Continuous Assurance Protocol
              </h3>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)', margin: '0.75rem 0' }}>
                £3,500 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ quarter</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Continuous telemetry indexing, 80% remote audit protocol compliance, and quarterly SECR & UAE SCA draft dossiers.
              </p>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li>Automated ISO 17025 sensor calibration gatekeeper</li>
                <li>±15% baseline drift lock and alert dispatch</li>
                <li>Continuous evidence locker synchronization</li>
              </ul>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/create-account" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Enroll Facility →
              </Link>
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tier 3 Global
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.35rem 0' }}>
                Enterprise Multi-Jurisdiction
              </h3>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', margin: '0.75rem 0' }}>
                £8,500 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ year</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Unified statutory compliance package for UK SECR, EU CSRD ESRS, California SB 253/261, and UAE Cabinet Resolution Net Zero 2050.
              </p>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li>Multi-facility aggregation and consolidation</li>
                <li>Direct external registrar portal access</li>
                <li>Dedicated regulatory defense advisory</li>
              </ul>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/portal/login" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
                Request Consultation →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 4c. Key Industry Verticals (Anchor Targets) */}
      <section id="verticals" style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            SPECIALISED INDUSTRIAL PROTOCOLS
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Industry Verticals & Sector Coverage
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '0.5rem', maxWidth: '640px', margin: '0.5rem auto 0 auto' }}>
            Deep operational telemetry protocols built for mission-critical clean energy, computation, and manufacturing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          <div id="datacentres" className="persefoni-card" style={{ padding: '2rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>VERTICAL 01</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Hyperscale Data Centres</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Real-time Power Usage Effectiveness (PUE) and Water Usage Effectiveness (WUE) tracking. Automated alert dispatch upon ±15% PUE variance from calibrated PDU baseline.
            </p>
            <ul style={{ paddingLeft: '1.2rem', margin: '0.75rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>ISO 50001 Energy Management compliance</li>
              <li>EU Energy Efficiency Directive (EED) telemetry logging</li>
            </ul>
          </div>

          <div id="hydrogen" className="persefoni-card" style={{ padding: '2rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>VERTICAL 02</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Green Hydrogen & DRI</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Electrolyser stack telemetry with gas chromatograph calibration gatekeeper, ensuring 99.97% H2 purity validation under ISO 22734 standards.
            </p>
            <ul style={{ paddingLeft: '1.2rem', margin: '0.75rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>ISO 22734 / ISO 14064-1 emission baselines</li>
              <li>Direct-Reduced Iron (DRI) steelmaking audit readiness</li>
            </ul>
          </div>

          <div id="manufacturing" className="persefoni-card" style={{ padding: '2rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>VERTICAL 03</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Industrial Manufacturing</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              High-voltage sub-meter and thermal flow meter streaming with automated UK SECR and EU CSRD Scope 1 & 2 draft filings.
            </p>
            <ul style={{ paddingLeft: '1.2rem', margin: '0.75rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>ISO 17025 calibration expiry enforcement</li>
              <li>Scope 1-3 cradle-to-gate GHG inventory dossiers</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Case Study / Quote Block */}
      <section className="persefoni-card" style={{ padding: '3rem', marginBottom: '4rem', backgroundColor: '#0f172a', color: '#ffffff', border: 'none' }}>
        <blockquote style={{ fontSize: '1.15rem', lineHeight: 1.7, color: '#e2e8f0', margin: '0 0 1.5rem 0', fontStyle: 'normal' }}>
          "Continuous telemetry assurance detected a 14.8% calibration drift in our data center sub-metering infrastructure three weeks before our statutory audit. Being able to isolate the sensor and log the ISO non-conformance before filing saved our executive team from severe greenwashing exposure."
        </blockquote>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-sky)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#ffffff' }}>
            OT
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>Director of Infrastructure Operations</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Hyperscale CleanTech Infrastructure</div>
          </div>
        </div>
      </section>

      {/* 6. Bottom Sign Up & Sign In CTA */}
      <section className="persefoni-card" style={{ textAlign: 'center', padding: '3.5rem 2rem', backgroundColor: 'var(--bg-subtle)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          Ready to achieve continuous audit readiness?
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
          Set up your organization's client profile in under 60 seconds. Free access to sensor calibration gatekeepers and anomaly simulators.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/create-account" className="btn btn-primary" style={{ padding: '0.85rem 2rem' }}>
            <span>Sign Up Free</span>
            <span>→</span>
          </Link>
          <Link to="/portal/login" className="btn btn-secondary" style={{ padding: '0.85rem 2rem' }}>
            <span>Sign In to Console</span>
          </Link>
        </div>
      </section>

    </div>
  );
};
