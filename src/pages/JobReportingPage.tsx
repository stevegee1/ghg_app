import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export const JobReportingPage: React.FC = () => {
  // Assessment Calculator State
  const [totalWorkers, setTotalWorkers] = useState<number>(120);
  const [localWorkers, setLocalWorkers] = useState<number>(36);
  const [apprenticeCount, setApprenticeCount] = useState<number>(8);
  const [livingWageCompliant, setLivingWageCompliant] = useState<boolean>(true);
  const [trainingHours, setTrainingHours] = useState<number>(1450);

  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function runEval() {
      setEvaluating(true);
      try {
        const res = await api.assessJobCompliance({
          totalWorkers: Number(totalWorkers) || 1,
          localWorkers: Number(localWorkers) || 0,
          apprenticeCount: Number(apprenticeCount) || 0,
          livingWageCompliant,
          trainingHours: Number(trainingHours) || 0,
        });
        if (isMounted) setAssessmentResult(res);
      } catch (err) {
        console.error('Failed to evaluate workforce metrics', err);
      } finally {
        if (isMounted) setEvaluating(false);
      }
    }
    runEval();
    return () => { isMounted = false; };
  }, [totalWorkers, localWorkers, apprenticeCount, livingWageCompliant, trainingHours]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 0 5rem 0' }}>
      
      {/* 1. Hero Section (Clean Google B2B Layout — Zero Badges) */}
      <section style={{ textAlign: 'center', padding: '2.5rem 1rem 3rem 1rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            margin: '0 auto 0.75rem auto',
            letterSpacing: '-0.025em',
            maxWidth: '850px',
            lineHeight: 1.25,
          }}
        >
          Audit-Ready Job Creation & Section 106 Planning Compliance
        </h1>

        <p
          style={{
            fontSize: '0.9375rem',
            color: 'var(--text-muted)',
            maxWidth: '780px',
            margin: '0 auto 2rem auto',
            lineHeight: 1.55,
          }}
        >
          Guarantee continuous audit-readiness for municipal planning covenants, the UK Social Value Act, and EU CSRD ESRS S1. Ingest verified payroll records, track local apprentice quotas, and export cryptographically sealed compliance dossiers before council inspection.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/create-account" className="btn btn-primary" style={{ padding: '0.65rem 1.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <span>Sign Up Free</span>
            <span>→</span>
          </Link>
          <a href="#auditor" className="btn btn-secondary" style={{ padding: '0.65rem 1.75rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            <span>Launch Compliance Auditor</span>
          </a>
        </div>
      </section>

      {/* 2. Visual Feature Strip with Attached Executive Audit Asset */}
      <section className="persefoni-card" style={{ padding: '2rem', marginBottom: '3rem', backgroundColor: 'var(--bg-card)' }}>
        <div className="hero-layout-grid" style={{ alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              Eliminate Planning Permit Revocation Risk
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
              Under Town and Country Planning Act 1990 covenants, industrial infrastructure builders face financial penalties and permit revocation if local workforce commitments cannot be proven during annual audits.
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li><strong>Local Labor Quotas</strong>: Automatic distance-based resident filtering (within 15-mile council boundaries).</li>
              <li><strong>Apprentice Accreditations</strong>: Immutable storage of NVQ Level 2/3 indentures and City & Guilds logs.</li>
              <li><strong>Statutory Living Wage</strong>: Real-time validation against the UK Real Living Wage and EU Fair Wage mandates.</li>
            </ul>
            <Link to="/create-account" style={{ color: 'var(--color-sky)', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}>
              Set up workforce compliance tenant →
            </Link>
          </div>

          <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)' }}>
            <img
              src="/images/workforce-audit.jpg"
              alt="Executive Review of Workforce Quotas and Audit Line Graphs"
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* 3. Core Pillars Bento Grid */}
      <section style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Three Pillars of Workforce Audit Readiness
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Built specifically for industrial operators with municipal planning obligations.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Section 106 Local Labor Gatekeeper
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Automatically aggregates subcontractor rosters to compute local resident employment ratios against statutory planning thresholds (typically 20% to 30%), flagging workforce deficits before quarterly council submissions.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--color-sky)', fontWeight: 700 }}>
              Town & Country Planning Act Aligned
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Cryptographic Payroll Evidence Locker
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Securely ingests anonymized payroll summaries, CSCS cards, and apprentice indenture certificates. Each payload is stamped with an immutable SHA-256 hash to withstand forensic examination by external municipal auditors.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--color-sky)', fontWeight: 700 }}>
              GDPR & Multi-Tenant Isolated
            </div>
          </div>

          <div className="persefoni-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Certified Planning Dossier Generator
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                Compiles authoritative, board-ready Section 106 compliance dossiers complete with cryptographic verification seals, structured to satisfy UK Local Planning Authorities, Social Value evaluators, and CSRD ESRS S1 auditors.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--color-sky)', fontWeight: 700 }}>
              Social Value Act 2012 Certified
            </div>
          </div>

        </div>
      </section>

      {/* 4. Interactive Self-Service Planning Compliance Auditor */}
      <section id="auditor" className="persefoni-card" style={{ padding: '2rem', marginBottom: '3.5rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            Section 106 Planning Compliance Auditor
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Adjust workforce metrics to evaluate audit readiness under municipal planning benchmarks.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
          
          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Total Facility Workers (FTEs)
                </label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)' }}>{totalWorkers} workers</span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="5"
                value={totalWorkers}
                onChange={(e) => setTotalWorkers(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-sky)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Local Resident Hires (within 15 miles)
                </label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-sky)' }}>
                  {localWorkers} workers ({((localWorkers / totalWorkers) * 100).toFixed(1)}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={totalWorkers}
                step="1"
                value={localWorkers}
                onChange={(e) => setLocalWorkers(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-sky)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Accredited Apprentices (NVQ Level 2/3)
                </label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-green)' }}>
                  {apprenticeCount} apprentices ({((apprenticeCount / totalWorkers) * 100).toFixed(1)}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={apprenticeCount}
                onChange={(e) => setApprenticeCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-green)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Completed Vocational Training Hours
                </label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)' }}>{trainingHours} hrs</span>
              </div>
              <input
                type="range"
                min="200"
                max="5000"
                step="50"
                value={trainingHours}
                onChange={(e) => setTrainingHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-sky)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <input
                type="checkbox"
                id="livingWage"
                checked={livingWageCompliant}
                onChange={(e) => setLivingWageCompliant(e.target.checked)}
                style={{ accentColor: 'var(--color-green)', width: '18px', height: '18px' }}
              />
              <label htmlFor="livingWage" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                100% Real Living Wage Compliance across all contractors
              </label>
            </div>
          </div>

          {/* Real-time Assessment Card */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: assessmentResult?.isAuditReady ? 'var(--color-green)' : 'var(--google-red)', fontFamily: 'var(--font-mono)' }}>
                {assessmentResult?.score ?? 85}<span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/100</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: assessmentResult?.isAuditReady ? 'var(--color-green)' : 'var(--google-red)' }}>
                {assessmentResult?.grade === 'CONFORMANT_GRADE_A' ? 'CONFORMANT — AUDIT READY' : 'ACTION REQUIRED'}
              </div>
            </div>

            {/* Score Bar */}
            <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div
                style={{
                  height: '100%',
                  width: `${assessmentResult?.score ?? 85}%`,
                  backgroundColor: assessmentResult?.isAuditReady ? 'var(--color-green)' : 'var(--google-red)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Findings List */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Audit Evaluation Findings:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {assessmentResult?.notes?.map((n: string, idx: number) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            </div>

            {/* Cryptographic Seal Preview */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '0.72rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Provisional SHA-256 Verification Seal:
              </div>
              <code style={{ color: 'var(--color-sky)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                {assessmentResult?.provisionalSealHash ?? '7f9a8b1c4e2d3f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a'}
              </code>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/create-account" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Generate Certified Council Dossier →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Bottom Sign Up & Sign In CTA */}
      <section className="persefoni-card" style={{ textAlign: 'center', padding: '3.5rem 2rem', backgroundColor: 'var(--bg-subtle)' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', letterSpacing: '-0.025em' }}>
          Prepare your infrastructure project for planning authority audit.
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
          Provision an isolated workforce compliance tenant in under 60 seconds. Full access to Section 106 gatekeepers and council dossier generators.
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
