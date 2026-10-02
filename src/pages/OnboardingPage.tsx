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
  const [assuranceIntent, setAssuranceIntent] = useState<'CARBON' | 'JOB' | 'DUAL'>(
    user?.assuranceIntent || 'CARBON'
  );

  // ── Step 2: Intake Diagnostic Assessment ──────────────────────────────────
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
          if (res.assessment.assuranceIntent) {
            setAssuranceIntent(res.assessment.assuranceIntent as 'CARBON' | 'JOB' | 'DUAL');
          }
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
        assuranceIntent,
        organisationCountry,
        organisationSize,
        annualRevenueBand,
        industrySector,
        hasPhysicalSites,
        hasProductionProcess: assuranceIntent === 'JOB' ? false : hasProductionProcess,
        hasFleet: assuranceIntent === 'JOB' ? false : hasFleet,
        hasIoTMeters: assuranceIntent === 'JOB' ? false : hasIoTMeters,
        isUKPublicContractor: assuranceIntent === 'CARBON' ? false : isUKPublicContractor,
        hasPlanningConsent: assuranceIntent === 'CARBON' ? false : hasPlanningConsent,
        makesPublicGreenClaims: assuranceIntent === 'JOB' ? false : makesPublicGreenClaims,
        hasGreenHydrogen: assuranceIntent === 'JOB' ? false : hasGreenHydrogen,
      });

      setRecommendations(res.recommendations || []);
      if (res.assessment && updateUser) {
        updateUser({
          ...user,
          assuranceIntent,
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
    const hasCarbon = recommendations.some((r) => r.workflowType === 'CARBON' && r.clientAccepted !== false);
    const hasJob = recommendations.some((r) => r.workflowType === 'JOB' && r.clientAccepted !== false);
    if (!hasCarbon && hasJob) {
      navigate('/portal?tab=checklist&scope=JOB_REPORTING');
    } else {
      navigate('/portal?tab=checklist&scope=CARBON_EMISSION');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: 'var(--text-main)', padding: '2.5rem 1rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Navigation Breadcrumb & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/images/nfty-logs-logo.png"
              alt="GHGEmissionLogs"
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              GHGEmissionLogs
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: '#f1f5f9',
                color: '#334155',
                fontWeight: 700,
                border: '1px solid #e2e8f0',
              }}
            >
              Statutory Intake Navigator
            </span>
          </div>

          <Link
            to="/portal"
            style={{ fontSize: '0.85rem', color: '#475569', textDecoration: 'none', fontWeight: 600 }}
          >
            Skip to Console
          </Link>
        </div>

        {/* Step Progress Bar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  background: step > 1 ? '#059669' : step === 1 ? '#0284c7' : '#f1f5f9',
                  color: step >= 1 ? '#ffffff' : '#64748b',
                  border: `1.5px solid ${step > 1 ? '#059669' : step === 1 ? '#0284c7' : '#cbd5e1'}`,
                  boxShadow: step === 1 ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                }}
              >
                {step > 1 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '01'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: step >= 1 ? '#090d1a' : '#64748b', fontFamily: 'var(--font-heading)' }}>
                  Organization Profile
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Entity details &amp; jurisdiction</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  background: step > 2 ? '#059669' : step === 2 ? '#0284c7' : '#f1f5f9',
                  color: step >= 2 ? '#ffffff' : '#64748b',
                  border: `1.5px solid ${step > 2 ? '#059669' : step === 2 ? '#0284c7' : '#cbd5e1'}`,
                  boxShadow: step === 2 ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                }}
              >
                {step > 2 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '02'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: step >= 2 ? '#090d1a' : '#64748b', fontFamily: 'var(--font-heading)' }}>
                  Intake Assessment
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>12 operational parameters</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono, monospace)',
                  background: step >= 3 ? '#059669' : '#f1f5f9',
                  color: step >= 3 ? '#ffffff' : '#64748b',
                  border: `1.5px solid ${step >= 3 ? '#059669' : '#cbd5e1'}`,
                  boxShadow: step === 3 ? '0 0 0 3px rgba(5, 150, 105, 0.15)' : 'none',
                }}
              >
                03
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: step >= 3 ? '#090d1a' : '#64748b', fontFamily: 'var(--font-heading)' }}>
                  Compliance Roadmap
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Frameworks &amp; preparation</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontWeight: 500,
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
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '2.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Confirm Organization &amp; Contact Context
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '2rem', lineHeight: 1.5 }}>
              Statutory assurance obligations are tailored directly to your corporate jurisdiction, enterprise scale, and executive role.
            </p>

            <form onSubmit={handleStep1Next}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
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
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Legal corporate entity name"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      Your Job Title
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                      placeholder="e.g. Chief Sustainability Officer"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      Executive Responsibility Area
                    </label>
                    <select
                      value={primaryRole}
                      onChange={(e) => setPrimaryRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="COMPLIANCE_OFFICER">CSO / Sustainability Director</option>
                      <option value="FINANCE_DIRECTOR">CFO / Finance Director</option>
                      <option value="OPERATIONS_DIRECTOR">COO / Operations Lead</option>
                      <option value="LEGAL_OFFICER">General Counsel / Legal Officer</option>
                      <option value="SUSTAINABILITY_CONSULTANT">ESG Consultant / External Advisor</option>
                      <option value="IT_DATA_MANAGER">IT &amp; Data Architect</option>
                      <option value="OTHER">Other Executive Role</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      Headquarters Country
                    </label>
                    <select
                      value={organisationCountry}
                      onChange={(e) => setOrganisationCountry(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
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
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      Primary Industry Sector
                    </label>
                    <select
                      value={industrySector}
                      onChange={(e) => setIndustrySector(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="MANUFACTURING">Manufacturing</option>
                      <option value="DATA_CENTRE">Data Centres &amp; HPC</option>
                      <option value="CONSTRUCTION">Construction &amp; Built Environment</option>
                      <option value="LOGISTICS_TRANSPORT">Logistics &amp; Fleet Transport</option>
                      <option value="GREEN_HYDROGEN">Green Hydrogen / Clean Fuels</option>
                      <option value="RETAIL_CONSUMER_GOODS">Consumer Goods &amp; Retail</option>
                      <option value="FINANCIAL_SERVICES">Financial Services</option>
                      <option value="PUBLIC_SECTOR">Public Sector &amp; Healthcare</option>
                      <option value="EVENTS_HOSPITALITY">Events, Venues &amp; Hospitality</option>
                      <option value="REAL_ESTATE_PROPERTY">Commercial Real Estate</option>
                      <option value="AGRICULTURE">Agriculture</option>
                      <option value="OTHER">Other Professional Sector</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.75rem', marginBottom: '1.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  Primary Assurance Mandate
                </label>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.45 }}>
                  Select the compliance stream your organization requires. The statutory intake diagnostic and preparation checklists will be customized strictly for this mandate.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {/* Card 1: CARBON */}
                  <div
                    onClick={() => setAssuranceIntent('CARBON')}
                    style={{
                      border: assuranceIntent === 'CARBON' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: assuranceIntent === 'CARBON' ? '#f0f9ff' : '#ffffff',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: assuranceIntent === 'CARBON' ? '0 4px 12px rgba(2, 132, 199, 0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>GHG &amp; Carbon Emissions</span>
                      </div>
                      <input
                        type="radio"
                        name="assuranceIntent"
                        checked={assuranceIntent === 'CARBON'}
                        onChange={() => setAssuranceIntent('CARBON')}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', marginBottom: '0.4rem' }}>
                      ISO 14064 · ISO 50001 · UK SECR · EU CSRD
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                      Corporate Scope 1, 2, and 3 emissions accounting, energy management telemetry, and digital warranty dockets.
                    </p>
                  </div>

                  {/* Card 2: JOB */}
                  <div
                    onClick={() => setAssuranceIntent('JOB')}
                    style={{
                      border: assuranceIntent === 'JOB' ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: assuranceIntent === 'JOB' ? '#f0fdf4' : '#ffffff',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: assuranceIntent === 'JOB' ? '0 4px 12px rgba(5, 150, 105, 0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>Workforce &amp; Social Value</span>
                      </div>
                      <input
                        type="radio"
                        name="assuranceIntent"
                        checked={assuranceIntent === 'JOB'}
                        onChange={() => setAssuranceIntent('JOB')}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', marginBottom: '0.4rem' }}>
                      UK Section 106 · Social Value Act · Apprentice Quotas
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                      Audit Section 106 planning covenants, Real Living Wage compliance, local community hiring, and public tender credits.
                    </p>
                  </div>

                  {/* Card 3: DUAL */}
                  <div
                    onClick={() => setAssuranceIntent('DUAL')}
                    style={{
                      border: assuranceIntent === 'DUAL' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      background: assuranceIntent === 'DUAL' ? '#faf5ff' : '#ffffff',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: assuranceIntent === 'DUAL' ? '0 4px 12px rgba(124, 58, 237, 0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>Dual Enterprise Assurance</span>
                      </div>
                      <input
                        type="radio"
                        name="assuranceIntent"
                        checked={assuranceIntent === 'DUAL'}
                        onChange={() => setAssuranceIntent('DUAL')}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6d28d9', marginBottom: '0.4rem' }}>
                      Full Enterprise ESG &amp; Statutory Coverage
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                      Comprehensive unified assurance covering both environmental greenhouse gas emissions and workforce social impact.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.8rem 1.85rem',
                    borderRadius: '8px',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  Continue to Intake Assessment
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 2: 12-QUESTION INTAKE ASSESSMENT ────────────────────────────── */}
        {step === 2 && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '2.25rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
                  {assuranceIntent === 'JOB'
                    ? 'Section 106 & Workforce Intake Diagnostic'
                    : assuranceIntent === 'CARBON'
                    ? 'GHG & Carbon Emissions Intake Diagnostic'
                    : 'Dual Enterprise ESG Intake Diagnostic'}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {assuranceIntent === 'JOB'
                    ? 'Answer these workforce and planning parameters. Our statutory engine calculates Section 106 covenant compliance and apprentice verification dockets.'
                    : assuranceIntent === 'CARBON'
                    ? 'Answer these operational parameters. Our statutory engine calculates your corporate Scope 1, 2 & 3 reporting duties and lead auditor assurance dockets.'
                    : 'Answer these operational and planning parameters for unified greenhouse gas emissions and Section 106 workforce social value assurance.'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    background: assuranceIntent === 'JOB' ? '#f0fdf4' : assuranceIntent === 'CARBON' ? '#f0f9ff' : '#faf5ff',
                    color: assuranceIntent === 'JOB' ? '#047857' : assuranceIntent === 'CARBON' ? '#0369a1' : '#6d28d9',
                    fontWeight: 700,
                    border: `1px solid ${assuranceIntent === 'JOB' ? '#bbf7d0' : assuranceIntent === 'CARBON' ? '#bae6fd' : '#e9d5ff'}`,
                  }}
                >
                  {assuranceIntent === 'JOB' ? 'Workforce Mandate' : assuranceIntent === 'CARBON' ? 'Carbon Mandate' : 'Dual ESG Mandate'}
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Change
                </button>
              </div>
            </div>

            <form onSubmit={handleAssessmentSubmit}>
              {/* Section A: Scale & Thresholds (Applies to All Mandates) */}
              <div style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Section A</span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ color: '#475569' }}>Organizational Scale &amp; Entity Thresholds</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      Headcount Size Band
                    </label>
                    <select
                      value={organisationSize}
                      onChange={(e) => setOrganisationSize(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="MICRO_UNDER_10">Micro (Under 10 employees)</option>
                      <option value="SMALL_10_49">Small (10 - 49 employees)</option>
                      <option value="MEDIUM_50_249">Medium (50 - 249 employees)</option>
                      <option value="LARGE_250_PLUS">Large (250+ employees - Statutory SECR / Large Enterprise)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      Annual Revenue Band
                    </label>
                    <select
                      value={annualRevenueBand}
                      onChange={(e) => setAnnualRevenueBand(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="UNDER_2M">Under £2m / €2m</option>
                      <option value="BAND_2M_10M">£2m - £10m</option>
                      <option value="BAND_10M_36M">£10m - £36m</option>
                      <option value="BAND_36M_PLUS">Over £36m (Statutory SECR &amp; Large Enterprise Threshold)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section B for JOB MANDATE: Planning Consent & Workforce Obligations */}
              {assuranceIntent === 'JOB' && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Section B</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ color: '#475569' }}>Planning Permission &amp; Public Tender Obligations</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1rem' }}>
                    <div
                      onClick={() => setHasPlanningConsent(!hasPlanningConsent)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${hasPlanningConsent ? '#059669' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: hasPlanningConsent ? '0 4px 12px rgba(5, 150, 105, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Section 106 Planning Permission
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: hasPlanningConsent ? '#059669' : '#f8fafc',
                            border: `1.5px solid ${hasPlanningConsent ? '#059669' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {hasPlanningConsent && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Development projects or construction permits subject to Section 106 local authority labor, apprentice, or community covenants.
                      </div>
                    </div>

                    <div
                      onClick={() => setIsUKPublicContractor(!isUKPublicContractor)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${isUKPublicContractor ? '#059669' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: isUKPublicContractor ? '0 4px 12px rgba(5, 150, 105, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Public Sector Contractor / Social Value Tenders
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: isUKPublicContractor ? '#059669' : '#f8fafc',
                            border: `1.5px solid ${isUKPublicContractor ? '#059669' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isUKPublicContractor && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Hold or bid for public sector contracts under the Social Value Act 2012 evaluating Real Living Wage, local hiring, and apprentice training hours.
                      </div>
                    </div>

                    <div
                      onClick={() => setHasPhysicalSites(!hasPhysicalSites)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${hasPhysicalSites ? '#059669' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: hasPhysicalSites ? '0 4px 12px rgba(5, 150, 105, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Active Sites &amp; Construction Projects
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: hasPhysicalSites ? '#059669' : '#f8fafc',
                            border: `1.5px solid ${hasPhysicalSites ? '#059669' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {hasPhysicalSites && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Maintain physical property developments, operational depots, or project sites with direct and subcontracted labor hours.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section B for CARBON or DUAL MANDATE: Operations & Energy Infrastructure */}
              {(assuranceIntent === 'CARBON' || assuranceIntent === 'DUAL') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Section B</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ color: '#475569' }}>Operations &amp; Energy Infrastructure</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1rem' }}>
                    <div
                      onClick={() => setHasPhysicalSites(!hasPhysicalSites)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${hasPhysicalSites ? '#0284c7' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: hasPhysicalSites ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Physical Buildings or Facilities
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: hasPhysicalSites ? '#0284c7' : '#f8fafc',
                            border: `1.5px solid ${hasPhysicalSites ? '#0284c7' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {hasPhysicalSites && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Own, lease, or occupy office buildings, warehouses, retail shops, or operational sites.
                      </div>
                    </div>

                    <div
                      onClick={() => setHasProductionProcess(!hasProductionProcess)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${hasProductionProcess ? '#0284c7' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: hasProductionProcess ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Manufacturing or Assembly
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: hasProductionProcess ? '#0284c7' : '#f8fafc',
                            border: `1.5px solid ${hasProductionProcess ? '#0284c7' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {hasProductionProcess && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Fabricate, refine, assemble, or process physical goods or industrial materials.
                      </div>
                    </div>

                    <div
                      onClick={() => setHasFleet(!hasFleet)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${hasFleet ? '#0284c7' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: hasFleet ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Company Commercial Fleet
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: hasFleet ? '#0284c7' : '#f8fafc',
                            border: `1.5px solid ${hasFleet ? '#0284c7' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {hasFleet && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Operate company-owned or leased delivery vans, trucks, forklifts, or service cars.
                      </div>
                    </div>

                    <div
                      onClick={() => setHasIoTMeters(!hasIoTMeters)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${hasIoTMeters ? '#0284c7' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: hasIoTMeters ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Smart Meters / SCADA / BMS
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: hasIoTMeters ? '#0284c7' : '#f8fafc',
                            border: `1.5px solid ${hasIoTMeters ? '#0284c7' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {hasIoTMeters && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Automated energy sub-metering, Building Management Systems, or telemetry loggers.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section C for CARBON or DUAL MANDATE: Regulatory & Contractual Context */}
              {(assuranceIntent === 'CARBON' || assuranceIntent === 'DUAL') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Section C</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ color: '#475569' }}>
                      {assuranceIntent === 'DUAL'
                        ? 'Regulatory, Planning & Commercial Context'
                        : 'Regulatory & Environmental Claims'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1rem' }}>
                    {assuranceIntent === 'DUAL' && (
                      <>
                        <div
                          onClick={() => setIsUKPublicContractor(!isUKPublicContractor)}
                          style={{
                            padding: '1.2rem',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: `1.5px solid ${isUKPublicContractor ? '#0284c7' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isUKPublicContractor ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                              Public Sector Contractor (UK)
                            </span>
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '6px',
                                background: isUKPublicContractor ? '#0284c7' : '#f8fafc',
                                border: `1.5px solid ${isUKPublicContractor ? '#0284c7' : '#cbd5e1'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {isUKPublicContractor && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                            Hold or bid for UK Central Government tenders subject to PPN 06/21 carbon reduction plans.
                          </div>
                        </div>

                        <div
                          onClick={() => setHasPlanningConsent(!hasPlanningConsent)}
                          style={{
                            padding: '1.2rem',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: `1.5px solid ${hasPlanningConsent ? '#0284c7' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: hasPlanningConsent ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                              Section 106 Planning Permission
                            </span>
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '6px',
                                background: hasPlanningConsent ? '#0284c7' : '#f8fafc',
                                border: `1.5px solid ${hasPlanningConsent ? '#0284c7' : '#cbd5e1'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {hasPlanningConsent && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                            Property development or building projects subject to Section 106 carbon offset or job creation quotas.
                          </div>
                        </div>
                      </>
                    )}

                    <div
                      onClick={() => setMakesPublicGreenClaims(!makesPublicGreenClaims)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${makesPublicGreenClaims ? '#0284c7' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: makesPublicGreenClaims ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Public ESG or Green Claims
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: makesPublicGreenClaims ? '#0284c7' : '#f8fafc',
                            border: `1.5px solid ${makesPublicGreenClaims ? '#0284c7' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {makesPublicGreenClaims && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Publish sustainability claims, net-zero badges, or carbon-neutral assertions subject to CMA Green Claims rules.
                      </div>
                    </div>

                    <div
                      onClick={() => setHasGreenHydrogen(!hasGreenHydrogen)}
                      style={{
                        padding: '1.2rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1.5px solid ${hasGreenHydrogen ? '#0284c7' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: hasGreenHydrogen ? '0 4px 12px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                          Green Hydrogen Generation
                        </span>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: hasGreenHydrogen ? '#0284c7' : '#f8fafc',
                            border: `1.5px solid ${hasGreenHydrogen ? '#0284c7' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {hasGreenHydrogen && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                        Produce, compress, or distribute electrolytic hydrogen requiring guarantee of origin and LCHS certification.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: '0.75rem 1.4rem',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  Back to Profile
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.85rem 2.2rem',
                    borderRadius: '8px',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.94rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {loading ? 'Evaluating Statutory Obligations...' : 'Generate Statutory Compliance Roadmap'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: COMPLIANCE ROADMAP & RECOMMENDATIONS ────────────────────── */}
        {step === 3 && (
          <div>
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '2.25rem',
                marginBottom: '2rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem', margin: 0 }}>
                    Statutory Compliance Roadmap
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                    Based on your 12 operational parameters, our engine identified {recommendations.length} compliance frameworks applicable to your company.
                  </p>
                </div>

                <button
                  onClick={handleLaunchChecklist}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  Go to Preparation Console
                </button>
              </div>

              {/* Recommendations list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.75rem' }}>
                {recommendations.map((rec) => {
                  const isAccepted = rec.clientAccepted;
                  const isMandatory = rec.isLegallyMandatory;

                  return (
                    <div
                      key={rec.id}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: isMandatory ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                        borderLeft: isMandatory ? '4px solid #090d1a' : '4px solid #0284c7',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#090d1a', fontFamily: 'var(--font-heading)' }}>
                              {rec.frameworkName}
                            </span>
                            {isMandatory ? (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '4px',
                                  background: '#fef2f2',
                                  color: '#991b1b',
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono, monospace)',
                                  border: '1px solid #fecaca',
                                }}
                              >
                                LEGALLY MANDATORY
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '4px',
                                  background: '#f0f9ff',
                                  color: '#0369a1',
                                  fontWeight: 600,
                                  fontFamily: 'var(--font-mono, monospace)',
                                  border: '1px solid #bae6fd',
                                }}
                              >
                                RECOMMENDED STANDARD
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono, monospace)',
                              }}
                            >
                              EFFORT: {rec.estimatedEffort?.toUpperCase()}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                            {rec.plainEnglishWhy}
                          </div>
                        </div>

                        <div>
                          {isMandatory ? (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: '#166534',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.45rem 0.9rem',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
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
                                padding: '0.45rem 0.95rem',
                                borderRadius: '6px',
                                background: isAccepted ? '#f0fdf4' : '#ffffff',
                                border: `1px solid ${isAccepted ? '#86efac' : '#cbd5e1'}`,
                                color: isAccepted ? '#166534' : '#334155',
                                fontSize: '0.82rem',
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
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                          gap: '1rem',
                          padding: '0.75rem 1rem',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.8rem',
                          marginTop: '0.5rem',
                        }}
                      >
                        <div>
                          <span style={{ color: '#991b1b', fontWeight: 700 }}>Consequence if skipped: </span>
                          <span style={{ color: '#475569' }}>{rec.consequenceIfSkipped}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>Enforcement body: </span>
                          <span style={{ color: '#475569', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.76rem' }}>{rec.enforcementBody}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    padding: '0.75rem 1.4rem',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  Back to Intake Questions
                </button>

                <button
                  type="button"
                  onClick={handleLaunchChecklist}
                  style={{
                    padding: '0.85rem 2.25rem',
                    borderRadius: '8px',
                    background: '#059669',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.96rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {assuranceIntent === 'JOB'
                    ? 'Launch Job Audit Preparation Console'
                    : assuranceIntent === 'CARBON'
                    ? 'Launch Carbon Preparation Console'
                    : 'Launch Dual Preparation Console'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
