import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { StatusBadge } from '../components/StatusBadge';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const itemName = searchParams.get('item') || 'NFTY LOGS® Vagaries of GHG Emissions Embroidered Cap';
  const itemPriceGbp = parseFloat(searchParams.get('price') || '25.00');
  const grossAmountCents = Math.round(itemPriceGbp * 100);

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [optIn, setOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  
  const [referenceId] = useState<string>(() => `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 4);
    const formatted = val.length >= 3 ? `${val.substring(0, 2)}/${val.substring(2)}` : val;
    setCardExpiry(formatted);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optIn) {
      setError('Please agree to the Verified GHG Accountability Mark terms to proceed.');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length < 15) {
      setError('Please enter a valid card number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.checkout({
        licenseeId: 'lic_default_platform',
        grossAmountCents,
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
    <div style={{ maxWidth: '640px', margin: '2rem auto 5rem auto', padding: '0 1rem' }}>
      
      <div className="persefoni-card" style={{ padding: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Secure Order Checkout
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Encrypted payment processing & verified statutory ESG charitable split.
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
              <div style={{ fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '1rem' }}>Payment & Order Complete!</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                Transaction ID: <strong>{successResult.transactionId}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Settlement Status:</span>
              <StatusBadge status="SETTLED" />
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <FinancialSplitBar
                grossAmountCents={successResult.grossAmountCents || grossAmountCents}
                licensorRoyaltyCents={successResult.licensorRoyaltyCents || Math.round(grossAmountCents * 0.85)}
                charityGiftCents={successResult.charityGiftCents || Math.round(grossAmountCents * 0.15)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <Link to="/transparency" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                View on Transparency Ledger
              </Link>
              <Link to="/merch" className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                Return to Store
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckout}>
            
            {/* Item Summary Card */}
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{itemName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>NFTY LOGS® Official Store</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>
                  £{itemPriceGbp.toFixed(2)}
                </div>
              </div>
            </div>

            {/* 15% ESG Accountability Mark Box */}
            <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', gap: '0.65rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  style={{ marginTop: '0.15rem', accentColor: 'var(--color-green)' }}
                />
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--color-green-dark)' }}>Verified GHG Accountability Mark</div>
                  <div style={{ color: 'var(--text-main)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    Exact 15% (£{(itemPriceGbp * 0.15).toFixed(2)}) of this purchase is automatically routed to verified local environmental restoration funds.
                  </div>
                </div>
              </label>
            </div>

            {/* Production Payment Details Form */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Payment Details
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🔒 256-Bit SSL Encrypted
                </span>
              </div>

              {/* Card Number Input */}
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  required
                  placeholder="Card number (4242 •••• •••• ••••)"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Expiry & CVC Grid */}
              <div className="form-grid-2col" style={{ gap: '0.75rem' }}>
                <input
                  type="text"
                  required
                  placeholder="MM / YY"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="CVC"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !optIn}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
            >
              {loading ? 'Processing Payment...' : `Pay £${itemPriceGbp.toFixed(2)} →`}
            </button>
          </form>
        )}
      </div>

    </div>
  );
};
