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
    icon: '🛍️',
  },
  {
    id: 'item_ceramic_mug',
    title: 'Custom Printed Ceramic Souvenir Mug',
    priceCents: 300, // £3.00
    description: 'Matte finish ceramic mug with custom event text and GHG verified logo drop',
    icon: '☕',
  },
  {
    id: 'item_tshirt',
    title: 'Organic Cotton Event T-Shirt',
    priceCents: 800, // £8.00
    description: 'Soft organic cotton apparel with custom front artwork & GHG logo mark on sleeve',
    icon: '👕',
  },
  {
    id: 'item_gift_box',
    title: 'Premium Wooden Souvenir Gift Box',
    priceCents: 1200, // £12.00
    description: 'Sustainably sourced bamboo gift box engraved with GHG verified logo drop',
    icon: '🎁',
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
      const order = await api.createSouvenirOrder({
        eventName,
        eventType,
        eventDate,
        itemTitle: selectedItem.title,
        quantity,
        pricePerItemCents: selectedItem.priceCents,
      });

      setSuccessOrder(order);
    } catch (err: any) {
      setError(err.message || 'Failed to submit souvenir order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Personal & Event Physical Souvenir Logo Drops</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Order custom physical logo drops for weddings, galas, birthdays, or souvenirs. We handle production & dropshipping before your event deadline.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {successOrder ? (
        <div className="card">
          <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              🎉 Event Souvenir Order Confirmed & Production Scheduled!
            </div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Order Reference ID: <code>{successOrder.orderId}</code> | Tracking: <code>{successOrder.trackingNumber}</code>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Event Details</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{successOrder.eventName}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {successOrder.eventType} • Event Date: {successOrder.eventDate}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Souvenir Order</div>
              <div style={{ fontWeight: 700 }}>{successOrder.quantity}× {successOrder.itemTitle}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                Total Paid: £{(successOrder.grossAmountCents / 100).toFixed(2)} via Stripe
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Charity Allocation Split from Order
            </h3>
            <FinancialSplitBar
              grossAmountCents={successOrder.grossAmountCents}
              licensorRoyaltyCents={royaltyCents}
              charityGiftCents={charityCents}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link
              to={`/public-tracker?orderId=${successOrder.orderId}`}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Monitor Dropshipping Tracker 🚚
            </Link>
            <button
              onClick={() => setSuccessOrder(null)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Place Another Order
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleOrderSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left Column: Event Form */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">1. Event & Deadline Details</h2>
                <p className="card-subtitle">Anyone can order — weddings, galas, birthdays, custom merch</p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="eventName">Event Name / Occasion</label>
                <input
                  id="eventName"
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Sarah & Alex Wedding"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="eventType">Occasion Category</label>
                <select
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="form-select"
                >
                  <option value="Wedding Souvenirs">Wedding Souvenirs</option>
                  <option value="Birthday Celebration">Birthday Celebration</option>
                  <option value="Corporate Gala Merch">Corporate Gala Merch</option>
                  <option value="Community Eco-Gathering">Community Eco-Gathering</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="eventDate">Event Date (Fulfillment Deadline)</label>
                <input
                  id="eventDate"
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="form-input"
                />
                <div className="form-help">
                  Production & dropshipping guaranteed before your target event date.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="shipping">Shipping Address</label>
                <textarea
                  id="shipping"
                  rows={2}
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.8125rem' }}
                />
              </div>
            </div>

            {/* Right Column: Souvenir Item Selector & Stripe Payment */}
            <div>
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">2. Select Souvenir & Quantity</h2>
                  <p className="card-subtitle">Custom printed physical items with verified GHG logo drop</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Souvenir Item Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {SOUVENIR_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="btn btn-secondary"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '0.625rem',
                          textAlign: 'left',
                          borderColor: selectedItem.id === item.id ? 'var(--accent-primary)' : 'var(--border-medium)',
                          backgroundColor: selectedItem.id === item.id ? 'var(--accent-light)' : 'var(--bg-card)',
                        }}
                      >
                        <div style={{ fontSize: '1.25rem' }}>{item.icon}</div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginTop: '0.25rem' }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          £{(item.priceCents / 100).toFixed(2)} / item
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Order Quantity</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="number"
                      min="10"
                      max="5000"
                      step="10"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="form-input"
                      style={{ width: '120px' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      items × £{(selectedItem.priceCents / 100).toFixed(2)}
                    </span>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.125rem' }}>
                      <span>Total Price:</span>
                      <span>£{(grossCents / 100).toFixed(2)}</span>
                    </div>
                    <FinancialSplitBar
                      grossAmountCents={grossCents}
                      licensorRoyaltyCents={royaltyCents}
                      charityGiftCents={charityCents}
                    />
                  </div>
                </div>
              </div>

              {/* Stripe Payment Settlement */}
              <div className="card">
                <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                  <h2 className="card-title">3. Secure Order via Stripe</h2>
                  <p className="card-subtitle">Pay to secure dropshipping request</p>
                </div>

                <div className="form-group">
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
                  {loading ? 'Securing Order via Stripe...' : `Pay £${(grossCents / 100).toFixed(2)} & Secure Request`}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
