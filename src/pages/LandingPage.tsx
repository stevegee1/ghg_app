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
      
      {/* 1. Persefoni Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: 'clamp(3rem, 5vw, 4.5rem) 1.5rem',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--bg-page)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="hero-layout-grid" style={{ alignItems: 'center' }}>
            
            {/* Left Hero Column */}
            <div>
              {/* Persefoni Headline */}
              <h1
                style={{
                  fontSize: 'clamp(2.4rem, 4.8vw, 3.85rem)',
                  fontWeight: 800,
                  lineHeight: 1.08,
                  marginBottom: '1.5rem',
                  color: 'var(--text-main)',
                  letterSpacing: '-0.04em',
                }}
              >
                Carbon Footprint & Sustainability Assurance
              </h1>

              {/* Subtitle */}
              <p
                style={{
                  fontSize: 'clamp(1.05rem, 2.2vw, 1.2rem)',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  marginBottom: '2.5rem',
                  maxWidth: '560px',
                }}
              >
                Respond with confidence to disclosure requests from customers, investors, and regulators. Measure, report, and decarbonize with calibrated continuous telemetry.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link
                  to="/create-account"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    padding: '0.85rem 1.85rem',
                    borderRadius: '6px',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>Sign up free</span>
                  <span>→</span>
                </Link>

                <Link
                  to="/portal/login"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-main)',
                    padding: '0.85rem 1.75rem',
                    borderRadius: 'var(--radius-pill)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>Sign In to Console</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Right Hero: Persefoni-Style Multi-Card Dashboard Visual Mockup */}
            <div
              style={{
                position: 'relative',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)',
              }}
            >
              {/* Central Floating Company Profile Box */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  padding: '1.25rem',
                  marginBottom: '1rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
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
                  Leading clean-tech data infrastructure specializing in green hydrogen & continuous energy optimization.
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>🏢 Technology</span>
                  <span>🇬🇧 United Kingdom</span>
                  <span style={{ color: 'var(--color-sky)' }}>🔗 www.apex-hyperscale.com</span>
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
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)', transition: 'all 0.3s ease' }}>
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

                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600 }}>🚛 EV-Fleet-Truck-1802 (Heavy Duty)</span>
                  <span style={{ color: 'var(--color-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="radar-pulse" style={{ width: '6px', height: '6px' }} />
                    <span>Fuel Verified</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 600 }}>⚡ NH-Gen-011 (H2 Electrolyzer)</span>
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

      {/* 2. Google B2B Standard: Certified Climate Standards & Frameworks Strip with Official Emblems */}
      <section style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: '2rem' }}>
            ENGINEERED FOR CONTINUOUS ASSURANCE UNDER GLOBAL STATUTORY PROTOCOLS
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
            
            {/* 1. ISO 14064-1 Standard Emblem */}
            <div style={{ padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.04em' }}>ISO 14064-1</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>GHG Assurance</div>
              </div>
            </div>

            {/* 2. ISO 50001 Standard Emblem */}
            <div style={{ padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0f172a', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #38bdf8', boxShadow: '0 4px 10px rgba(15, 23, 42, 0.25)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.04em' }}>ISO 50001</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>Energy Management</div>
              </div>
            </div>

            {/* 3. GHG Protocol Standard Emblem */}
            <div style={{ padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.04em' }}>GHG PROTOCOL</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>Scope 1, 2 & 3 Standard</div>
              </div>
            </div>

            {/* 4. UK SECR Standard Emblem */}
            <div style={{ padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0369a1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(3, 105, 161, 0.25)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18M3 12h18M5 7l14 10M19 7L5 17" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.04em' }}>UK SECR</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>Streamlined Disclosures</div>
              </div>
            </div>

            {/* 5. EU CSRD Standard Emblem */}
            <div style={{ padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#1e3a8a', color: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(30, 58, 138, 0.25)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="4" r="1.3" />
                  <circle cx="17.6" cy="6.4" r="1.3" />
                  <circle cx="20" cy="12" r="1.3" />
                  <circle cx="17.6" cy="17.6" r="1.3" />
                  <circle cx="12" cy="20" r="1.3" />
                  <circle cx="6.4" cy="17.6" r="1.3" />
                  <circle cx="4" cy="12" r="1.3" />
                  <circle cx="6.4" cy="6.4" r="1.3" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.04em' }}>EU CSRD</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>ESRS Audit Alignment</div>
              </div>
            </div>

            {/* 6. TCFD / CDP Standard Emblem */}
            <div style={{ padding: '1.25rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0f766e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.25)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '0.04em' }}>TCFD / CDP</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>Financial Governance</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Persefoni Feature Section 1: "Measure, Report, Decarbonize." */}
      <section style={{ maxWidth: '1280px', margin: '4.5rem auto 0 auto', padding: '0 1.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Measure, Report, Decarbonize.
          </h2>
        </div>

        <div className="hero-layout-grid" style={{ alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)', fontWeight: 800, lineHeight: 1.2, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              Scope 1, 2, and 3 carbon footprints for businesses of all sizes and complexities.
            </h3>

            <Link to="/licensing" style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Explore our plans</span>
              <span>→</span>
            </Link>
          </div>

          {/* Scope 1, 2, 3 Visual Card */}
          <div
            style={{
              backgroundColor: '#fff7ed',
              borderRadius: '16px',
              border: '1px solid #fed7aa',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
              <div>
                <span style={{ color: '#ea580c' }}>● Scope 1:</span> 277.1 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tCO2e</span>
              </div>
              <div>
                <span style={{ color: '#0284c7' }}>● Scope 2:</span> 166.1 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tCO2e</span>
              </div>
              <div>
                <span style={{ color: '#10b981' }}>● Scope 3:</span> 664.8 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tCO2e</span>
              </div>
            </div>

            {/* Scope Waterfall Progress Bar */}
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ width: '25%', backgroundColor: '#ea580c' }} />
              <div style={{ width: '15%', backgroundColor: '#0284c7' }} />
              <div style={{ width: '60%', backgroundColor: '#10b981' }} />
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Continuous assurance algorithms automatically verify Scope 1 & 2 boundary data against primary IoT telemetry before generating statutory disclosures.
            </div>
          </div>
        </div>
      </section>

      {/* 4. Persefoni Feature Section 2: Statutory Regulation Reporting with Generated Image */}
      <section style={{ maxWidth: '1280px', margin: '5rem auto 0 auto', padding: '0 1.5rem' }}>
        <div className="hero-layout-grid" style={{ alignItems: 'center' }}>
          
          {/* Nature Restoration & Statutory Climate Assurance Image */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: '0 15px 35px rgba(0,0,0,0.08)' }}>
            <img
              src="/images/nature-assurance.jpg"
              alt="Natural Geothermal Ecosystem & Climate Restoration"
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            />
          </div>

          <div>
            <h3 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)', fontWeight: 800, lineHeight: 1.2, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              Assurance-grade GHG emissions reporting and verifiable nature-positive climate impact.
            </h3>

            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Pre-configured for UK SECR, EU CSRD, California SB 253/261, and ISO 14064 standards with immutable cryptographic SHA-256 data watermarks and direct 15% ESG fund routing to local nature projects.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <Link to="/about" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>
                Regulatory Reporting →
              </Link>
              <Link to="/transparency" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>
                Investor Reporting →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Persefoni Feature Section 3: Decarbonization Management */}
      <section style={{ maxWidth: '1280px', margin: '5rem auto 0 auto', padding: '0 1.5rem' }}>
        <div className="hero-layout-grid" style={{ alignItems: 'center' }}>
          
          <div>
            <h3 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)', fontWeight: 800, lineHeight: 1.2, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              Net-zero target setting, reduction modeling, and supplier engagement for advanced decarbonization.
            </h3>

            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Continuous sensor models tracking 15% anomaly variance limits and supplier compliance scorecards under ISO Clause 10.2.
            </p>

            <Link to="/portal/login" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>
              Decarbonization Management →
            </Link>
          </div>

          {/* Reduction Ambition Card */}
          <div
            style={{
              backgroundColor: '#fff7ed',
              borderRadius: '16px',
              border: '1px solid #fed7aa',
              padding: '2.5rem',
            }}
          >
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reduction Ambition</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Annual reduction trajectory</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ea580c', margin: '0.5rem 0' }}>
                100 <span style={{ fontSize: '1.25rem' }}>%</span>
              </div>
            </div>

            {/* Trajectory SVG Graph */}
            <svg viewBox="0 0 320 80" style={{ width: '100%', height: '70px' }}>
              <line x1="0" y1="20" x2="320" y2="20" stroke="#fed7aa" strokeDasharray="4" />
              <path d="M 0 20 Q 120 30, 320 70" fill="none" stroke="#ea580c" strokeWidth="3" />
              <circle cx="0" cy="20" r="4" fill="#ea580c" />
              <circle cx="320" cy="70" r="4" fill="#ea580c" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
              <span>2024</span>
              <span>2027</span>
              <span>2030</span>
              <span>2035</span>
            </div>
          </div>

        </div>
      </section>

      {/* 6. Section 106 & Social Value Job Creation Feature Section */}
      <section style={{ maxWidth: '1280px', margin: '5rem auto 0 auto', padding: '0 1.5rem' }}>
        <div className="hero-layout-grid" style={{ alignItems: 'center' }}>
          
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-sky)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              MUNICIPAL & STATUTORY WORKFORCE ASSURANCE
            </div>

            <h3 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)', fontWeight: 800, lineHeight: 1.2, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              Section 106 & Social Value Job Creation Reporting, Certified for Planning Authorities.
            </h3>

            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Ensure continuous audit-readiness for municipal planning covenants, the UK Social Value Act, and EU CSRD ESRS S1. Ingest verified payroll records, track local apprentice quotas, and export cryptographically sealed compliance dossiers before council inspection.
            </p>

            <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.75rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <li><strong>Section 106 Local Labor Quotas</strong>: Automated resident radius verification.</li>
              <li><strong>NVQ Training Evidence Locker</strong>: Cryptographically hashed apprentice credentials.</li>
              <li><strong>One-Click Planning Dossiers</strong>: Certified reports ready for council submission.</li>
            </ul>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              <Link to="/job-reporting" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-sky)', textDecoration: 'none' }}>
                Explore Workforce Assurance →
              </Link>
              <button
                type="button"
                onClick={() => {
                  setActiveDemoTab('JOBS');
                  const el = document.getElementById('demonstrator-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Test Section 106 Auditor →
              </button>
            </div>
          </div>

          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: '0 15px 35px rgba(0,0,0,0.08)' }}>
            <img
              src="/images/workforce-audit.jpg"
              alt="Executive Review of Workforce Quotas and Audit Graphs"
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            />
          </div>

        </div>
      </section>

      {/* 7. Interactive System Demonstrator Tabs */}
      <section id="demonstrator-section" style={{ maxWidth: '1280px', margin: '5rem auto 0 auto', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            CONTINUOUS ASSURANCE ENGINES
          </div>
          <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Test Our Continuous Assurance Engines Live
          </h2>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.625rem', marginBottom: '2rem', flexWrap: 'wrap', overflowX: 'auto' }}>
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
                padding: '0.65rem 1.35rem',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeDemoTab === tab.key ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                backgroundColor: activeDemoTab === tab.key ? 'var(--accent-light)' : 'var(--bg-card)',
                color: activeDemoTab === tab.key ? 'var(--color-sky)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Box */}
        <div className="persefoni-card" style={{ padding: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}>
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
                    ✅ <strong>HTTP 201 CREATED:</strong> Telemetry verified against active calibration certificate (SHA-256: 8f9b...a10c). Ingestion approved under Nice Class 35 rules.
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
                          <span style={{ fontSize: '2.5rem', fontWeight: 900, color: isPassing ? 'var(--color-green)' : 'var(--google-red)', fontFamily: 'var(--font-mono)' }}>
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
      </section>

    </div>
  );
};
