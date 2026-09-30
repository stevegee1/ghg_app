import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export type OnboardingStep = 1 | 2 | 3;

export const OnboardingPage: React.FC = () => {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: Entity & Contact Confirmation ─────────────────────────────────
  const [companyName, setCompanyName] = useState<string>(user?.companyName || '');
  const [jobTitle, setJobTitle] = useState<string>(user?.jobTitle || '');
  const [primaryRole, setPrimaryRole] = useState<string>(user?.primaryRole || 'COMPLIANCE_OFFICER');
  const [organisationCountry, setOrganisationCountry] = useState<string>(user?.organisationCountry || 'GB');
  const [industrySector, setIndustrySector] = useState<string>(user?.industrySector || 'MANUFACTURING');

  // ── Step 2: 12-Question Intake Assessment ──────────────────────────────────
  const [organisationSize, setOrganisationSize] = useState<string>('MEDIUM_50_249');
  const [annualRevenueBand, setAnnualRevenueBand] = useState<string>('BAND_10M_36M');

  // Operational Questions (Block B)
  const [hasPhysicalSites, setHasPhysicalSites] = useState<boolean>(true);
  const [hasProductionProcess, setHasProductionProcess] = useState<boolean>(false);
  const [hasFleet, setHasFleet] = useState<boolean>(false);
  const [hasIoTMeters, setHasIoTMeters] = useState<boolean>(false);

  // Regulatory & Commercial Context (Block C)
  const [isUKPublicContractor, setIsUKPublicContractor] = useState<boolean>(false);
  const [hasPlanningConsent, setHasPlanningConsent] = useState<boolean>(false);
  const [makesPublicGreenClaims, setMakesPublicGreenClaims] = useState<boolean>(true);
  const [hasGreenHydrogen, setHasGreenHydrogen] = useState<boolean>(false);

  // ── Step 3: Generated Recommendations State ───────────────────────────────
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // If user has already completed assessment, check existing assessment
  useEffect(() => {
    if (token) {
      api.getAssessment(token).then((res) => {
        if (res.assessment && res.assessment.recommendations && res.assessment.recommendations.length > 0) {
          setRecommendations(res.assessment.recommendations);
          setStep(3);
        }
      }).catch(() => {
        // Fresh onboarding, proceed at Step 1
      });
    }
  }, [token]);

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    setError(null);
    if (token) {
      try {
        setLoading(true);
        const res = await api.updateProfile(token, {
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
          primaryRole,
          organisationCountry,
          industrySector,
        });
        if (res.user && updateUser) {
          updateUser(res.user);
        }
      } catch (err: any) {
        console.warn('Profile update warning:', err.message);
      } finally {
        setLoading(false);
      }
    }
    setStep(2);
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.submitAssessment(token, {
        organisationCountry,
        organisationSize,
        annualRevenueBand,
        industrySector,
        hasPhysicalSites,
        hasProductionProcess,
        hasFleet,
        hasIoTMeters,
        isUKPublicContractor,
        hasPlanningConsent,
        makesPublicGreenClaims,
        hasGreenHydrogen,
      });

      setRecommendations(res.recommendations || []);
      if (res.assessment && updateUser) {
        updateUser({
          ...user,
          hasCompletedAssessment: true,
          isOnboardingComplete: true,
        });
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to submit intake assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRecommendation = async (recId: string, currentAccepted: boolean, isMandatory: boolean) => {
    if (isMandatory) return; // Mandatory cannot be toggled off
    if (!token) return;

    setDecidingId(recId);
    try {
      const nextAccepted = !currentAccepted;
      const res = await api.decideRecommendation(
        token,
        recId,
        nextAccepted,
        nextAccepted ? undefined : 'Deferred during onboarding'
      );
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, clientAccepted: res.recommendation.clientAccepted } : r))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update recommendation selection');
    } finally {
      setDecidingId(null);
    }
  };

  const handleLaunchChecklist = () => {
    navigate('/portal?tab=checklist');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080c14', color: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Navigation Breadcrumb & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/images/nfty-logs-logo.png"
              alt="GHGEmissionLogs"
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              GHGEmissionLogs
            </span>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
              Onboarding Navigator
            </span>
          </div>

          <Link
            to="/portal"
            style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
          >
            Skip to Console &rarr;
          </Link>
        </div>

        {/* Step Progress Bar */}
        <div style={{ background: '#0d1424', borderRadius: '12px', border: '1px solid #1e293b', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: step >= 1 ? '#38bdf8' : '#1e293b',
                  color: step >= 1 ? '#080c14' : '#64748b',
                }}
              >
                1
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: step >= 1 ? '#f8fafc' : '#64748b' }}>
                  Organization Profile
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Entity details & role</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: step >= 2 ? '#38bdf8' : '#1e293b',
                  color: step >= 2 ? '#080c14' : '#64748b',
                }}
              >
                2
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: step >= 2 ? '#f8fafc' : '#64748b' }}>
                  Intake Assessment
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>12 operational questions</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: step >= 3 ? '#22c55e' : '#1e293b',
                  color: step >= 3 ? '#080c14' : '#64748b',
                }}
              >
                3
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: step >= 3 ? '#f8fafc' : '#64748b' }}>
                  Compliance Roadmap
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Frameworks & checklist</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: ORGANIZATION & ROLE VERIFICATION ─────────────────────────── */}
        {step === 1 && (
          <div style={{ background: '#0d1424', borderRadius: '12px', border: '1px solid #1e293b', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Confirm your Organization & Contact Context
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              We tailor your compliance obligations directly to your corporate jurisdiction and executive role.
            </p>

            <form onSubmit={handleStep1Next}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                    Company or Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: '#080c14',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                    }}
                    placeholder="Legal corporate entity name"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Your Job Title
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#080c14',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                      }}
                      placeholder="e.g. Chief Sustainability Officer"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Executive Responsibility Area
                    </label>
                    <select
                      value={primaryRole}
                      onChange={(e) => setPrimaryRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#080c14',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                      }}
                    >
                      <option value="COMPLIANCE_OFFICER">CSO / Sustainability Director</option>
                      <option value="FINANCE_DIRECTOR">CFO / Finance Director</option>
                      <option value="OPERATIONS_DIRECTOR">COO / Operations Lead</option>
                      <option value="LEGAL_OFFICER">General Counsel / Legal Officer</option>
                      <option value="SUSTAINABILITY_CONSULTANT">ESG Consultant / External Advisor</option>
                      <option value="IT_DATA_MANAGER">IT & Data Architect</option>
                      <option value="OTHER">Other Executive Role</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Headquarters Country
                    </label>
                    <select
                      value={organisationCountry}
                      onChange={(e) => setOrganisationCountry(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#080c14',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                      }}
                    >
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="DE">Germany (DE)</option>
                      <option value="FR">France (FR)</option>
                      <option value="NL">Netherlands (NL)</option>
                      <option value="IE">Ireland (IE)</option>
                      <option value="US">United States (US)</option>
                      <option value="AU">Australia (AU)</option>
                      <option value="CA">Canada (CA)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Primary Industry Sector
                    </label>
                    <select
                      value={industrySector}
                      onChange={(e) => setIndustrySector(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#080c14',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                      }}
                    >
                      <option value="MANUFACTURING">Manufacturing</option>
                      <option value="DATA_CENTRE">Data Centres & HPC</option>
                      <option value="CONSTRUCTION">Construction & Built Environment</option>
                      <option value="LOGISTICS_TRANSPORT">Logistics & Fleet Transport</option>
                      <option value="GREEN_HYDROGEN">Green Hydrogen / Clean Fuels</option>
                      <option value="RETAIL_CONSUMER_GOODS">Consumer Goods & Retail</option>
                      <option value="FINANCIAL_SERVICES">Financial Services</option>
                      <option value="PUBLIC_SECTOR">Public Sector & Healthcare</option>
                      <option value="EVENTS_HOSPITALITY">Events, Venues & Hospitality</option>
                      <option value="REAL_ESTATE_PROPERTY">Commercial Real Estate</option>
                      <option value="AGRICULTURE">Agriculture</option>
                      <option value="OTHER">Other Professional Sector</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.75rem',
                    borderRadius: '8px',
                    background: '#38bdf8',
                    color: '#080c14',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Continue to Intake Assessment &rarr;
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 2: 12-QUESTION INTAKE ASSESSMENT ────────────────────────────── */}
        {step === 2 && (
          <div style={{ background: '#0d1424', borderRadius: '12px', border: '1px solid #1e293b', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>
                12-Question Intake Assessment
              </h2>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontWeight: 600 }}>
                Plain-English Babysitter Mode
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.5 }}>
              Answer these straightforward operational questions. Our decision engine will automatically calculate your exact statutory duties and audit requirements.
            </p>

            <form onSubmit={handleAssessmentSubmit}>
              {/* Block A: Scale & Thresholds */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Section A</span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span style={{ color: '#cbd5e1' }}>Organizational Scale</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Headcount Size Band
                    </label>
                    <select
                      value={organisationSize}
                      onChange={(e) => setOrganisationSize(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#080c14',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                      }}
                    >
                      <option value="MICRO_UNDER_10">Micro (Under 10 employees)</option>
                      <option value="SMALL_10_49">Small (10 - 49 employees)</option>
                      <option value="MEDIUM_50_249">Medium (50 - 249 employees)</option>
                      <option value="LARGE_250_PLUS">Large (250+ employees - Statutory SECR Threshold)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      Annual Revenue Band
                    </label>
                    <select
                      value={annualRevenueBand}
                      onChange={(e) => setAnnualRevenueBand(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#080c14',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.9rem',
                      }}
                    >
                      <option value="UNDER_2M">Under £2m / €2m</option>
                      <option value="BAND_2M_10M">£2m - £10m</option>
                      <option value="BAND_10M_36M">£10m - £36m</option>
                      <option value="BAND_36M_PLUS">Over £36m (Statutory SECR & Large Enterprise Threshold)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Block B: Operations & Assets */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Section B</span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span style={{ color: '#cbd5e1' }}>Operations & Energy Footprint</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div
                    onClick={() => setHasPhysicalSites(!hasPhysicalSites)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: hasPhysicalSites ? 'rgba(56, 189, 248, 0.08)' : '#080c14',
                      border: `1px solid ${hasPhysicalSites ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Physical Buildings or Facilities</span>
                      <input type="checkbox" checked={hasPhysicalSites} readOnly style={{ accentColor: '#38bdf8' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Own, lease, or occupy office buildings, warehouses, retail shops, or operational sites.
                    </div>
                  </div>

                  <div
                    onClick={() => setHasProductionProcess(!hasProductionProcess)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: hasProductionProcess ? 'rgba(56, 189, 248, 0.08)' : '#080c14',
                      border: `1px solid ${hasProductionProcess ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Manufacturing or Assembly</span>
                      <input type="checkbox" checked={hasProductionProcess} readOnly style={{ accentColor: '#38bdf8' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Fabricate, refine, assemble, or process physical goods or industrial materials.
                    </div>
                  </div>

                  <div
                    onClick={() => setHasFleet(!hasFleet)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: hasFleet ? 'rgba(56, 189, 248, 0.08)' : '#080c14',
                      border: `1px solid ${hasFleet ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Company Commercial Fleet</span>
                      <input type="checkbox" checked={hasFleet} readOnly style={{ accentColor: '#38bdf8' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Operate company-owned or leased delivery vans, trucks, forklifts, or service cars.
                    </div>
                  </div>

                  <div
                    onClick={() => setHasIoTMeters(!hasIoTMeters)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: hasIoTMeters ? 'rgba(56, 189, 248, 0.08)' : '#080c14',
                      border: `1px solid ${hasIoTMeters ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Smart Meters / SCADA / BMS</span>
                      <input type="checkbox" checked={hasIoTMeters} readOnly style={{ accentColor: '#38bdf8' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Automated energy sub-metering, Building Management Systems, or telemetry loggers.
                    </div>
                  </div>
                </div>
              </div>

              {/* Block C: Commercial & Legal Obligations */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Section C</span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span style={{ color: '#cbd5e1' }}>Regulatory & Contractual Obligations</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div
                    onClick={() => setIsUKPublicContractor(!isUKPublicContractor)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: isUKPublicContractor ? 'rgba(56, 189, 248, 0.08)' : '#080c14',
                      border: `1px solid ${isUKPublicContractor ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Public Sector Contractor (UK)</span>
                      <input type="checkbox" checked={isUKPublicContractor} readOnly style={{ accentColor: '#38bdf8' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Hold or bid for UK Central Government tenders subject to PPN 06/21 carbon reduction plans.
                    </div>
                  </div>

                  <div
                    onClick={() => setHasPlanningConsent(!hasPlanningConsent)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: hasPlanningConsent ? 'rgba(56, 189, 248, 0.08)' : '#080c14',
                      border: `1px solid ${hasPlanningConsent ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Section 106 Planning Permission</span>
                      <input type="checkbox" checked={hasPlanningConsent} readOnly style={{ accentColor: '#38bdf8' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Property development or building projects subject to Section 106 carbon offset or job creation quotas.
                    </div>
                  </div>

                  <div
                    onClick={() => setMakesPublicGreenClaims(!makesPublicGreenClaims)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: makesPublicGreenClaims ? 'rgba(56, 189, 248, 0.08)' : '#080c14',
                      border: `1px solid ${makesPublicGreenClaims ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Public ESG or Green Claims</span>
                      <input type="checkbox" checked={makesPublicGreenClaims} readOnly style={{ accentColor: '#38bdf8' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Publish sustainability claims, net-zero badges, or carbon-neutral assertions subject to CMA Green Claims rules.
                    </div>
                  </div>

                  <div
                    onClick={() => setHasGreenHydrogen(!hasGreenHydrogen)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: hasGreenHydrogen ? 'rgba(56, 189, 248, 0.08)' : '#080c14',
                      border: `1px solid ${hasGreenHydrogen ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Green Hydrogen Generation</span>
                      <input type="checkbox" checked={hasGreenHydrogen} readOnly style={{ accentColor: '#38bdf8' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Produce, compress, or distribute electrolytic hydrogen requiring guarantee of origin and LCHS certification.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: '#94a3b8',
                    border: '1px solid #1e293b',
                    cursor: 'pointer',
                  }}
                >
                  &larr; Back to Profile
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.75rem',
                    borderRadius: '8px',
                    background: '#22c55e',
                    color: '#080c14',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {loading ? 'Evaluating Obligations...' : 'Generate Compliance Roadmap &rarr;'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: COMPLIANCE ROADMAP & RECOMMENDATIONS ────────────────────── */}
        {step === 3 && (
          <div>
            <div style={{ background: '#0d1424', borderRadius: '12px', border: '1px solid #1e293b', padding: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.4rem' }}>
                    Your Personalized Compliance Roadmap
                  </h2>
                  <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Based on your 12 operational parameters, our engine identified {recommendations.length} compliance frameworks applicable to your company.
                  </p>
                </div>

                <button
                  onClick={handleLaunchChecklist}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    background: '#22c55e',
                    color: '#080c14',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Go to Preparation Console &rarr;
                </button>
              </div>

              {/* Recommendations list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                {recommendations.map((rec) => {
                  const isAccepted = rec.clientAccepted;
                  const isMandatory = rec.isLegallyMandatory;

                  return (
                    <div
                      key={rec.id}
                      style={{
                        padding: '1.25rem 1.5rem',
                        borderRadius: '10px',
                        background: isMandatory ? 'rgba(30, 41, 59, 0.7)' : '#080c14',
                        border: `1px solid ${isMandatory ? '#38bdf8' : isAccepted ? '#1e293b' : '#334155'}`,
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                              {rec.frameworkName}
                            </span>
                            {isMandatory ? (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '4px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#f87171',
                                  fontWeight: 700,
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                }}
                              >
                                LEGALLY MANDATORY
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '4px',
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: '#38bdf8',
                                  fontWeight: 600,
                                }}
                              >
                                RECOMMENDED STANDARD
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                background: '#1e293b',
                                color: '#94a3b8',
                              }}
                            >
                              Effort: {rec.estimatedEffort}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.65rem' }}>
                            {rec.plainEnglishWhy}
                          </div>
                        </div>

                        <div>
                          {isMandatory ? (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: '#22c55e',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.85rem',
                                background: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: '6px',
                              }}
                            >
                              Active Mandate
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={decidingId === rec.id}
                              onClick={() => handleToggleRecommendation(rec.id, isAccepted, isMandatory)}
                              style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: '6px',
                                background: isAccepted ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                                border: `1px solid ${isAccepted ? '#22c55e' : '#475569'}`,
                                color: isAccepted ? '#4ade80' : '#94a3b8',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {decidingId === rec.id ? 'Updating...' : isAccepted ? 'Included' : 'Include +'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Consequences & Enforcement row */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr',
                          gap: '1rem',
                          paddingTop: '0.65rem',
                          borderTop: '1px solid #1e293b',
                          fontSize: '0.78rem',
                        }}
                      >
                        <div>
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>Consequence if skipped: </span>
                          <span style={{ color: '#94a3b8' }}>{rec.consequenceIfSkipped}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>Enforcement body: </span>
                          <span style={{ color: '#94a3b8' }}>{rec.enforcementBody}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: '#94a3b8',
                    border: '1px solid #1e293b',
                    cursor: 'pointer',
                  }}
                >
                  &larr; Retake 12 Questions
                </button>

                <button
                  type="button"
                  onClick={handleLaunchChecklist}
                  style={{
                    padding: '0.85rem 2rem',
                    borderRadius: '8px',
                    background: '#22c55e',
                    color: '#080c14',
                    fontWeight: 800,
                    fontSize: '0.96rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Launch Preparation Checklist &rarr;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
