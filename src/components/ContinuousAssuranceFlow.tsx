import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export interface AssuranceStage {
  id: string;
  stepNumber: string;
  tabLabel: string;
  subLabel: string;
  title: string;
  narrative: string;
  agentName: string;
  agentRecommendation: string;
  records: {
    label: string;
    value: string;
    badge?: string;
  }[];
  ctaText: string;
  ctaLink: string;
}

const STAGES: AssuranceStage[] = [
  {
    id: 'event',
    stepNumber: '01',
    tabLabel: 'Telemetry Event',
    subLabel: 'Continuous Ingestion',
    title: 'Physical emission telemetry detected at facility stack.',
    narrative: 'High-frequency Continuous Emission Monitoring Systems (CEMS) and IoT flue gas sensors capture real-time volumetric flow, temperature, and CO2e parts-per-million. GHGEmissionLogs ingests raw streams at 1-second intervals via Modbus TCP and encrypted MQTT gateways.',
    agentName: 'Autonomous Ingestion Gatekeeper',
    agentRecommendation: 'Telemetry stream verified online on Stack #3 (Thames Estuary). Ingestion frequency: 1 Hz. Sampling baseline within standard atmospheric envelope.',
    records: [
      { label: 'Sensor Ingestion Stream', value: 'IoT Modbus TCP / MQTT TLS', badge: '1 Hz Live' },
      { label: 'Monitored Source', value: 'Stationary Flue Stack CEMS-04', badge: 'Online' },
      { label: 'Active Metric', value: '418.2 ppm CO2e (14.2 m/s velocity)' },
      { label: 'Statutory Standard', value: 'ISO 14064-1 & GHG Protocol Scope 1' },
    ],
    ctaText: 'Launch Sensor Diagnostic Console',
    ctaLink: '/portal?scope=CARBON_EMISSION&tab=telemetry',
  },
  {
    id: 'calibration',
    stepNumber: '02',
    tabLabel: 'Autonomous Calibration',
    subLabel: '15% Drift Gatekeeper',
    title: 'Real-time sensor drift analyzed and mathematically calibrated.',
    narrative: 'Field instrumentation suffers from thermal expansion and optical soot buildup. The automated calibration engine continuously cross-references raw sensor telemetry against redundant optical spectrometers. Any variance exceeding 15% is quarantined and algorithmically normalized to ISO/IEC 17025 precision standards.',
    agentName: 'Drift & Calibration Gatekeeper',
    agentRecommendation: 'Transient spike detected at 09:41:22 UTC (+16.4% variance). Cross-referencing against redundant optical sensor verified non-combustion plume. Delta calibrated to +1.2% compliant SLA.',
    records: [
      { label: 'Calibration Boundary', value: '±15.0% Statutory Drift SLA', badge: 'Enforced' },
      { label: 'Anomaly Suppression', value: 'Cross-Sensor Optical Reconciliation', badge: 'Active' },
      { label: 'Drift Delta', value: '+1.2% (Raw spike: +16.4% quarantined)' },
      { label: 'Statutory Framework', value: 'ISO/IEC 17025:2017 & ISO 19011' },
    ],
    ctaText: 'Inspect Drift Threshold Protocol',
    ctaLink: '/portal?scope=CARBON_EMISSION&tab=diagnostic',
  },
  {
    id: 'trust-seal',
    stepNumber: '03',
    tabLabel: 'Cryptographic Trust Seal',
    subLabel: 'Polygon Ledger Commit',
    title: 'Tamper-proof assurance seal committed to public blockchain.',
    narrative: 'Once verified, emission records and calibration logs are bundled into an immutable cryptographic Merkle tree. A SHA-256 state root is sealed onto Polygon PoS (ERC-1155), establishing an indisputable audit trail that independent verifiers (BSI, TÜV, DNV) can inspect without accessing proprietary trade secrets.',
    agentName: 'Blockchain Provenance Validator',
    agentRecommendation: 'Merkle root 0x7e4b9...3a8f committed to Polygon Block #62,914,801. Statutory ISO 14064-3 assurance certificate signed with zero human tampering possible.',
    records: [
      { label: 'Block Commitment', value: 'Polygon PoS Block #62,914,801', badge: 'Sealed' },
      { label: 'Cryptographic Hash', value: '0x8f2c...4e19 (SHA-256 Merkle Root)' },
      { label: 'Assurance Certificate', value: 'ERC-1155 Statutory Digital Twin', badge: 'Level 5' },
      { label: 'Audit Standard', value: 'ISAE 3410 & UK CMA Green Claims Code' },
    ],
    ctaText: 'Verify On-Chain Provenance',
    ctaLink: '/portal?tab=evidence',
  },
];

export const ContinuousAssuranceFlow: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const STEP_DURATION_MS = 7500;
  const TICK_INTERVAL_MS = 50;

  // Auto-advance stepper
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK_INTERVAL_MS / STEP_DURATION_MS) * 100;
        if (next >= 100) {
          setActiveIdx((current) => (current + 1) % STAGES.length);
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, activeIdx]);

  const selectStage = (idx: number) => {
    setActiveIdx(idx);
    setProgress(0);
  };

  const currentStage = STAGES[activeIdx];

  return (
    <section
      className="pe-flow-section"
      aria-label="Continuous Assurance Interactive Flow"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container-x">
        {/* Section Header */}
        <div className="pe-flow-header">
          <div className="pe-flow-eyebrow">
            <span className="pe-pulse-dot" aria-hidden="true" />
            <span>CONTINUOUS ASSURANCE PIPELINE</span>
          </div>
          <h2 className="pe-flow-title">
            From physical telemetry event to verified cryptographic trust seal
          </h2>
          <p className="pe-flow-subtitle">
            Experience how GHGEmissionLogs continuously bridges physical smokestack emissions, automated 15% drift calibration, and public blockchain assurance ledgers in near-real-time.
          </p>
        </div>

        {/* The Interactive Stepper Card */}
        <div className="pe-exhibit-container">
          {/* Top Bar with Live Pipeline Status & Controls */}
          <div className="pe-bar">
            <div className="pe-bar-left">
              <svg className="pe-icon-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <span className="pe-bar-label">
                Statutory Pipeline Flow &bull; Active Node: <strong>UK-THAMES-01</strong>
              </span>
            </div>
            <div className="pe-bar-right">
              <button
                type="button"
                className="pe-pause-btn"
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
                title={isPaused ? 'Resume auto-play' : 'Pause auto-play'}
              >
                {isPaused ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Resume Auto-Play</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    <span>Pause Flow</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stepper Tabs with Directional Flow Arrows */}
          <div className="pe-tabs" role="tablist" aria-label="Assurance stages">
            {STAGES.map((stage, idx) => {
              const isActive = activeIdx === idx;
              return (
                <React.Fragment key={stage.id}>
                  <button
                    type="button"
                    role="tab"
                    id={`flow-tab-${idx}`}
                    aria-selected={isActive}
                    aria-controls={`flow-panel-${idx}`}
                    tabIndex={isActive ? 0 : -1}
                    className={`pe-tab ${isActive ? 'is-active' : ''}`}
                    onClick={() => selectStage(idx)}
                  >
                    <div className="pe-tab-number">{stage.stepNumber}</div>
                    <div className="pe-tab-text-group">
                      <div className="pe-tab-title">{stage.tabLabel}</div>
                      <div className="pe-tab-sub">{stage.subLabel}</div>
                    </div>
                    {isActive && (
                      <div
                        className="pe-tab-progress-bar"
                        style={{ width: `${progress}%` }}
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {idx < STAGES.length - 1 && (
                    <div className="pe-flow-arrow-wrapper" aria-hidden="true">
                      <svg className="pe-flow-arrow" viewBox="0 0 48 16" fill="none">
                        <path
                          d="M1 8H45m-6-6 6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Active Stage Body */}
          <div
            className="pe-stage"
            id={`flow-panel-${activeIdx}`}
            role="tabpanel"
            aria-labelledby={`flow-tab-${activeIdx}`}
          >
            <div className="pe-split">
              {/* Left Column: Technical Narrative & Agent Recommendation */}
              <div className="pe-reading">
                <div className="pe-reading-badge">
                  <span>STAGE {currentStage.stepNumber} OF 03</span>
                  <span className="pe-badge-dot">&bull;</span>
                  <span>{currentStage.subLabel.toUpperCase()}</span>
                </div>

                <h3 className="pe-stage-heading">{currentStage.title}</h3>
                <p className="pe-stage-narrative">{currentStage.narrative}</p>

                {/* AI Agent Recommendation Chip (SpydySense style) */}
                <div className="pe-agent-chip">
                  <div className="pe-agent-emblem">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="pe-agent-content">
                    <div className="pe-agent-name">{currentStage.agentName}</div>
                    <div className="pe-agent-recommendation">
                      &ldquo;{currentStage.agentRecommendation}&rdquo;
                    </div>
                  </div>
                </div>

                {/* Metadata Records */}
                <dl className="pe-records">
                  {currentStage.records.map((rec, rIdx) => (
                    <div key={rIdx} className="pe-record-item">
                      <dt className="pe-record-dt">{rec.label}</dt>
                      <dd className="pe-record-dd">
                        <span>{rec.value}</span>
                        {rec.badge && <span className="pe-record-badge">{rec.badge}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Interactive Action CTA */}
                <div className="pe-action-row">
                  <Link to={currentStage.ctaLink} className="pe-action-link">
                    <span>{currentStage.ctaText}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>

                  <button
                    type="button"
                    className="pe-action-subtle"
                    onClick={() => selectStage((activeIdx + 1) % STAGES.length)}
                  >
                    <span>Next Stage ({STAGES[(activeIdx + 1) % STAGES.length].tabLabel}) &rarr;</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live Animated Diagram Canvas */}
              <div className="pe-canvas">
                {activeIdx === 0 && <Stage1TelemetryCanvas />}
                {activeIdx === 1 && <Stage2CalibrationCanvas />}
                {activeIdx === 2 && <Stage3BlockchainCanvas />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ==========================================
// STAGE 1: TELEMETRY EVENT CANVAS
// ==========================================
const Stage1TelemetryCanvas: React.FC = () => {
  return (
    <div className="pe-canvas-inner">
      <div className="pe-canvas-header">
        <span className="pe-live-indicator">
          <span className="pe-live-beacon" />
          <span>LIVE TELEMETRY STREAM &bull; CEMS-04</span>
        </span>
        <span className="pe-canvas-mono">SAMPLING: 1 Hz</span>
      </div>

      <div className="pe-diagram-stage">
        <svg className="pe-svg-scene" viewBox="0 0 540 320" fill="none">
          {/* Background Grid Lines */}
          <g className="pe-svg-grid">
            <line x1="40" y1="60" x2="500" y2="60" />
            <line x1="40" y1="120" x2="500" y2="120" />
            <line x1="40" y1="180" x2="500" y2="180" />
            <line x1="40" y1="240" x2="500" y2="240" />
            <line x1="120" y1="40" x2="120" y2="280" />
            <line x1="260" y1="40" x2="260" y2="280" />
            <line x1="400" y1="40" x2="400" y2="280" />
          </g>

          {/* Industrial Stack Structure */}
          <path
            d="M80 270 L95 100 L125 100 L140 270 Z"
            fill="rgba(15, 23, 42, 0.05)"
            stroke="#0284c7"
            strokeWidth="2"
          />
          {/* Stack Rim */}
          <rect x="92" y="94" width="36" height="6" rx="2" fill="#0284c7" />

          {/* Plume Animation */}
          <ellipse cx="110" cy="70" rx="28" ry="18" className="pe-plume-puff p1" />
          <ellipse cx="125" cy="50" rx="34" ry="22" className="pe-plume-puff p2" />
          <ellipse cx="140" cy="30" rx="42" ry="26" className="pe-plume-puff p3" />

          {/* Sensor Probe at Stack */}
          <circle cx="110" cy="140" r="7" fill="#059669" />
          <circle cx="110" cy="140" r="14" stroke="#059669" strokeWidth="1.5" className="pe-radar-ring" />
          <circle cx="110" cy="140" r="22" stroke="#059669" strokeWidth="1" opacity="0.6" className="pe-radar-ring r2" />

          <text x="110" y="175" textAnchor="middle" className="pe-svg-label">
            Probe #CEMS-04
          </text>

          {/* Telemetry Flow Pipe with Animated Data Signals */}
          <path
            d="M110 140 L210 140 L210 190 L330 190"
            stroke="var(--border-light, #cbd5e1)"
            strokeWidth="3"
            strokeDasharray="6 4"
            className="pe-pipe-track"
          />
          <path
            d="M110 140 L210 140 L210 190 L330 190"
            stroke="#0284c7"
            strokeWidth="3"
            strokeDasharray="12 12"
            className="pe-flowing-signal"
          />

          {/* Gateway Node */}
          <g transform="translate(330, 165)">
            <rect x="0" y="0" width="80" height="50" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
            <text x="40" y="22" textAnchor="middle" className="pe-svg-node-title">EDGE GATEWAY</text>
            <text x="40" y="38" textAnchor="middle" className="pe-svg-node-sub">MODBUS &bull; TLS</text>
            <circle cx="70" cy="10" r="3" fill="#059669" />
          </g>

          {/* Stream Arrow to Ingestion Cloud */}
          <path
            d="M410 190 L460 190"
            stroke="#0284c7"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="pe-flowing-signal"
          />
          <circle cx="480" cy="190" r="18" fill="rgba(2, 132, 199, 0.1)" stroke="#0284c7" strokeWidth="1.5" />
          <text x="480" y="194" textAnchor="middle" className="pe-svg-cloud-label">INGEST</text>
        </svg>

        {/* Real-Time Live Oscilloscope Graph */}
        <div className="pe-telemetry-readout">
          <div className="pe-readout-item">
            <span className="pe-readout-label">CO2e Concentration</span>
            <span className="pe-readout-value highlight">418.2 <small>ppm</small></span>
          </div>
          <div className="pe-readout-item">
            <span className="pe-readout-label">Flue Gas Velocity</span>
            <span className="pe-readout-value">14.2 <small>m/s</small></span>
          </div>
          <div className="pe-readout-item">
            <span className="pe-readout-label">Core Temperature</span>
            <span className="pe-readout-value">182.4 <small>&deg;C</small></span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// STAGE 2: AUTONOMOUS CALIBRATION CANVAS
// ==========================================
const Stage2CalibrationCanvas: React.FC = () => {
  return (
    <div className="pe-canvas-inner">
      <div className="pe-canvas-header">
        <span className="pe-live-indicator">
          <span className="pe-live-beacon beacon-calibrating" />
          <span>AUTONOMOUS DRIFT GATEKEEPER &bull; ISO 17025</span>
        </span>
        <span className="pe-canvas-mono">SLA: &plusmn;15.0% TOLERANCE</span>
      </div>

      <div className="pe-diagram-stage">
        <svg className="pe-svg-scene" viewBox="0 0 540 280" fill="none">
          {/* Tolerance Envelope Zone (+15% to -15%) */}
          <rect x="50" y="80" width="440" height="120" fill="rgba(5, 150, 105, 0.05)" />
          <line x1="50" y1="80" x2="490" y2="80" stroke="#059669" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="495" y="84" className="pe-svg-bound-label">+15% Gatekeeper SLA</text>

          <line x1="50" y1="140" x2="490" y2="140" stroke="rgba(15, 23, 42, 0.2)" strokeWidth="1" />
          <text x="495" y="144" className="pe-svg-bound-label">Target Zero-Drift</text>

          <line x1="50" y1="200" x2="490" y2="200" stroke="#059669" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="495" y="204" className="pe-svg-bound-label">-15% Gatekeeper SLA</text>

          {/* Raw Sensor Uncalibrated Signal (Red dashed wave with transient spike violating +15%) */}
          <path
            d="M50 140 Q 90 120, 130 140 T 210 135 T 260 55 T 310 145 T 390 130 T 470 140"
            stroke="#ea580c"
            strokeWidth="2"
            strokeDasharray="4 4"
            fill="none"
          />

          {/* Highlight Spike Anomaly Zone */}
          <circle cx="260" cy="55" r="16" fill="rgba(234, 88, 12, 0.15)" stroke="#ea580c" strokeWidth="1.5" />
          <text x="260" y="42" textAnchor="middle" className="pe-svg-spike-alert">
            +16.4% SPIKE QUARANTINED
          </text>

          {/* Calibrated Normalized Signal (Emerald Green Smooth Curve) */}
          <path
            d="M50 140 Q 90 135, 130 140 T 210 138 T 260 136 T 310 142 T 390 139 T 470 140"
            stroke="#059669"
            strokeWidth="3"
            fill="none"
          />

          {/* Scanning Sweep Line (Radar style) */}
          <line x1="260" y1="50" x2="260" y2="230" stroke="#0284c7" strokeWidth="2" className="pe-scan-line" />
        </svg>

        {/* Calibration Legend & Status */}
        <div className="pe-cal-matrix">
          <div className="pe-cal-pill">
            <span className="pe-dot dot-orange" />
            <span>Raw Instrument Telemetry (+16.4% Transient Jitter)</span>
          </div>
          <div className="pe-cal-pill">
            <span className="pe-dot dot-green" />
            <span>Calibrated Ground-Truth Signal (+1.2% Normalized)</span>
          </div>
          <div className="pe-cal-pill highlight">
            <span>&bull; ISO/IEC 17025 Conformant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// STAGE 3: CRYPTOGRAPHIC TRUST SEAL CANVAS
// ==========================================
const Stage3BlockchainCanvas: React.FC = () => {
  return (
    <div className="pe-canvas-inner">
      <div className="pe-canvas-header">
        <span className="pe-live-indicator">
          <span className="pe-live-beacon beacon-sealed" />
          <span>CRYPTOGRAPHIC LEDGER &bull; POLYGON PoS</span>
        </span>
        <span className="pe-canvas-mono">BLOCK #62,914,801</span>
      </div>

      <div className="pe-diagram-stage">
        <div className="pe-seal-showcase">
          {/* Isometric Blockchain Block Seal Box */}
          <div className="pe-block-cube">
            <div className="pe-cube-face pe-cube-top">
              <span>SHA-256</span>
            </div>
            <div className="pe-cube-face pe-cube-front">
              <span className="pe-cube-id">BLOCK #62,914,801</span>
              <span className="pe-cube-hash">0x8f2c...4e19</span>
            </div>
            <div className="pe-cube-face pe-cube-side">
              <span>POLYGON</span>
            </div>
          </div>

          {/* Statutory Assurance Certificate Stamp */}
          <div className="pe-cert-stamp">
            <div className="pe-stamp-inner">
              <div className="pe-stamp-laurel">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div className="pe-stamp-title">ISO 14064-3 SEALED</div>
              <div className="pe-stamp-sub">ZERO TAMPERING POSSIBLE</div>
              <div className="pe-stamp-meta">MATURITY LEVEL 5 &bull; IMMUTABLE</div>
            </div>
          </div>
        </div>

        {/* Verification Stream Terminal */}
        <div className="pe-terminal-stream">
          <div className="pe-term-row">
            <span className="pe-term-ts">09:41:28.104</span>
            <span className="pe-term-label">MERKLE_ROOT:</span>
            <span className="pe-term-hash">0x7e4b981ca290f11d6b0521e...</span>
          </div>
          <div className="pe-term-row">
            <span className="pe-term-ts">09:41:28.450</span>
            <span className="pe-term-label">POLYGON_TX:</span>
            <span className="pe-term-tx">0x3b118...a94c &bull; 12 Confirmations</span>
          </div>
          <div className="pe-term-row highlight">
            <span className="pe-term-ts">09:41:28.910</span>
            <span className="pe-term-status">&bull; AUDIT DOSSIER CRYPTOGRAPHICALLY SECURED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
