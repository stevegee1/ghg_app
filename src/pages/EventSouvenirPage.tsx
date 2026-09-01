import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';

interface SouvenirCatalogItem {
  id: string;
  title: string;
  priceCents: number;
  description: string;
  icon: string;
}

const SOUVENIR_ITEMS: SouvenirCatalogItem[] = [
  {
    id: 'item_tote_bag',
    title: 'Eco Organic Cotton Tote Bag',
    priceCents: 250, // £2.50
    description: '100% GOTS certified organic cotton with printed GHG verified logo drop mark',
    icon: '👜 ORGANIC TOTE',
  },
  {
    id: 'item_ceramic_mug',
    title: 'Custom Printed Ceramic Souvenir Mug',
    priceCents: 300, // £3.00
    description: 'Matte finish ceramic mug with custom event text and GHG verified logo drop',
    icon: '☕ CERAMIC MUG',
  },
  {
    id: 'item_tshirt',
    title: 'Organic Cotton Event T-Shirt',
    priceCents: 800, // £8.00
    description: 'Soft organic cotton apparel with custom front artwork & GHG logo mark on sleeve',
    icon: '👕 COTTON SHIRT',
  },
  {
    id: 'item_gift_box',
    title: 'Premium Wooden Souvenir Gift Box',
    priceCents: 1200, // £12.00
    description: 'Sustainably sourced bamboo gift box engraved with GHG verified logo drop',
    icon: '📦 BAMBOO BOX',
  },
];

export const EventSouvenirPage: React.FC = () => {
  const [eventName, setEventName] = useState<string>('Sarah & Alex Wedding Celebration');
  const [eventType, setEventType] = useState<string>('Wedding Souvenirs');
  const [eventDate, setEventDate] = useState<string>('2026-09-15');
  const [selectedItem, setSelectedItem] = useState<SouvenirCatalogItem>(SOUVENIR_ITEMS[0]);
  const [quantity, setQuantity] = useState<number>(150);
  const [shippingAddress, setShippingAddress] = useState<string>('124 Kensington High Street, London W8 7RG, UK');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  const grossCents = quantity * selectedItem.priceCents;
  const royaltyCents = Math.round((grossCents * 8500) / 10000);
  const charityCents = grossCents - royaltyCents;

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createEventSouvenirOrder({
        eventName,
        eventType,
        eventDate,
        itemId: selectedItem.id,
        quantity,
        shippingAddress,
      });
      setSuccessOrder(res);
    } catch (err: any) {
      setError(err.message || 'Failed to submit event souvenir order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.5rem 0 4rem 0' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
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
          <span>EVENT DROPS & CELEBRATORY SOUVENIRS</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.85rem, 3.8vw, 2.5rem)', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.75rem 0', letterSpacing: '-0.03em' }}>
          Custom Event Keepsakes & Souvenir Ordering
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '750px', margin: '0 0 1.5rem 0' }}>
          Celebrate weddings, birthdays, sports tournaments, and corporate milestones with custom-printed eco souvenirs carrying the verified GHG Accountability Mark and automatic 15% ESG charitable routing.
        </p>

        {/* Quick Switcher between Souvenirs & Merch Store */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/souvenirs"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
          >
            Custom Event Keepsakes (Active)
          </Link>
          <Link
            to="/merch"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem', textDecoration: 'none' }}
          >
            Official Merchandise & Jackets Studio →
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {successOrder ? (
        <div className="persefoni-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-green-light)', color: 'var(--color-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', fontSize: '1.75rem' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
            Event Souvenir Order Confirmed!
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Order Reference: <code style={{ fontWeight: 700, color: 'var(--color-sky)', backgroundColor: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '4px' }}>{successOrder.orderId}</code>
          </p>

          <div style={{ maxWidth: '580px', margin: '0 auto 2rem auto', textAlign: 'left', backgroundColor: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div className="form-grid-2col" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Event:</span> <strong>{successOrder.eventName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong>{successOrder.eventDate}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Item:</span> <strong>{selectedItem.title}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Quantity:</span> <strong>{quantity} units</strong>
              </div>
            </div>

            <FinancialSplitBar
              grossAmountCents={successOrder.grossAmountCents}
              licensorRoyaltyCents={successOrder.licensorRoyaltyCents}
              charityGiftCents={successOrder.charityGiftCents}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSuccessOrder(null)}
              className="btn btn-secondary"
            >
              Order More Souvenirs
            </button>
            <Link to="/public-tracker" className="btn btn-primary">
              <span>Track Drop on Ledger →</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleOrderSubmit}>
          {/* 1. Item Selection Grid */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem' }}>
              1. Choose Your Eco Souvenir Product
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {SOUVENIR_ITEMS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="persefoni-card"
                  style={{
                    padding: '1.5rem',
                    cursor: 'pointer',
                    border: selectedItem.id === item.id ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                    backgroundColor: selectedItem.id === item.id ? 'var(--accent-light)' : 'var(--bg-card)',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-sky)', marginBottom: '0.5rem' }}>
                    {item.icon}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.45 }}>
                    {item.description}
                  </p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    £{(item.priceCents / 100).toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ unit</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Event Details & Logistics Card */}
          <div className="persefoni-card" style={{ padding: 'clamp(1.5rem, 3.5vw, 2.5rem)', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.5rem' }}>
              2. Event Inscription & Delivery Details
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Event Name / Inscription</label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Event Category</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="form-input"
                >
                  <option value="Wedding Souvenirs">Wedding Celebration</option>
                  <option value="Sports Tournament">Sports Tournament / Match Day</option>
                  <option value="Corporate CleanTech Milestone">Corporate CleanTech Milestone</option>
                  <option value="Birthday Celebration">Milestone Birthday Celebration</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Event Date</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Order Quantity (Units)</label>
                <input
                  type="number"
                  required
                  min={10}
                  step={10}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(10, parseInt(e.target.value) || 10))}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>Shipping Destination Address</label>
              <textarea
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="form-input"
                rows={2}
              />
            </div>

            {/* Financial Summary & Split */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-light)', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Total Order Value ({quantity} units):</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>
                  £{(grossCents / 100).toFixed(2)}
                </span>
              </div>

              <FinancialSplitBar
                grossAmountCents={grossCents}
                licensorRoyaltyCents={royaltyCents}
                charityGiftCents={charityCents}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Processing Souvenir Order...' : `Place Custom Event Order (£${(grossCents / 100).toFixed(2)}) →`}
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
