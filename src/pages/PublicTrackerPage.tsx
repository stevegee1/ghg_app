import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';

const STATUS_STEPS = [
  { key: 'ORDER_PLACED', label: 'Order Placed', detail: 'Payment received and order registered.' },
  { key: 'SPLIT_DISBURSED', label: 'Charity share paid', detail: 'The charity share of this order has been paid to our partner charities.' },
  { key: 'QUEUED_FOR_PRINT', label: 'Queued for Print', detail: 'Your batch has been allocated to the printing queue.' },
  { key: 'IN_PRODUCTION', label: 'In Production', detail: 'Artisans are applying the GHG certified logo drop mark.' },
  { key: 'QUALITY_INSPECTED', label: 'ISO Quality Check', detail: 'ISO 14067 LCA certificate generated and batch verified.' },
  { key: 'DISPATCHED', label: 'Dispatched', detail: 'Your order is on its way via courier.' },
  { key: 'DELIVERED', label: 'Delivered', detail: 'Order delivered. Thank you!' },
];

const CATEGORY_LABELS: Record<string, string> = {
  SPORTS: 'Sports',
  GALA: 'Gala',
  TECH_SUMMIT: 'Tech Summit',
  WEDDING: 'Wedding',
};

export const PublicTrackerPage: React.FC = () => {
  const { orderNumber: urlOrderNumber } = useParams<{ orderNumber?: string }>();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState<string>(urlOrderNumber || '');
  const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(urlOrderNumber || null);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrderNumber) return;
    let isMounted = true;

    async function fetchOrder() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getSouvenirTracker(activeOrderNumber!);
        if (isMounted) setOrder(res);
      } catch (err: any) {
        if (isMounted) {
          setOrder(null);
          setError(err.message || 'Order not found.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();
    return () => { isMounted = false; };
  }, [activeOrderNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim().toUpperCase();
    if (!trimmed) return;
    setActiveOrderNumber(trimmed);
    navigate(`/track/${trimmed}`, { replace: true });
  };

  const currentIndex = order ? (order.statusIndex ?? STATUS_STEPS.findIndex((s) => s.key === order.status)) : -1;
  const isCancelled = order?.status === 'CANCELLED';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem var(--page-px, 1.25rem) 4rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: 'var(--accent-light)', border: '1px solid rgba(2, 132, 199, 0.25)',
          padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-pill)',
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-sky)',
          letterSpacing: '0.04em', marginBottom: '0.75rem',
        }}>
          <span className="radar-pulse" />
          <span>ORDER FULFILLMENT & TRACKING</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
          Track Your Logo Drop Order
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          Enter an order reference number to view verified production milestones, shipping status, and statutory charitable disbursements.
        </p>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}
      >
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
          placeholder="e.g. GHG-ORD-2026-X8F9K"
          className="form-input"
          style={{ flex: 1, minWidth: '220px', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '0.65rem 1.5rem', minHeight: '40px', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}
        >
          Track Order
        </button>
      </form>

      {loading && (
        <div className="persefoni-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Retrieving order tracking records...
        </div>
      )}

      {!loading && error && (
        <div className="persefoni-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '0.35rem' }}>Order Not Found</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && order && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Order Summary Card */}
          <div className="persefoni-card" style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light)',
              paddingBottom: '1rem', marginBottom: '1.25rem',
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Order Reference
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>
                  {order.orderNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                  fontSize: '0.75rem', fontWeight: 800,
                  backgroundColor: isCancelled ? 'rgba(239,68,68,0.1)' : 'var(--color-green-light)',
                  color: isCancelled ? 'var(--google-red)' : 'var(--color-green-dark)',
                  border: `1px solid ${isCancelled ? 'var(--google-red)' : 'var(--color-green)'}`,
                }}>
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Order Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Category</div>
                <div style={{ fontWeight: 800 }}>{CATEGORY_LABELS[order.eventCategory] ?? order.eventCategory}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Event</div>
                <div style={{ fontWeight: 800 }}>{order.eventName}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Logo Drops</div>
                <div style={{ fontWeight: 800 }}>{order.logoDropCount} units</div>
              </div>
              {order.courierName && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Courier</div>
                  <div style={{ fontWeight: 800 }}>
                    {order.trackingUrl ? (
                      <a href={order.trackingUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-sky)', fontWeight: 800, textDecoration: 'none' }}>
                        {order.courierName}: {order.trackingNumber}
                      </a>
                    ) : (
                      `${order.courierName}${order.trackingNumber ? `: ${order.trackingNumber}` : ''}`
                    )}
                  </div>
                </div>
              )}
              {order.estimatedDelivery && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Est. Delivery</div>
                  <div style={{ fontWeight: 800, color: 'var(--color-sky)' }}>
                    {new Date(order.estimatedDelivery).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Order Date</div>
                <div style={{ fontWeight: 800 }}>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          {/* Production Timeline Stepper */}
          <div className="persefoni-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              Production & Delivery Timeline
            </h2>

            {/* Desktop horizontal stepper */}
            <div style={{ display: 'none' }} className="desktop-stepper">
              {/* mobile-first: shown only on desktop via media-query class in index.css */}
            </div>

            {/* Mobile-first vertical stepper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {STATUS_STEPS.map((step, i) => {
                const done = currentIndex > i;
                const active = currentIndex === i;
                const upcoming = currentIndex < i;

                return (
                  <div key={step.key} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', position: 'relative' }}>
                    {/* Left: circle + line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '2px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem',
                        backgroundColor: active ? 'var(--color-sky)' : done ? 'var(--color-green)' : 'var(--bg-subtle)',
                        color: (active || done) ? '#ffffff' : 'var(--text-muted)',
                        border: upcoming ? '1px solid var(--border-medium)' : 'none',
                        transition: 'all 0.3s',
                        flexShrink: 0,
                      }}>
                        {done ? (
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7L5.5 10.5L12 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (i + 1)}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div style={{
                          width: '2px', flex: 1, minHeight: '28px',
                          backgroundColor: done ? 'var(--color-green)' : 'var(--border-light)',
                          transition: 'background-color 0.3s',
                          margin: '4px 0',
                        }} />
                      )}
                    </div>

                    {/* Right: label + detail */}
                    <div style={{ paddingBottom: i < STATUS_STEPS.length - 1 ? '1.25rem' : 0, paddingTop: '3px' }}>
                      <div style={{
                        fontWeight: 600, fontSize: '0.875rem',
                        color: active ? 'var(--color-sky)' : done ? 'var(--color-green-dark)' : 'var(--text-muted)',
                        marginBottom: '2px',
                      }}>
                        {step.label}
                        {active && (
                          <span style={{
                            marginLeft: '8px', fontSize: '0.6875rem', fontWeight: 600,
                            backgroundColor: 'var(--color-sky)', color: '#fff',
                            padding: '1px 7px', borderRadius: 'var(--radius-pill)',
                            verticalAlign: 'middle',
                          }}>
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: done ? 'var(--text-muted)' : active ? 'var(--text-main)' : 'var(--text-muted)', lineHeight: 1.4 }}>
                        {step.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="persefoni-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
              Statutory 85/15 Financial Disbursement
            </h2>
            <FinancialSplitBar
              grossAmountCents={order.grossAmountCents}
              licensorRoyaltyCents={order.licensorCents}
              charityGiftCents={order.charityCents}
            />

            {order.charityAllocations?.length > 0 && (
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {order.charityAllocations.map((alloc: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '0.82rem', padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--bg-subtle)', borderRadius: '8px',
                    flexWrap: 'wrap', gap: '0.25rem',
                  }}>
                    <span style={{ fontWeight: 700 }}>{alloc.charityName}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-green)' }}>
                        £{(alloc.amountCents / 100).toFixed(2)}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)',
                        backgroundColor: alloc.transferred ? 'var(--color-green-light)' : 'var(--bg-subtle)',
                        color: alloc.transferred ? 'var(--color-green-dark)' : 'var(--text-muted)',
                        border: `1px solid ${alloc.transferred ? 'var(--color-green)' : 'var(--border-light)'}`,
                      }}>
                        {alloc.transferred ? 'Transferred' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions: Invoice Download */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href={api.getInvoicePdfUrl(order.orderNumber)}
              download
              style={{
                flex: '1 1 200px', padding: '0.85rem 1.25rem', textAlign: 'center',
                backgroundColor: 'var(--bg-card)', color: 'var(--text-main)',
                fontWeight: 800, fontSize: '0.9rem', borderRadius: '10px',
                border: '1px solid var(--border-light)', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                minHeight: '44px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download ESG Tax Invoice (PDF)
            </a>
            <button
              type="button"
              onClick={() => { setOrder(null); setActiveOrderNumber(null); setSearchInput(''); navigate('/track', { replace: true }); }}
              className="btn btn-secondary"
              style={{ flex: '1 1 160px', minHeight: '44px' }}
            >
              Track Another Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
