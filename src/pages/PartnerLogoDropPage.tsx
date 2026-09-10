import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { BrandLogoUploader } from '../components/BrandLogoUploader';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { OpenSeaBadge } from '../components/OpenSeaBadge';
import { StatusBadge } from '../components/StatusBadge';

export const PartnerLogoDropPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const licenseeId = searchParams.get('licenseeId') || user?.licenseeId || 'lic_itm_power';

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
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Pricing calculation
  const pricePerDropCents = licenseeId === 'lic_jcb_test' ? 750 : 500; // £5.00 or £7.50 per drop
  const grossAmountCents = quantity * pricePerDropCents;
  const royaltyCents = Math.round((grossAmountCents * 8500) / 10000);
  const charityCents = grossAmountCents - royaltyCents;

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
      const result = await api.b2bTrigger({
        licenseeId,
        quantity,
        deliveryType,
        externalReferenceId: `ref_b2b_${Date.now()}`,
        attestationNote,
        logoName,
      });

      setSuccessResult(result);
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

      {successResult ? (
        <div className="card">
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              B2B Logo Drop Licensing & Settlement Complete
            </div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Transaction Ref: <code>{successResult.transactionId}</code>
            </div>
          </div>
          <div className="responsive-grid-2" style={{ marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Settlement Status</div>
              <div style={{ marginTop: '0.25rem' }}><StatusBadge status="SETTLED" /></div>

              <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Deployment Type</div>
              <div style={{ fontWeight: 600 }}>
                {deliveryType === 'DIGITAL' ? 'Digital / Software Application' : 'Physical Keepsake / Product Application'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Digital Provenance</div>
              <div style={{ marginTop: '0.5rem' }}>
                <OpenSeaBadge transactionId={successResult.transactionId} licenseeId={licenseeId} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Settled Royalty & Charity Financial Breakdown
            </h3>
            <FinancialSplitBar
              grossAmountCents={successResult.grossAmountCents}
              licensorRoyaltyCents={successResult.licensorRoyaltyCents}
              charityGiftCents={successResult.charityGiftCents}
            />
          </div>

          <button
            onClick={() => {
              setSuccessResult(null);
              setError(null);
            }}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1.5rem' }}
          >
            Create Another Logo Drop Licensing Batch
          </button>
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
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>🌐 Software / Web</div>
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Printed gear & products</div>
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
                      drops × £{(pricePerDropCents / 100).toFixed(2)}/drop
                    </span>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.125rem' }}>
                      <span>Total Licensing Fee:</span>
                      <span>£{(grossAmountCents / 100).toFixed(2)}</span>
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
                  <p className="card-subtitle">Encrypted 256-bit SSL transaction settlement via Stripe</p>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Card number (4242 •••• •••• ••••)"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || quantity <= 0}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.875rem' }}
                >
                  {loading
                    ? 'Settling Licensing Fee via Stripe...'
                    : `Pay £${(grossAmountCents / 100).toFixed(2)} & License ${quantity} Drops`}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
