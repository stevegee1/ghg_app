import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { OpenSeaBadge } from '../components/OpenSeaBadge';

const PILLAR_LABELS: Record<string, string> = {
  REFORESTATION_AND_LAND: 'Reforestation & Land',
  OCEAN_AND_WATER: 'Ocean & Water',
  COMMUNITY_AND_YOUTH: 'Community & Youth',
};

function warrantyDaysRemaining(warrantyEnd: string): number {
  const diff = new Date(warrantyEnd).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export const TransparencyPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const [charities, setCharities] = useState<any | null>(null);
  const [charitiesLoading, setCharitiesLoading] = useState<boolean>(true);

  // Registration form
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    legalEntityName: '',
    registrationNumber: '',
    registrationJurisdiction: '',
    headquartersAddress: '',
    focusPillar: 'REFORESTATION_AND_LAND' as 'REFORESTATION_AND_LAND' | 'OCEAN_AND_WATER' | 'COMMUNITY_AND_YOUTH',
    primaryContactName: '',
    primaryContactEmail: '',
    stripeConnectedAccountId: '',
    impactMetricDescription: '',
    authorizedSignatoryName: '',
    authorizedSignatoryTitle: '',
    agreedToTerms: false,
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchLedger() {
      setLedgerLoading(true);
      try {
        const res = await api.getTransparencyLedger();
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setLedgerError(err.message || 'Failed to load public transparency ledger');
      } finally {
        if (isMounted) setLedgerLoading(false);
      }
    }
    fetchLedger();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchCharities() {
      try {
        const res = await api.getActiveCharities();
        if (isMounted) setCharities(res);
      } catch {
        // non-critical
      } finally {
        if (isMounted) setCharitiesLoading(false);
      }
    }
    fetchCharities();
    return () => { isMounted = false; };
  }, []);

  const handleFormChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const result = await api.registerCharity({
        ...form,
        agreedToTerms: form.agreedToTerms,
      });
      setFormSuccess(`Application submitted successfully. Application ID: ${result.applicationId}. Our team will review your submission and contact you within 10 business days.`);
      setShowForm(false);
    } catch (err: any) {
      if (err.status === 423) {
        setFormError(err.body?.message || 'Registration is currently closed — at capacity (3/3).');
      } else {
        setFormError(err.message || 'Failed to submit application.');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const registrationOpen = charities?.registrationOpen ?? false;
  const nextIntakeDate = charities?.nextIntakeDate
    ? new Date(charities.nextIntakeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem var(--page-px, 1.25rem) 4rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: 'var(--accent-light)', border: '1px solid rgba(2, 132, 199, 0.25)',
          padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-pill)',
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sky)',
          letterSpacing: '0.04em', marginBottom: '0.75rem',
        }}>
          <span className="radar-pulse" />
          <span>STATUTORY AUDIT-READY TRANSPARENCY REGISTRY</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          Public Audit Registry & Transparency Ledger
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: '750px', margin: 0 }}>
          Publicly auditable registry of corporate partners, continuous carbon verification metrics, active 1-year warranty validation, and statutory 15% ESG charitable routing.
        </p>
      </div>

      {ledgerError && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '0.875rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
          {ledgerError}
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="persefoni-card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--color-sky)' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Settled Drops</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            {ledgerLoading ? '...' : (data?.totalSettledTransactions ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-sky)', marginTop: '0.2rem', fontWeight: 500 }}>Verified On-Chain & Ledger</div>
        </div>

        <div className="persefoni-card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--color-green)' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>15% ESG Charity Split</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-green)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            {ledgerLoading ? '...' : `£${((data?.totalCharityGiftCents ?? 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-green)', marginTop: '0.2rem', fontWeight: 500 }}>Direct Local Environmental Funds</div>
        </div>

        <div className="persefoni-card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#a855f7' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Statutory Charities</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            {charitiesLoading ? '...' : `${charities?.activeCount ?? 0} / 3`}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#a855f7', marginTop: '0.2rem', fontWeight: 500 }}>1-Year Audit Warranty Holders</div>
        </div>
      </div>

      {/* Statutory Charities Section */}
      <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.875rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            Statutory ESG Charities — 1-Year Audit Warranty
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Exactly 15% of every transaction is automatically disbursed to the 3 registered statutory charities below. Each charity holds a 1-year audited warranty.
          </p>
        </div>

        {charitiesLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading charities...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {(charities?.charities ?? []).map((c: any, i: number) => {
              const daysLeft = warrantyDaysRemaining(c.warrantyEnd);
              const warrantyActive = c.warrantyActive;
              return (
                <div key={c.id} style={{
                  padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', backgroundColor: ['var(--color-green)', '#0891b2', '#7c3aed'][i % 3] }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>{c.name}</div>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                      backgroundColor: warrantyActive ? 'var(--color-green-light)' : 'rgba(239,68,68,0.08)',
                      color: warrantyActive ? 'var(--color-green-dark)' : 'var(--google-red)',
                      border: `1px solid ${warrantyActive ? 'var(--color-green)' : 'var(--google-red)'}`,
                    }}>
                      {warrantyActive ? 'Warranty Active' : 'Warranty Expired'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Warranty: {new Date(c.warrantyStart).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} – {new Date(c.warrantyEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    {warrantyActive && <span style={{ marginLeft: '6px', color: 'var(--color-green)', fontWeight: 700 }}>({daysLeft} days remaining)</span>}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-green)', fontFamily: 'var(--font-mono)' }}>
                    £{Number(c.totalDisbursedGbp).toLocaleString('en-GB', { minimumFractionDigits: 2 })} disbursed
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Capacity-gated Registration */}
        {!charitiesLoading && (
          <div>
            {registrationOpen ? (
              <div>
                {formSuccess ? (
                  <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', borderRadius: '10px', padding: '1.25rem', color: 'var(--color-green-dark)', fontWeight: 600, fontSize: '0.9rem' }}>
                    {formSuccess}
                  </div>
                ) : (
                  <div>
                    <div style={{ backgroundColor: 'var(--accent-light)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-sky)' }}>
                      Registration is open ({charities?.activeCount ?? 0}/3 positions filled). Qualifying organisations may apply for the next statutory intake.
                    </div>

                    {!showForm && (
                      <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="btn btn-primary"
                        style={{ padding: '0.65rem 1.5rem' }}
                      >
                        Apply for Statutory Charity Registration
                      </button>
                    )}

                    {showForm && (
                      <form onSubmit={handleRegisterSubmit} style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                          Charity Statutory Registration Application
                        </h3>

                        {formError && (
                          <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600, fontSize: '0.85rem' }}>
                            {formError}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                          {[
                            { field: 'legalEntityName', label: 'Legal Entity Name *', placeholder: 'Green Earth Alliance UK', type: 'text' },
                            { field: 'registrationNumber', label: 'Registration Number *', placeholder: 'UK Charity No. / US EIN', type: 'text' },
                            { field: 'registrationJurisdiction', label: 'Registration Jurisdiction *', placeholder: 'England & Wales', type: 'text' },
                            { field: 'headquartersAddress', label: 'Headquarters Address *', placeholder: '1 Climate House, London', type: 'text' },
                            { field: 'primaryContactName', label: 'Primary Contact Name *', placeholder: 'Jane Smith', type: 'text' },
                            { field: 'primaryContactEmail', label: 'Contact Email *', placeholder: 'contact@charity.org', type: 'email' },
                            { field: 'authorizedSignatoryName', label: 'Authorized Signatory Name *', placeholder: 'Dr. James Green', type: 'text' },
                            { field: 'authorizedSignatoryTitle', label: 'Signatory Title *', placeholder: 'CEO / Trustee Chair', type: 'text' },
                            { field: 'stripeConnectedAccountId', label: 'Stripe Connected Account ID (optional)', placeholder: 'acct_...', type: 'text' },
                          ].map(({ field, label, placeholder, type }) => (
                            <div key={field}>
                              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>{label}</label>
                              <input
                                type={type}
                                value={(form as any)[field]}
                                onChange={(e) => handleFormChange(field, e.target.value)}
                                className="form-input"
                                placeholder={placeholder}
                                required={!field.includes('Stripe')}
                              />
                            </div>
                          ))}
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>Focus Pillar *</label>
                          <select value={form.focusPillar} onChange={(e) => handleFormChange('focusPillar', e.target.value)} className="form-input">
                            {Object.entries(PILLAR_LABELS).map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>Impact Metric Description *</label>
                          <textarea
                            value={form.impactMetricDescription}
                            onChange={(e) => handleFormChange('impactMetricDescription', e.target.value)}
                            className="form-input"
                            rows={2}
                            required
                            placeholder="e.g. 12,000 trees planted per £10,000 received"
                          />
                        </div>

                        <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.83rem', color: 'var(--text-main)' }}>
                          <input
                            type="checkbox"
                            checked={form.agreedToTerms}
                            onChange={(e) => handleFormChange('agreedToTerms', e.target.checked)}
                            style={{ marginTop: '2px', accentColor: 'var(--color-sky)', minWidth: '16px', minHeight: '16px' }}
                            required
                          />
                          <span>
                            I, the Authorized Signatory, confirm that all information is accurate and legally binding. I agree to the 1-year statutory warranty terms, annual audit reviews, and random ESG spot-audits as administered by GHG App.
                          </span>
                        </label>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary" style={{ flex: '1 1 120px', minHeight: '44px' }}>
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={formSubmitting || !form.agreedToTerms}
                            className="btn btn-primary"
                            style={{ flex: '3 1 200px', minHeight: '44px', opacity: (formSubmitting || !form.agreedToTerms) ? 0.65 : 1 }}
                          >
                            {formSubmitting ? 'Submitting...' : 'Submit Statutory Registration Application'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                borderRadius: '10px', padding: '1.25rem 1.5rem',
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  backgroundColor: 'var(--google-red)', flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Registration Currently Closed — At Capacity (3/3)
                  </div>
                  {nextIntakeDate && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Applications will re-open after the next annual audit review, expected on {nextIntakeDate}.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Corporate Partners Table */}
      <div className="persefoni-card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.875rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            Registered Corporate Partners & 1-Year Warranty Status
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Auditable registry of registered partners, annual carbon assertions, warranty expirations, and cryptographic provenance ledgers.
          </p>
        </div>

        {ledgerLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading registry...</div>
        ) : !data?.publicPartners || data.publicPartners.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No registered corporate partners found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left', minWidth: '580px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Partner Entity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Licensee ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Annual Carbon</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Warranty</th>
                  <th style={{ padding: '0.75rem 1rem' }}>On-Chain</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.publicPartners.map((partner: any) => (
                  <tr key={partner.licenseeId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{partner.name}</td>
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{partner.licenseeId}</td>
                    <td style={{ padding: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{partner.annualCarbonTonnes ?? 250} tCO2e/yr</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--color-green-light)', color: 'var(--color-green-dark)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '0.72rem', fontWeight: 700 }}>
                        Active
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <OpenSeaBadge licenseeId={partner.licenseeId} />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link to={`/partner-logo-drop?licenseeId=${partner.licenseeId}`} style={{ color: 'var(--color-sky)', fontWeight: 700, textDecoration: 'none', fontSize: '0.8rem' }}>
                        View Drops
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
