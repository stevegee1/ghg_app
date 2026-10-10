import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminMerchProduct, MerchProductKind } from '../../api/merch.types';
import { formatPence } from '../merch/useMerchProducts';

const KIND_LABELS: Record<MerchProductKind, string> = {
  CATALOGUE: 'Store items',
  CUSTOM_GARMENT: 'Custom garments',
  EVENT_SOUVENIR: 'Event souvenirs',
};

/** Turns a pounds field into whole pence; empty means enquiry only. */
function parsePounds(text: string): { pence: number | null } | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { pence: null };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { error: 'Enter a price like 35 or 35.00, or leave it empty for enquiry only.' };
  const pence = Math.round(Number(trimmed) * 100);
  if (pence <= 0) return { error: 'The price must be more than zero.' };
  return { pence };
}

const ProductRow: React.FC<{ token: string; product: AdminMerchProduct; onSaved: (p: AdminMerchProduct) => void }> = ({
  token,
  product,
  onSaved,
}) => {
  const [price, setPrice] = useState(product.pricePence === null ? '' : (product.pricePence / 100).toFixed(2));
  const [active, setActive] = useState(product.active);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);

  const save = async () => {
    const parsed = parsePounds(price);
    if ('error' in parsed) return setMessage({ tone: 'error', text: parsed.error });
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.updateMerchProduct(token, product.id, { pricePence: parsed.pence, active });
      onSaved(res.product);
      setMessage({ tone: 'ok', text: 'Saved. New orders use this price.' });
    } catch (err) {
      setMessage({ tone: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const changed = price !== (product.pricePence === null ? '' : (product.pricePence / 100).toFixed(2)) || active !== product.active;

  return (
    <li className="merch-admin-row">
      <div className="merch-admin-info">
        <strong>{product.title}</strong>
        <span className="fleet-muted">
          {product.id}
          {product.supplierCostPence !== null ? ` · supplier cost ${formatPence(product.supplierCostPence, product.currency)}` : ''}
        </span>
      </div>
      <label className="merch-admin-field">
        <span>Price ({product.currency})</span>
        <input inputMode="decimal" value={price} placeholder="Enquiry only" onChange={(e) => setPrice(e.target.value)} />
      </label>
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

/** Merch prices and availability. Checkout reads these on the server for every order. */
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

  return (
    <section className="fleet-stack" aria-labelledby="merch-products-title">
      <header>
        <h2 id="merch-products-title" className="fleet-panel-title">Merch prices</h2>
        <p className="fleet-muted">Prices apply to new orders straight away. Leave a store item's price empty to sell it by enquiry only.</p>
      </header>
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
    </section>
  );
};
