import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminMerchProduct, MerchProductKind } from '../../api/merch.types';
import { formatPence } from '../merch/useMerchProducts';
import { LogoDropPricesAdmin } from './LogoDropPricesAdmin';

const KIND_LABELS: Record<MerchProductKind, string> = {
  CATALOGUE: 'Shop items (Merch page)',
  CUSTOM_GARMENT: 'Frenzy Studio garments',
  EVENT_SOUVENIR: 'Event souvenirs',
};

const PHOTO_ACCEPT = '.png,.jpg,.jpeg,.webp';

/** Turns a pounds field into whole pence. */
function parsePounds(text: string): { pence: number } | { error: string } {
  const trimmed = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { error: 'Enter a price like 35 or 35.00, or choose contact for order.' };
  const pence = Math.round(Number(trimmed) * 100);
  if (pence <= 0) return { error: 'The price must be more than zero.' };
  return { pence };
}

const poundsText = (pence: number | null) => (pence === null ? '' : (pence / 100).toFixed(2));

/** Fixed price or contact for order: the two ways a product can be sold. */
const PriceFields: React.FC<{
  idPrefix: string;
  currency: string;
  contactForOrder: boolean;
  setContactForOrder: (v: boolean) => void;
  price: string;
  setPrice: (v: string) => void;
}> = ({ idPrefix, currency, contactForOrder, setContactForOrder, price, setPrice }) => (
  <fieldset className="merch-admin-pricing">
    <legend>How it is sold</legend>
    <label className="merch-admin-check">
      <input type="radio" name={`${idPrefix}-pricing`} checked={!contactForOrder} onChange={() => setContactForOrder(false)} />
      <span>Fixed price, paid by card</span>
    </label>
    {!contactForOrder && (
      <label className="merch-admin-field">
        <span>Price ({currency})</span>
        <input inputMode="decimal" value={price} placeholder="25.00" onChange={(e) => setPrice(e.target.value)} />
      </label>
    )}
    <label className="merch-admin-check">
      <input type="radio" name={`${idPrefix}-pricing`} checked={contactForOrder} onChange={() => setContactForOrder(true)} />
      <span>Contact for order (customers send an enquiry)</span>
    </label>
  </fieldset>
);

const AddProductForm: React.FC<{ token: string; onAdded: (p: AdminMerchProduct) => void }> = ({ token, onAdded }) => {
  const [kind, setKind] = useState<'CATALOGUE' | 'CUSTOM_GARMENT'>('CATALOGUE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [contactForOrder, setContactForOrder] = useState(false);
  const [price, setPrice] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [onSale, setOnSale] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setContactForOrder(false);
    setPrice('');
    setPhoto(null);
    setOnSale(true);
    setFormKey((k) => k + 1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setMessage({ tone: 'error', text: 'Give the product a name.' });
    let pricePence: number | null = null;
    if (!contactForOrder) {
      const parsed = parsePounds(price);
      if ('error' in parsed) return setMessage({ tone: 'error', text: parsed.error });
      pricePence = parsed.pence;
    }
    if (kind === 'CATALOGUE' && !photo) return setMessage({ tone: 'error', text: 'Shop items need a photo: the Merch page only shows items with one.' });
    setSaving(true);
    setMessage(null);
    try {
      // Created off sale, so it only appears once its photo is in place.
      let { product } = await api.createMerchProduct(token, {
        kind,
        title: title.trim(),
        description: description.trim() || null,
        category: kind === 'CATALOGUE' ? category.trim() || null : null,
        pricePence,
        active: false,
      });
      if (photo) ({ product } = await api.uploadMerchProductImage(token, product.id, photo));
      if (onSale) ({ product } = await api.updateMerchProduct(token, product.id, { active: true }));
      onAdded(product);
      reset();
      setMessage({
        tone: 'ok',
        text: onSale
          ? `${product.title} is live on the ${kind === 'CATALOGUE' ? 'Merch page' : 'Frenzy Studio page'}.`
          : `${product.title} was added off sale. Tick "On sale" below when it is ready.`,
      });
    } catch (err) {
      setMessage({ tone: 'error', text: `${(err as Error).message} If the product was created, finish it in the list below.` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="fleet-panel merch-admin-add" onSubmit={submit} noValidate>
      <h3 className="fleet-panel-title">Add a product</h3>
      <fieldset className="merch-admin-pricing">
        <legend>Where it appears</legend>
        <label className="merch-admin-check">
          <input type="radio" name="new-kind" checked={kind === 'CATALOGUE'} onChange={() => setKind('CATALOGUE')} />
          <span>Merch page (ready-made item)</span>
        </label>
        <label className="merch-admin-check">
          <input type="radio" name="new-kind" checked={kind === 'CUSTOM_GARMENT'} onChange={() => setKind('CUSTOM_GARMENT')} />
          <span>Frenzy Studio (garment customers personalise)</span>
        </label>
      </fieldset>
      <div className="merch-admin-add-grid">
        <label className="merch-admin-field">
          <span>Name</span>
          <input value={title} maxLength={200} placeholder="Team T-shirt" onChange={(e) => setTitle(e.target.value)} />
        </label>
        {kind === 'CATALOGUE' && (
          <label className="merch-admin-field">
            <span>Category (optional)</span>
            <input value={category} maxLength={80} placeholder="T-shirts" onChange={(e) => setCategory(e.target.value)} />
          </label>
        )}
        <label className="merch-admin-field merch-admin-wide">
          <span>Description (optional)</span>
          <textarea rows={2} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      <PriceFields
        idPrefix="new"
        currency="GBP"
        contactForOrder={contactForOrder}
        setContactForOrder={setContactForOrder}
        price={price}
        setPrice={setPrice}
      />
      <label className="merch-admin-field">
        <span>Photo (PNG, JPG or WEBP, up to 8 MB){kind === 'CATALOGUE' ? '' : ', optional'}</span>
        <input key={formKey} type="file" accept={PHOTO_ACCEPT} onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </label>
      <label className="merch-admin-check">
        <input type="checkbox" checked={onSale} onChange={(e) => setOnSale(e.target.checked)} />
        <span>On sale straight away</span>
      </label>
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Adding...' : 'Add product'}
      </button>
      {message && (
        <p className={message.tone === 'error' ? 'fleet-error-text' : 'fleet-muted'} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </form>
  );
};

const ProductRow: React.FC<{ token: string; product: AdminMerchProduct; onSaved: (p: AdminMerchProduct) => void }> = ({
  token,
  product,
  onSaved,
}) => {
  const [title, setTitle] = useState(product.title);
  const [contactForOrder, setContactForOrder] = useState(product.pricePence === null);
  const [price, setPrice] = useState(poundsText(product.pricePence));
  const [active, setActive] = useState(product.active);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);

  const save = async () => {
    if (!title.trim()) return setMessage({ tone: 'error', text: 'The name cannot be empty.' });
    let pricePence: number | null = null;
    if (!contactForOrder) {
      const parsed = parsePounds(price);
      if ('error' in parsed) return setMessage({ tone: 'error', text: parsed.error });
      pricePence = parsed.pence;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.updateMerchProduct(token, product.id, { title: title.trim(), pricePence, active });
      onSaved(res.product);
      setMessage({ tone: 'ok', text: 'Saved. The shop shows this now.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const replacePhoto = async (file: File | undefined) => {
    if (!file) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.uploadMerchProductImage(token, product.id, file);
      onSaved(res.product);
      setMessage({ tone: 'ok', text: 'Photo replaced.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const changed =
    title !== product.title ||
    contactForOrder !== (product.pricePence === null) ||
    (!contactForOrder && price !== poundsText(product.pricePence)) ||
    active !== product.active;

  return (
    <li className="merch-admin-row">
      <div className="merch-admin-photo">
        {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span>No photo</span>}
        <label className={`btn btn-secondary btn-small${saving ? ' is-disabled' : ''}`}>
          {product.imageUrl ? 'Replace photo' : 'Add photo'}
          <input
            type="file"
            accept={PHOTO_ACCEPT}
            className="visually-hidden"
            disabled={saving}
            onChange={(e) => {
              void replacePhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <div className="merch-admin-info">
        <label className="merch-admin-field">
          <span>Name</span>
          <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <span className="fleet-muted">
          {product.id}
          {product.supplierCostPence !== null ? ` · supplier cost ${formatPence(product.supplierCostPence, product.currency)}` : ''}
          {product.kind === 'CATALOGUE' && !product.imageUrl ? ' · hidden from the shop until it has a photo' : ''}
        </span>
      </div>
      <PriceFields
        idPrefix={product.id}
        currency={product.currency}
        contactForOrder={contactForOrder}
        setContactForOrder={setContactForOrder}
        price={price}
        setPrice={setPrice}
      />
      <label className="merch-admin-check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>On sale</span>
      </label>
      <button type="button" className="btn btn-primary" disabled={saving || !changed} onClick={save}>
        {saving ? 'Saving...' : 'Save'}
      </button>
      {message && (
        <p className={message.tone === 'error' ? 'fleet-error-text' : 'fleet-muted'} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </li>
  );
};

/** Merch products: add new ones, set prices or contact for order, photos and availability. Checkout reads prices on the server. */
export const MerchProductsAdmin: React.FC<{ token: string }> = ({ token }) => {
  const [products, setProducts] = useState<AdminMerchProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .getAdminMerchProducts(token)
      .then((res) => setProducts(res.products))
      .catch((err: Error) => setError(err.message));
  }, [token]);

  useEffect(load, [load]);

  const replace = (updated: AdminMerchProduct) =>
    setProducts((prev) => (prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev));
  const add = (created: AdminMerchProduct) => setProducts((prev) => (prev ? [...prev, created] : [created]));

  return (
    <section className="fleet-stack" aria-labelledby="merch-products-title">
      <header>
        <h2 id="merch-products-title" className="fleet-panel-title">Merch products</h2>
        <p className="fleet-muted">
          Add products and change prices here; the Merch and Frenzy Studio pages show changes straight away. A product sold by &quot;contact for
          order&quot; shows an enquiry form instead of card payment.
        </p>
      </header>
      <AddProductForm token={token} onAdded={add} />
      {error && (
        <p className="fleet-error-text" role="alert">
          {error}
        </p>
      )}
      {!products && !error && <div className="fleet-panel fleet-state">Loading products...</div>}
      {products && products.length === 0 && <div className="fleet-panel fleet-muted">No products yet.</div>}
      {products &&
        (Object.keys(KIND_LABELS) as MerchProductKind[]).map((kind) => {
          const group = products.filter((p) => p.kind === kind);
          if (group.length === 0) return null;
          return (
            <div key={kind} className="fleet-panel">
              <h3 className="fleet-panel-title">{KIND_LABELS[kind]}</h3>
              <ul className="merch-admin-list">
                {group.map((p) => (
                  <ProductRow key={p.id} token={token} product={p} onSaved={replace} />
                ))}
              </ul>
            </div>
          );
        })}
      <LogoDropPricesAdmin token={token} />
    </section>
  );
};
