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
    { key: 'ORDER_PLACED', label: 'Order Placed & Secured', icon: '1' },
    { key: 'ARTWORK_APPROVED', label: 'Logo Overlay Approved', icon: '2' },
    { key: 'LOGO_DROP_PRINTED', label: 'Logo Drop Printed', icon: '3' },
    { key: 'SHIPPED', label: 'Out for Dropshipping', icon: '4' },
    { key: 'DELIVERED', label: 'Delivered Before Event', icon: '5' },
  ];

  const getStepStatusClass = (stepKey: string) => {
    if (!order) return '';
    const statusOrder = ['ORDER_PLACED', 'ARTWORK_APPROVED', 'LOGO_DROP_PRINTED', 'SHIPPED', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return '';
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Public Dropshipping & Fulfillment Tracker</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Publicly monitor the status of physical logo drop production, souvenir printing, and delivery deadlines.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter Order Reference ID (e.g. ord_wedding_9988)"
            className="form-input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">
            Track Order 🔍
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Searching dropshipping registry...</div>
      ) : !order ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>No Dropshipping Order Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Check your order reference ID or place a new order on the Event Souvenirs page.
          </p>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-primary)', fontWeight: 700 }}>
                Public Order Status
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0' }}>{order.eventName}</h2>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Category: <strong>{order.eventType}</strong> | Ref: <code>{order.orderId}</code>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Carrier Tracking Number</div>
              <div style={{ fontWeight: 700, fontFamily: 'monospace' }}><code>{order.trackingNumber}</code></div>
            </div>
          </div>

          {/* Dropshipping Timeline Progress */}
          <div className="timeline-track">
            {steps.map((s) => {
              const cls = getStepStatusClass(s.key);
              return (
                <div key={s.key} className={`timeline-step ${cls}`}>
                  <div className="timeline-icon">{cls === 'completed' ? '✓' : s.icon}</div>
                  <div className="timeline-label">{s.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginTop: '1.5rem' }}>
            <div className="responsive-grid-3-col">
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Souvenir Item</div>
                <div style={{ fontWeight: 600 }}>{order.itemTitle}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity Produced</div>
                <div style={{ fontWeight: 700 }}>{order.quantity} units</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Event Date</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{order.eventDate}</div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
            <FinancialSplitBar
              grossAmountCents={order.grossAmountCents}
              licensorRoyaltyCents={Math.round((order.grossAmountCents * 8500) / 10000)}
              charityGiftCents={order.grossAmountCents - Math.round((order.grossAmountCents * 8500) / 10000)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
