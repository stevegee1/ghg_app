import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { BrandLogoUploader } from '../components/BrandLogoUploader';
import { FinancialSplitBar } from '../components/FinancialSplitBar';

export const PartnerLogoDropPage: React.FC = () => {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const returnedFromStripe = searchParams.get('payment') === 'success';

  // Form State
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoName, setLogoName] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<'DIGITAL' | 'PHYSICAL'>('DIGITAL'); // DIGITAL = Software/Website, PHYSICAL = Physical Merch/Hardware
  const [quantity, setQuantity] = useState<number>(100);
  const [attestationNote, setAttestationNote] = useState<string>(
    'Data submitted via partner self-report emissions telemetry portal. Not independently audited.'
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // The client's own price per drop and the active split, from the server. The order is priced there too.
  const [pricing, setPricing] = useState<{ pricePerDropPence: number | null; royaltyBps: number; currency: string } | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getLogoDropPricing(token)
      .then(setPricing)
      .catch((err: Error) => setPricingError(err.message));
  }, [token]);

  const pricePerDropCents = pricing?.pricePerDropPence ?? null;
  const grossAmountCents = pricePerDropCents === null ? 0 : quantity * pricePerDropCents;
  const royaltyCents = pricing ? Math.round((grossAmountCents * pricing.royaltyBps) / 10000) : 0;
  const charityCents = grossAmountCents - royaltyCents;
  const money = (pence: number, currency: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(pence / 100);

  const handleLicensingCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Honesty Validation (M5d): Prevent unsubstantiated claims of independent audit
    const noteLower = attestationNote.toLowerCase();
    if (
      (noteLower.includes('independently audited') || noteLower.includes('third party verified') || noteLower.includes('certified zero carbon')) &&
      !noteLower.includes('not independently audited')
    ) {
      setError(
        'Validation Warning (Verification Honesty): Claims of independent third-party audit are restricted unless accredited third-party auditor credentials are attached. Please include standing disclaimer ("Not independently audited").'
      );
      return;
    }

    setLoading(true);

    try {
      if (!token) throw new Error('Please sign in to order logo drops.');
      const session = await api.orderLogoDrops(token, { quantity, deliveryType, attestationNote });
      if (!session.sessionUrl) throw new Error('Checkout is unavailable right now. Please try again later.');
      window.location.assign(session.sessionUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to complete licensing transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>B2B Partner Brand Logo Drop Studio</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          License the official GHG Accountability Mark, upload your brand logo, provide carbon emissions proof, and settle licensing fees via Stripe.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {returnedFromStripe ? (
        <div className="card">
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>Payment submitted</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Stripe has your payment. The order appears in your payment history once Stripe confirms it.
            </div>
          </div>
          <Link to="/portal?tab=transactions" className="btn btn-secondary">
            View payment history
          </Link>
        </div>
) : (
        <form onSubmit={handleLicensingCheckout}>
          <div className="responsive-grid-2">
            {/* Left Column: Brand Logo & Deployment Method */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">1. Brand Logo & Deployment</h2>
                <p className="card-subtitle">Choose where your verified logo drop will be deployed</p>
              </div>

              {/* Logo Upload Component */}
              <BrandLogoUploader
                initialLogoUrl={user?.logoUrl || ''}
                initialLogoName={user?.companyName || ''}
                onLogoSelected={(url, name) => {
                  setLogoUrl(url);
                  setLogoName(name);
                }}
              />

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Deployment Type</label>
                <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: deliveryType === 'DIGITAL' ? 'var(--accent-light)' : 'var(--bg-card)',
                      borderColor: deliveryType === 'DIGITAL' ? 'var(--accent-primary)' : 'var(--border-medium)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={deliveryType === 'DIGITAL'}
                      onChange={() => setDeliveryType('DIGITAL')}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Software / Web Application</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Site badge / SaaS integration</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: deliveryType === 'PHYSICAL' ? 'var(--accent-light)' : 'var(--bg-card)',
                      borderColor: deliveryType === 'PHYSICAL' ? 'var(--accent-primary)' : 'var(--border-medium)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={deliveryType === 'PHYSICAL'}
                      onChange={() => setDeliveryType('PHYSICAL')}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Physical Keepsake</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Printed gear &amp; products</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Carbon Proof & Stripe Payment */}
            <div>
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">2. Carbon Emissions Summary Proof</h2>
                  <p className="card-subtitle">Required attestation note before proceeding to licensing payment</p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="attestation">
                    Company Carbon Proof & Methodology Summary
                  </label>
                  <textarea
                    id="attestation"
                    rows={3}
                    required
                    value={attestationNote}
                    onChange={(e) => setAttestationNote(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.8125rem' }}
                  />
                  <div className="form-help">
                    Must accurately describe verification source. Standing disclaimer ("Not independently audited") is automatically maintained.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Drop Quantity & Licensing Fee</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="form-input"
                      style={{ width: '120px' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {pricing && pricePerDropCents !== null
                        ? `drops × ${money(pricePerDropCents, pricing.currency)} per drop`
                        : pricingError
                        ? `Pricing is unavailable: ${pricingError}`
                        : pricing
                        ? 'Logo drop pricing has not been set up for your account. Please contact us.'
                        : 'Loading your price...'}
                    </span>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.125rem' }}>
                      <span>Total Licensing Fee:</span>
                      <span>{pricing ? money(grossAmountCents, pricing.currency) : '-'}</span>
                    </div>
                    <FinancialSplitBar
                      grossAmountCents={grossAmountCents}
                      licensorRoyaltyCents={royaltyCents}
                      charityGiftCents={charityCents}
                    />
                  </div>
                </div>
              </div>

              {/* Stripe Checkout Card */}
              <div className="card">
                <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                  <h2 className="card-title">3. Payment & Licensing Settlement</h2>
                  <p className="card-subtitle">Payment is handled by Stripe</p>
                </div>

                <p className="card-subtitle" style={{ marginBottom: '1rem' }}>You pay securely on Stripe's checkout page.</p>

                <button
                  type="submit"
                  disabled={loading || quantity <= 0 || !pricing || pricePerDropCents === null}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.875rem' }}
                >
                  {loading
                    ? 'Opening Stripe checkout...'
                    : pricing && pricePerDropCents !== null
                    ? `Pay ${money(grossAmountCents, pricing.currency)} with Stripe`
                    : 'Pricing unavailable'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
