import React, { useEffect, useRef, useState } from 'react';
import type { MerchProduct } from '../../api/merch.types';
import { MerchProductCard } from './MerchProductCard';
import { MerchOrderPanel } from './MerchOrderPanel';

interface Props {
  products: MerchProduct[];
  charityShare: string | null;
}

const ALL = 'All';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Brings the order card into view when it is off screen (the stacked phone layout), then focuses it. */
function revealOrderCard(heading: HTMLHeadingElement | null) {
  if (!heading) return;
  const rect = heading.getBoundingClientRect();
  const visible = rect.top >= 0 && rect.top < window.innerHeight * 0.6;
  if (!visible) heading.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
}

/** The catalogue: category filter, product grid and the order card for the chosen item. */
export const MerchCatalog: React.FC<Props> = ({ products, charityShare }) => {
  const [category, setCategory] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string>(products[0].id);
  const [selectionKey, setSelectionKey] = useState(0);
  const [zoomed, setZoomed] = useState<MerchProduct | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const categories = [ALL, ...Array.from(new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c))))];
  const visible = category === ALL ? products : products.filter((p) => p.category === category);
  const selected = products.find((p) => p.id === selectedId) ?? products[0];

  const select = (product: MerchProduct) => {
    setSelectedId(product.id);
    setSelectionKey((k) => k + 1);
  };

  useEffect(() => {
    if (selectionKey === 0) return;
    const frame = window.requestAnimationFrame(() => revealOrderCard(headingRef.current));
    return () => window.cancelAnimationFrame(frame);
  }, [selectionKey]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoomed(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  return (
    <>
      <div className="merch-filters" role="group" aria-label="Filter by category">
        {categories.map((c) => (
          <button key={c} type="button" className={`merch-filter${category === c ? ' is-active' : ''}`} aria-pressed={category === c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="merch-layout">
        <div className="merch-grid">
          {visible.map((p) => (
            <MerchProductCard key={p.id} product={p} selected={p.id === selected.id} onSelect={select} onZoom={setZoomed} />
          ))}
        </div>
        <MerchOrderPanel ref={headingRef} product={selected} charityShare={charityShare} selectionKey={selectionKey} />
      </div>

      {zoomed && (
        <div className="merch-lightbox" role="dialog" aria-modal="true" aria-label={zoomed.title} onClick={() => setZoomed(null)}>
          <div className="merch-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {zoomed.imageUrl && <img src={zoomed.imageUrl} alt={zoomed.title} />}
            <div className="merch-lightbox-body">
              <h3>{zoomed.title}</h3>
              {zoomed.description && <p>{zoomed.description}</p>}
              <div className="merch-lightbox-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    select(zoomed);
                    setZoomed(null);
                  }}
                >
                  {zoomed.pricePence !== null ? 'Buy this item' : 'Ask for a price'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setZoomed(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
