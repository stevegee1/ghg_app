import React, { useState } from 'react';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { StatusBadge } from '../components/StatusBadge';

export const CheckoutPage: React.FC = () => {
  const [optIn, setOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  
  const [referenceId] = useState<string>(() => `ref_${crypto.randomUUID()}`);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optIn) {
      alert('Please check the GHG Accountability Mark opt-in box to proceed with logo drop licensing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.checkout({
        licenseeId: 'lic_arsenal_fc',
        grossAmountCents: 2500, // £25.00
        checkoutReferenceId: referenceId,
      });

      setSuccessResult(result);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during checkout processing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '2rem auto', padding: '0 1rem' }}>
      
      <div className="persefoni-card" style={{ padding: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--accent-light)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--color-sky)',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem',
            }}
          >
            <span className="radar-pulse" />
            <span>CONSUMER CHECKOUT WIDGET</span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Arsenal FC Official Matchday Kit
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Verified Trademark Licensing & Environmental Royalty Checkout
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {successResult ? (
          <div>
            <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '1rem' }}>Payment & Royalty Licensing Complete!</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                Transaction ID: <strong>{successResult.transactionId}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
              <StatusBadge status="SETTLED" />
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <FinancialSplitBar
                grossAmountCents={successResult.grossAmountCents}
                licensorRoyaltyCents={successResult.licensorRoyaltyCents}
                charityGiftCents={successResult.charityGiftCents}
              />
            </div>

            <button
              onClick={() => setSuccessResult(null)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '1.5rem' }}
            >
              Start New Checkout Demo
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheckout}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>Arsenal FC 2026 Derby Kit</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Standard Consumer Checkout</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>
                  £25.00
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', gap: '0.65rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  style={{ marginTop: '0.15rem', accentColor: 'var(--color-green)' }}
                />
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--color-green-dark)' }}>Apply Printed GHG Accountability Mark</div>
                  <div style={{ color: 'var(--text-main)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    15% (£3.75) of this purchase will be automatically routed to verified climate action and tree planting funds.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Payment Method (Stripe Test Mode)
              </label>
              <input
                type="text"
                readOnly
                value="•••• •••• •••• 4242  |  Exp: 12/34  |  CVC: 123"
                className="form-input"
                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !optIn}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Authorizing Payment...' : 'Pay £25.00 & Mint Digital Provenance →'}
            </button>
          </form>
        )}

      </div>

    </div>
  );
};
