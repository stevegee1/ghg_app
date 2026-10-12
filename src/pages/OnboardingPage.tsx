import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ServicePicker } from '../components/onboarding/ServicePicker';
import { ServiceQuestions, type YesNoAnswers } from '../components/onboarding/ServiceQuestions';
import {
  GHG_QUESTIONS,
  SERVICE_OPTIONS,
  WORKFORCE_QUESTIONS,
  type ClientService,
  type FleetProfileAnswers,
} from '../components/onboarding/onboardingServices';

const SERVICE_DESTINATIONS: Record<ClientService, string> = {
  GHG: '/portal?tab=checklist&scope=CARBON_EMISSION',
  WORKFORCE: '/portal?tab=checklist&scope=JOB_REPORTING',
  FLEET: '/portal?tab=fleet',
};

const SERVICE_INTRO: Record<ClientService, { title: string; detail: string }> = {
  GHG: {
    title: 'GHG questions',
    detail: 'These answers decide which greenhouse gas reporting and carbon frameworks apply to you.',
  },
  WORKFORCE: {
    title: 'Workforce questions',
    detail: 'These answers decide which planning and Social Value obligations apply to you.',
  },
  FLEET: {
    title: 'Fleet questions',
    detail: 'These answers set up your Fleet dashboard and how each machine will be connected.',
  },
};

export type OnboardingStep = 1 | 2 | 3;

/** Services in the order they are asked about and routed to. */
const SERVICE_ORDER: ClientService[] = ['GHG', 'WORKFORCE', 'FLEET'];

/** Services the client already holds, from their entitlements. */
const heldServices = (entitlements: { serviceLine: string }[] = []): ClientService[] => {
  const lines = new Set(entitlements.map((e) => e.serviceLine));
  return SERVICE_ORDER.filter((s) =>
    s === 'GHG' ? lines.has('GHG') || lines.has('CARBON') : s === 'WORKFORCE' ? lines.has('JOB') : lines.has('FLEET')
  );
};

export const OnboardingPage: React.FC = () => {
  const { user, token, updateUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const addParam = searchParams.get('add');
  const addService: ClientService | null =
    user?.hasCompletedAssessment && (addParam === 'GHG' || addParam === 'WORKFORCE' || addParam === 'FLEET') ? addParam : null;

  const [step, setStep] = useState<OnboardingStep>(addService ? 2 : 1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: Entity, contact and service ───────────────────────────────────
  const [companyName, setCompanyName] = useState<string>(user?.companyName || '');
  const [jobTitle, setJobTitle] = useState<string>(user?.jobTitle || '');
  const [primaryRole, setPrimaryRole] = useState<string>(user?.primaryRole || 'COMPLIANCE_OFFICER');
  const [organisationCountry, setOrganisationCountry] = useState<string>(user?.organisationCountry || 'GB');
  const [industrySector, setIndustrySector] = useState<string>(user?.industrySector || 'MANUFACTURING');
  const [services, setServicesState] = useState<ClientService[]>(addService ? [addService] : []);
  const setServices = (next: ClientService[]) => setServicesState(SERVICE_ORDER.filter((s) => next.includes(s)));
  const alreadyHeld = heldServices(user?.serviceEntitlements);

  // ── Step 2: Scale and the chosen service's questions ──────────────────────
  const [organisationSize, setOrganisationSize] = useState<string>('MEDIUM_50_249');
  const [annualRevenueBand, setAnnualRevenueBand] = useState<string>('BAND_10M_36M');
  const [answers, setAnswers] = useState<YesNoAnswers>({});
  const [fleet, setFleet] = useState<FleetProfileAnswers>({ assetCountBand: '', categories: [], cloudConnection: '' });

  // ── Step 3: Generated recommendations and where the client goes next ──────
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);

  const serviceTitle = services.map((id) => SERVICE_OPTIONS.find((o) => o.id === id)?.title ?? id).join(', ');
  const hasFleet = services.includes('FLEET');
  const hasFrameworkService = services.includes('GHG') || services.includes('WORKFORCE');

  // A client who has already onboarded sees their roadmap, unless they are adding a service.
  useEffect(() => {
    if (!token || addService) return;
    api
      .getAssessment(token)
      .then((res) => {
        const lines: string[] = res.assessment?.serviceLinesRequested || [];
        if (!res.assessment) return;
        setServices(heldServices(lines.map((serviceLine) => ({ serviceLine }))));
        setRecommendations(res.assessment.recommendations || []);
        setStep(3);
      })
      .catch(() => {
        // Fresh onboarding, proceed at Step 1
      });
  }, [token, addService]);

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (services.length === 0) {
      setError('Choose at least one service.');
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
        setError(err.message || 'Failed to save your profile.');
        return;
      } finally {
        setLoading(false);
      }
    }
    setStep(2);
  };

  /** Validates that every question for each chosen service has an answer. */
  const collectAnswers = (): { error: string } | { value: Record<string, unknown> } => {
    if (services.length === 0) return { error: 'Choose at least one service.' };
    const value: Record<string, unknown> = {};
    if (hasFleet) {
      if (!fleet.assetCountBand || !fleet.cloudConnection || fleet.categories.length === 0) {
        return { error: 'Answer every Fleet question, including at least one equipment type.' };
      }
      value.fleetProfile = fleet;
    }
    const questions = [
      ...(services.includes('GHG') ? GHG_QUESTIONS : []),
      ...(services.includes('WORKFORCE') ? WORKFORCE_QUESTIONS : []),
    ];
    const keys = [...new Set(questions.map((q) => q.key))];
    const unanswered = keys.filter((key) => typeof answers[key] !== 'boolean');
    if (unanswered.length > 0) {
      return { error: `Answer every question before continuing (${unanswered.length} left).` };
    }
    for (const key of keys) value[key] = answers[key];
    return { value };
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || services.length === 0) return;
    const collected = collectAnswers();
    if ('error' in collected) {
      setError(collected.error);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (addService) {
        const res = await api.addClientService(token, { service: addService, ...collected.value });
        await refreshUser();
        navigate(res.destination);
        return;
      }
      const res = await api.submitAssessment(token, {
        services,
        organisationCountry,
        organisationSize,
        annualRevenueBand,
        industrySector,
        ...collected.value,
      });
      setRecommendations(res.recommendations || []);
      setDestination(res.destination);
      await refreshUser();
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
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
    navigate(destination || SERVICE_DESTINATIONS[services[0] || 'GHG']);
  };

  // A service the client already holds has nothing to add: go straight to it.
  if (addService && alreadyHeld.includes(addService)) {
    return <Navigate to={SERVICE_DESTINATIONS[addService]} replace />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: 'var(--text-main)', padding: '2.5rem 1rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h1 className="onb-page-title">{addService ? `Add ${serviceTitle}` : 'Set up your account'}</h1>

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
          <div className="onb-progress">
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
                  Your answers
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Questions for your services</div>
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

        {error && step !== 2 && (
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

                <div className="onb-two-col">
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

                <div className="onb-two-col">
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

              <div className="onb-section">
                <ServicePicker value={services} onChange={setServices} disabled={alreadyHeld} />
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
                  Continue
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
            <div className="onb-step-header">
              <div>
                <h2 className="onb-step-title">{services.length === 1 ? SERVICE_INTRO[services[0]].title : 'Questions for your services'}</h2>
                <p className="onb-help">
                  {services.length === 1 ? SERVICE_INTRO[services[0]].detail : 'Each set of answers sets up that service. Shared questions are asked once.'}
                </p>
              </div>
              <div className="onb-step-badges">
                <span className="onb-service-badge">{addService ? `Adding ${serviceTitle}` : serviceTitle}</span>
                {!addService && (
                  <button type="button" className="onb-link-button" onClick={() => setStep(1)}>
                    Change services
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleAssessmentSubmit}>
              {/* Section A: scale and thresholds, asked once at onboarding */}
              {!addService && (
              <div style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Section A</span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ color: '#475569' }}>Organizational Scale &amp; Entity Thresholds</span>
                </div>

                <div className="onb-two-col onb-two-col-spaced">
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
              )}

              {services.map((id, index) => (
                <section key={id} className="onb-service-questions" aria-label={SERVICE_INTRO[id].title}>
                  {services.length > 1 && <h3 className="onb-service-questions-title">{SERVICE_INTRO[id].title}</h3>}
                  <ServiceQuestions
                    service={id}
                    answers={answers}
                    onAnswer={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
                    fleet={fleet}
                    onFleetChange={setFleet}
                    skip={id === 'WORKFORCE' && services.slice(0, index).includes('GHG') ? GHG_QUESTIONS.map((q) => q.key) : []}
                  />
                </section>
              ))}

              {error && (
                <p className="onb-error" role="alert">
                  {error}
                </p>
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
                  {loading ? 'Saving your answers...' : addService ? `Add ${serviceTitle}` : hasFrameworkService ? 'Show my compliance roadmap' : 'Set up Fleet'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: COMPLIANCE ROADMAP & RECOMMENDATIONS ────────────────────── */}
        {step === 3 && hasFleet && (
          <div className="onb-fleet-done">
            <h2 className="onb-step-title">Your Fleet service is set up</h2>
            <p className="onb-help">
              Next, register your machines and vehicles and connect your data. Your Fleet dashboard walks you through
              each step.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => navigate(SERVICE_DESTINATIONS.FLEET)}>
              Go to Fleet
            </button>
          </div>
        )}

        {step === 3 && hasFrameworkService && (
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
                    Based on your answers, {recommendations.length} compliance frameworks apply to your company.
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
                  Go to preparation
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
                  {services[0] === 'WORKFORCE' ? 'Start Workforce preparation' : 'Start GHG preparation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
