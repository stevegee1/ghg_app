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
}

const MERCH_CATALOG: MerchItem[] = [
  {
    id: 'item_ghg_sweatshirt',
    title: 'GHG Logo Drop Heavyweight Sweatshirt',
    licenseeId: 'lic_ghg_official',
    partnerName: 'GHG Logo Drop Official Store',
    priceCents: 4500, // £45.00
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
    category: 'Official Company Apparel',
    description: '400gsm organic cotton crewneck sweatshirt with embroidered official GHG verified logo drop mark on chest.',
  },
  {
    id: 'item_ghg_cap',
    title: 'GHG Logo Drop Official Embroidered Cap',
    licenseeId: 'lic_ghg_official',
    partnerName: 'GHG Logo Drop Official Store',
    priceCents: 2000, // £20.00
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80',
    category: 'Official Accessories',
    description: 'Adjustable 6-panel cotton twill cap featuring high-density embroidered GHG lightning accountability logo mark.',
  },
  {
    id: 'item_ghg_tshirt',
    title: 'GHG Logo Drop Organic Cotton T-Shirt',
    priceCents: 2500, // £25.00
    licenseeId: 'lic_ghg_official',
    partnerName: 'GHG Logo Drop Official Store',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    category: 'Official Company Apparel',
    description: '100% GOTS certified organic ring-spun cotton tee with printed GHG verified logo drop mark.',
  },
  {
    id: 'item_ghg_bottle',
    title: 'GHG Logo Drop Eco Stainless Water Bottle',
    licenseeId: 'lic_ghg_official',
    partnerName: 'GHG Logo Drop Official Store',
    priceCents: 1800, // £18.00
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
    category: 'Eco Merchandise',
    description: 'Double-wall vacuum insulated stainless steel water bottle laser-etched with official GHG verified mark.',
  },
];

export const MerchStorePage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<MerchItem>(MERCH_CATALOG[0]);
  const [optInMark, setOptInMark] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optInMark) {
      alert('Please check the GHG Accountability Mark opt-in box to proceed.');
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
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Official GHG Logo Drop Company Merchandise</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Purchase official internal company caps, sweatshirts, hoodies, and eco gear printed with our verified GHG Accountability Mark.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Catalog Grid */}
        <div>
          <div className="merch-grid">
            {MERCH_CATALOG.map((item) => (
              <div
                key={item.id}
                className="merch-card"
                style={{
                  borderColor: selectedItem.id === item.id ? 'var(--accent-primary)' : 'var(--border-light)',
                  boxShadow: selectedItem.id === item.id ? '0 0 0 2px var(--accent-primary)' : 'none',
                }}
              >
                <div className="merch-image-placeholder">
                  <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    ⚡ Printed GHG Logo Mark
                  </div>
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {item.category}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.25rem 0 0.25rem 0' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>£{(item.priceCents / 100).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setSuccessResult(null);
                      }}
                      className={selectedItem.id === item.id ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                    >
                      {selectedItem.id === item.id ? 'Selected' : 'Select Item'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Checkout Panel */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Order Summary & Stripe Payment</h2>
            <p className="card-subtitle">Complete purchase for selected company merch</p>
          </div>

          {successResult ? (
            <div>
              <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700 }}>Order Placed & Payment Settled!</div>
                <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  Transaction ID: <code>{successResult.transactionId}</code>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.875rem' }}>Status:</span>
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
              <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700 }}>{selectedItem.title}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedItem.partnerName}</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem' }}>
                  £{(selectedItem.priceCents / 100).toFixed(2)}
                </div>
              </div>

              <div className="form-group" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #99f6e4', padding: '0.875rem', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={optInMark}
                    onChange={(e) => setOptInMark(e.target.checked)}
                    style={{ marginTop: '0.1rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Includes Printed GHG Logo Mark</div>
                    <div style={{ color: 'var(--text-main)', marginTop: '0.15rem' }}>
                      15% of purchase price is automatically routed to verified environmental charity partners.
                    </div>
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Information (Stripe Test Mode)</label>
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
                disabled={loading || !optInMark}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {loading ? 'Processing...' : `Pay £${(selectedItem.priceCents / 100).toFixed(2)}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
