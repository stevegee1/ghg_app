import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';

type EventCategory = 'SPORTS' | 'GALA' | 'TECH_SUMMIT' | 'WEDDING';
type LogoDropCount = 10 | 25 | 50 | 100 | 250 | 500;

const CATEGORY_META: Record<EventCategory, { label: string; description: string; bgClass: string }> = {
  SPORTS: {
    label: 'Sports',
    description: 'Marathons, football matches, tennis opens, athletics meets, golf invitationals & all sporting occasions.',
    bgClass: '#0369a1',
  },
  GALA: {
    label: 'Gala',
    description: 'Charity balls, award galas, black-tie dinners, fundraising soirees & formal celebrations.',
    bgClass: '#7c3aed',
  },
  TECH_SUMMIT: {
    label: 'Tech Summit',
    description: 'Developer conferences, AI symposiums, startup showcases, hackathons & corporate showcases.',
    bgClass: '#0891b2',
  },
  WEDDING: {
    label: 'Wedding',
    description: 'Sustainable weddings, eco-friendly luxury receptions, celebratory banquets & anniversary events.',
    bgClass: '#be185d',
  },
};

const DROP_COUNTS: LogoDropCount[] = [10, 25, 50, 100, 250, 500];
const UNIT_PRICE_GBP = 5.0; // £5.00 per logo drop unit

export const EventSouvenirPage: React.FC = () => {
  const navigate = useNavigate();

  // Step tracking
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Order fields
  const [eventCategory, setEventCategory] = useState<EventCategory>('SPORTS');
  const [eventName, setEventName] = useState<string>('');
  const [logoDropCount, setLogoDropCount] = useState<LogoDropCount>(50);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('United Kingdom');
  const [postalCode, setPostalCode] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  const grossCents = logoDropCount * UNIT_PRICE_GBP * 100;
  const licensorCents = Math.round((grossCents * 8500) / 10000);
  const charityCents = grossCents - licensorCents;

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createEventSouvenirOrder({
        customerEmail: customerEmail.trim(),
        customerName: customerName.trim() || undefined,
        eventCategory,
        eventName: eventName.trim(),
        logoDropCount,
        shippingAddress: { street, city, country, postalCode },
      });

      setSuccessOrder(res);

      // If Stripe session URL available, redirect immediately
      if (res.sessionUrl) {
        window.location.href = res.sessionUrl;
      } else {
        // Navigate to tracker page
        navigate(`/track/${res.orderNumber}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit event souvenir order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.5rem var(--page-px, 1.25rem) 4rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: 'var(--accent-light)', border: '1px solid rgba(2, 132, 199, 0.25)',
          padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-pill)',
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-sky)',
          letterSpacing: '0.04em', marginBottom: '0.75rem',
        }}>
          <span className="radar-pulse" />
          <span>EVENT SOUVENIR PROCUREMENT</span>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          Event Souvenir Logo Drops
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55, maxWidth: '750px', margin: '0 0 1.25rem 0' }}>
          Select an event category and required logo drop volume. Orders are processed with the certified GHG accountability mark and include statutory 15% ESG charitable routing.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/souvenirs" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.5rem 1.15rem' }}>
            Logo Drops (Active)
          </Link>
          <Link to="/merch" className="btn btn-secondary" style={{ fontSize: '0.8125rem', padding: '0.5rem 1.15rem', textDecoration: 'none' }}>
            Custom Merch Studio
          </Link>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)',
          color: 'var(--google-red)', padding: '0.875rem 1.25rem', borderRadius: '8px',
          marginBottom: '1.5rem', fontWeight: 500, fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Step Progress Indicator */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
        {(['1. Event Category', '2. Quantity & Delivery', '3. Review & Payment'] as const).map((label, i) => {
          const s = (i + 1) as 1 | 2 | 3;
          const active = step === s;
          const done = step > s;
          return (
            <div key={label} style={{
              flex: 1, padding: '0.7rem 0.5rem', textAlign: 'center',
              fontSize: '0.75rem', fontWeight: 600,
              backgroundColor: active ? 'var(--color-sky)' : done ? 'var(--color-green-light)' : 'var(--bg-subtle)',
              color: active ? '#fff' : done ? 'var(--color-green-dark)' : 'var(--text-muted)',
              borderRight: i < 2 ? '1px solid var(--border-light)' : 'none',
              transition: 'all 0.2s',
            }}>
              {done ? `${label.split('.')[0]}. Complete` : label}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleOrderSubmit}>
        {/* STEP 1: Event Category Selection */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
              1. Select event category
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {(Object.keys(CATEGORY_META) as EventCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                const selected = eventCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEventCategory(cat)}
                    style={{
                      padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                      border: selected ? `2px solid ${meta.bgClass}` : '1px solid var(--border-light)',
                      backgroundColor: selected ? `${meta.bgClass}18` : 'var(--bg-card)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                    }}
                  >
                    <div style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                      backgroundColor: meta.bgClass, color: '#fff',
                      fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em',
                      marginBottom: '0.75rem', textTransform: 'uppercase',
                    }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {meta.description}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                Event Name / Occasion *
              </label>
              <input
                type="text"
                required
                placeholder={`e.g. "${eventCategory === 'SPORTS' ? 'London Marathon 2026' : eventCategory === 'WEDDING' ? 'Sarah & Alex Wedding Celebration' : eventCategory === 'GALA' ? 'Annual Green Earth Gala 2026' : 'GreenTech AI Summit London 2026'}"`}
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="form-input"
              />
            </div>

            <button
              type="button"
              onClick={() => { if (!eventName.trim()) { setError('Please enter an event name.'); return; } setError(null); setStep(2); }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              Continue: Select Quantity
            </button>
          </div>
        )}

        {/* STEP 2: Quantity & Contact Details */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
              2. Quantity and delivery details
            </h2>

            {/* Drop Count Selector */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Logo drop volume (units)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {DROP_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setLogoDropCount(count)}
                    style={{
                      padding: '0.5rem 1.15rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                      fontSize: '0.875rem', border: logoDropCount === count ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                      backgroundColor: logoDropCount === count ? 'var(--accent-light)' : 'var(--bg-card)',
                      color: logoDropCount === count ? 'var(--color-sky)' : 'var(--text-main)',
                      transition: 'all 0.15s',
                      minWidth: '64px', minHeight: '38px',
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Unit price: £{UNIT_PRICE_GBP.toFixed(2)} • Order subtotal: <strong style={{ color: 'var(--text-main)' }}>£{(logoDropCount * UNIT_PRICE_GBP).toFixed(2)}</strong>
              </div>
            </div>

            {/* Live 85/15 Split Preview */}
            <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', padding: '1.25rem', border: '1px solid var(--border-light)', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{logoDropCount} units • {CATEGORY_META[eventCategory].label}</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-sky)', fontFamily: 'var(--font-mono)' }}>
                  £{(grossCents / 100).toFixed(2)}
                </span>
              </div>
              <FinancialSplitBar
                grossAmountCents={grossCents}
                licensorRoyaltyCents={licensorCents}
                charityGiftCents={charityCents}
              />
            </div>

            {/* Contact & Shipping */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>Email address for confirmation and tax invoice *</label>
                <input type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="form-input" placeholder="procurement@organization.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>Primary contact name</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="form-input" placeholder="Authorized Representative" />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>Delivery address *</label>
              <input type="text" required value={street} onChange={(e) => setStreet(e.target.value)} className="form-input" placeholder="Facility / Suite Address" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>City *</label>
                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="form-input" placeholder="London" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>Country *</label>
                <input type="text" required value={country} onChange={(e) => setCountry(e.target.value)} className="form-input" placeholder="United Kingdom" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>Postal code *</label>
                <input type="text" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="form-input" placeholder="SW1A 1AA" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: '1 1 120px' }}>
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!customerEmail.includes('@')) { setError('Please enter a valid email address.'); return; }
                  if (!street || !city || !postalCode) { setError('Please complete all shipping address fields.'); return; }
                  setError(null);
                  setStep(3);
                }}
                className="btn btn-primary"
                style={{ flex: '3 1 240px' }}
              >
                Continue to Review
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Pay */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
              3. Review order specification
            </h2>

            <div className="persefoni-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.87rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Event Category</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{CATEGORY_META[eventCategory].label}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Event Name</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{eventName}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Logo Drops</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{logoDropCount} units</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Receipt Email</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{customerEmail}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Shipping To</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', fontSize: '0.82rem' }}>{street}, {city}, {country} {postalCode}</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', padding: '1.25rem', border: '1px solid var(--border-light)' }}>
                <FinancialSplitBar
                  grossAmountCents={grossCents}
                  licensorRoyaltyCents={licensorCents}
                  charityGiftCents={charityCents}
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', borderRadius: '8px', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-green-dark)', fontWeight: 500, lineHeight: 1.5 }}>
              15% of this transaction is automatically routed to verified statutory environmental restoration funds. A formal GHG Tax Invoice will be generated and dispatched to {customerEmail}.
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setStep(2)} className="btn btn-secondary" style={{ flex: '1 1 120px' }}>
                Previous
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: '3 1 240px', padding: '0.8125rem 1.25rem',
                  backgroundColor: '#635BFF', color: '#ffffff', fontWeight: 600,
                  fontSize: '0.875rem', borderRadius: '8px', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(99, 91, 255, 0.25)', transition: 'opacity 0.2s',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Processing...' : `Pay £${(grossCents / 100).toFixed(2)} via Stripe Checkout`}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
