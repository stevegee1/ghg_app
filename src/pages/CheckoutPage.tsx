import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { StatusBadge } from '../components/StatusBadge';

export const CheckoutPage: React.FC = () => {
  const [optIn, setOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  
  // Client-side in-memory session reference ID
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
      // Call POST /api/checkout
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
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Arsenal FC Official Matchday Kit</h1>
          <p className="card-subtitle">Verified Trademark Licensing & Environmental Royalty Checkout</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {successResult ? (
          <div>
            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
              <strong>Payment & Royalty Licensing Complete!</strong>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                Transaction ID: <code style={{ fontWeight: 600 }}>{successResult.transactionId}</code>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Settlement Status:</span>
              <StatusBadge status="SETTLED" />
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Royalty & Charity Split Breakdown
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
              Start New Test Checkout
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheckout}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontWeight: 600 }}>2026 Season Home Jersey</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Quantity: 1 | Licensee: Arsenal FC (lic_arsenal_fc)</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>£25.00</div>
            </div>

            <div className="form-group" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #99f6e4', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  style={{ marginTop: '0.2rem', width: '16px', height: '16px' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                    Add the GHG Accountability Logo Drop (+£0.00)
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    Opt in to license the official verified logo drop mark. 15% of licensing royalties are automatically allocated to verified environmental charity partners.
                  </div>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Information</label>
              <div style={{ padding: '0.75rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Stripe Test Mode (Card: 4242 4242 4242 4242)
                </div>
                <input
                  type="text"
                  readOnly
                  value="•••• •••• •••• 4242  |  Exp: 12/34  |  CVC: 123"
                  className="form-input"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !optIn}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.875rem' }}
            >
              {loading ? 'Processing Transaction...' : 'Pay £25.00 & Apply Logo Drop'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
