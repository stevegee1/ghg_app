import React, { forwardRef, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { MerchProduct } from '../../api/merch.types';
import { formatPence } from './useMerchProducts';
import { MerchPartnerLinks } from './MerchPartnerLinks';

interface Props {
  product: MerchProduct;
  charityShare: string | null;
  /** Changes on every selection so the card can draw attention to itself. */
  selectionKey: number;
}

const CharityNote: React.FC<{ charityShare: string | null }> = ({ charityShare }) => (
  <p className="merch-note">
    {charityShare ? `${charityShare}% of this purchase goes to our charity partners.` : 'A share of this purchase goes to our charity partners.'}
  </p>
);

const CheckoutCard: React.FC<{ product: MerchProduct; charityShare: string | null }> = ({ product, charityShare }) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = (product.pricePence as number) * quantity;

  const pay = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await api.createCheckoutSession({ productId: product.id, quantity });
      if (!session?.sessionUrl) throw new Error('Checkout is unavailable right now. Please try again later.');
      window.location.href = session.sessionUrl;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="merch-order-section">
      <div className="merch-qty">
        <span id="merch-qty-label">Quantity</span>
        <div className="merch-qty-control" role="group" aria-labelledby="merch-qty-label">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="One fewer">
            -
          </button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setQuantity((q) => q + 1)} aria-label="One more">
            +
          </button>
        </div>
      </div>
      <div className="merch-total">
        <span>Total</span>
        <strong>{formatPence(total, product.currency)}</strong>
      </div>
      {error && (
        <p className="merch-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-primary merch-block-btn" onClick={pay} disabled={loading}>
        {loading ? 'Opening Stripe...' : `Pay ${formatPence(total, product.currency)}`}
      </button>
      <p className="merch-note">Secure payment by Stripe: card, Apple Pay or Google Pay. Delivery details are taken at checkout.</p>
      <CharityNote charityShare={charityShare} />
    </div>
  );
};

/** Contact-for-order form. `details` (for example a Frenzy Studio design) is sent with the message as it is when submitted. */
export const EnquiryCard: React.FC<{ product: MerchProduct; details?: string }> = ({ product, details }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return setError('Enter your name and email address.');
    setLoading(true);
    setError(null);
    try {
      await api.submitMerchEnquiry({
        itemId: product.id,
        itemTitle: product.title,
        contactName: name.trim(),
        contactEmail: email.trim(),
        message: [details, message.trim()].filter(Boolean).join('\n\n') || undefined,
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="merch-order-section merch-success" role="status">
        <strong>Enquiry sent</strong>
        <p>We will reply to {email.trim()} within 1 to 2 business days with a price and delivery time.</p>
        <button type="button" className="btn btn-secondary" onClick={() => setSent(false)}>
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form className="merch-order-section merch-form" onSubmit={submit} noValidate>
      <p className="merch-note">This item is made to order. Tell us how many you need and we will send a price.</p>
      <label className="merch-field">
        <span>Your name</span>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      </label>
      <label className="merch-field">
        <span>Email address</span>
        <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="merch-field">
        <span>Quantity, sizes or other details (optional)</span>
        <textarea className="form-input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {error && (
        <p className="merch-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary merch-block-btn" disabled={loading}>
        {loading ? 'Sending...' : 'Send enquiry'}
      </button>
    </form>
  );
};

/** The order card for the selected item: Stripe checkout when it has a price, otherwise an enquiry form. */
export const MerchOrderPanel = forwardRef<HTMLHeadingElement, Props>(({ product, charityShare, selectionKey }, headingRef) => {
  const priced = product.pricePence !== null;
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (selectionKey === 0) return;
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 900);
    return () => window.clearTimeout(timer);
  }, [selectionKey]);

  return (
    <aside className={`merch-order${flash ? ' is-flash' : ''}`} aria-labelledby="merch-order-title">
      <h2 id="merch-order-title" className="merch-order-title" ref={headingRef} tabIndex={-1}>
        {priced ? 'Your order' : 'Ask for a price'}
      </h2>
      <div className="merch-order-item">
        {product.imageUrl && (
          <img src={product.imageUrl} alt="" style={product.imagePosition ? { objectPosition: product.imagePosition } : undefined} />
        )}
        <div>
          <p className="merch-order-item-title">{product.title}</p>
          <p className="merch-order-item-price">{priced ? formatPence(product.pricePence as number, product.currency) : 'Price on request'}</p>
        </div>
      </div>
      {priced ? (
        <CheckoutCard key={product.id} product={product} charityShare={charityShare} />
      ) : (
        <EnquiryCard key={product.id} product={product} />
      )}
      <MerchPartnerLinks />
    </aside>
  );
});
MerchOrderPanel.displayName = 'MerchOrderPanel';
