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
              Create sandbox tenant →
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
                Multi-Tenant Evidence Locker
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Maintains immutable, time-stamped proof of raw telemetry payloads, meter calibration records, and non-conformance remediation logs protected by strict row-level security (RLS) and Nice Class 35 non-brokerage rules.
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
                Ideal for organizations required to file annual UK SECR, EU CSRD, or California SB 253 disclosures.
              </p>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Included Features:</div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  <li>Annual Scope 1, 2, and 3 accounting</li>
                  <li>UK SECR & EU CSRD reporting packs</li>
                  <li>5-Pillar Speedometer Risk Scorecard</li>
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
                  <li>Live PDU, SCADA, & sub-meter telemetry streaming</li>
                  <li>ISO 17025 Database Calibration Gatekeeper</li>
                  <li>±15% Baseline Anomaly Lock Engine (HTTP 423)</li>
                  <li>ISO Clause 10.2 non-conformance incident logs</li>
                  <li>Dedicated multi-tenant evidence locker</li>
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
                Complete continuous telemetry assurance, custom keepsake studio licensing, and Section 106 job creation.
              </p>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Everything in Tier 2, plus:</div>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  <li>Milestone Keepsake Studio licensing & LCA tags</li>
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
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', letterSpacing: '-0.025em' }}>
          Ready to achieve continuous audit readiness?
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
          Set up your organization's sandbox tenant in under 60 seconds. Free access to sensor calibration gatekeepers and anomaly simulators.
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
