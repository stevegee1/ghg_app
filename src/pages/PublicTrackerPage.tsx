import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';

export const PublicTrackerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || 'ord_wedding_9988';

  const [orderId, setOrderId] = useState<string>(initialOrderId);
  const [searchInput, setSearchInput] = useState<string>(initialOrderId);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrder() {
      setLoading(true);
      try {
        const res = await api.getSouvenirTracker(orderId);
        if (isMounted) setOrder(res);
      } catch (err) {
        if (isMounted) setOrder(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();
    return () => { isMounted = false; };
  }, [orderId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setOrderId(searchInput.trim());
    }
  };

  const steps = [
    { key: 'ORDER_PLACED', label: 'Order Placed', num: '1' },
    { key: 'ARTWORK_APPROVED', label: 'Artwork Approved', num: '2' },
    { key: 'LOGO_DROP_PRINTED', label: 'Logo Drop Printed', num: '3' },
    { key: 'SHIPPED', label: 'In Transit', num: '4' },
    { key: 'DELIVERED', label: 'Delivered', num: '5' },
  ];

  const getStepStatus = (stepKey: string) => {
    if (!order) return 'upcoming';
    const statusOrder = ['ORDER_PLACED', 'ARTWORK_APPROVED', 'LOGO_DROP_PRINTED', 'SHIPPED', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '1.5rem 0 4rem 0' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--accent-light)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            padding: '0.4rem 0.9rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-sky)',
            letterSpacing: '0.04em',
            marginBottom: '1rem',
          }}
        >
          <span className="radar-pulse" />
          <span>REAL-TIME SOUVENIR DROPSHIPPING TRACKER</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.85rem, 3.8vw, 2.5rem)', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0', letterSpacing: '-0.03em' }}>
          Event Souvenir Delivery Tracker
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0 }}>
          Track production progress, proof verification, shipment updates, and 15% charitable routing.
        </p>
      </div>

      {/* Search Bar Card */}
      <form onSubmit={handleSearch} className="persefoni-card" style={{ padding: '1.25rem', marginBottom: '2.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter Order Reference (e.g. ord_wedding_9988)"
          className="form-input"
          style={{ flex: 1, minWidth: '220px' }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
          Track Order →
        </button>
      </form>

      {loading ? (
        <div className="persefoni-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading live tracking data...
        </div>
      ) : !order ? (
        <div className="persefoni-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Order Not Found</p>
          <p style={{ fontSize: '0.875rem', margin: 0 }}>No order found for reference: <code>{orderId}</code>. Please check and try again.</p>
        </div>
      ) : (
        <div className="persefoni-card" style={{ padding: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}>
          
          {/* Order Meta Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>ORDER TRACKING REFERENCE</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>{order.orderId}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>EVENT DATE</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{order.eventDate}</div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
            {steps.map((step) => {
              const status = getStepStatus(step.key);
              const isCompleted = status === 'completed';
              const isActive = status === 'active';

              return (
                <div
                  key={step.key}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'var(--accent-light)' : isCompleted ? 'var(--color-green-light)' : 'var(--bg-subtle)',
                    border: isActive ? '2px solid var(--color-sky)' : isCompleted ? '1px solid var(--color-green)' : '1px solid var(--border-light)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      margin: '0 auto 0.5rem auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      backgroundColor: isActive ? 'var(--color-sky)' : isCompleted ? 'var(--color-green)' : 'var(--border-medium)',
                      color: '#ffffff',
                    }}
                  >
                    {isCompleted ? '✓' : step.num}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Details Breakdown */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Event Inscription:</span>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{order.eventName}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Quantity:</span>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{order.quantity} units</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Delivery:</span>
                <div style={{ fontWeight: 800, color: 'var(--color-sky)', marginTop: '2px' }}>{order.estimatedDeliveryDate}</div>
              </div>
            </div>

            <FinancialSplitBar
              grossAmountCents={order.grossAmountCents}
              licensorRoyaltyCents={order.licensorRoyaltyCents}
              charityGiftCents={order.charityGiftCents}
            />
          </div>

        </div>
      )}

    </div>
  );
};
