import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { OpenSeaBadge } from '../components/OpenSeaBadge';

// ── Step definitions ──────────────────────────────────────────────────────────
type WorkflowStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<WorkflowStep, string> = {
  1: 'ISO Diagnostic',
  2: 'Checkout',
  3: 'API Access',
  4: 'Credential Studio',
  5: 'Digital Asset',
};

// ── Tier definitions ──────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'TIER_1_READINESS',
    name: 'Single-Site Remote Readiness',
    price: '£1,250',
    description: 'ISO 14001 / ISO 50001 / ISO 19011:2026 assessment. 72-hour turnaround.',
  },
  {
    id: 'TIER_2_CONTINUOUS',
    name: 'Continuous Assurance Protocol',
    price: '£3,500',
    description: 'Quarterly multi-jurisdiction protocol. UK SECR, UAE SCA, EU CSRD aligned.',
    recommended: true,
  },
];

export const PortalPage: React.FC = () => {
  const { token, user } = useAuth();

  // ── Global portal data ────────────────────────────────────────────────────
  const [summary, setSummary] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [jobReports, setJobReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── ISO Workflow State ────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState<WorkflowStep>(1);
  const [framework, setFramework] = useState<any | null>(null);
  const [frameworkLoading, setFrameworkLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedTier, setSelectedTier] = useState<string>('TIER_1_READINESS');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isoStatus, setIsoStatus] = useState<any | null>(null);
  const [isoStatusLoading, setIsoStatusLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any[]>([]);

  // ── Credential Studio State ────────────────────────────────────────────────
  const [clientMessage, setClientMessage] = useState<string>('');
  const [clientLogoFile, setClientLogoFile] = useState<File | null>(null);
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null);
  const [compositePreview, setCompositePreview] = useState<string | null>(null);
  const [compositeLoading, setCompositeLoading] = useState(false);
  const [compositeError, setCompositeError] = useState<string | null>(null);
  const [mintLoading, setMintLoading] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<any | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // ── Job filing modal ──────────────────────────────────────────────────────
  const [showJobModal, setShowJobModal] = useState<boolean>(false);
  const [periodType, setPeriodType] = useState<string>('QUARTERLY');
  const [periodStart, setPeriodStart] = useState<string>('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState<string>('2026-03-31');
  const [jobsCreatedInput, setJobsCreatedInput] = useState<string>('50');
  const [customNoteInput, setCustomNoteInput] = useState<string>('');
  const [submittingJob, setSubmittingJob] = useState<boolean>(false);
  const [jobFormError, setJobFormError] = useState<string | null>(null);

  const logoDropRef = useRef<HTMLDivElement>(null);

  // ── Fetch portal data ─────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [sumRes, txRes, jobRes] = await Promise.all([
          api.getPortalSummary(token),
          api.getPortalTransactions(token),
          api.getPortalJobReports(token).catch(() => ({ data: [] })),
        ]);
        if (isMounted) {
          setSummary(sumRes);
          setTransactions(txRes.transactions || []);
          setJobReports(jobRes.data || []);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load portal data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [token]);

  // ── Load ISO framework on step 1 ─────────────────────────────────────────
  useEffect(() => {
    if (activeStep !== 1 || framework) return;
    setFrameworkLoading(true);
    api.getIsoFramework()
      .then((res) => setFramework(res.framework))
      .catch(() => setFramework(null))
      .finally(() => setFrameworkLoading(false));
  }, [activeStep, framework]);

  // ── Load ISO status on portal load ───────────────────────────────────────
  useEffect(() => {
    if (!token || !user?.licenseeId) return;
    setIsoStatusLoading(true);
    api.getIsoStatus(token, user.licenseeId)
      .then((res) => {
        setIsoStatus(res.latestSubmission);
        if (res.latestSubmission?.id) setSubmissionId(res.latestSubmission.id);
      })
      .catch(() => setIsoStatus(null))
      .finally(() => setIsoStatusLoading(false));
  }, [token, user?.licenseeId]);

  // ── Load credentials ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    api.getMyCredentials(token)
      .then((res) => setCredentials(res.credentials || []))
      .catch(() => setCredentials([]));
  }, [token, mintResult]);

  // ── Answer change ─────────────────────────────────────────────────────────
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // ── Submit ISO answers ────────────────────────────────────────────────────
  const handleIsoSubmit = async () => {
    if (!token || !framework) return;
    const allQuestions = framework.sections.flatMap((s: any) => s.questions);
    const answerArray = allQuestions.map((q: any) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      answer: answers[q.questionId] || '',
      isoClause: q.isoClause,
    }));
    const unanswered = answerArray.filter((a: any) => !a.answer);
    if (unanswered.length > 0) {
      setSubmitError(`Please answer all ${unanswered.length} remaining question(s).`);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.submitIsoAnswers(token, { answers: answerArray, tierSelected: selectedTier });
      setSubmissionId(res.submissionId);
      setActiveStep(2);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Create Stripe checkout ────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!token || !submissionId) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const origin = window.location.origin;
      const res = await api.createIsoCheckout(token, {
        submissionId,
        tierSelected: selectedTier,
        successUrl: `${origin}/portal?step=3`,
        cancelUrl: `${origin}/portal?step=2`,
      });
      if (res.sessionUrl) {
        window.location.href = res.sessionUrl;
      } else {
        // Fallback if Stripe session URL not available (dev mode)
        setActiveStep(3);
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Logo drag-and-drop ────────────────────────────────────────────────────
  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  }, []);

  const handleLogoFile = (file: File) => {
    setClientLogoFile(file);
    setCompositePreview(null);
    setCompositeError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setClientLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Generate composite preview ────────────────────────────────────────────
  const handleCompose = async () => {
    if (!token || !clientLogoFile || !clientMessage.trim()) return;
    setCompositeLoading(true);
    setCompositeError(null);
    try {
      const res = await api.composeBadge(token, {
        clientLogoFile,
        clientMessage,
        submissionId: submissionId || undefined,
      });
      setCompositePreview(res.previewDataUri);
    } catch (err: any) {
      setCompositeError(err.message || 'Failed to generate preview.');
    } finally {
      setCompositeLoading(false);
    }
  };

  // ── Mint credential ───────────────────────────────────────────────────────
  const handleMint = async () => {
    if (!token || !clientLogoFile || !clientMessage.trim() || !submissionId) return;
    setMintLoading(true);
    setMintError(null);
    try {
      const res = await api.mintCredential(token, {
        clientLogoFile,
        clientMessage,
        submissionId,
      });
      setMintResult(res);
      setActiveStep(5);
    } catch (err: any) {
      setMintError(err.message || 'Minting failed.');
    } finally {
      setMintLoading(false);
    }
  };

  // ── Job filing ────────────────────────────────────────────────────────────
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmittingJob(true);
    setJobFormError(null);
    const jobsCount = parseInt(jobsCreatedInput, 10);
    try {
      const createdReport = await api.submitPortalJobReport(token, {
        periodType,
        periodStart,
        periodEnd,
        jobsCreated: isNaN(jobsCount) ? 0 : jobsCount,
        attestationNote: customNoteInput.trim() || undefined,
      });
      setJobReports([createdReport, ...jobReports]);
      setShowJobModal(false);
      setCustomNoteInput('');
    } catch (err: any) {
      setJobFormError(err.message || 'Failed to submit job creation report');
    } finally {
      setSubmittingJob(false);
    }
  };

  // ── Read URL params on mount (post-checkout redirect) ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    if (step === '3') setActiveStep(3);
    if (step === '4') setActiveStep(4);
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  // ── Telemetry API key (derived from submissionId or user ID) ──────────────
  const telemetryApiKey = submissionId
    ? `ghg_api_${submissionId.replace(/-/g, '').substring(0, 24)}`
    : user?.licenseeId
    ? `ghg_api_${user.licenseeId.replace(/-/g, '').substring(0, 24)}`
    : 'ghg_api_pending_payment';

  // ── Progress indicator ────────────────────────────────────────────────────
  const totalQuestions = framework?.sections.flatMap((s: any) => s.questions).length || 0;
  const answeredQuestions = Object.values(answers).filter((v) => v).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 0 4rem 0' }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: 'var(--accent-light)', border: '1px solid rgba(2,132,199,0.25)',
            padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)',
            letterSpacing: '0.04em', marginBottom: '0.75rem',
          }}>
            <span className="radar-pulse" />
            <span>PARTNER ASSURANCE CONSOLE</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Compliance, Telemetry &amp; Credential Studio
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Scoped Tenant: <code style={{ fontWeight: 700, color: 'var(--color-sky)', backgroundColor: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '4px' }}>{user?.licenseeId || 'ALL (ADMIN)'}</code>
          </p>
        </div>
        <button onClick={() => setShowJobModal(true)} className="btn btn-primary">
          + Submit Job Filing
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* ── KPI Summary Cards ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Settled Transactions', value: loading ? '…' : (summary?.totalSettledTransactions ?? 0).toLocaleString(), sub: 'Verified Audit Trail', accent: 'var(--color-sky)' },
          { label: 'Settled Gross Volume', value: loading ? '…' : `£${((summary?.totalGrossVolumeCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'Contractual Settlement', accent: 'var(--color-green)' },
          { label: '15% ESG Charity Split', value: loading ? '…' : `£${((summary?.totalCharityGiftCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, sub: 'Direct Environmental Routing', accent: '#a855f7' },
          { label: 'Active Credentials', value: credentials.length.toString(), sub: 'Polygon ERC-1155 Minted', accent: '#f59e0b' },
        ].map((kpi) => (
          <div key={kpi.label} className="persefoni-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: kpi.accent }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.72rem', color: kpi.accent, marginTop: '0.2rem', fontWeight: 600 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ISO Audit Workflow ── 5-Step tabbed stepper ───────────────────── */}
      <div className="persefoni-card" style={{ padding: '0', marginBottom: '2.5rem', overflow: 'hidden' }}>

        {/* Step tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
          {([1, 2, 3, 4, 5] as WorkflowStep[]).map((step) => {
            const isActive = activeStep === step;
            const isComplete = isoStatus?.status === 'APPROVED' || (step < activeStep);
            return (
              <button
                key={step}
                onClick={() => setActiveStep(step)}
                style={{
                  flex: '1 0 auto',
                  minWidth: '120px',
                  padding: '1rem 1.25rem',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--color-sky)' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '22px', height: '22px', borderRadius: '50%',
                  backgroundColor: isComplete ? 'var(--color-green)' : isActive ? 'var(--color-sky)' : 'var(--bg-subtle)',
                  color: isComplete || isActive ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.35rem',
                }}>
                  {isComplete ? '✓' : step}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--color-sky)' : 'var(--text-muted)', letterSpacing: '0.03em' }}>
                  {STEP_LABELS[step]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div style={{ padding: '2rem' }}>

          {/* ── STEP 1: ISO Diagnostic ────────────────────────────────────── */}
          {activeStep === 1 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.4rem 0' }}>
                  ISO Audit-Readiness Diagnostic
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                  Respond to all questions aligned with ISO 14001, ISO 50001, ISO 14064, and ISO 19011:2026 remote auditing guidelines.
                  Answers are saved and queued for review by our lead assurance officer.
                </p>
                {totalQuestions > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: progressPct === 100 ? 'var(--color-green)' : 'var(--color-sky)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {answeredQuestions}/{totalQuestions} answered
                    </span>
                  </div>
                )}
              </div>

              {frameworkLoading && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading framework questions…</div>
              )}

              {!frameworkLoading && framework && (
                <div>
                  {framework.sections.map((section: any) => (
                    <div key={section.sectionId} style={{ marginBottom: '2rem' }}>
                      <div style={{
                        backgroundColor: 'var(--bg-subtle)', borderLeft: '3px solid var(--color-sky)',
                        padding: '0.65rem 1rem', marginBottom: '1rem', borderRadius: '0 6px 6px 0',
                      }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{section.sectionTitle}</div>
                      </div>

                      {section.questions.map((q: any) => (
                        <div key={q.questionId} style={{ marginBottom: '1.25rem', paddingLeft: '0.5rem' }}>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <span style={{
                              display: 'inline-block', fontSize: '0.68rem', fontWeight: 700,
                              color: 'var(--color-sky)', backgroundColor: 'var(--accent-light)',
                              padding: '2px 6px', borderRadius: '4px', marginRight: '0.5rem',
                            }}>
                              {q.isoClause.split('/')[0].trim()}
                            </span>
                            {q.legalMandate && (
                              <span style={{
                                display: 'inline-block', fontSize: '0.68rem', fontWeight: 700,
                                color: '#a855f7', backgroundColor: 'rgba(168,85,247,0.1)',
                                padding: '2px 6px', borderRadius: '4px',
                              }}>
                                {q.legalMandate.split('—')[0].trim()}
                              </span>
                            )}
                          </div>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem', lineHeight: 1.5 }}>
                            {q.questionId}: {q.questionText}
                          </label>
                          {q.evidenceRequired && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0', fontStyle: 'italic' }}>
                              Evidence: {q.evidenceRequired}
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                            {['Yes, fully in place', 'Partially implemented', 'Not yet implemented', 'Not applicable'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleAnswerChange(q.questionId, opt)}
                                style={{
                                  padding: '0.35rem 0.8rem',
                                  borderRadius: '20px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: answers[q.questionId] === opt
                                    ? '1px solid var(--color-sky)'
                                    : '1px solid var(--border-light)',
                                  backgroundColor: answers[q.questionId] === opt
                                    ? 'var(--accent-light)'
                                    : 'var(--bg-card)',
                                  color: answers[q.questionId] === opt
                                    ? 'var(--color-sky)'
                                    : 'var(--text-muted)',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Supporting notes or evidence description (optional)"
                            value={typeof answers[`${q.questionId}_notes`] === 'string' ? answers[`${q.questionId}_notes`] : ''}
                            onChange={(e) => handleAnswerChange(`${q.questionId}_notes`, e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.8rem', resize: 'vertical' }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Tier selection */}
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
                      Select Preparation Service Tier
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      {TIERS.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setSelectedTier(tier.id)}
                          style={{
                            padding: '1.25rem', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
                            border: selectedTier === tier.id ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                            backgroundColor: selectedTier === tier.id ? 'var(--accent-light)' : 'var(--bg-card)',
                            transition: 'all 0.15s', position: 'relative',
                          }}
                        >
                          {tier.recommended && (
                            <span style={{
                              position: 'absolute', top: '-10px', right: '12px',
                              backgroundColor: 'var(--color-green)', color: '#fff',
                              fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                            }}>
                              RECOMMENDED
                            </span>
                          )}
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{tier.name}</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-sky)', marginBottom: '0.35rem' }}>{tier.price}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tier.description}</div>
                        </button>
                      ))}
                    </div>

                    {submitError && (
                      <div style={{ color: 'var(--google-red)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
                        {submitError}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      {submissionId && (
                        <button
                          type="button"
                          onClick={() => setActiveStep(2)}
                          className="btn btn-secondary"
                        >
                          Already Submitted — Go to Checkout
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleIsoSubmit}
                        disabled={submitting || progressPct < 100}
                        className="btn btn-primary"
                      >
                        {submitting ? 'Submitting…' : progressPct < 100 ? `Answer ${totalQuestions - answeredQuestions} more question(s)` : 'Submit Diagnostic →'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Stripe Checkout ───────────────────────────────────── */}
          {activeStep === 2 && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Secure Flat-Rate Checkout
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                All preparation service fees are settled with automatic 85% software revenue / 15% disaster relief endowment routing.
              </p>

              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  style={{
                    width: '100%', marginBottom: '0.75rem', padding: '1.25rem', borderRadius: '12px',
                    textAlign: 'left', cursor: 'pointer',
                    border: selectedTier === tier.id ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                    backgroundColor: selectedTier === tier.id ? 'var(--accent-light)' : 'var(--bg-card)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{tier.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tier.description}</div>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-sky)', marginLeft: '1rem', whiteSpace: 'nowrap' }}>{tier.price}</div>
                  </div>
                </button>
              ))}

              <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-main)' }}>Submission ID:</strong>{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-sky)' }}>{submissionId || 'pending'}</code>
              </div>

              {checkoutError && (
                <div style={{ color: 'var(--google-red)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>{checkoutError}</div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => setActiveStep(1)} className="btn btn-secondary">Back</button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutLoading || !submissionId}
                  className="btn btn-primary"
                  style={{ minWidth: '200px' }}
                >
                  {checkoutLoading ? 'Redirecting…' : `Pay ${TIERS.find((t) => t.id === selectedTier)?.price} via Stripe →`}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Telemetry API Access ──────────────────────────────── */}
          {activeStep === 3 && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Telemetry Ingestion API Access
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Your API key has been provisioned. Use it to submit automated emissions data or upload evidence documents manually.
              </p>

              {/* API Key */}
              <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Telemetry Ingestion API Key
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-sky)',
                  backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: '8px',
                  wordBreak: 'break-all', letterSpacing: '0.04em',
                }}>
                  {telemetryApiKey}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                  onClick={() => { navigator.clipboard.writeText(telemetryApiKey); }}
                >
                  Copy Key
                </button>
              </div>

              {/* cURL example */}
              <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Automated Reporting — cURL Example
                </div>
                <pre style={{
                  backgroundColor: '#0c1929', color: '#a5f3fc', padding: '1rem', borderRadius: '8px',
                  fontSize: '0.78rem', overflowX: 'auto', margin: 0, lineHeight: 1.6,
                }}>
{`curl -X POST https://ghgapp-production.up.railway.app/api/iso/telemetry/ingest \\
  -H "Authorization: Bearer ${telemetryApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "assetTag": "PDU-METER-04B",
    "metricType": "MWH_LOAD",
    "numericValue": 42.3,
    "rawUnit": "kWh",
    "assetCalibrationId": "<YOUR_CALIBRATION_ID>"
  }'`}
                </pre>
              </div>

              {/* Evidence document upload instruction */}
              <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Manual Evidence Document Upload
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                  Upload utility bills, calibration certificates, GHG inventory reports, and ISO audit evidence directly to the Evidence Locker.
                </p>
                <a href="/portal/evidence" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                  Open Evidence Locker
                </a>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setActiveStep(4)} className="btn btn-primary">
                  Proceed to Credential Studio →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Credential Studio ─────────────────────────────────── */}
          {activeStep === 4 && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Dual-Logo Credential Studio
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Upload your corporate logo and enter your attestation message. We composite it with the GHG Emissions Registered Trade Mark and mint an ERC-1155 token on Polygon PoS.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {/* Left — inputs */}
                <div>
                  {/* Logo dropzone */}
                  <div
                    ref={logoDropRef}
                    onDrop={handleLogoDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => { const inp = document.getElementById('logo-file-input') as HTMLInputElement; inp?.click(); }}
                    style={{
                      border: '2px dashed var(--border-light)', borderRadius: '12px', padding: '2rem',
                      textAlign: 'center', cursor: 'pointer', marginBottom: '1.25rem',
                      backgroundColor: clientLogoPreview ? 'var(--bg-subtle)' : 'transparent',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <input
                      id="logo-file-input"
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.webp"
                      style={{ display: 'none' }}
                      onChange={(e) => { if (e.target.files?.[0]) handleLogoFile(e.target.files[0]); }}
                    />
                    {clientLogoPreview ? (
                      <img src={clientLogoPreview} alt="Client logo preview" style={{ maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>+</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Drag &amp; drop corporate logo</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>PNG, JPG, SVG or WebP — max 5 MB</div>
                      </>
                    )}
                  </div>
                  {clientLogoPreview && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem', marginBottom: '1rem' }}
                      onClick={() => { setClientLogoFile(null); setClientLogoPreview(null); setCompositePreview(null); }}
                    >
                      Remove Logo
                    </button>
                  )}

                  {/* Attestation message */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Attestation Message
                    </label>
                    <textarea
                      rows={3}
                      maxLength={120}
                      value={clientMessage}
                      onChange={(e) => { setClientMessage(e.target.value); setCompositePreview(null); }}
                      placeholder="e.g. ISO 14001 aligned — Net Zero pathway committed 2030"
                      className="form-input"
                      style={{ resize: 'none' }}
                    />
                    <div style={{ fontSize: '0.72rem', color: clientMessage.length >= 110 ? 'var(--google-red)' : 'var(--text-muted)', textAlign: 'right', marginTop: '0.25rem' }}>
                      {clientMessage.length}/120 characters
                    </div>
                  </div>

                  {compositeError && (
                    <div style={{ color: 'var(--google-red)', fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600 }}>{compositeError}</div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleCompose}
                      disabled={compositeLoading || !clientLogoFile || !clientMessage.trim()}
                      className="btn btn-secondary"
                    >
                      {compositeLoading ? 'Generating…' : 'Preview Badge'}
                    </button>
                    <button
                      type="button"
                      onClick={handleMint}
                      disabled={mintLoading || !clientLogoFile || !clientMessage.trim() || !submissionId}
                      className="btn btn-primary"
                    >
                      {mintLoading ? 'Minting on Polygon…' : 'Issue and Mint Credential →'}
                    </button>
                  </div>
                  {mintError && (
                    <div style={{ color: 'var(--google-red)', fontSize: '0.82rem', marginTop: '0.75rem', fontWeight: 600 }}>{mintError}</div>
                  )}
                  {!submissionId && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      A paid ISO submission is required to mint. Complete Steps 1 and 2 first.
                    </p>
                  )}
                </div>

                {/* Right — badge preview */}
                <div>
                  <div style={{
                    background: 'linear-gradient(135deg, #0c1929, #0a2540)',
                    borderRadius: '12px', padding: '2rem', minHeight: '280px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {compositePreview ? (
                      <img
                        src={compositePreview}
                        alt="Dual-logo composite badge preview"
                        style={{ maxWidth: '100%', borderRadius: '8px' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', opacity: 0.5 }}>
                        <div style={{ fontSize: '0.85rem', color: '#a5f3fc', fontWeight: 600, marginBottom: '0.5rem' }}>
                          BADGE PREVIEW
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          Upload logo and enter message, then click Preview Badge
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Includes:</strong> Client logo + GHG Emissions Registered Trade Mark + Attestation message + ISO 19011:2026 stamp + 1-year warranty date + Polygon ERC-1155 token
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: Digital Asset Delivery ───────────────────────────── */}
          {activeStep === 5 && (
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                Digital Asset Delivery
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Your audit warranty credential has been issued and recorded on Polygon PoS. Embed the badge on your corporate website using the code snippet below.
              </p>

              {(mintResult || credentials[0]) && (() => {
                const cred = mintResult || credentials[0];
                return (
                  <div>
                    {/* Token details */}
                    <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {[
                          { label: 'Token ID', value: cred.tokenId || 'pending', mono: true },
                          { label: 'Contract', value: cred.contractAddress ? `${cred.contractAddress.substring(0, 10)}…` : 'Polygon PoS', mono: true },
                          { label: 'Network', value: 'Polygon PoS', mono: false },
                          { label: 'Standard', value: 'ERC-1155', mono: false },
                        ].map((item) => (
                          <div key={item.label}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{item.label}</div>
                            <div style={{ fontFamily: item.mono ? 'var(--font-mono)' : 'inherit', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {cred.openSeaUrl && (
                        <div style={{ marginTop: '1.25rem' }}>
                          <a
                            href={cred.openSeaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem' }}
                          >
                            View on OpenSea (Polygon)
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Embed snippet */}
                    {cred.embedSnippet && (
                      <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Website Embed Snippet — Copy to your Developer
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.8rem' }}
                            onClick={() => {
                              navigator.clipboard.writeText(cred.embedSnippet);
                              setCopiedSnippet(true);
                              setTimeout(() => setCopiedSnippet(false), 2000);
                            }}
                          >
                            {copiedSnippet ? 'Copied!' : 'Copy Snippet'}
                          </button>
                        </div>
                        <pre style={{
                          backgroundColor: '#0c1929', color: '#a5f3fc', padding: '1rem', borderRadius: '8px',
                          fontSize: '0.78rem', overflowX: 'auto', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                        }}>
                          {cred.embedSnippet}
                        </pre>
                      </div>
                    )}

                    {/* Warranty details */}
                    <div className="persefoni-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--color-green)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-green)', marginBottom: '0.35rem' }}>
                        1-Year Statutory Warranty Issued
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Valid to:{' '}
                        <strong style={{ color: 'var(--text-main)' }}>
                          {cred.warrantyExpiresAt
                            ? new Date(cred.warrantyExpiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                            : 'TBD'}
                        </strong>
                      </div>
                      {cred.verificationSeal && (
                        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.35rem', wordBreak: 'break-all' }}>
                          SHA-256: {cred.verificationSeal}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setActiveStep(4)} className="btn btn-secondary">
                        Issue Another Credential
                      </button>
                    </div>
                  </div>
                );
              })()}

              {!mintResult && credentials.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>No credential issued yet</div>
                  <button type="button" onClick={() => setActiveStep(4)} className="btn btn-primary">
                    Go to Credential Studio
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Existing Credentials Table ────────────────────────────────────────── */}
      {credentials.length > 0 && (
        <div className="persefoni-card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 1.25rem 0' }}>
            Issued Audit Warranty Credentials
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Credential ID</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Token ID</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>Warranty Expires</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>OpenSea</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred: any) => (
                  <tr key={cred.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {cred.id.substring(0, 18)}…
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--color-sky)' }}>
                      {cred.tokenId || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <StatusBadge status={cred.status} />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                      {cred.warrantyExpiresAt
                        ? new Date(cred.warrantyExpiresAt).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {cred.openSeaUrl ? (
                        <a href={cred.openSeaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2081E2', fontSize: '0.8rem', fontWeight: 600 }}>
                          OpenSea
                        </a>
                      ) : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Job Creation Reporting ────────────────────────────────────────────── */}
      <div className="persefoni-card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
              Job Creation &amp; Social Impact Filings
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Section 106 local authority covenants and artisan manufacturing workforce hours
            </p>
          </div>
          <button onClick={() => setShowJobModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem', minHeight: '38px' }}>
            + New Filing
          </button>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading filings…</div>
        ) : jobReports.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px' }}>
            <p style={{ margin: '0 0 1rem 0', fontWeight: 700, color: 'var(--text-main)' }}>No job filings recorded yet</p>
            <button onClick={() => setShowJobModal(true)} className="btn btn-primary">Submit Your First Filing</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Period</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date Range</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Jobs Created</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Source</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {jobReports.map((report) => (
                  <tr key={report.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ backgroundColor: 'var(--accent-light)', color: 'var(--color-sky)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>{report.periodType}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(report.periodStart).toLocaleDateString('en-GB')} – {new Date(report.periodEnd).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '1rem', color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                      {report.jobsCreated}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                        {report.reportSource === 'THIRD_PARTY_API' ? 'API Ingest' : 'Portal Self-Report'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '280px' }}>
                      {report.attestationNote || 'Verified Section 106 covenant'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Transaction History ───────────────────────────────────────────────── */}
      <div className="persefoni-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
              Transaction History &amp; 15% ESG Splits
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Immutable settlement history with SHA-256 data watermarks</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['ALL', 'SETTLED', 'PENDING'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === s ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
                backgroundColor: statusFilter === s ? 'var(--accent-light)' : 'var(--bg-card)',
                color: statusFilter === s ? 'var(--color-sky)' : 'var(--text-muted)',
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions…</div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions for filter: <strong>{statusFilter}</strong>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Transaction ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Gross Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>15% Charity Split</th>
                  <th style={{ padding: '0.75rem 1rem' }}>On-Chain</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>
                      {tx.id.substring(0, 16)}…
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <StatusBadge status={tx.status} />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      £{(tx.grossAmountCents / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                      £{(tx.charityGiftCents / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <OpenSeaBadge transactionId={tx.id} licenseeId={tx.licenseeId} />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Job Filing Modal ──────────────────────────────────────────────────── */}
      {showJobModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setShowJobModal(false)}
        >
          <div className="persefoni-card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Submit Section 106 Job Filing</h3>
              <button type="button" onClick={() => setShowJobModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer' }}>x</button>
            </div>
            {jobFormError && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {jobFormError}
              </div>
            )}
            <form onSubmit={handleJobSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Period Type</label>
                <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} className="form-input">
                  <option value="QUARTERLY">Quarterly (Section 106 Standard)</option>
                  <option value="ANNUAL">Annual Corporate Filing</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Period Start</label>
                  <input type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Period End</label>
                  <input type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="form-input" />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Verified Jobs Created</label>
                <input type="number" required min={1} value={jobsCreatedInput} onChange={(e) => setJobsCreatedInput(e.target.value)} className="form-input" />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>Attestation / Auditor Note</label>
                <textarea value={customNoteInput} onChange={(e) => setCustomNoteInput(e.target.value)} placeholder="e.g. Local authority Section 106 covenant for artisan embroidery workforce" className="form-input" rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowJobModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submittingJob} className="btn btn-primary">
                  {submittingJob ? 'Submitting…' : 'Confirm Filing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
