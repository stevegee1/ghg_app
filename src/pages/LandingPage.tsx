import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RiskSpeedometer } from '../components/RiskSpeedometer';
import { CmaClaimsLinter } from '../components/CmaClaimsLinter';
import { CerebriumAnimatedHeroBackground } from '../components/CerebriumAnimatedHeroBackground';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [activeDemoTab, setActiveDemoTab] = useState<'CALIBRATION' | 'ANOMALY' | 'SCORECARD' | 'CMA' | 'JOBS'>('CALIBRATION');

  // Cerebrium Feature Showcase States (Image 4)
  const [activeWhyItem, setActiveWhyItem] = useState<number>(0);
  const [activeWhyTab, setActiveWhyTab] = useState<'ISO' | 'JOBS'>('ISO');

  // Simulator States
  const [simulatedPue, setSimulatedPue] = useState<number>(1.14);
  const [simulatedSensor, setSimulatedSensor] = useState<'PDU' | 'H2' | 'WATER'>('PDU');

  // Section 106 Workforce Simulator States
  const [simJobsWorkers, setSimJobsWorkers] = useState<number>(100);
  const [simJobsLocal, setSimJobsLocal] = useState<number>(28);
  const [simJobsApprentices, setSimJobsApprentices] = useState<number>(6);
  const [simJobsLivingWage, setSimJobsLivingWage] = useState<boolean>(true);

  // Hero Station Demo Simulator States
  const [heroStationTab, setHeroStationTab] = useState<'SENSORS' | 'EFFICIENCY' | 'CERT'>('SENSORS');
  const [isSimulatingSweep, setIsSimulatingSweep] = useState<boolean>(false);
  const [sweepCount, setSweepCount] = useState<number>(142);
  const [lastSweepTime, setLastSweepTime] = useState<string>('Just now');

  const handleTriggerSweep = () => {
    if (isSimulatingSweep) return;
    setIsSimulatingSweep(true);
    setTimeout(() => {
      setIsSimulatingSweep(false);
      setSweepCount(prev => prev + 1);
      setLastSweepTime('Just now');
    }, 900);
  };

  // Anomaly math for simulator (baseline = 1.14)
  const pueVariance = Math.abs((simulatedPue - 1.14) / 1.14) * 100;
  const isAnomalyLocked = pueVariance > 15.0;

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-main)', transition: 'all 0.25s ease', width: '100%', overflowX: 'hidden' }}>
      
      {/* 1. Cerebrium-Style Animated Hero Section with 3D Ribbons & Kinetic Laser */}
      <CerebriumAnimatedHeroBackground showRadarNode={true}>
        <div className="container-x" style={{ paddingTop: '2.5rem', paddingBottom: '4.5rem' }}>
          
          {/* Official UK Corporate Registration & Protocol Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: 'rgba(255, 45, 141, 0.2)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid rgba(255, 45, 141, 0.5)' }}>
              <span className="radar-pulse" style={{ width: '6px', height: '6px', backgroundColor: 'var(--cerebrium-magenta)' }} />
              NFTY LOGS® CONTINUOUS ASSURANCE
            </span>
            <span style={{ fontSize: '0.78rem', color: '#cfd7e7', fontFamily: 'var(--font-mono)' }}>
              UK Corporation No. <strong>15230476</strong> • ISO 14064, 50001 &amp; UK CMA Audit-Ready
            </span>
          </div>

          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3.5rem' }}>
            
            {/* Left Hero Column: Cerebrium Typography & Hot-Pink Highlights */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--cerebrium-magenta)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--cerebrium-magenta)', boxShadow: '0 0 8px var(--cerebrium-magenta)' }} />
                <span>Continuous Assurance Protocol</span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2.5rem, 4.8vw, 4.25rem)',
                  fontWeight: 800,
                  lineHeight: 1.08,
                  marginBottom: '1.35rem',
                  color: '#ffffff',
                  letterSpacing: '-0.03em',
                }}
              >
                Continuous Carbon Assurance that <span style={{ color: 'var(--cerebrium-magenta)', textShadow: '0 0 28px rgba(255, 45, 141, 0.6)' }}>scales</span> with you
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: '#cfd7e7',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                  maxWidth: '560px',
                }}
              >
                Deploy verified ISO 14064, 50001 &amp; Section 106 statutory screening pipelines with real-time IoT telemetry stream, tamper-proof calibration, and automated on-chain Polygon trust seals.
              </p>

              {/* Action Buttons & Statutory Badges (Cerebrium Action Pair) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {isAuthenticated ? (
                    <Link
                      to={isAdmin ? '/admin' : '/portal'}
                      className="cerebrium-btn-magenta"
                      style={{
                        padding: '0.85rem 2.2rem',
                        fontSize: '0.9375rem',
                        letterSpacing: '0.06em',
                      }}
                    >
                      <span>{isAdmin ? 'OPEN ADMIN CONSOLE' : 'GO TO MY DASHBOARD'}</span>
                      <span style={{ marginLeft: '0.4rem' }}>→</span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/create-account"
                        className="cerebrium-btn-magenta"
                        style={{
                          padding: '0.85rem 2.2rem',
                          fontSize: '0.9375rem',
                          letterSpacing: '0.06em',
                        }}
                      >
                        <span>CREATE ACCOUNT</span>
                        <span style={{ marginLeft: '0.4rem' }}>→</span>
                      </Link>

                      <Link
                        to="/portal/login"
                        className="cerebrium-btn-ghost"
                        style={{
                          padding: '0.85rem 1.85rem',
                          fontSize: '0.9375rem',
                          letterSpacing: '0.06em',
                        }}
                      >
                        <span>SIGN IN TO CONSOLE</span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Statutory Credentials Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#b3c0d4', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                    CMA Green Claims Code Audit-Ready
                  </span>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span>ISO 19011:2026 Remote Auditing</span>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span style={{ color: 'var(--cerebrium-magenta)', fontWeight: 700 }}>15% Direct Environmental Relief</span>
                </div>
              </div>
            </div>

            {/* Right Hero: Interactive Platform Demo Simulator */}
            <div
              style={{
                position: 'relative',
                backgroundColor: 'rgba(12, 16, 29, 0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '1.75rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 45, 141, 0.12)',
              }}
            >
              {/* Card Header: Station ID and Demo Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--cerebrium-magenta)', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>
                    CONTINUOUS TELEMETRY NODE
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                    Industrial Telemetry Station UK-01
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                    station-uk01.nftylogslabs.com
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--cerebrium-magenta)', fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.06em', backgroundColor: 'rgba(255, 45, 141, 0.12)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255, 45, 141, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="radar-pulse" style={{ width: '4px', height: '4px', backgroundColor: 'var(--cerebrium-magenta)' }} />
                    DEMO AUDIT SIMULATOR
                  </span>
                  <span style={{ backgroundColor: '#10b981', color: '#ffffff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="radar-pulse" style={{ width: '4px', height: '4px', backgroundColor: '#fff' }} />
                    OPERATIONAL
                  </span>
                </div>
              </div>

              {/* Tabbed Demo Panels */}
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                {(['SENSORS', 'EFFICIENCY', 'CERT'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setHeroStationTab(tab)}
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.06em',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      backgroundColor: heroStationTab === tab ? 'rgba(255, 45, 141, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                      color: heroStationTab === tab ? 'var(--cerebrium-magenta)' : '#94a3b8',
                      outline: heroStationTab === tab ? '1px solid rgba(255, 45, 141, 0.4)' : '1px solid transparent',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab: SENSORS */}
              {heroStationTab === 'SENSORS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { id: 'PDU-07', label: 'PDU Smart Meter', value: '48.2 kWh', unit: 'ISO 50001', color: '#38bdf8', status: 'CALIBRATED' },
                    { id: 'EV-1802', label: 'EV-Fleet-Truck-1802', value: '0.0 gCO2/km', unit: 'Fuel Verified', color: '#10b981', status: 'VERIFIED' },
                    { id: 'NH-011', label: 'NH-Gen-011 H2 Electrolyzer', value: '99.97% Purity', unit: 'ISO 14064', color: '#a78bfa', status: 'ONLINE' },
                  ].map(sensor => (
                    <div
                      key={sensor.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.75rem' }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#cfd7e7', marginBottom: '0.1rem' }}>{sensor.label}</div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{sensor.id} · {sensor.unit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: sensor.color, fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{sensor.value}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: sensor.color, display: 'inline-block' }} />
                          <span style={{ fontSize: '0.62rem', color: sensor.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{sensor.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: EFFICIENCY */}
              {heroStationTab === 'EFFICIENCY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { label: 'Power Usage Effectiveness (PUE)', value: '1.12', benchmark: 'Industry avg: 1.58', color: '#38bdf8', bar: 71 },
                    { label: 'Thermal Energy Re-Use Rate', value: '94.6%', benchmark: 'ISO 50001 target: 85%', color: '#10b981', bar: 94 },
                    { label: 'Renewable Energy Share', value: '100%', benchmark: 'SECR mandated: 60%', color: '#a78bfa', bar: 100 },
                    { label: 'Scope 2 Market-Based Intensity', value: '0.00 tCO2e', benchmark: 'Reduction: -300 tCO2e', color: '#f59e0b', bar: 100 },
                  ].map(metric => (
                    <div key={metric.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#cfd7e7', fontWeight: 600 }}>{metric.label}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: metric.color, fontFamily: 'var(--font-mono)' }}>{metric.value}</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${metric.bar}%`, backgroundColor: metric.color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>{metric.benchmark}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: CERT */}
              {heroStationTab === 'CERT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { framework: 'ISO 14064-1:2018', scope: 'GHG Quantification and Reporting', status: 'AUDIT-READY', color: '#10b981' },
                    { framework: 'ISO 50001:2018', scope: 'Energy Management System', status: 'AUDIT-READY', color: '#10b981' },
                    { framework: 'UK CMA Green Claims Code', scope: 'Section 3.2 Environmental Claims', status: 'AUDIT-READY', color: '#38bdf8' },
                    { framework: 'TCFD / CSRD Aligned', scope: 'Climate Risk Disclosure Framework', status: 'ALIGNED', color: '#a78bfa' },
                    { framework: 'UK SECR', scope: 'Streamlined Energy and Carbon Reporting', status: 'AUDIT-READY', color: '#f59e0b' },
                  ].map(cert => (
                    <div
                      key={cert.framework}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.55rem 0.85rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>{cert.framework}</div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '0.1rem' }}>{cert.scope}</div>
                      </div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: cert.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', flexShrink: 0 }}>{cert.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Sweep Action Footer */}
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#94a3b8' }}>Sweeps simulated:</span>{' '}
                  <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{sweepCount}</span>
                  <span style={{ marginLeft: '0.75rem', color: '#64748b' }}>Last: {lastSweepTime}</span>
                </div>
                <button
                  id="hero-trigger-sweep-btn"
                  onClick={handleTriggerSweep}
                  disabled={isSimulatingSweep}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em',
                    padding: '6px 14px',
                    borderRadius: '5px',
                    border: '1px solid rgba(255, 45, 141, 0.4)',
                    backgroundColor: isSimulatingSweep ? 'rgba(255, 45, 141, 0.06)' : 'rgba(255, 45, 141, 0.14)',
                    color: isSimulatingSweep ? '#94a3b8' : 'var(--cerebrium-magenta)',
                    cursor: isSimulatingSweep ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSimulatingSweep ? (
                    <>
                      <span className="radar-pulse" style={{ width: '5px', height: '5px', backgroundColor: 'var(--cerebrium-magenta)' }} />
                      SWEEPING...
                    </>
                  ) : (
                    <>
                      <span>&#9654;</span>
                      TRIGGER SWEEP
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </CerebriumAnimatedHeroBackground>

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
              <span><strong>80% Remote Audits</strong> | ISO 19011:2026 Annex A</span>
            </div>
            <div className="greenly-ticker-item">
              <span style={{ color: 'var(--color-green)', fontSize: '0.9rem' }}>●</span>
              <span><strong>Zero Brokerage Conflict</strong> | Section X Software Firewall</span>
            </div>
            <div className="greenly-ticker-item">
              <span style={{ color: 'var(--color-sky)', fontSize: '0.9rem' }}>●</span>
              <span><strong>100% Calibrated Hardware</strong> | ISO 17025 Gatekeeper</span>
            </div>
            <div className="greenly-ticker-item">
              <span style={{ color: 'var(--color-green)', fontSize: '0.9rem' }}>●</span>
              <span><strong>15% ESG Split</strong> | Automated Charity Disbursements</span>
            </div>
          </div>

        </div>
      </section>

      {/* 2.5 Cerebrium "Why Continuous Assurance" Feature Showcase (Image 4 Exact Spec) */}
      <section className="cerebrium-why-section">
        <div className="cerebrium-why-grid">
          
          {/* Left Column: Big Typography Vertical Selector */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--cerebrium-magenta)', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--cerebrium-magenta)' }} />
              <span>WHY CONTINUOUS ASSURANCE</span>
            </div>

            <div className="cerebrium-why-selector">
              {[
                { title: 'Real-Time Audit Gates', desc: 'Audit-readiness from the first telemetry ping. Ingest calibrated sensor streams in milliseconds with automated ISO 17025 verification. Continuous screening flags anomalies before certification freezes.' },
                { title: '15% Baseline Anomaly Lock', desc: 'Automated export freeze under ISO 14064-1 Clause 10.2. Any facility sensor drifting beyond the 15% threshold automatically seals ledger issuance until supervisor root-cause resolution is certified.' },
                { title: 'Section 106 Workforce', desc: 'Town and Country Planning Act 1990 covenant enforcement. Automatically track local employment quotas, accredited apprenticeships, and Real Living Wage guarantees with live council reporting dossiers.' },
                { title: 'On-Chain Ledger Seal', desc: 'Permanent Polygon ERC-1155 tamper-evident verification. Every verified metric batch is cryptographically hashed with SHA-256 and committed on-chain with dual-logo statutory provenance.' },
              ].map((item, idx) => (
                <button
                  key={item.title}
                  type="button"
                  className={`cerebrium-why-item ${activeWhyItem === idx ? 'active' : ''}`}
                  onClick={() => setActiveWhyItem(idx)}
                >
                  <div className="cerebrium-why-item-title">{item.title}</div>
                </button>
              ))}
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.65, marginTop: '2rem', maxWidth: '520px' }}>
              {[
                'Audit-readiness from the first telemetry ping. Ingest calibrated sensor streams in milliseconds with automated ISO 17025 verification. Continuous screening flags anomalies before certification freezes.',
                'Automated export freeze under ISO 14064-1 Clause 10.2. Any facility sensor drifting beyond the 15% threshold automatically seals ledger issuance until supervisor root-cause resolution is certified.',
                'Town and Country Planning Act 1990 covenant enforcement. Automatically track local employment quotas, accredited apprenticeships, and Real Living Wage guarantees with live council reporting dossiers.',
                'Permanent Polygon ERC-1155 tamper-evident verification. Every verified metric batch is cryptographically hashed with SHA-256 and committed on-chain with dual-logo statutory provenance.',
              ][activeWhyItem]}
            </p>
          </div>

          {/* Right Column: High-Tech Dark Card with Tab Switcher & Benchmark Bars */}
          <div className="cerebrium-benchmark-card">
            <div className="cerebrium-card-glow" />

            {/* Model / Framework Switcher */}
            <div className="cerebrium-tab-capsule">
              <button
                type="button"
                className={`cerebrium-tab-btn ${activeWhyTab === 'ISO' ? 'active' : ''}`}
                onClick={() => setActiveWhyTab('ISO')}
              >
                ISO 14064-1 &amp; 50001 Scope 1-3
              </button>
              <button
                type="button"
                className={`cerebrium-tab-btn ${activeWhyTab === 'JOBS' ? 'active' : ''}`}
                onClick={() => setActiveWhyTab('JOBS')}
              >
                Section 106 Jobs Covenant
              </button>
            </div>

            {/* Benchmark Latency Rows */}
            {activeWhyTab === 'ISO' ? (
              <div>
                {/* Benchmark 1: GHG App Automated */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header active">
                    <span style={{ color: 'var(--cerebrium-magenta)', fontWeight: 800 }}>GHGEmissionLogs (Automated OT)</span>
                    <span style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800 }}>3.8s</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill magenta" style={{ width: '96%' }} />
                  </div>
                </div>

                {/* Benchmark 2: External Audit */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header">
                    <span>Periodic Annual Audit Engagement</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>42 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill plum" style={{ width: '48%' }} />
                  </div>
                </div>

                {/* Benchmark 3: Big 4 Advisory */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header">
                    <span>Big-4 Advisory Manual Reconciliation</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>71 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill slate" style={{ width: '28%' }} />
                  </div>
                </div>

                {/* Benchmark 4: Spreadsheets */}
                <div className="cerebrium-benchmark-row" style={{ marginBottom: 0 }}>
                  <div className="cerebrium-benchmark-row-header">
                    <span>Legacy Spreadsheets (Statutory Risk)</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>156 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill muted" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Benchmark 1: Jobs Automated */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header active">
                    <span style={{ color: 'var(--cerebrium-magenta)', fontWeight: 800 }}>GHGEmissionLogs (Real-Time Dossier)</span>
                    <span style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800 }}>2.4s</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill magenta" style={{ width: '98%' }} />
                  </div>
                </div>

                {/* Benchmark 2: Quarterly Council Return */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header">
                    <span>Quarterly Planning Authority Return</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>28 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill plum" style={{ width: '52%' }} />
                  </div>
                </div>

                {/* Benchmark 3: External Consultant */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header">
                    <span>External Planning Consultant Sampling</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>60 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill slate" style={{ width: '32%' }} />
                  </div>
                </div>

                {/* Benchmark 4: General Contractor Filing */}
                <div className="cerebrium-benchmark-row" style={{ marginBottom: 0 }}>
                  <div className="cerebrium-benchmark-row-header">
                    <span>Ad-hoc Contractor Self-Reporting</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>120 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill muted" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                Audit-readiness from the first telemetry ping.
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Launch continuous audit pipelines in seconds with calibrated IoT ingestion and automated statutory checks. GHG App handles sudden bursts and scale-outs automatically, without compromising evidentiary integrity.
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Cerebrium Architectural 4-Card Value Grid: Key but Complex in Digital Landscape */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', padding: '5rem 0' }}>
        <div className="container-x">
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3.5rem auto' }}>
            <div className="cerebrium-section-eyebrow">
              <span className="eyebrow-dot" />
              ARCHITECTURAL CHALLENGES
            </div>
            <h2 className="h2" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Emission Measurement is Key but Complex in the Digital Landscape
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.6 }}>
              Enterprise technology environments involve multi-tenant cloud platforms, distributed hardware, and intricate Scope 3 supplier contracts.
            </p>
          </div>

          <div className="cerebrium-arch-grid">
            <div className="cerebrium-arch-card">
              <div className="cerebrium-arch-card-top">
                <div className="cerebrium-arch-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </div>
                <span className="cerebrium-arch-idx">01</span>
              </div>
              <h4 className="cerebrium-arch-title">Infrastructure Ambiguity</h4>
              <p className="cerebrium-arch-desc">Difficulty to ascertain verifiable sustainability credentials and real PUE across hybrid cloud and data center estates.</p>
            </div>

            <div className="cerebrium-arch-card">
              <div className="cerebrium-arch-card-top">
                <div className="cerebrium-arch-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <span className="cerebrium-arch-idx">02</span>
              </div>
              <h4 className="cerebrium-arch-title">Multi-Jurisdiction Filing</h4>
              <p className="cerebrium-arch-desc">Complexities in reporting statutory metrics across the UK SECR, EU CSRD ESRS, California SB 253, and UAE ESG mandates.</p>
            </div>

            <div className="cerebrium-arch-card">
              <div className="cerebrium-arch-card-top">
                <div className="cerebrium-arch-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span className="cerebrium-arch-idx">03</span>
              </div>
              <h4 className="cerebrium-arch-title">Supplier &amp; Workforce Scrutiny</h4>
              <p className="cerebrium-arch-desc">Enterprise procurement teams and planning authorities now prioritize verified ESG and local workforce covenant compliance.</p>
            </div>

            <div className="cerebrium-arch-card">
              <div className="cerebrium-arch-card-top">
                <div className="cerebrium-arch-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <span className="cerebrium-arch-idx">04</span>
              </div>
              <h4 className="cerebrium-arch-title">Auditable Competitive Edge</h4>
              <p className="cerebrium-arch-desc">Maintaining ISO 14064/50001 compliance readiness under ISO 19011:2026 remote auditing protocols is fundamental to winning enterprise bids.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Standards Compliance Grid (Balanced 8-Cell Architectural Layout) */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <div className="container-x" style={{ padding: 0 }}>
          <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
            COMPLY WITH THE WORLD&apos;S TOP STATUTORY STANDARDS
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
              { id: 'UK CMA CODE', sub: 'Green Claims Provenance' },
            ].map((std) => (
              <div key={std.id} className="logo-cell" style={{ backgroundColor: '#ffffff', minHeight: '88px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#090d1a', letterSpacing: '0.01em' }}>
                    {std.id}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
                    {std.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2b. ISO 19011:2026 Remote Auditing & Evidence Ledger Architecture */}
      <section style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.08)', backgroundColor: '#f8fafc', padding: '4.5rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ maxWidth: '820px', marginBottom: '2.75rem' }}>
            <div className="cerebrium-section-eyebrow">
              <span className="eyebrow-dot" />
              STATUTORY REMOTE VERIFICATION PROTOCOL
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#090d1a', margin: 0, letterSpacing: '-0.025em' }}>
              80% Remote Auditing via Trademarked Digital Data Protocol
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#475569', marginTop: '0.85rem', lineHeight: 1.65 }}>
              Under the newly published ISO 19011:2026 guidelines, corporate operators can conduct 80% of management audits remotely through our accredited digital data protocol, significantly reducing client on-site disruption, operational footprint, and corporate travel emissions.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
            
            {/* Card 1: Evidence Ledger & Annex A Isolation */}
            <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '14px', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 4px 20px -8px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                DEPLOYING THE EVIDENCE LEDGER
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 750, color: '#090d1a', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                Integrated Audit Report Matrix
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                When logging operational metrics, every entry is systematically stamped:
              </p>
              
              {/* Sleek Cryptographic Ledger Stamp */}
              <div className="cerebrium-ledger-stamp">
                <div className="cerebrium-ledger-stamp-header">
                  <span>IMMUTABLE EVIDENCE STAMP</span>
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    ISO 19011:2026 ANNEX A CONFORMANT
                  </span>
                </div>
                <div className="cerebrium-ledger-stamp-text">
                  Evidence verified via Remote ICT Review in strict compliance with ISO 19011:2026 Annex A.
                </div>
                <div className="cerebrium-ledger-stamp-footer">
                  <span>SHA-256: 8f9b4c02...e38a9d10</span>
                  <span>BLOCK #88192</span>
                </div>
              </div>

              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '1rem', lineHeight: 1.55 }}>
                This immutable ledger stamp isolates our continuous data protocol from risks of regulatory greenwashing and compliance pushback during external assurance reviews.
              </p>
            </div>

            {/* Card 2: Multi-Jurisdiction Statutory Disclosures */}
            <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '14px', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 4px 20px -8px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                GLOBAL REGULATORY MATRIX
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 750, color: '#090d1a', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                Unified International Filings
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Single-source telemetry mapped directly to four statutory disclosure regimes:
              </p>
              
              <div className="cerebrium-reg-grid">
                <div className="cerebrium-reg-chip">
                  <span>UK SECR / Companies Act</span>
                  <span className="cerebrium-reg-chip-dot" />
                </div>
                <div className="cerebrium-reg-chip">
                  <span>EU CSRD / ESRS E1</span>
                  <span className="cerebrium-reg-chip-dot" />
                </div>
                <div className="cerebrium-reg-chip">
                  <span>California SB 253 / 261</span>
                  <span className="cerebrium-reg-chip-dot" />
                </div>
                <div className="cerebrium-reg-chip">
                  <span>UAE SCA / ADX-DFM ESG</span>
                  <span className="cerebrium-reg-chip-dot" />
                </div>
              </div>

              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '1.15rem', lineHeight: 1.55 }}>
                Full conformity with UAE Cabinet Resolution on the Green Agenda and UAE Net Zero 2050 framework.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Feature Section 1: "Measure, Report, Decarbonize." */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', padding: '5rem 0' }}>
        <div className="container-x">
          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3.5rem' }}>
            <div>
              <div className="cerebrium-section-eyebrow">
                <span className="eyebrow-dot" />
                CARBON MANAGEMENT
              </div>
              <h2 className="h2" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
                Measure, Report, Decarbonize.
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Scope 1, 2, and 3 carbon footprints for businesses of all sizes and complexities, verified against real-world energy and fuel telemetry.
              </p>
              <Link to="/licensing#plans" className="cerebrium-btn-pill-dark">
                <span>Explore our plans</span>
                <span>→</span>
              </Link>
            </div>

            {/* Scope 1, 2, 3 Clean Architectural Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                padding: '2.25rem',
                boxShadow: '0 12px 36px -12px rgba(15, 23, 42, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: 700 }}>
                <div>
                  <span style={{ color: '#ea580c' }}>● Scope 1:</span> 277.1 <span style={{ fontSize: '0.72rem', color: '#64748b' }}>tCO2e</span>
                </div>
                <div>
                  <span style={{ color: '#0284c7' }}>● Scope 2:</span> 166.1 <span style={{ fontSize: '0.72rem', color: '#64748b' }}>tCO2e</span>
                </div>
                <div>
                  <span style={{ color: '#10b981' }}>● Scope 3:</span> 664.8 <span style={{ fontSize: '0.72rem', color: '#64748b' }}>tCO2e</span>
                </div>
              </div>

              {/* Scope Waterfall Progress Bar */}
              <div style={{ display: 'flex', height: '10px', borderRadius: '9999px', overflow: 'hidden', marginBottom: '1.5rem', background: '#f1f5f9' }}>
                <div style={{ width: '25%', backgroundColor: '#ea580c' }} />
                <div style={{ width: '15%', backgroundColor: '#0284c7' }} />
                <div style={{ width: '60%', backgroundColor: '#10b981' }} />
              </div>

              <div style={{ backgroundColor: '#090d1a', color: '#e2e8f0', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.8125rem', lineHeight: 1.55, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#10b981', marginRight: '6px' }}>●</span>
                Continuous assurance algorithms automatically verify Scope 1 &amp; 2 boundary data against primary IoT telemetry before generating statutory disclosures.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Feature Section 2: Statutory Regulation Reporting & Nature Restoration */}
      <section style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', padding: '5rem 0' }}>
        <div className="container-x">
          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3.5rem' }}>
            
            {/* Nature Restoration & Statutory Climate Assurance Image */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 12px 32px -10px rgba(0, 0, 0, 0.08)' }}>
              <img
                src="/images/nature-assurance.jpg"
                alt="Natural Geothermal Ecosystem & Climate Restoration"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
              />
            </div>

            <div>
              <div className="cerebrium-section-eyebrow">
                <span className="eyebrow-dot" />
                REGULATORY REPORTING
              </div>
              <h2 className="h2" style={{ fontSize: '2rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                Assurance-grade GHG emissions reporting and verifiable nature-positive climate impact.
              </h2>

              <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Pre-configured for UK SECR, EU CSRD, California SB 253/261, and ISO 14064 standards with immutable cryptographic SHA-256 data watermarks and direct 15% ESG fund routing to verified local nature projects.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/about#compliance" className="cerebrium-btn-pill-dark">
                  <span>Regulatory Reporting</span>
                  <span>→</span>
                </Link>
                <Link to="/transparency" className="cerebrium-btn-pill-outline">
                  <span>Investor Reporting</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Feature Section 3: Decarbonization Management */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', padding: '5rem 0' }}>
        <div className="container-x">
          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3.5rem' }}>
            
            <div>
              <div className="cerebrium-section-eyebrow">
                <span className="eyebrow-dot" />
                DECARBONISATION STRATEGY
              </div>
              <h2 className="h2" style={{ fontSize: '2rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                Net-zero target setting, reduction modeling, and supplier engagement.
              </h2>

              <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Continuous sensor models tracking 15% anomaly variance limits and supplier compliance scorecards under ISO Clause 10.2.
              </p>

              <Link to="/portal/login" className="cerebrium-btn-pill-dark">
                <span>Decarbonization Management</span>
                <span>→</span>
              </Link>
            </div>

            {/* Reduction Ambition Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                padding: '2.25rem',
                boxShadow: '0 12px 36px -12px rgba(15, 23, 42, 0.08)',
              }}
            >
              <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(15, 23, 42, 0.06)', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reduction Ambition</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Annual reduction trajectory</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#090d1a', margin: '0.4rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
                  100 <span style={{ fontSize: '1.35rem', color: 'var(--cerebrium-magenta, #ff2d8d)' }}>%</span>
                </div>
              </div>

              {/* Trajectory SVG Graph */}
              <svg viewBox="0 0 320 80" style={{ width: '100%', height: '70px' }}>
                <line x1="0" y1="20" x2="320" y2="20" stroke="rgba(15, 23, 42, 0.1)" strokeDasharray="4" />
                <path d="M 0 20 Q 120 30, 320 70" fill="none" stroke="var(--cerebrium-magenta, #ff2d8d)" strokeWidth="3" />
                <circle cx="0" cy="20" r="4" fill="var(--cerebrium-magenta, #ff2d8d)" />
                <circle cx="320" cy="70" r="4" fill="var(--cerebrium-magenta, #ff2d8d)" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
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
      <section style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', padding: '5rem 0' }}>
        <div className="container-x">
          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3.5rem' }}>
            
            <div>
              <div className="cerebrium-section-eyebrow">
                <span className="eyebrow-dot" />
                MUNICIPAL &amp; STATUTORY WORKFORCE ASSURANCE
              </div>

              <h2 className="h2" style={{ fontSize: '2rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                Section 106 &amp; Social Value Job Creation Reporting, Certified for Planning Authorities.
              </h2>

              <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Ensure continuous audit-readiness for municipal planning covenants, the UK Social Value Act, and EU CSRD ESRS S1. Ingest verified payroll records, track local apprentice quotas, and export cryptographically sealed compliance dossiers before council inspection.
              </p>

              <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.75rem 0', fontSize: '0.875rem', color: '#475569', lineHeight: 1.7 }}>
                <li><strong>Section 106 Local Labor Quotas</strong>: Automated resident radius verification.</li>
                <li><strong>NVQ Training Evidence Locker</strong>: Cryptographically hashed apprentice credentials.</li>
                <li><strong>One-Click Planning Dossiers</strong>: Certified reports ready for council submission.</li>
              </ul>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/job-reporting" className="cerebrium-btn-pill-dark">
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
                  className="cerebrium-btn-pill-outline"
                >
                  <span>Test Section 106 Auditor</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 12px 32px -10px rgba(0, 0, 0, 0.08)' }}>
              <img
                src="/images/workforce-audit.jpg"
                alt="Executive Review of Workforce Quotas and Audit Graphs"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
              />
            </div>

          </div>
        </div>
      </section>

      {/* 10. Interactive System Demonstrator Tabs (Cerebrium Capsule Segmented Control) */}
      <section id="demonstrator-section" style={{ backgroundColor: '#ffffff', padding: '5.5rem 0', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
        <div className="container-x">
          <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>
            <div className="cerebrium-section-eyebrow">
              <span className="eyebrow-dot" />
              CONTINUOUS ASSURANCE ENGINES
            </div>
            <h2 className="h2" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.03em', margin: 0 }}>
              Test Our Continuous Assurance Engines Live
            </h2>
          </div>

          {/* Floating Cerebrium Segmented Capsule Tab Control */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
            <div className="cerebrium-engine-capsule">
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
                  className={`cerebrium-engine-tab-btn ${activeDemoTab === tab.key ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Box: Architectural Card */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: '16px', padding: 'clamp(1.75rem, 4vw, 3rem)', boxShadow: '0 12px 36px -12px rgba(15, 23, 42, 0.08)' }}>
          {activeDemoTab === 'CALIBRATION' && (
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#090d1a', letterSpacing: '-0.02em' }}>
                Milestone ISO-1: Mandatory Calibration Gatekeeper
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#475569', marginBottom: '1.75rem', lineHeight: 1.6 }}>
                Under ISO 50001 Clause 6.6, uncalibrated sensor telemetry is rejected by the native PostgreSQL database trigger before reaching public ledgers.
              </p>

              <div className="meter-demo-grid" style={{ marginBottom: '1.75rem' }}>
                {[
                  { key: 'PDU', tag: 'PDU-METER-04A', type: 'ELECTRICITY_SUB_METER', expiry: 'Active: 284 Days Left', valid: true },
                  { key: 'H2', tag: 'GAS-CHROM-01B', type: 'GAS_CHROMATOGRAPH', expiry: 'Active: 190 Days Left', valid: true },
                  { key: 'WATER', tag: 'EVAP-WATER-02C', type: 'WATER_FLOW_METER', expiry: 'Expired: Certificate Missing', valid: false },
                ].map((meter) => (
                  <div
                    key={meter.key}
                    onClick={() => setSimulatedSensor(meter.key as any)}
                    style={{
                      backgroundColor: simulatedSensor === meter.key ? '#f8fafc' : '#ffffff',
                      border: simulatedSensor === meter.key ? '2px solid #090d1a' : '1px solid rgba(15, 23, 42, 0.1)',
                      padding: '1.35rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      boxShadow: simulatedSensor === meter.key ? '0 6px 16px rgba(9, 13, 26, 0.08)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#090d1a', fontFamily: 'var(--font-mono)' }}>{meter.tag}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.35rem 0' }}>{meter.type}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 750, color: meter.valid ? '#10b981' : '#ef4444' }}>
                      {meter.expiry}
                    </div>
                  </div>
                ))}
              </div>

              {/* Developer Terminal Console Execution */}
              <div className="cerebrium-dev-terminal">
                <div className="cerebrium-dev-terminal-bar">
                  <div className="cerebrium-dev-terminal-dots">
                    <span style={{ backgroundColor: '#ff5f56' }} />
                    <span style={{ backgroundColor: '#ffbd2e' }} />
                    <span style={{ backgroundColor: '#27c93f' }} />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.08em', fontWeight: 700 }}>
                    ASSURANCE GATEWAY EXECUTION LOG
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>ISO 50001 CLAUSE 6.6</span>
                </div>
                {simulatedSensor === 'WATER' ? (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    ❌ <strong>HTTP 422 FAILED_PRECONDITION:</strong> Telemetry ingestion rejected for asset &apos;EVAP-WATER-02C&apos;. No active Certificate of Calibration found. Blocked by PostgreSQL safety trigger under ISO 50001 rules.
                  </div>
                ) : (
                  <div style={{ color: '#10b981', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    ✅ <strong>HTTP 201 CREATED:</strong> Telemetry verified against active calibration certificate (SHA-256: 8f9b...a10c). Ingestion approved under statutory assurance rules.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeDemoTab === 'ANOMALY' && (
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#090d1a', letterSpacing: '-0.02em' }}>
                Milestone ISO-2: 15% Baseline Anomaly Lock Simulator
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#475569', marginBottom: '1.75rem', lineHeight: 1.6 }}>
                Slide to adjust observed PUE against the calibrated 1.14 baseline. Shifts exceeding ±15% trigger an immediate export lock (HTTP 423) and open an ISO Clause 10.2 non-conformance event.
              </p>

              <div style={{ marginBottom: '1.75rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.92rem', color: '#090d1a', fontWeight: 700 }}>Simulate Observed PUE:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isAnomalyLocked ? '#ef4444' : '#10b981', fontFamily: 'var(--font-mono)' }}>
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
                  style={{ width: '100%', accentColor: isAnomalyLocked ? '#ef4444' : '#10b981' }}
                />
              </div>

              {/* Developer Terminal Console Execution */}
              <div className="cerebrium-dev-terminal">
                <div className="cerebrium-dev-terminal-bar">
                  <div className="cerebrium-dev-terminal-dots">
                    <span style={{ backgroundColor: '#ff5f56' }} />
                    <span style={{ backgroundColor: '#ffbd2e' }} />
                    <span style={{ backgroundColor: '#27c93f' }} />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.08em', fontWeight: 700 }}>
                    ANOMALY DRIFT MONITOR
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>ISO 14001 CLAUSE 10.2</span>
                </div>
                {isAnomalyLocked ? (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ef4444', marginBottom: '0.4rem' }}>
                      🔒 HTTP 423 RESOURCE_LOCKED: System Export Lock Active
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.55 }}>
                      Metric variance of +{pueVariance.toFixed(1)}% exceeds the 15% threshold. Public transparency exports and certificate downloads are locked until supervisor root-cause resolution under ISO Clause 10.2.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#10b981', marginBottom: '0.4rem' }}>
                      ✅ HTTP 200 OK: Metric Within Calibrated Baseline
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.55 }}>
                      Observed PUE ({simulatedPue.toFixed(2)}) is within the nominal ±15% corridor. Public transparency ledger exports are active.
                    </div>
                  </div>
                )}
              </div>
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
                <div style={{ backgroundColor: '#f8fafc', padding: '1.75rem', borderRadius: '14px', border: '1px solid rgba(15, 23, 42, 0.08)', display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 750, color: '#090d1a' }}>Total Facility Workers:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#090d1a' }}>{simJobsWorkers} FTEs</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="300"
                      step="5"
                      value={simJobsWorkers}
                      onChange={(e) => setSimJobsWorkers(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#090d1a' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 750, color: '#090d1a' }}>Local Resident Hires (≤ 15 miles):</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#0284c7' }}>
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
                      style={{ width: '100%', accentColor: '#0284c7' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 750, color: '#090d1a' }}>Accredited Apprentices (NVQ Level 2/3):</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#10b981' }}>
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
                      style={{ width: '100%', accentColor: '#10b981' }}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 650, color: '#090d1a' }}>
                    <input
                      type="checkbox"
                      checked={simJobsLivingWage}
                      onChange={(e) => setSimJobsLivingWage(e.target.checked)}
                      style={{ accentColor: '#10b981' }}
                    />
                    <span>100% Real Living Wage Compliance</span>
                  </label>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1.75rem', borderRadius: '14px', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    COUNCIL AUDIT READINESS SCORE
                  </div>
                  
                  {(() => {
                    const localPct = (simJobsLocal / simJobsWorkers) * 100;
                    const apprenticePct = (simJobsApprentices / simJobsWorkers) * 100;
                    const isPassing = localPct >= 20 && apprenticePct >= 5 && simJobsLivingWage;
                    const score = Math.round((Math.min(localPct / 25, 1) * 40) + (Math.min(apprenticePct / 5, 1) * 30) + (simJobsLivingWage ? 30 : 0));

                    return (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.85rem' }}>
                          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: isPassing ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                            {score}/100
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isPassing ? '#10b981' : '#ef4444' }}>
                            {isPassing ? 'CONFORMANT (AUDIT READY)' : 'PLANNING RISK DETECTED'}
                          </span>
                        </div>

                        <div style={{ height: '8px', width: '100%', backgroundColor: 'rgba(15, 23, 42, 0.08)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                          <div style={{ height: '100%', width: `${score}%`, backgroundColor: isPassing ? '#10b981' : '#ef4444', transition: 'width 0.3s ease' }} />
                        </div>

                        <ul style={{ paddingLeft: '1.1rem', margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>
                          <li>Local Resident Hiring: {localPct.toFixed(1)}% {localPct >= 20 ? '✅ (Exceeds 20% covenant)' : '❌ (Deficit vs 20% quota)'}</li>
                          <li>Apprenticeship Ratio: {apprenticePct.toFixed(1)}% {apprenticePct >= 5 ? '✅ (Conforms to City & Guilds)' : '❌ (Below 5% threshold)'}</li>
                          <li>Living Wage Benchmark: {simJobsLivingWage ? '✅ (100% Compliant)' : '❌ (Living wage deficit)'}</li>
                        </ul>

                        <Link to="/job-reporting" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cerebrium-magenta, #ff2d8d)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>Open Standalone Workforce Suite</span>
                          <span>→</span>
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

      {/* 9.5 Cerebrium "Latest from our blog" Section (Image 3 Exact Spec) */}
      <section className="cerebrium-blog-section">
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          
          <div className="cerebrium-blog-header">
            <h2 className="cerebrium-blog-title">Latest from our blog</h2>
            <Link to="/blog" className="cerebrium-blog-see-all">
              SEE ALL
            </Link>
          </div>

          <div className="cerebrium-blog-grid">
            
            {/* Card 1: Low Latency Telemetry */}
            <Link to="/blog" className="cerebrium-blog-card">
              <div className="cerebrium-blog-banner">
                <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="blogRibbon1" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#1e0520" />
                      <stop offset="60%" stopColor="#57143c" />
                      <stop offset="100%" stopColor="#8d2363" />
                    </linearGradient>
                    <filter id="laserStreak1" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path d="M 0 240 C 120 180, 240 100, 400 30 L 400 240 Z" fill="url(#blogRibbon1)" />
                  <path d="M 0 200 C 140 160, 260 90, 400 10" stroke="#7a2258" strokeWidth="32" strokeLinecap="round" opacity="0.8" />
                  {/* Diagonal White/Magenta Laser Stroke */}
                  <path d="M 10 210 C 150 160, 270 95, 390 15" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" filter="url(#laserStreak1)" />
                  {/* Floating Outline Box (Image 3) */}
                  <rect x="145" y="72" width="80" height="95" rx="4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="rgba(255,255,255,0.02)" />
                </svg>
              </div>
              <div className="cerebrium-blog-body">
                <div className="cerebrium-blog-meta">
                  <span>JULY 15, 2026</span>
                  <span style={{ color: 'var(--cerebrium-magenta)', fontWeight: 800 }}>TUTORIAL</span>
                </div>
                <h3 className="cerebrium-blog-card-title">
                  A Low-Latency Architecture for Continuous OT Telemetry with Real-Time ISO Audit Verification
                </h3>
                <p className="cerebrium-blog-excerpt">
                  How industrial operators stream calibrated OT meter data into cryptographically sealed audit logs, eliminating annual reporting scrambles.
                </p>
              </div>
            </Link>

            {/* Card 2: Section 106 Guide */}
            <Link to="/blog" className="cerebrium-blog-card">
              <div className="cerebrium-blog-banner">
                <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="blogRibbon2" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#170319" />
                      <stop offset="50%" stopColor="#4e1035" />
                      <stop offset="100%" stopColor="#9a256d" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 240 C 130 190, 250 110, 400 40 L 400 240 Z" fill="url(#blogRibbon2)" />
                  <path d="M 20 220 C 160 170, 280 100, 390 20" stroke="#ff2d8d" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                  
                  {/* Central Statutory Book Emblem "2026 £" (Image 3) */}
                  <g transform="translate(170, 72)">
                    <rect x="0" y="0" width="60" height="85" rx="5" fill="#0e0714" stroke="#ffffff" strokeWidth="2.2" />
                    <line x1="10" y1="0" x2="10" y2="85" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x="35" y="28" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">2026</text>
                    <text x="35" y="62" fill="#ff2d8d" fontSize="24" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">£</text>
                  </g>
                </svg>
              </div>
              <div className="cerebrium-blog-body">
                <div className="cerebrium-blog-meta">
                  <span>JULY 13, 2026</span>
                  <span style={{ color: 'var(--cerebrium-magenta)', fontWeight: 800 }}>ANNOUNCEMENT</span>
                </div>
                <h3 className="cerebrium-blog-card-title">
                  2026 Section 106 Statutory Workforce Covenant &amp; Local Wage Compliance Guide
                </h3>
                <p className="cerebrium-blog-excerpt">
                  Structuring municipal planning employment dossiers under the Town and Country Planning Act 1990 with live payroll proof and apprenticeships.
                </p>
              </div>
            </Link>

            {/* Card 3: Anomaly Lock */}
            <Link to="/blog" className="cerebrium-blog-card">
              <div className="cerebrium-blog-banner">
                <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="blogRibbon3" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#150217" />
                      <stop offset="50%" stopColor="#430d2d" />
                      <stop offset="100%" stopColor="#851d5c" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 240 C 110 170, 230 90, 400 20 L 400 240 Z" fill="url(#blogRibbon3)" />
                  <path d="M 0 170 C 130 140, 260 80, 400 15" stroke="#a33276" strokeWidth="28" strokeLinecap="round" opacity="0.8" />
                  
                  {/* Central Cloud Security Lock Emblem (Image 3) */}
                  <g transform="translate(162, 75)">
                    <path
                      d="M 16 48 A 16 16 0 0 1 30 22 A 24 24 0 0 1 64 24 A 14 14 0 0 1 74 48 Z"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                    />
                    {/* Padlock */}
                    <rect x="37" y="36" width="16" height="15" rx="2" fill="#ffffff" />
                    <path d="M 41 36 L 41 30 A 4 4 0 0 1 49 30 L 49 36" fill="none" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="45" cy="43" r="1.5" fill="#0d0614" />
                  </g>
                </svg>
              </div>
              <div className="cerebrium-blog-body">
                <div className="cerebrium-blog-meta">
                  <span>JULY 8, 2026</span>
                  <span style={{ color: 'var(--cerebrium-magenta)', fontWeight: 800 }}>PRODUCT UPDATE • ANNOUNCEMENT →</span>
                </div>
                <h3 className="cerebrium-blog-card-title">
                  GHGEmissionLogs Deploys Real-Time Anomaly Lock: Enforcing 15% Baseline Drift Freeze
                </h3>
                <p className="cerebrium-blog-excerpt">
                  Autonomous ledger safeguards that freeze statutory exports (HTTP 423) whenever facility consumption drifts more than 15% from calibrated baselines.
                </p>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* 9.7 Audit-Ready Company: Carbon Emissions & Job Reporting Enterprise Matrix */}
      <section className="cerebrium-audit-matrix-section">
        <div className="cerebrium-audit-matrix-aura" aria-hidden="true" />
        <div className="cerebrium-audit-matrix-container">
          
          <div className="cerebrium-audit-matrix-header">
            <div className="cerebrium-audit-pill-tag">
              <span className="radar-pulse" style={{ width: '6px', height: '6px', backgroundColor: 'var(--cerebrium-magenta)' }} />
              STATUTORY AUDIT ASSURANCE
            </div>
            <h2 className="cerebrium-audit-matrix-title">
              Audit-Ready Infrastructure for Carbon Emissions &amp; Job Reporting
            </h2>
            <p className="cerebrium-audit-matrix-subtitle">
              Strict statutory alignment with ISO 14064, ISO 50001, and Town &amp; Country Planning Act Section 106. Every emission data-point and workforce metric is cryptographically sealed, tamper-proof, and ready for immediate auditor verification.
            </p>
          </div>

          <div className="cerebrium-audit-matrix-grid">
            
            {/* Card 1: Carbon Emissions (ISO 14064-1 & ISO 14001) */}
            <div className="cerebrium-audit-matrix-card">
              <span className="cerebrium-audit-card-badge">ISO 14064-1:2018 ASSURED</span>
              <h3 className="cerebrium-audit-card-title">Carbon Emissions Accounting</h3>
              <p className="cerebrium-audit-card-desc">
                Continuous ingestion of Scope 1, 2, and 3 activities with real-time statutory emission factor calculation.
              </p>
              <ul className="cerebrium-audit-card-points">
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Automated DEFRA 2026, EPA &amp; IEA statutory conversion factor updates</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>15% Baseline Drift Freeze (HTTP 423) prevents non-conforming exports</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>SHA-256 cryptographic provenance seals anchored on Polygon mainnet</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Aligned with UK CMA Green Claims Code for anti-greenwashing protection</span>
                </li>
              </ul>
              <div className="cerebrium-audit-card-status">
                <span>READINESS STATUS</span>
                <span>● 100% AUDIT-READY</span>
              </div>
            </div>

            {/* Card 2: Section 106 Statutory Job Reporting */}
            <div className="cerebrium-audit-matrix-card">
              <span className="cerebrium-audit-card-badge">TCPA 1990 § 106 COMPLIANT</span>
              <h3 className="cerebrium-audit-card-title">Statutory Job Reporting</h3>
              <p className="cerebrium-audit-card-desc">
                Automated social value and municipal employment compliance under the Town and Country Planning Act 1990.
              </p>
              <ul className="cerebrium-audit-card-points">
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Local labor ratio verification matched against municipal planning covenants</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Certified apprenticeship headcount &amp; accredited training hours verification</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Real Living Wage payroll audit trails with contractor non-repudiation</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Instant statutory council return generation with legal certification badges</span>
                </li>
              </ul>
              <div className="cerebrium-audit-card-status">
                <span>COVENANT COMPLIANCE</span>
                <span>● VERIFIED AUDIT DOSSIER</span>
              </div>
            </div>

            {/* Card 3: Energy Telemetry (ISO 50001:2018) */}
            <div className="cerebrium-audit-matrix-card">
              <span className="cerebrium-audit-card-badge">ISO 50001:2018 TELEMETRY</span>
              <h3 className="cerebrium-audit-card-title">Industrial Energy Telemetry</h3>
              <p className="cerebrium-audit-card-desc">
                Sub-second OT telemetry ingestion directly from calibrated physical meters with active warranty gatekeepers.
              </p>
              <ul className="cerebrium-audit-card-points">
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Continuous PDU, H2 electrolyzer, and chilled water meter telemetry</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Active calibration certificate validity tracking with auto-lockout</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Statutory energy intensity baselining &amp; PUE / CUE efficiency ratios</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Automated ISO non-conformance event triggers and corrective action logs</span>
                </li>
              </ul>
              <div className="cerebrium-audit-card-status">
                <span>OT SENSOR SYNC</span>
                <span>● SUB-SECOND ASSURANCE</span>
              </div>
            </div>

            {/* Card 4: Remote Audit Verification (ISO 19011:2026) */}
            <div className="cerebrium-audit-matrix-card">
              <span className="cerebrium-audit-card-badge">ISO 19011:2026 PROTOCOL</span>
              <h3 className="cerebrium-audit-card-title">Remote Auditor Portal</h3>
              <p className="cerebrium-audit-card-desc">
                Purpose-built remote verification workflows for accredited auditing bodies (BSI, TÜV Rheinland, DNV, SGS).
              </p>
              <ul className="cerebrium-audit-card-points">
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Annex A evidence isolation for secure, multi-tenant statutory review</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Interactive 5-pillar audit diagnostic stepper with live readiness scoring</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>One-click statutory certification PDF export with embedded digital signatures</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span className="cerebrium-audit-point-dot" />
                  <span>Multi-jurisdiction statutory disclosures (SECR, CSRD / ESRS, TCFD)</span>
                </li>
              </ul>
              <div className="cerebrium-audit-card-status">
                <span>AUDIT DEFENSE</span>
                <span>● STATUTORY ACCREDITED</span>
              </div>
            </div>

          </div>

          {/* Interactive Call-to-Action Bar */}
          <div className="cerebrium-audit-cta-bar">
            <div className="cerebrium-audit-cta-text">
              <h3>Evaluate Your Statutory Audit Readiness</h3>
              <p>
                Run our interactive diagnostic screening aligned with ISO 14001:2015, ISO 50001:2018, and Section 106 remote auditing protocols.
              </p>
            </div>
            <div className="cerebrium-audit-cta-actions">
              <Link to="/portal?scope=CARBON_EMISSION&tab=diagnostic" className="cerebrium-btn-solid-magenta">
                LAUNCH AUDIT-READINESS DIAGNOSTIC
              </Link>
              <Link
                to="/book-demo"
                className="cerebrium-btn-ghost-dark"
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('open-book-demo-modal'));
                }}
              >
                BOOK COMPLIANCE DEMO
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
