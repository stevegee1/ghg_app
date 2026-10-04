import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CerebriumAnimatedHeroBackground } from '../components/CerebriumAnimatedHeroBackground';
import { FleetCalculator } from '../components/fleet/FleetCalculator';
import { ContinuousAssuranceFlow } from '../components/ContinuousAssuranceFlow';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  // Cerebrium Feature Showcase States (Image 4)
  const [activeWhyItem, setActiveWhyItem] = useState<number>(0);
  const [activeWhyTab, setActiveWhyTab] = useState<'ISO' | 'JOBS'>('ISO');

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

  const authDestination = isAuthenticated ? (isAdmin ? '/admin' : '/portal') : '/portal/login';

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-main)', transition: 'all 0.25s ease', width: '100%', overflowX: 'hidden' }}>
      
      {/* 1. Cerebrium-Style Animated Hero Section with 3D Ribbons & Kinetic Laser */}
      <CerebriumAnimatedHeroBackground showRadarNode={true}>
        <div className="container-x" style={{ paddingTop: '2.5rem', paddingBottom: '4.5rem' }}>
          
          {/* Official UK Corporate Registration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              UK Corporation No. <strong>15230476</strong> • ISO 19011 Audit-Readiness Framework
            </span>
          </div>

          <div className="hero-layout-grid" style={{ alignItems: 'center', gap: '3.5rem' }}>
            
            {/* Left Hero Column: Cerebrium Typography & Hot-Pink Highlights */}
            <div>


              <h1
                style={{
                  fontSize: 'clamp(2.5rem, 4.8vw, 4.25rem)',
                  fontWeight: 800,
                  lineHeight: 1.08,
                  marginBottom: '1.35rem',
                  color: 'var(--text-main)',
                  letterSpacing: '-0.03em',
                }}
              >
                Continuous Environmental &amp; Workforce Assurance that <span style={{ color: 'var(--color-sky)' }}>scales</span> with you
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                  maxWidth: '560px',
                }}
              >
                Deploy audit-readiness pipelines across GHG Protocol Scopes 1-3, ISO 14064, ISO 50001, and UK Social Value &amp; Section 106 covenants with real-time IoT telemetry stream, tamper-proof calibration, and publicly verifiable dual-logo credentials.
              </p>

              {/* Action Buttons & Statutory Badges (Cerebrium Action Pair) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {isAuthenticated ? (
                    <Link
                      to={isAdmin ? '/admin' : '/portal'}
                      className="cerebrium-btn-magenta"
                    >
                      <span>{isAdmin ? 'Open Admin Console' : 'Go to My Dashboard'}</span>
                      <span className="btn-arrow" style={{ marginLeft: '0.25rem' }}>→</span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/create-account"
                        className="cerebrium-btn-magenta"
                      >
                        <span>Create Account</span>
                        <span className="btn-arrow" style={{ marginLeft: '0.25rem' }}>→</span>
                      </Link>

                      <Link
                        to="/portal/login"
                        className="cerebrium-btn-ghost"
                      >
                        <span>Sign In to Console</span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Statutory Credentials Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>
                    CMA Green Claims Code Audit-Ready
                  </span>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span>ISO 19011:2018 Remote Auditing</span>
                  <span style={{ opacity: 0.3 }}>•</span>
                  <span style={{ color: 'var(--color-sky)', fontWeight: 700 }}>15% Direct Environmental Relief</span>
                </div>
              </div>
            </div>

            {/* Right Hero: Interactive Platform Demo Simulator with Ground Truth Facility */}
            <div
              style={{
                position: 'relative',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Monitored Physical Facility Ground Truth Window */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '175px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-light)',
                }}
              >
                <img
                  src="/images/hero-industrial-facility.jpg"
                  alt="Industrial Generation and Manufacturing Emissions Facility"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              {/* Card Header: Station ID and Clean Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-sky)', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '0.2rem' }}>
                    CONTINUOUS TELEMETRY NODE
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    Industrial Telemetry Station UK-01
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                    Thames Estuary Node • 51.5074° N, 0.1278° W
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981', letterSpacing: '0.04em' }}>
                    TELEMETRY ACTIVE
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                    station-uk01.nftylogslabs.com
                  </div>
                </div>
              </div>

              {/* Tabbed Demo Panels */}
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
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
                      backgroundColor: heroStationTab === tab ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: heroStationTab === tab ? '#ffffff' : 'var(--text-muted)',
                      outline: 'none',
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
                    { id: 'STACK-01', label: 'Scope 1 Stack Emissions', value: '0.12 tCO2e', unit: 'GHG Protocol', color: '#10b981', status: 'CALIBRATED' },
                    { id: 'EV-1802', label: 'EV Logistics Fleet', value: '0.0 gCO2/km', unit: 'Scope 1 Verified', color: '#38bdf8', status: 'VERIFIED' },
                    { id: 'NH-011', label: 'NH-Gen-011 H2 Electrolyzer', value: '99.97% Purity', unit: 'ISO 14064', color: '#a78bfa', status: 'ONLINE' },
                  ].map(sensor => (
                    <div
                      key={sensor.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-subtle)', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.75rem' }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.1rem' }}>{sensor.label}</div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{sensor.id} · {sensor.unit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: sensor.color, fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{sensor.value}</div>
                        <div style={{ fontSize: '0.65rem', color: sensor.color, fontFamily: 'var(--font-mono)', fontWeight: 700, marginTop: '0.15rem' }}>
                          {sensor.status}
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
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 600 }}>{metric.label}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: metric.color, fontFamily: 'var(--font-mono)' }}>{metric.value}</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden' }}>
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
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-subtle)', padding: '0.55rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{cert.framework}</div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '0.1rem' }}>{cert.scope}</div>
                      </div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: cert.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', flexShrink: 0 }}>{cert.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Sweep Action Footer */}
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#94a3b8' }}>Sweeps simulated:</span>{' '}
                  <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{sweepCount}</span>
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
                    border: '1px solid rgba(2, 132, 199, 0.35)',
                    backgroundColor: isSimulatingSweep ? 'rgba(2, 132, 199, 0.05)' : 'rgba(2, 132, 199, 0.1)',
                    color: isSimulatingSweep ? '#94a3b8' : 'var(--color-sky)',
                    cursor: isSimulatingSweep ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSimulatingSweep ? (
                    <span>SWEEPING...</span>
                  ) : (
                    <>
                      <span>&#9654;</span>
                      <span>TRIGGER SWEEP</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </CerebriumAnimatedHeroBackground>

      {/* 2. Statutory Standards Wall (Continuous Horizontal Moving Stripes) */}
      <section style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-greyscale-8)', borderBottom: '1px solid var(--border-light)' }}>
          STATUTORY COMPLIANCE FRAMEWORKS &amp; VERIFIED CALIBRATION STANDARDS
        </div>
        
        <div className="frameworks-marquee-container" aria-label="Statutory compliance frameworks ticker">
          <div className="frameworks-marquee-track">
            {[
              { name: 'GHG Protocol', sub: 'Scopes 1, 2 & 3 Corporate Standard' },
              { name: 'ISO 14064-1', sub: 'GHG Quantification & Reporting' },
              { name: 'ISO 50001', sub: 'Energy Management & Efficiency' },
              { name: 'ISO 19011:2018', sub: 'Audit-Readiness Framework' },
              { name: 'UK Social Value & S106', sub: 'Workforce & Planning Covenants' },
              { name: 'ISO/IEC 17025', sub: 'Hardware Calibration Protocol' },
              { name: 'UK SECR', sub: 'Companies Act Mandated Disclosures' },
              { name: 'UK CMA Green Claims', sub: 'Substantiated Anti-Greenwashing' },
              // Duplicate set for seamless continuous loop
              { name: 'GHG Protocol', sub: 'Scopes 1, 2 & 3 Corporate Standard' },
              { name: 'ISO 14064-1', sub: 'GHG Quantification & Reporting' },
              { name: 'ISO 50001', sub: 'Energy Management & Efficiency' },
              { name: 'ISO 19011:2018', sub: 'Audit-Readiness Framework' },
              { name: 'UK Social Value & S106', sub: 'Workforce & Planning Covenants' },
              { name: 'ISO/IEC 17025', sub: 'Hardware Calibration Protocol' },
              { name: 'UK SECR', sub: 'Companies Act Mandated Disclosures' },
              { name: 'UK CMA Green Claims', sub: 'Substantiated Anti-Greenwashing' },
            ].map((std, idx) => (
              <div key={`${std.name}-${idx}`} className="framework-marquee-cell">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    {std.name}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {std.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* 2.1 Interactive UI Flow: Continuous Assurance Pipeline (SpydySense Standard) */}
      <ContinuousAssuranceFlow />

      {/* 2.2 Physical-to-Digital Provenance & Authentic Brand Assets */}
      <section style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', padding: '4.5rem 0' }}>
        <div className="container-x">
          <div className="provenance-layout-grid">
            
            {/* Left: Authentic Provenance Artwork Display */}
            <div
              style={{
                position: 'relative',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--color-sky)', fontWeight: 800, letterSpacing: '0.08em' }}>
                  IMMUTABLE PROVENANCE ASSETS
                </span>
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                  SHA-256 VERIFICATION SEAL
                </span>
              </div>

              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)' }}>
                <img
                  src="/images/vagaries-provenance-cards.jpg"
                  alt="NFTY LOGS Vagaries of GHG Digital Twin Collectible Cards"
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <span>Vagaries of GHG™ Digital Twin Series</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>Dual-Logo Verified</span>
              </div>
            </div>

            {/* Right: Technical Explanation */}
            <div>
              <div style={{ color: 'var(--color-sky)', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                PHYSICAL-TO-DIGITAL PROVENANCE
              </div>

              <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
                From Physical Emissions to Immutable Trust Seals
              </h2>

              <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.65, marginBottom: '2rem' }}>
                Traditional ESG disclosures rely on unverified, retroactive spreadsheets. GHGEmissionLogs anchors real-time telemetry from physical smokestacks, utility meters, and workforce covenants directly into verifiable digital twin provenance cards and publicly verifiable credentials.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sky)', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flexShrink: 0 }}>
                    01
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Hardware Telemetry &amp; ISO 17025 Gatekeeper
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                      Activity data is continuously captured via live SSE streams. Telemetry passing calibration thresholds is sealed with SHA-256 integrity hashes before database insertion.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flexShrink: 0 }}>
                    02
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      ISO 19011 Compliance Dossiers
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                      Evidence packages are pre-formatted for external certification auditors, proving continuous conformity across GHG Protocol Scopes 1-3, ISO 14064, and ISO 50001.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', flexShrink: 0 }}>
                    03
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                      Dual-Logo Provenance Seals
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                      Every issued credential is sealed with a SHA-256 fingerprint and a public verification record. Dual-logo composites permanently tie corporate licensee credentials to verified environmental achievements.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <Link
                  to={authDestination}
                  className="cerebrium-btn-ghost"
                >
                  <span>Explore Provenance &amp; Licensing</span>
                  <span className="btn-arrow">→</span>
                </Link>
              </div>

            </div>

          </div>
        </div>
      </section>

      <FleetCalculator />

      {/* 2.5 Cerebrium "Why Continuous Assurance" Feature Showcase (Image 4 Exact Spec) */}
      <section className="cerebrium-why-section">
        <div className="cerebrium-why-grid">
          
          {/* Left Column: Big Typography Vertical Selector */}
          <div>
            <div style={{ color: 'var(--color-sky)', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>
              WHY CONTINUOUS ASSURANCE
            </div>

            <div className="cerebrium-why-selector">
              {[
                { title: 'Real-Time Audit Gates', desc: 'Audit-readiness from the first telemetry ping. Ingest calibrated sensor streams in milliseconds with automated ISO 17025 verification. Continuous screening flags anomalies before certification freezes.' },
                { title: '15% Baseline Anomaly Lock', desc: 'Automated export freeze under ISO 14064-1 Clause 10.2. Any facility sensor drifting beyond the 15% threshold automatically seals ledger issuance until supervisor root-cause resolution is verified.' },
                { title: 'Social Value & S106 Workforce', desc: 'Town and Country Planning Act 1990 covenant enforcement and Public Services (Social Value) Act 2012 compliance. Automatically track local employment quotas, accredited apprenticeships, and Real Living Wage guarantees with live council reporting dossiers.' },
                { title: 'Verified Credential Seal', desc: 'Tamper-evident dual-logo credentials. Every issued credential carries a SHA-256 verification seal and a public verification record that anyone can check against the platform registry.' },
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
                'Automated export freeze under ISO 14064-1 Clause 10.2. Any facility sensor drifting beyond the 15% threshold automatically seals ledger issuance until supervisor root-cause resolution is verified.',
                'Town and Country Planning Act 1990 covenant enforcement and Public Services (Social Value) Act 2012 compliance. Automatically track local employment quotas, accredited apprenticeships, and Real Living Wage guarantees with live council reporting dossiers.',
                'Tamper-evident dual-logo credentials. Every issued credential carries a SHA-256 verification seal and a public verification record that anyone can check against the platform registry.',
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
                Social Value &amp; S106 Covenants
              </button>
            </div>

            {/* Benchmark Latency Rows */}
            {activeWhyTab === 'ISO' ? (
              <div>
                {/* Benchmark 1: GHG App Automated */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header active">
                    <span style={{ color: 'var(--color-sky)', fontWeight: 800 }}>GHGEmissionLogs (Automated OT)</span>
                    <span style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 800 }}>3.8s</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill magenta" style={{ width: '96%' }} />
                  </div>
                </div>

                {/* Benchmark 2: External Audit */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header">
                    <span>Periodic Annual Audit Engagement</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>42 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill plum" style={{ width: '48%' }} />
                  </div>
                </div>

                {/* Benchmark 3: Big 4 Advisory */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header">
                    <span>Big-4 Advisory Manual Reconciliation</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>71 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill slate" style={{ width: '28%' }} />
                  </div>
                </div>

                {/* Benchmark 4: Spreadsheets */}
                <div className="cerebrium-benchmark-row" style={{ marginBottom: 0 }}>
                  <div className="cerebrium-benchmark-row-header">
                    <span>Legacy Spreadsheets (Statutory Risk)</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>156 days</span>
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
                    <span style={{ color: 'var(--color-sky)', fontWeight: 800 }}>GHGEmissionLogs (Real-Time Dossier)</span>
                    <span style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 800 }}>2.4s</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill magenta" style={{ width: '98%' }} />
                  </div>
                </div>

                {/* Benchmark 2: Quarterly Council Return */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header">
                    <span>Quarterly Planning Authority Return</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>28 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill plum" style={{ width: '52%' }} />
                  </div>
                </div>

                {/* Benchmark 3: External Consultant */}
                <div className="cerebrium-benchmark-row">
                  <div className="cerebrium-benchmark-row-header">
                    <span>External Planning Consultant Sampling</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>60 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill slate" style={{ width: '32%' }} />
                  </div>
                </div>

                {/* Benchmark 4: General Contractor Filing */}
                <div className="cerebrium-benchmark-row" style={{ marginBottom: 0 }}>
                  <div className="cerebrium-benchmark-row-header">
                    <span>Ad-hoc Contractor Self-Reporting</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>120 days</span>
                  </div>
                  <div className="cerebrium-bar-track">
                    <div className="cerebrium-bar-fill muted" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Audit-readiness from the first telemetry ping.
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Launch continuous audit pipelines in seconds with calibrated IoT ingestion and automated statutory checks. GHG App handles sudden bursts and scale-outs automatically, without compromising evidentiary integrity.
              </div>
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
                CARBON MANAGEMENT
              </div>
              <h2 className="h2" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
                Measure, Report, Decarbonize.
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Scope 1, 2, and 3 carbon footprints for businesses of all sizes and complexities, verified against real-world energy and fuel telemetry.
              </p>
              <Link
                to="/licensing#plans"
                className="cerebrium-btn-solid-magenta"
              >
                <span>Explore Licensing Plans</span>
                <span className="btn-arrow">→</span>
              </Link>
            </div>

            {/* Scope 1, 2, 3 Physical Ground Truth & Telemetry Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                overflow: 'hidden',
                boxShadow: '0 12px 36px -12px rgba(15, 23, 42, 0.08)',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden' }}>
                <img
                  src="/images/industrial-refinery-smoke.jpg"
                  alt="Industrial Refinery Stationary Combustion & Smoke Plume"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.65rem',
                    left: '0.75rem',
                    right: '0.75rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    color: '#cbd5e1',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Stationary Combustion &amp; Flaring • Scope 1 Continuous CEMS Ingestion
                </div>
              </div>

              <div style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.15rem', fontSize: '0.85rem', fontWeight: 700 }}>
                  <div>
                    <span style={{ color: '#ea580c' }}>Scope 1:</span> 277.1 <span style={{ fontSize: '0.72rem', color: '#64748b' }}>tCO2e</span>
                  </div>
                  <div>
                    <span style={{ color: '#0284c7' }}>Scope 2:</span> 166.1 <span style={{ fontSize: '0.72rem', color: '#64748b' }}>tCO2e</span>
                  </div>
                  <div>
                    <span style={{ color: '#10b981' }}>Scope 3:</span> 664.8 <span style={{ fontSize: '0.72rem', color: '#64748b' }}>tCO2e</span>
                  </div>
                </div>

                {/* Scope Waterfall Progress Bar */}
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.25rem', background: '#f1f5f9' }}>
                  <div style={{ width: '25%', backgroundColor: '#ea580c' }} />
                  <div style={{ width: '15%', backgroundColor: '#0284c7' }} />
                  <div style={{ width: '60%', backgroundColor: '#10b981' }} />
                </div>

                <div style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.8rem', lineHeight: 1.55, fontFamily: 'var(--font-mono)' }}>
                  Continuous assurance algorithms automatically verify Scope 1 &amp; 2 boundary telemetry against primary facility sensors before compiling ISO 14064 compliance dossiers.
                </div>
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
              <h2 className="h2" style={{ fontSize: '2rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                Assurance-grade GHG emissions reporting and verifiable nature-positive climate impact.
              </h2>

              <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Pre-configured for UK SECR, EU CSRD, California SB 253/261, and ISO 14064 standards with immutable cryptographic SHA-256 data watermarks and direct 15% ESG fund routing to verified local nature projects.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to={authDestination} className="cerebrium-btn-pill-dark">
                  <span>Regulatory Reporting</span>
                  <span>→</span>
                </Link>
                <Link to={authDestination} className="cerebrium-btn-pill-outline">
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

              <h2 className="h2" style={{ fontSize: '2rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                Net-zero target setting, reduction modeling, and supplier engagement.
              </h2>

              <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Continuous sensor models tracking 15% anomaly variance limits and supplier compliance scorecards under ISO Clause 10.2.
              </p>

              <Link to={authDestination} className="cerebrium-btn-pill-dark">
                <span>Decarbonization Management</span>
                <span>→</span>
              </Link>
            </div>

            {/* Decarbonisation Strategy Image */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: '0 12px 32px -10px rgba(0, 0, 0, 0.08)' }}>
              <img
                src="/images/eyestetix-studio-zvbPbSz5BFo-unsplash.jpg"
                alt="Decarbonisation Strategy and Net-Zero Trajectory"
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
              />
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
                MUNICIPAL &amp; STATUTORY WORKFORCE ASSURANCE
              </div>

              <h2 className="h2" style={{ fontSize: '2rem', fontWeight: 800, color: '#090d1a', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
                Section 106 &amp; Social Value Job Creation Reporting, Audit-Ready for Planning Authorities &amp; Public Procurement.
              </h2>

              <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Ensure continuous audit-readiness for municipal planning covenants, the UK Social Value Act, and EU CSRD ESRS S1. Ingest verified payroll records, track local apprentice quotas, and export cryptographically sealed compliance dossiers before council inspection.
              </p>

              <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.75rem 0', fontSize: '0.875rem', color: '#475569', lineHeight: 1.7 }}>
                <li><strong>Section 106 Local Labor Quotas</strong>: Automated resident radius verification.</li>
                <li><strong>NVQ Training Evidence Locker</strong>: Cryptographically hashed apprentice credentials.</li>
                <li><strong>One-Click Planning Dossiers</strong>: Audit-ready reports formatted for council and procurement submission.</li>
              </ul>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link
                  to={authDestination}
                  className="cerebrium-btn-solid-magenta"
                >
                  <span>Explore Workforce Assurance</span>
                  <span className="btn-arrow">→</span>
                </Link>
                <Link
                  to="/book-demo"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open-book-demo-modal'));
                  }}
                  className="cerebrium-btn-ghost-dark"
                >
                  <span>Test Workforce Auditor</span>
                  <span className="btn-arrow">→</span>
                </Link>
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
                  <span style={{ color: '#e06d53', fontWeight: 600 }}>TO BE PUBLISHED SOON</span>
                  <span style={{ color: 'var(--color-sky)', fontWeight: 800 }}>TUTORIAL</span>
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
                  <path d="M 20 220 C 160 170, 280 100, 390 20" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                  
                  {/* Central Statutory Book Emblem "2026 £" (Image 3) */}
                  <g transform="translate(170, 72)">
                    <rect x="0" y="0" width="60" height="85" rx="5" fill="#0e0714" stroke="#ffffff" strokeWidth="2.2" />
                    <line x1="10" y1="0" x2="10" y2="85" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x="35" y="28" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">2026</text>
                    <text x="35" y="62" fill="#0284c7" fontSize="24" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">£</text>
                  </g>
                </svg>
              </div>
              <div className="cerebrium-blog-body">
                <div className="cerebrium-blog-meta">
                  <span style={{ color: '#e06d53', fontWeight: 600 }}>TO BE PUBLISHED SOON</span>
                  <span style={{ color: 'var(--color-sky)', fontWeight: 800 }}>ANNOUNCEMENT</span>
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
                  <span style={{ color: '#e06d53', fontWeight: 600 }}>TO BE PUBLISHED SOON</span>
                  <span style={{ color: 'var(--color-sky)', fontWeight: 800 }}>PRODUCT UPDATE</span>
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
            <div style={{ color: 'var(--color-sky)', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
              STATUTORY AUDIT ASSURANCE
            </div>
            <h2 className="cerebrium-audit-matrix-title">
              Audit-Ready Infrastructure for Carbon Emissions &amp; Job Reporting
            </h2>
            <p className="cerebrium-audit-matrix-subtitle">
              Strict statutory alignment with GHG Protocol Scopes 1-3, ISO 14064, ISO 50001, and UK Social Value &amp; Section 106 covenants. Every emission data-point and workforce metric is cryptographically sealed, tamper-proof, and ready for immediate auditor verification.
            </p>
          </div>

          <div className="cerebrium-audit-matrix-grid">
            
            {/* Card 1: Carbon Emissions (ISO 14064-1 & ISO 14001) */}
            <div className="cerebrium-audit-matrix-card">
              <h3 className="cerebrium-audit-card-title">Carbon Emissions Accounting</h3>
              <p className="cerebrium-audit-card-desc">
                Continuous ingestion of Scope 1, 2, and 3 activities with real-time statutory emission factor calculation.
              </p>
              <ul className="cerebrium-audit-card-points">
                <li className="cerebrium-audit-card-point">
                  <span>Automated DEFRA 2026, EPA &amp; IEA statutory conversion factor updates</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>15% Baseline Drift Freeze (HTTP 423) prevents non-conforming exports</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>SHA-256 verification seals with a public verification record</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Aligned with UK CMA Green Claims Code for anti-greenwashing protection</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Section 106 Statutory Job Reporting */}
            <div className="cerebrium-audit-matrix-card">
              <h3 className="cerebrium-audit-card-title">Statutory Job Reporting</h3>
              <p className="cerebrium-audit-card-desc">
                Automated social value and municipal employment compliance under the Town and Country Planning Act 1990.
              </p>
              <ul className="cerebrium-audit-card-points">
                <li className="cerebrium-audit-card-point">
                  <span>Local labor ratio verification matched against municipal planning covenants</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Verified apprenticeship headcount &amp; accredited training hours verification</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Real Living Wage payroll audit trails with contractor non-repudiation</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Instant statutory council return generation with verified provenance badges</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Energy Telemetry (ISO 50001:2018) */}
            <div className="cerebrium-audit-matrix-card">
              <h3 className="cerebrium-audit-card-title">Industrial Energy Telemetry</h3>
              <p className="cerebrium-audit-card-desc">
                Sub-second OT telemetry ingestion directly from calibrated physical meters with active warranty gatekeepers.
              </p>
              <ul className="cerebrium-audit-card-points">
                <li className="cerebrium-audit-card-point">
                  <span>Continuous PDU, H2 electrolyzer, and chilled water meter telemetry</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Active calibration certificate validity tracking with auto-lockout</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Statutory energy intensity baselining &amp; PUE / CUE efficiency ratios</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Automated ISO non-conformance event triggers and corrective action logs</span>
                </li>
              </ul>
            </div>

            {/* Card 4: Remote Audit Verification (ISO 19011:2018) */}
            <div className="cerebrium-audit-matrix-card">
              <h3 className="cerebrium-audit-card-title">Remote Auditor Portal</h3>
              <p className="cerebrium-audit-card-desc">
                Purpose-built remote verification workflows for independent auditing bodies (BSI, TÜV Rheinland, DNV, SGS).
              </p>
              <ul className="cerebrium-audit-card-points">
                <li className="cerebrium-audit-card-point">
                  <span>Annex A evidence isolation for secure, multi-tenant statutory review</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Interactive 5-pillar audit diagnostic stepper with live readiness scoring</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>One-click statutory compliance dossier PDF export with embedded digital signatures</span>
                </li>
                <li className="cerebrium-audit-card-point">
                  <span>Multi-jurisdiction statutory disclosures (SECR, CSRD / ESRS, TCFD)</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Interactive Call-to-Action Bar */}
          <div className="cerebrium-audit-cta-bar">
            <div className="cerebrium-audit-cta-text">
              <h3>Evaluate Your Statutory Audit Readiness</h3>
              <p>
                Run our interactive diagnostic screening aligned with GHG Protocol, ISO 14064, ISO 50001, and UK Social Value &amp; Section 106 audit-readiness protocols.
              </p>
            </div>
            <div className="cerebrium-audit-cta-actions">
              <Link to="/portal?scope=CARBON_EMISSION&tab=diagnostic" className="cerebrium-btn-solid-magenta">
                <span>Launch Audit Diagnostic</span>
                <span className="btn-arrow">→</span>
              </Link>
              <Link
                to="/book-demo"
                className="cerebrium-btn-ghost-dark"
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('open-book-demo-modal'));
                }}
              >
                <span>Book Compliance Demo</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
