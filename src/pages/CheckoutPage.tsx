import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';

interface OrderSummaryData {
  orderNumber: string;
  transactionId: string;
  status: string;
  orderStatus: string;
  itemTitle: string;
  grossAmountCents: number;
  licensorRoyaltyCents: number;
  charityGiftCents: number;
  currency: string;
  createdAt?: string;
  shippingAddress?: any;
  courierName?: string;
  trackingNumber?: string | null;
  trackingUrl: string;
  invoicePdfUrl: string;
  charityAllocations: { charityName: string; amountCents: number; transferred: boolean }[];
}

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session_id');
  const txId = searchParams.get('tx_id');
  const isPostCheckout = Boolean(sessionId || txId);

  // Order Summary State
  const [orderSummary, setOrderSummary] = useState<OrderSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(isPostCheckout);

  useEffect(() => {
    if (!isPostCheckout) return;

    let isCurrent = true;
    const fetchOrderSummary = async () => {
      setSummaryLoading(true);
      try {
        const data = await api.getOrderSummary({
          sessionId: sessionId || undefined,
          txId: txId || undefined,
        });

        if (isCurrent && data?.success) {
          setOrderSummary(data);
        }
      } catch (err: any) {
        console.error('[CHECKOUT] Order summary unavailable', err);
      } finally {
        if (isCurrent) setSummaryLoading(false);
      }
    };

    fetchOrderSummary();

    return () => {
      isCurrent = false;
    };
  }, [sessionId, txId, isPostCheckout]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadInvoice = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!orderSummary) return;
    setDownloadingPdf(true);
    try {
      const url = orderSummary.invoicePdfUrl && orderSummary.invoicePdfUrl.startsWith('/api')
        ? orderSummary.invoicePdfUrl
        : `/api/orders/${orderSummary.orderNumber}/invoice-pdf`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Invoice download request returned non-200');
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `GHG-Invoice-${orderSummary.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2000);
    } catch (dlErr) {
      console.warn('Direct blob download failed, redirecting:', dlErr);
      window.location.href = `/api/orders/${orderSummary.orderNumber}/invoice-pdf`;
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem 5rem 1.5rem',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '620px' }}>
        {/* POST-CHECKOUT SUCCESS: EXACT SECOND SCREENSHOT STYLE */}
        {orderSummary ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '3.25rem 2.75rem',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* GHG / NFTYLOGS Brand Logo */}
            <div style={{ marginBottom: '1.75rem' }}>
              <img
                src="/images/nfty-logs-logo.png"
                alt="NFTYLOGS Official Logo"
                style={{ width: '48px', height: '48px', objectFit: 'contain', display: 'block' }}
              />
            </div>

            {/* Bold Title */}
            <h1
              style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 0.85rem 0',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
              }}
            >
              Order Confirmed
            </h1>

            {/* Subtitle Description */}
            <p
              style={{
                fontSize: '1rem',
                color: '#475569',
                margin: '0 0 2.25rem 0',
                lineHeight: 1.55,
                fontWeight: 400,
              }}
            >
              NFTYLOGS merchandise, with a share of every payment going to our charity partners:
            </p>

            {/* Clean Feature List with Black Checkmark Icons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginTop: '0.2rem', flexShrink: 0 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div style={{ fontSize: '0.975rem', fontWeight: 500, color: '#1e293b', lineHeight: 1.4 }}>
                  Charity share recorded with your order
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginTop: '0.2rem', flexShrink: 0 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div style={{ fontSize: '0.975rem', fontWeight: 500, color: '#1e293b', lineHeight: 1.4 }}>
                  Cryptographic provenance sealed on the GHG Transparency Ledger
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginTop: '0.2rem', flexShrink: 0 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div style={{ fontSize: '0.975rem', fontWeight: 500, color: '#1e293b', lineHeight: 1.4 }}>
                  Real-time parcel tracking from production to courier dispatch
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginTop: '0.2rem', flexShrink: 0 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div style={{ fontSize: '0.975rem', fontWeight: 500, color: '#1e293b', lineHeight: 1.4 }}>
                  Statutory tax-deductible ESG gift receipt &amp; invoice download
                </div>
              </div>
            </div>

            {/* Provenance Ledger & Financial Routing Strip */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                marginBottom: '2.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>
                    Official Order Number
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    {orderSummary.orderNumber}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>
                    Ledger Status
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                    SETTLED &amp; SEALED
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span>Gross Item Total ({orderSummary.currency}):</span>
                  <strong style={{ color: '#0f172a' }}>£{(orderSummary.grossAmountCents / 100).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span>Supplier production:</span>
                  <strong style={{ color: '#0f172a' }}>£{(orderSummary.licensorRoyaltyCents / 100).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Charity share:</span>
                  <strong style={{ color: '#16a34a' }}>£{(orderSummary.charityGiftCents / 100).toFixed(2)}</strong>
                </div>
              </div>

              {orderSummary.charityAllocations.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Automated Charity Split Disbursements:
                  </div>
                  {orderSummary.charityAllocations.map((alloc, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.15rem' }}>
                      <span>• {alloc.charityName}</span>
                      <span>£{(alloc.amountCents / 100).toFixed(2)} (Programmatic Split)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Action Area Matching Image 2 Exact Rhythm */}
            <div style={{ marginBottom: '1.75rem' }}>
              <Link
                to={orderSummary.trackingUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  textDecoration: 'none',
                  letterSpacing: '-0.01em',
                  transition: 'color 0.15s ease',
                }}
              >
                Track your order <span style={{ fontSize: '1.25rem', transform: 'translateX(2px)' }}>→</span>
              </Link>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 400 }}>
                Order #{orderSummary.orderNumber}
              </div>
            </div>

            {/* Secondary Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <Link
                to="/transparency"
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                View Transparency Ledger
              </Link>

              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloadingPdf}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  cursor: downloadingPdf ? 'wait' : 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {downloadingPdf ? 'Downloading PDF...' : 'Download ESG Invoice (PDF)'}
              </button>

              <Link
                to="/merch"
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  color: '#64748b',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Return to Store
              </Link>
            </div>
          </div>
        ) : summaryLoading ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '4rem 2rem',
              textAlign: 'center',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#0f172a',
                borderRadius: '50%',
                margin: '0 auto 1.5rem auto',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Sealing Provenance Ledger...
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              Reconciling Stripe payment session and generating parcel tracking credentials.
            </p>
          </div>
        ) : (
          <div className="checkout-message">
            <h1>{isPostCheckout ? 'We could not load your order' : 'Nothing to check out'}</h1>
            <p>
              {isPostCheckout
                ? 'Your payment is handled by Stripe and is not affected. Your receipt is in your email, and you can follow the order on the tracking page.'
                : 'Orders are placed from the store and paid securely through Stripe.'}
            </p>
            <div className="checkout-message-actions">
              {isPostCheckout && (
                <Link to="/track" className="btn btn-primary">
                  Track an order
                </Link>
              )}
              <Link to="/merch" className="btn btn-secondary">
                Go to the store
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
