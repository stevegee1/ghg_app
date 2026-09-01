import React, { useState } from 'react';
import { api } from '../api/client';
import { FinancialSplitBar } from '../components/FinancialSplitBar';
import { OpenSeaBadge } from '../components/OpenSeaBadge';
import { StatusBadge } from '../components/StatusBadge';

interface MerchItem {
  id: string;
  title: string;
  licenseeId: string;
  partnerName: string;
  priceCents: number;
  imageUrl: string;
  category: string;
  description: string;
  objectPosition?: string;
}

const MERCH_CATALOG: MerchItem[] = [
  {
    id: 'item_nfty_cap',
    title: 'NFTY LOGS® Vagaries of GHG Emissions Embroidered Cap',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 2500, // £25.00
    imageUrl: '/images/merch/804c16c8-6d00-4596-b456-dfe607b635b7.jpeg',
    category: 'Official Headwear',
    description: 'Black structured cotton cap with high-density embroidered multi-color NFTY LOGS® Vagaries of GHG Emissions accountability badge.',
    objectPosition: 'center 0%',
  },
  {
    id: 'item_nfty_volcano_hoodie',
    title: 'NFTY LOGS® "Vibing The Vagaries" Heavyweight Hoodie',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 6500, // £65.00
    imageUrl: '/images/merch/a014f871-4e03-4f3d-a056-47f3f3dbe729.jpeg',
    category: 'Graphic Art Hoodies',
    description: 'Heavyweight black pullover hoodie with embroidered "Re-awakened Volcanoes, Melting Glaciers" chest artwork and dual GHG logo drops.',
    objectPosition: 'center 20%',
  },
  {
    id: 'item_nfty_tech_fleece',
    title: 'NFTY LOGS® Tech Fleece Full-Zip Performance Hoodie',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 7500, // £75.00
    imageUrl: '/images/merch/09acb896-19df-488f-9a9b-ac1241c6dc97.jpeg',
    category: 'Performance Apparel',
    description: 'Charcoal tech fleece full-zip hoodie with zippered sleeve utility pocket, tailored seamlines, and embroidered GHG accountability badges.',
    objectPosition: 'center 25%',
  },
  {
    id: 'item_nfty_arsenal_hoodie',
    title: 'NFTY LOGS® Arsenal FC Milestone Match Commemorative Hoodie',
    licenseeId: 'lic_arsenal_fc',
    partnerName: 'Arsenal FC Merchandise',
    priceCents: 8000, // £80.00
    imageUrl: '/images/merch/fa1c261d-9fd9-4cb7-a5c3-a4425c641db7.jpeg',
    category: 'Special Edition Sports',
    description: 'Commemorative dark fleece hoodie celebrating the 2025 West Ham derby milestone with embroidered match narrative and official GHG badge.',
    objectPosition: 'center 25%',
  },
  {
    id: 'item_nfty_puffer_jacket',
    title: 'NFTY LOGS® Heavyweight Insulated Puffer Jacket',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 9500, // £95.00
    imageUrl: '/images/merch/5df490db-a560-4754-924d-9a27581f0c23.jpeg',
    category: 'Premium Winterwear',
    description: 'High-loft quilted puffer jacket with full-length storm zip, insulated hood, and embroidered NFTY LOGS® Greenhouse Gas accountability mark.',
    objectPosition: 'center 20%',
  },
  {
    id: 'item_nfty_softshell_vest',
    title: 'NFTY LOGS® Web3 Provenance Embroidered Softshell Vest',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 5500, // £55.00
    imageUrl: '/images/merch/ca6c871a-d643-4695-a605-9a357fb26ae3.jpeg',
    category: 'Official Outerwear',
    description: 'Sleeveless softshell vest embroidered with direct blockchain collectibles search paths for OpenSea, Rarible, and NFTY LOGS Labs.',
    objectPosition: 'center 25%',
  },
  {
    id: 'item_nfty_softshell_vest_back',
    title: 'NFTY LOGS® Disaster Relief Charity Edition Softshell Vest',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 5500, // £55.00
    imageUrl: '/images/merch/3bf3f794-fcb4-412a-a556-b3289bbebd39.jpeg',
    category: 'Official Outerwear',
    description: 'Embroidered with worldwide extreme weather survivor succour donation mandate and "While..." prompt blockchain collectibles statement.',
    objectPosition: 'center 25%',
  },
  {
    id: 'item_nfty_joggers',
    title: 'NFTY LOGS® Premium Embroidered Fleece Joggers',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 4500, // £45.00
    imageUrl: '/images/merch/66e17346-415e-4f20-9c86-3aa5c4587af6.jpeg',
    category: 'Loungewear & Bottoms',
    description: 'Organic heavyweight French terry fleece sweatpants with embroidered NFTY LOGS® Vagaries of Greenhouse Gases [GHGs] thigh badge.',
    objectPosition: 'center 15%',
  },
  {
    id: 'item_nfty_puffer_sleeve',
    title: 'NFTY LOGS® Arm-Badge Puffer Jacket (Sleeve Detail Edition)',
    licenseeId: 'lic_ghg_official',
    partnerName: 'NFTY LOGS® Official Store',
    priceCents: 9500, // £95.00
    imageUrl: '/images/merch/82ccfad7-9e7b-4882-990d-f9805bc52a22.jpeg',
    category: 'Premium Winterwear',
    description: 'Close-up sleeve edition showcasing the intricate multi-thread embroidery of the official NFTY LOGS® Vagaries of Greenhouse Gases mark.',
    objectPosition: 'center center',
  },
];

export const MerchStorePage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<MerchItem>(MERCH_CATALOG[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lightboxImage, setLightboxImage] = useState<MerchItem | null>(null);
  const [optInMark, setOptInMark] = useState<boolean>(true);
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const categories = ['All', ...Array.from(new Set(MERCH_CATALOG.map((i) => i.category)))];
  const filteredItems = selectedCategory === 'All'
    ? MERCH_CATALOG
    : MERCH_CATALOG.filter((i) => i.category === selectedCategory);

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

  const handleStripeHostedCheckout = async () => {
    if (!optInMark) {
      setError('Please check the GHG Accountability Mark opt-in box to proceed.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await api.createCheckoutSession({
        licenseeId: selectedItem.licenseeId,
        itemTitle: selectedItem.title,
        grossAmountCents: selectedItem.priceCents,
        currency: 'GBP',
      });
      if (session?.sessionUrl) {
        window.location.href = session.sessionUrl;
      } else {
        const result = await api.checkout({
          licenseeId: selectedItem.licenseeId,
          grossAmountCents: selectedItem.priceCents,
          checkoutReferenceId: `ref_merch_${Date.now()}`,
        });
        setSuccessResult(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Stripe checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optInMark) {
      setError('Please check the GHG Accountability Mark opt-in box to proceed.');
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
        licenseeId: selectedItem.licenseeId,
        grossAmountCents: selectedItem.priceCents,
        checkoutReferenceId: `ref_merch_${Date.now()}`,
      });
      setSuccessResult(result);
    } catch (err: any) {
      setError(err.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 0 4rem 0' }}>
      
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
          <span>VERIFIED MILESTONE KEEPSAKE STUDIO & ECO APPAREL</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.85rem, 3.8vw, 2.5rem)', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.75rem 0', letterSpacing: '-0.03em' }}>
          Custom Keepsake Studio & Official Merch
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '750px', margin: 0 }}>
          Authentic heavyweight organic apparel embroidered with verified GHG accountability marks, embedded ISO 14067 LCA carbon tags, and automated 15% ESG charitable routing.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--google-red)', color: 'var(--google-red)', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: selectedCategory === cat ? '1px solid var(--color-sky)' : '1px solid var(--border-light)',
              backgroundColor: selectedCategory === cat ? 'var(--accent-light)' : 'var(--bg-card)',
              color: selectedCategory === cat ? 'var(--color-sky)' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Full Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setLightboxImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '720px',
              width: '100%',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'relative', height: '480px', backgroundColor: '#020617' }}>
              <img
                src={lightboxImage.imageUrl}
                alt={lightboxImage.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-sky)', fontWeight: 800, textTransform: 'uppercase' }}>
                {lightboxImage.category}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.25rem 0' }}>{lightboxImage.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{lightboxImage.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Store Layout */}
      <div className="store-layout-grid">
        
        {/* Left Column: Product Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="persefoni-card"
              style={{
                border: selectedItem.id === item.id ? '2px solid var(--color-sky)' : '1px solid var(--border-light)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{ position: 'relative', height: '240px', backgroundColor: 'var(--bg-subtle)', cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => setLightboxImage(item)}
                title="Click to zoom image"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: item.objectPosition || 'center center',
                    transition: 'transform 0.3s ease',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  Embroidered Mark
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#94a3b8',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                  }}
                >
                  🔍 Zoom
                </div>
              </div>

              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {item.category}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.35rem 0' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.45 }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    £{(item.priceCents / 100).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      setSuccessResult(null);
                    }}
                    className={selectedItem.id === item.id ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', minHeight: '38px' }}
                  >
                    {selectedItem.id === item.id ? 'Selected ✓' : 'Select Item'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Checkout Panel */}
        <div className="persefoni-card" style={{ padding: '1.75rem', position: 'sticky', top: '100px' }}>
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
              Order & ESG Routing
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Complete purchase with automated 15% charity split
            </p>
          </div>

          {successResult ? (
            <div>
              <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 800, color: 'var(--color-green-dark)', fontSize: '1rem' }}>Order Placed & Payment Settled!</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                  Transaction: <code>{successResult.transactionId}</code>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
                <StatusBadge status="SETTLED" />
              </div>

              <div style={{ margin: '1rem 0' }}>
                <OpenSeaBadge transactionId={successResult.transactionId} licenseeId={selectedItem.licenseeId} />
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '1rem' }}>
                <FinancialSplitBar
                  grossAmountCents={successResult.grossAmountCents}
                  licensorRoyaltyCents={successResult.licensorRoyaltyCents}
                  charityGiftCents={successResult.charityGiftCents}
                />
              </div>

              <button
                onClick={() => setSuccessResult(null)}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '1.25rem' }}
              >
                Purchase Another Item
              </button>
            </div>
          ) : (
            <form onSubmit={handleCheckout}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{selectedItem.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedItem.partnerName}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-sky)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                  £{(selectedItem.priceCents / 100).toFixed(2)}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-green-light)', border: '1px solid var(--color-green)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', gap: '0.65rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <input
                    type="checkbox"
                    checked={optInMark}
                    onChange={(e) => setOptInMark(e.target.checked)}
                    style={{ marginTop: '0.15rem', accentColor: 'var(--color-green)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--color-green-dark)' }}>Verified GHG Accountability Mark</div>
                    <div style={{ color: 'var(--text-main)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                      Exact 15% of purchase is automatically routed to verified local environmental restoration funds.
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Payment Details
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    🔒 256-Bit SSL Encrypted
                  </span>
                </div>

                <div style={{ marginBottom: '0.65rem' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
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

              {/* Stripe Hosted Checkout (Primary Instant Option) */}
              <button
                type="button"
                onClick={handleStripeHostedCheckout}
                disabled={loading || !optInMark}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  backgroundColor: '#635BFF',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  transition: 'opacity 0.2s',
                  boxShadow: '0 4px 12px rgba(99, 91, 255, 0.25)',
                }}
              >
                <span>💳 Pay with Stripe</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>(Cards, Apple Pay, Google Pay)</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR PAY DIRECTLY</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
              </div>

              <button
                type="submit"
                disabled={loading || !optInMark}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                {loading ? 'Processing...' : `Pay £${(selectedItem.priceCents / 100).toFixed(2)} with Encrypted Card →`}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};
