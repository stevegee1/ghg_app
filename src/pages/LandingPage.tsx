import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { RiskSpeedometer } from '../components/RiskSpeedometer';
import { CmaClaimsLinter } from '../components/CmaClaimsLinter';

export const LandingPage: React.FC = () => {
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDemoTab, setActiveDemoTab] = useState<'CALIBRATION' | 'ANOMALY' | 'SCORECARD' | 'CMA' | 'JOBS'>('CALIBRATION');

  // Simulator States
  const [simulatedPue, setSimulatedPue] = useState<number>(1.14);
  const [simulatedSensor, setSimulatedSensor] = useState<'PDU' | 'H2' | 'WATER'>('PDU');

  // Section 106 Workforce Simulator States
  const [simJobsWorkers, setSimJobsWorkers] = useState<number>(100);
  const [simJobsLocal, setSimJobsLocal] = useState<number>(28);
  const [simJobsApprentices, setSimJobsApprentices] = useState<number>(6);
  const [simJobsLivingWage, setSimJobsLivingWage] = useState<boolean>(true);

  // Live Animated Hero Demo Card States
  const [liveDrops, setLiveDrops] = useState<number>(958356);
  const [livePurity, setLivePurity] = useState<number>(99.97);
  const [livePue, setLivePue] = useState<number>(1.12);
  const [pulseCount, setPulseCount] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveDrops((prev) => prev + Math.floor(Math.random() * 3) + 1);
      setLivePurity((prev) => (prev === 99.97 ? 99.98 : 99.97));
      setLivePue((prev) => (prev === 1.12 ? 1.13 : 1.12));
      setPulseCount(true);
      const timer = setTimeout(() => setPulseCount(false), 500);
      return () => clearTimeout(timer);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

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

  const totalDrops = ledgerData?.totalSettledTransactions ?? 12480;
  const totalCharityCents = ledgerData?.totalCharityGiftCents ?? 34500000;
  const totalCharityPounds = (totalCharityCents / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  // Anomaly math for simulator (baseline = 1.14)
  const pueVariance = Math.abs((simulatedPue - 1.14) / 1.14) * 100;
  const isAnomalyLocked = pueVariance > 15.0;

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-main)', transition: 'all 0.25s ease', width: '100%', overflowX: 'hidden' }}>
      
      {/* 1. Greenly-Style Architectural Hero Section (Framed with Our Blue) */}
      <section style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container-x frame-bordered" style={{ paddingTop: '1.25rem', paddingBottom: '3.5rem' }}>
          
          {/* Official UK Corporate Registration & Protocol Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-sky)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: 'var(--accent-light)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
              <span className="radar-pulse" style={{ width: '6px', height: '6px' }} />
              NFTY LOGS® CONTINUOUS ASSURANCE
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              UK Registered Corporation No. <strong>15230476</strong> • ISO 14065 &amp; UK CMA Certified
            </span>
          </div>

          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3rem' }}>
            
            {/* Left Hero Column */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                <span>Continuous Assurance Protocol</span>
              </div>

              <h1
                className="h1"
                style={{
                  fontSize: 'clamp(2.3rem, 4vw, 3.25rem)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  marginBottom: '1.25rem',
                  color: 'var(--text-main)',
                  letterSpacing: '-0.025em',
                }}
              >
                Data-driven IT &amp; Industrial Decarbonisation
              </h1>

              <p
                className="p-medium"
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  marginBottom: '1.75rem',
                  maxWidth: '560px',
                }}
              >
                Automate your Scope 1, 2 &amp; 3 emissions, IoT telemetry, and Section 106 workforce covenants: turn statutory compliance into an auditable advantage with continuous data-driven carbon accounting.
              </p>

              {/* Action Buttons & Statutory Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link
                    to="/create-account"
                    className="btn btn-primary"
                    style={{
                      padding: '0.75rem 1.85rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                    }}
                  >
                    <span>Start with GHGEmissionLogs</span>
                    <span>→</span>
                  </Link>

                  <Link
                    to="/portal/login"
                    className="btn btn-secondary"
                    style={{
                      padding: '0.75rem 1.65rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                    }}
                  >
                    <span>Sign In to Console</span>
                    <span>→</span>
                  </Link>
                </div>

                {/* Real Statutory Credentials & Firewall Protections */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-green)', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-green)', display: 'inline-block' }} />
                    UK CMA Green Claims Code Validated
                  </span>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span>ISO 19011:2026 Remote Auditing</span>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span style={{ color: 'var(--color-sky)', fontWeight: 600 }}>15% Direct Environmental Relief</span>
                </div>
              </div>
            </div>

            {/* Right Hero: Persefoni-Style Multi-Card Dashboard Visual Mockup with Greenly Reduction Chip */}
            <div
              className="persefoni-card"
              style={{
                position: 'relative',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {/* Greenly-style top reduction badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '4px', color: '#047857', fontSize: '0.75rem', fontWeight: 700 }}>
                  <span>Reduction:</span>
                  <span style={{ backgroundColor: '#10b981', color: '#ffffff', fontSize: '0.625rem', padding: '1px 5px', borderRadius: '2px' }}>100%</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>-300 tCO2e</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>LIVE AUDIT #8819</span>
              </div>

              {/* Central Floating Company Profile Box */}
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  padding: '1.25rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase' }}>
                    CLIMATE PROFILE
                  </div>
                  <span style={{ backgroundColor: '#0f172a', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                    DEMO
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.2rem 0' }}>
                  Apex Hyperscale Corp.
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Leading clean-tech data infrastructure specializing in green hydrogen &amp; continuous energy optimization.
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>Sector: Clean Technology</span>
                  <span>Jurisdiction: United Kingdom</span>
                  <span style={{ color: 'var(--color-sky)' }}>apex-hyperscale.internal</span>
                </div>
              </div>

              {/* Floating Metric Card Overlap */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>2026 Total Calculated Drops</div>
                    <span className="radar-pulse" style={{ width: '6px', height: '6px' }} />
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: pulseCount ? 'var(--color-sky)' : 'var(--text-main)',
                      marginTop: '0.2rem',
                      fontFamily: 'var(--font-mono)',
                      transition: 'color 0.4s ease',
                    }}
                  >
                    {liveDrops.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>drops</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-green)', fontWeight: 700, marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                    ● 15% ESG Split: £{Math.round(liveDrops * 0.054).toLocaleString()}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Footprint Analytics</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-sky)', fontWeight: 700, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-sky)' }} />
                    <span>PUE {livePue} (ISO 50001)</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-green)', fontWeight: 700, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }} />
                    <span>94.6% Thermal Re-Use</span>
                  </div>
                </div>
              </div>

              {/* Equipment / Sensor Callout Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600 }}>EV-Fleet-Truck-1802 (Heavy Duty)</span>
                  <span style={{ color: 'var(--color-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="radar-pulse" style={{ width: '6px', height: '6px' }} />
                    <span>Fuel Verified</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600 }}>NH-Gen-011 (H2 Electrolyzer)</span>
                  <span style={{ color: 'var(--color-sky)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-sky)' }} />
                    <span>{livePurity.toFixed(2)}% Purity</span>
                  </span>
                </div>
              </div>

              {/* Framework Badges */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  TCFD / ISO 14064
                </span>
                <span style={{ fontSize: '0.68rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  SECR / CSRD Disclosures
                </span>
                <span style={{ fontSize: '0.68rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  CDP Aligned
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Statutory Standards Wall (Architectural 1px Cell Divider Standard) */}
      <section style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="container-x frame-bordered" style={{ padding: 0 }}>
          <div style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-greyscale-8)', borderBottom: '1px solid var(--border-light)' }}>
            STATUTORY COMPLIANCE FRAMEWORKS &amp; VERIFIED CALIBRATION STANDARDS
          </div>
          
          <div className="logo-cell-grid">
            {[
              { name: 'ISO 14064-1', sub: 'GHG Inventories (Scope 1-3)' },
              { name: 'ISO 50001', sub: 'Energy Management & PUE' },
              { name: 'ISO 14067', sub: 'Product Carbon LCA Tags' },
              { name: 'ISO/IEC 17025', sub: 'Laboratory Calibration' },
              { name: 'ISO 19011:2026', sub: 'Annex A.16 Remote Audits' },
              { name: 'UK SECR', sub: 'Companies Act Regulated' },
              { name: 'EU CSRD', sub: 'ESRS E1 Climate Standard' },
              { name: 'CA SB 253', sub: 'Scope 1-3 Data Accountability' },
            ].map((std) => (
              <div key={std.name} className="logo-cell">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                    {std.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {std.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Architectural Ticker Ribbon with Real Platform Guarantees */}
          <div className="greenly-ticker">
            <div className="greenly-ticker-item">
              <span style={{ color: 'var(--color-sky)', fontSize: '0.9rem' }}>●</span>
              <span><strong>80% Remote Audits</strong> — ISO 19011:2026 Annex A</span>
            </div>
            <div className="greenly-ticker-item">
              <span style={{ color: 'var(--color-green)', fontSize: '0.9rem' }}>●</span>
              <span><strong>Zero Brokerage Conflict</strong> — Section X Software Firewall</span>
            </div>
            <div className="greenly-ticker-item">
              <span style={{ color: 'var(--color-sky)', fontSize: '0.9rem' }}>●</span>
              <span><strong>100% Calibrated Hardware</strong> — ISO 17025 Gatekeeper</span>
            </div>
            <div className="greenly-ticker-item">
              <span style={{ color: 'var(--color-green)', fontSize: '0.9rem' }}>●</span>
              <span><strong>15% ESG Split</strong> — Automated Charity Disbursements</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Greenly 4-Card Value Grid: Key but Complex in Digital Landscape */}
      <section style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '4rem 0' }}>
        <div className="container-x frame-bordered">
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3rem auto' }}>
            <h2 className="h2" style={{ marginBottom: '1rem' }}>
              Emission Measurement is Key but Complex in the Digital Landscape
            </h2>
            <p className="p-medium">
              Enterprise technology environments involve multi-tenant cloud platforms, distributed hardware, and intricate Scope 3 supplier contracts.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '1.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <h4 className="h4" style={{ marginBottom: '0.5rem' }}>Infrastructure Ambiguity</h4>
              <p className="p-small">Difficulty to ascertain verifiable sustainability credentials and real PUE across hybrid cloud and data center estates.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '1.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h4 className="h4" style={{ marginBottom: '0.5rem' }}>Multi-Jurisdiction Filing</h4>
              <p className="p-small">Complexities in reporting statutory metrics across the UK SECR, EU CSRD ESRS, California SB 253, and UAE ESG mandates.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '1.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h4 className="h4" style={{ marginBottom: '0.5rem' }}>Supplier &amp; Workforce Scrutiny</h4>
              <p className="p-small">Enterprise procurement teams and planning authorities now prioritize verified ESG and local workforce covenant compliance.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '1.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <h4 className="h4" style={{ marginBottom: '0.5rem' }}>Auditable Competitive Edge</h4>
              <p className="p-small">Upholding ISO 14001/50001 certification under ISO 19011:2026 remote auditing is fundamental to winning enterprise bids.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Standards Compliance Grid (Greenly Architectural 1px Cell Dividers) */}
      <section style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container-x frame-bordered" style={{ padding: 0 }}>
          <div style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-greyscale-8)', borderBottom: '1px solid var(--border-light)' }}>
            COMPLY WITH THE WORLD&apos;S TOP STANDARDS
          </div>

          <div className="logo-cell-grid">
            {[
              { id: 'ISO 14064-1', sub: 'GHG Assurance' },
              { id: 'ISO 50001', sub: 'Energy Management' },
              { id: 'GHG Protocol', sub: 'Scope 1-3 Accounting' },
              { id: 'UK SECR', sub: 'Companies Act' },
              { id: 'EU CSRD', sub: 'ESRS Alignment' },
              { id: 'TCFD / CDP', sub: 'Financial Governance' },
              { id: 'ISO 19011:2026', sub: 'Remote ICT Audits' },
            ].map((std) => (
              <div key={std.id} className="logo-cell">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                    {std.id}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {std.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2b. ISO 19011:2026 Remote Auditing & Evidence Ledger Architecture */}
      <section style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ maxWidth: '820px', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
              Statutory Remote Verification Protocol
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
              80% Remote Auditing via Trademarked Digital Data Protocol
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.6 }}>
              Under the newly published ISO 19011:2026 guidelines, corporate operators can conduct 80% of management audits remotely through our accredited digital data protocol, significantly reducing client on-site disruption, operational footprint, and corporate travel emissions.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* Card 1: Evidence Ledger & Annex A Isolation */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.75rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Deploying the Evidence Ledger
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Integrated Audit Report Matrix
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                When logging operational metrics, every entry is systematically stamped:
              </p>
              <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-sky)', lineHeight: 1.5 }}>
                Evidence verified via Remote ICT Review in strict compliance with ISO 19011:2026 Annex A.
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                This immutable ledger stamp isolates our continuous data protocol from risks of regulatory greenwashing and compliance pushback during external assurance reviews.
              </p>
            </div>

            {/* Card 2: Multi-Jurisdiction Statutory Disclosures */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.75rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Global Regulatory Matrix
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Unified International Filings
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Single-source telemetry mapped directly to four statutory disclosure regimes:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  UK SECR / Companies Act
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  EU CSRD / ESRS E1
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  California SB 253 / 261
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                  UAE SCA / ADX-DFM ESG
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                Full conformity with UAE Cabinet Resolution on the Green Agenda and UAE Net Zero 2050 framework.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Feature Section 1: "Measure, Report, Decarbonize." */}
      <section style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '4rem 0' }}>
        <div className="container-x frame-bordered">
          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                CARBON MANAGEMENT
              </div>
              <h2 className="h2" style={{ marginBottom: '1rem' }}>
                Measure, Report, Decarbonize.
              </h2>
              <p className="p-medium" style={{ marginBottom: '1.5rem' }}>
                Scope 1, 2, and 3 carbon footprints for businesses of all sizes and complexities, verified against real-world energy and fuel telemetry.
              </p>
              <Link to="/licensing#plans" className="btn btn-secondary" style={{ borderRadius: '4px' }}>
                <span>Explore our plans</span>
                <span>→</span>
              </Link>
            </div>

            {/* Scope 1, 2, 3 Clean Architectural Card */}
            <div
              className="persefoni-card"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                padding: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                <div>
                  <span style={{ color: '#ea580c' }}>● Scope 1:</span> 277.1 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tCO2e</span>
                </div>
                <div>
                  <span style={{ color: 'var(--accent-primary)' }}>● Scope 2:</span> 166.1 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tCO2e</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-green)' }}>● Scope 3:</span> 664.8 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tCO2e</span>
                </div>
              </div>

              {/* Scope Waterfall Progress Bar */}
              <div style={{ display: 'flex', height: '10px', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                <div style={{ width: '25%', backgroundColor: '#ea580c' }} />
                <div style={{ width: '15%', backgroundColor: 'var(--accent-primary)' }} />
                <div style={{ width: '60%', backgroundColor: 'var(--color-green)' }} />
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Continuous assurance algorithms automatically verify Scope 1 &amp; 2 boundary data against primary IoT telemetry before generating statutory disclosures.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Feature Section 2: Statutory Regulation Reporting & Nature Restoration */}
      <section style={{ backgroundColor: 'var(--bg-page)', borderBottom: '1px solid var(--border-light)', padding: '4rem 0' }}>
        <div className="container-x frame-bordered">
          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3rem' }}>
            
            {/* Nature Restoration & Statutory Climate Assurance Image */}
            <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
              <img
                src="/images/nature-assurance.jpg"
                alt="Natural Geothermal Ecosystem & Climate Restoration"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                REGULATORY REPORTING
              </div>
              <h2 className="h2" style={{ marginBottom: '1rem' }}>
                Assurance-grade GHG emissions reporting and verifiable nature-positive climate impact.
              </h2>

              <p className="p-medium" style={{ marginBottom: '1.5rem' }}>
                Pre-configured for UK SECR, EU CSRD, California SB 253/261, and ISO 14064 standards with immutable cryptographic SHA-256 data watermarks and direct 15% ESG fund routing to verified local nature projects.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/about#compliance" className="btn btn-secondary" style={{ borderRadius: '4px' }}>
                  <span>Regulatory Reporting</span>
                  <span>→</span>
                </Link>
                <Link to="/transparency" className="btn btn-secondary" style={{ borderRadius: '4px' }}>
                  <span>Investor Reporting</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Feature Section 3: Decarbonization Management */}
      <section style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '4rem 0' }}>
        <div className="container-x frame-bordered">
          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3rem' }}>
            
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                DECARBONISATION STRATEGY
              </div>
              <h2 className="h2" style={{ marginBottom: '1rem' }}>
                Net-zero target setting, reduction modeling, and supplier engagement.
              </h2>

              <p className="p-medium" style={{ marginBottom: '1.5rem' }}>
                Continuous sensor models tracking 15% anomaly variance limits and supplier compliance scorecards under ISO Clause 10.2.
              </p>

              <Link to="/portal/login" className="btn btn-primary" style={{ borderRadius: '4px' }}>
                <span>Decarbonization Management</span>
                <span>→</span>
              </Link>
            </div>

            {/* Reduction Ambition Card */}
            <div
              className="persefoni-card"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                padding: '2rem',
              }}
            >
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: '4px', border: '1px solid var(--border-light)', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reduction Ambition</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Annual reduction trajectory</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)', margin: '0.35rem 0', fontFamily: 'var(--font-mono)' }}>
                  100 <span style={{ fontSize: '1.1rem' }}>%</span>
                </div>
              </div>

              {/* Trajectory SVG Graph */}
              <svg viewBox="0 0 320 80" style={{ width: '100%', height: '70px' }}>
                <line x1="0" y1="20" x2="320" y2="20" stroke="var(--border-light)" strokeDasharray="4" />
                <path d="M 0 20 Q 120 30, 320 70" fill="none" stroke="var(--accent-primary)" strokeWidth="3" />
                <circle cx="0" cy="20" r="4" fill="var(--accent-primary)" />
                <circle cx="320" cy="70" r="4" fill="var(--accent-primary)" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                <span>2024</span>
                <span>2027</span>
                <span>2030</span>
                <span>2035</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8. Section 106 & Social Value Job Creation Feature Section */}
      <section style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '4rem 0' }}>
        <div className="container-x frame-bordered">
          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3rem' }}>
            
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                MUNICIPAL &amp; STATUTORY WORKFORCE ASSURANCE
              </div>

              <h2 className="h2" style={{ marginBottom: '1rem' }}>
                Section 106 &amp; Social Value Job Creation Reporting, Certified for Planning Authorities.
              </h2>

              <p className="p-medium" style={{ marginBottom: '1.25rem' }}>
                Ensure continuous audit-readiness for municipal planning covenants, the UK Social Value Act, and EU CSRD ESRS S1. Ingest verified payroll records, track local apprentice quotas, and export cryptographically sealed compliance dossiers before council inspection.
              </p>

              <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li><strong>Section 106 Local Labor Quotas</strong>: Automated resident radius verification.</li>
                <li><strong>NVQ Training Evidence Locker</strong>: Cryptographically hashed apprentice credentials.</li>
                <li><strong>One-Click Planning Dossiers</strong>: Certified reports ready for council submission.</li>
              </ul>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/job-reporting" className="btn btn-primary" style={{ borderRadius: '4px' }}>
                  <span>Explore Workforce Assurance</span>
                  <span>→</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDemoTab('JOBS');
                    const el = document.getElementById('demonstrator-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn btn-secondary"
                  style={{ borderRadius: '4px', cursor: 'pointer' }}
                >
                  <span>Test Section 106 Auditor</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
              <img
                src="/images/workforce-audit.jpg"
                alt="Executive Review of Workforce Quotas and Audit Graphs"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
              />
            </div>

          </div>
        </div>
      </section>

      {/* 10. Interactive System Demonstrator Tabs */}
      <section id="demonstrator-section" style={{ backgroundColor: 'var(--bg-page)', padding: '4.5rem 0' }}>
        <div className="container-x frame-bordered">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              CONTINUOUS ASSURANCE ENGINES
            </div>
            <h2 className="h2" style={{ margin: 0 }}>
              Test Our Continuous Assurance Engines Live
            </h2>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', overflowX: 'auto' }}>
            {[
              { key: 'CALIBRATION', label: '1. Calibration Gatekeeper' },
              { key: 'ANOMALY', label: '2. 15% Anomaly Lock Simulator' },
              { key: 'SCORECARD', label: '3. 5-Pillar Risk Speedometer' },
              { key: 'CMA', label: '4. CMA Green Claims Linter' },
              { key: 'JOBS', label: '5. Section 106 Job Creation Auditor' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDemoTab(tab.key as any)}
                style={{
                  padding: '0.6rem 1.15rem',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeDemoTab === tab.key ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
                  backgroundColor: activeDemoTab === tab.key ? 'var(--accent-light)' : 'var(--bg-card)',
                  color: activeDemoTab === tab.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Box */}
          <div className="persefoni-card" style={{ padding: 'clamp(1.5rem, 3.5vw, 2.5rem)', borderRadius: '6px' }}>
          {activeDemoTab === 'CALIBRATION' && (
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                Milestone ISO-1: Mandatory Calibration Gatekeeper
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Under ISO 50001 Clause 6.6, uncalibrated sensor telemetry is rejected by the native PostgreSQL database trigger before reaching public ledgers.
              </p>

              <div className="meter-demo-grid" style={{ marginBottom: '1.5rem' }}>
                {[
                  { key: 'PDU', tag: 'PDU-METER-04A', type: 'ELECTRICITY_SUB_METER', expiry: 'Active: 284 Days Left', valid: true },
                  { key: 'H2', tag: 'GAS-CHROM-01B', type: 'GAS_CHROMATOGRAPH', expiry: 'Active: 190 Days Left', valid: true },
                  { key: 'WATER', tag: 'EVAP-WATER-02C', type: 'WATER_FLOW_METER', expiry: 'Expired: Certificate Missing', valid: false },
                ].map((meter) => (
                  <div
                    key={meter.key}
                    onClick={() => setSimulatedSensor(meter.key as any)}
                    style={{
                      backgroundColor: simulatedSensor === meter.key ? 'var(--bg-subtle)' : 'var(--bg-card)',
                      border: simulatedSensor === meter.key ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{meter.tag}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>{meter.type}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: meter.valid ? 'var(--color-green)' : 'var(--google-red)' }}>
                      {meter.expiry}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.15rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                {simulatedSensor === 'WATER' ? (
                  <div style={{ color: 'var(--google-red)' }}>
                    ❌ <strong>HTTP 422 FAILED_PRECONDITION:</strong> Telemetry ingestion rejected for asset 'EVAP-WATER-02C'. No active Certificate of Calibration found. Blocked by PostgreSQL safety trigger under ISO 50001 rules.
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-green)' }}>
                    ✅ <strong>HTTP 201 CREATED:</strong> Telemetry verified against active calibration certificate (SHA-256: 8f9b...a10c). Ingestion approved under statutory assurance rules.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeDemoTab === 'ANOMALY' && (
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                Milestone ISO-2: 15% Baseline Anomaly Lock Simulator
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Slide to adjust observed PUE against the calibrated 1.14 baseline. Shifts exceeding ±15% trigger an immediate export lock (HTTP 423) and open an ISO Clause 10.2 non-conformance event.
              </p>

              <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-subtle)', padding: '1.35rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Simulate Observed PUE:</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: isAnomalyLocked ? 'var(--google-red)' : 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                    {simulatedPue.toFixed(2)} (Variance: {pueVariance.toFixed(1)}%)
                  </span>
                </div>

                <input
                  type="range"
                  min="1.05"
                  max="1.55"
                  step="0.01"
                  value={simulatedPue}
                  onChange={(e) => setSimulatedPue(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: isAnomalyLocked ? 'var(--google-red)' : 'var(--color-green)' }}
                />
              </div>

              {isAnomalyLocked ? (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--google-red)' }}>
                    🔒 HTTP 423 RESOURCE_LOCKED: System Export Lock Active
                  </div>
                  <div style={{ fontSize: '0.84rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                    Metric variance of +{pueVariance.toFixed(1)}% exceeds the 15% threshold. Public transparency exports and certificate downloads are locked until supervisor root-cause resolution under ISO Clause 10.2.
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--color-green)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-green)' }}>
                    ✅ HTTP 200 OK: Metric Within Calibrated Baseline
                  </div>
                  <div style={{ fontSize: '0.84rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                    Observed PUE ({simulatedPue.toFixed(2)}) is within the nominal ±15% corridor. Public transparency ledger exports are active.
                  </div>
                </div>
              )}
            </div>
          )}

          {activeDemoTab === 'SCORECARD' && (
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                Milestone ISO-3: 5-Pillar Scorecard Speedometer Gauge
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Under ISO 14065 & UK CMA guidelines, questionnaires compute weighted assurance scores and flag critical greenwashing risks if any pillar lacks verifiable proof.
              </p>
              <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                <RiskSpeedometer score={4.85} riskLevel="LOW_RISK_CONFORMANT" />
              </div>
            </div>
          )}

          {activeDemoTab === 'CMA' && (
            <div>
              <CmaClaimsLinter initialText="This is a 100% Green Derby Hoodie with Zero Emissions Steel from our Carbon Neutral Event." />
            </div>
          )}

          {activeDemoTab === 'JOBS' && (
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                Section 106 & Social Value Job Creation Auditor
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Simulate your facility's workforce ratios against statutory Town and Country Planning Act 1990 covenants and Local Employment Charters.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Total Facility Workers:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{simJobsWorkers} FTEs</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="300"
                      step="5"
                      value={simJobsWorkers}
                      onChange={(e) => setSimJobsWorkers(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-sky)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Local Resident Hires (≤ 15 miles):</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-sky)' }}>
                        {simJobsLocal} ({((simJobsLocal / simJobsWorkers) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={simJobsWorkers}
                      step="1"
                      value={simJobsLocal}
                      onChange={(e) => setSimJobsLocal(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-sky)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Accredited Apprentices (NVQ Level 2/3):</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-green)' }}>
                        {simJobsApprentices} ({((simJobsApprentices / simJobsWorkers) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={simJobsApprentices}
                      onChange={(e) => setSimJobsApprentices(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-green)' }}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={simJobsLivingWage}
                      onChange={(e) => setSimJobsLivingWage(e.target.checked)}
                      style={{ accentColor: 'var(--color-green)' }}
                    />
                    <span>100% Real Living Wage Compliance</span>
                  </label>
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    COUNCIL AUDIT READINESS SCORE
                  </div>
                  
                  {(() => {
                    const localPct = (simJobsLocal / simJobsWorkers) * 100;
                    const apprenticePct = (simJobsApprentices / simJobsWorkers) * 100;
                    const isPassing = localPct >= 20 && apprenticePct >= 5 && simJobsLivingWage;
                    const score = Math.round((Math.min(localPct / 25, 1) * 40) + (Math.min(apprenticePct / 5, 1) * 30) + (simJobsLivingWage ? 30 : 0));

                    return (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '2rem', fontWeight: 800, color: isPassing ? 'var(--color-green)' : 'var(--google-red)', fontFamily: 'var(--font-mono)' }}>
                            {score}/100
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isPassing ? 'var(--color-green)' : 'var(--google-red)' }}>
                            {isPassing ? 'CONFORMANT (AUDIT READY)' : 'PLANNING RISK DETECTED'}
                          </span>
                        </div>

                        <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden', marginBottom: '1rem' }}>
                          <div style={{ height: '100%', width: `${score}%`, backgroundColor: isPassing ? 'var(--color-green)' : 'var(--google-red)' }} />
                        </div>

                        <ul style={{ paddingLeft: '1.1rem', margin: '0 0 1rem 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          <li>Local Resident Hiring: {localPct.toFixed(1)}% {localPct >= 20 ? '✅ (Exceeds 20% covenant)' : '❌ (Deficit vs 20% quota)'}</li>
                          <li>Apprenticeship Ratio: {apprenticePct.toFixed(1)}% {apprenticePct >= 5 ? '✅ (Conforms to City & Guilds)' : '❌ (Below 5% threshold)'}</li>
                          <li>Living Wage Benchmark: {simJobsLivingWage ? '✅ (100% Compliant)' : '❌ (Living wage deficit)'}</li>
                        </ul>

                        <Link to="/job-reporting" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-sky)', textDecoration: 'none' }}>
                          Open Standalone Workforce Suite →
                        </Link>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </section>

    </div>
  );
};
