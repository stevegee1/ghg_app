import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { SoftwareEmbedBuilder } from '../components/SoftwareEmbedBuilder';
import { OpenSeaBadge } from '../components/OpenSeaBadge';
import { StatusBadge } from '../components/StatusBadge';

export const PartnerLicensingPage: React.FC = () => {
  const { user } = useAuth();

  const [partnerName, setPartnerName] = useState<string>('ITM Power CleanTech');
  const [licenseeId, setLicenseeId] = useState<string>(user?.licenseeId || 'lic_itm_power');
  const [annualCarbonTonnes, setAnnualCarbonTonnes] = useState<number>(250);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Financial Fee Engine: £10 / tonne CO2e per year (minimum £500/yr)
  const annualFeeGbp = Math.max(500, annualCarbonTonnes * 10);
  const grossCents = annualFeeGbp * 100;
  const royaltyCents = Math.round((grossCents * 8500) / 10000);
  const charityCents = grossCents - royaltyCents;

  const handleAnnualLicensingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createAnnualLicense({
        licenseeId,
        partnerName,
        annualCarbonTonnes,
      });
      setSuccessResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to complete annual licensing setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Partner Annual Carbon Licensing & Warranty Studio</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Submit your annual carbon emissions proof, calculate your £/year licensing metric, and receive an active 1-Year Verified Warranty Mark.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {successResult ? (
        <div>
          <div className="card">
            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                🏆 1-Year Verified Carbon Warranty Issued & License Active!
              </div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                License Transaction Reference: <code>{successResult.transactionId}</code>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Warranty Status</div>
                <div className="warranty-badge warranty-active" style={{ marginTop: '0.25rem' }}>
                  <span>✓ 1-Year Active Warranty (Expires: {successResult.warrantyExpiresAt})</span>
                </div>

                <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Annual Carbon Metric</div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{annualCarbonTonnes} tonnes CO2e / year</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>On-Chain Provenance</div>
                <div style={{ marginTop: '0.5rem' }}>
                  <OpenSeaBadge transactionId={successResult.transactionId} licenseeId={licenseeId} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Annual Licensing Fee Financial Split (£{annualFeeGbp}/year)
              </h3>
              <FinancialSplitBar
                grossAmountCents={successResult.grossAmountCents}
                licensorRoyaltyCents={successResult.royaltyCents}
                charityGiftCents={successResult.charityCents}
              />
            </div>
          </div>

          {/* Software Embed Generator Widget */}
          <SoftwareEmbedBuilder licenseeId={licenseeId} partnerName={partnerName} />

          <button
            onClick={() => {
              setSuccessResult(null);
              setError(null);
            }}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1.5rem' }}
          >
            Modify Annual Emissions Calculation
          </button>
        </div>
      ) : (
        <form onSubmit={handleAnnualLicensingSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left Column: Annual Carbon Emissions Input */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">1. Company Annual Carbon Emissions Proof</h2>
                <p className="card-subtitle">Enter your total annual carbon footprint metric</p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="companyName">Corporate Partner Name</label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="carbonEmissions">
                  Annual Carbon Emissions (Tonnes CO2e / Year)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    id="carbonEmissions"
                    type="number"
                    min="1"
                    max="100000"
                    required
                    value={annualCarbonTonnes}
                    onChange={(e) => setAnnualCarbonTonnes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="form-input"
                    style={{ width: '140px' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>tonnes CO2e/yr</span>
                </div>
                <div className="form-help">
                  Annual licensing rate: £10 per tonne CO2e/year (minimum £500/year).
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Issued Warranty Scope:
                </div>
                <div className="warranty-badge warranty-active">
                  <span>✓ 1-Year Verified Logo Mark License</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Valid for 365 days from settlement. Renewed annually upon carbon proof submission.
                </div>
              </div>
            </div>

            {/* Right Column: Financial Calculation & Stripe Checkout */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">2. Annual Licensing Metric & Stripe Checkout</h2>
                <p className="card-subtitle">Calculated fee and automatic charity routing</p>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Calculated Annual License Fee</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  £{annualFeeGbp.toLocaleString()}.00 <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>/ year</span>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <FinancialSplitBar
                    grossAmountCents={grossCents}
                    licensorRoyaltyCents={royaltyCents}
                    charityGiftCents={charityCents}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Stripe Subscription Payment</label>
                <input
                  type="text"
                  readOnly
                  value="•••• •••• •••• 4242  |  Exp: 12/34  |  CVC: 123"
                  className="form-input"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.875rem' }}
              >
                {loading ? 'Processing Licensing Subscription...' : `Pay £${annualFeeGbp.toLocaleString()}.00 & Issue 1-Year Warranty`}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
