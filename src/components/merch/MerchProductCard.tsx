import React from 'react';
import type { MerchProduct } from '../../api/merch.types';
import { formatPence } from './useMerchProducts';

interface Props {
  product: MerchProduct;
  selected: boolean;
  onSelect: (product: MerchProduct) => void;
  onZoom: (product: MerchProduct) => void;
}

/** One catalogue item. Choosing it opens the matching order card: Stripe checkout or a price enquiry. */
export const MerchProductCard: React.FC<Props> = ({ product, selected, onSelect, onZoom }) => {
  const priced = product.pricePence !== null;
  return (
    <article className={`merch-card${selected ? ' is-selected' : ''}`} aria-label={product.title}>
      <button type="button" className="merch-card-media" onClick={() => onZoom(product)} aria-label={`Enlarge photo of ${product.title}`}>
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            style={product.imagePosition ? { objectPosition: product.imagePosition } : undefined}
          />
        )}
        <span className="merch-chip merch-card-zoom">Enlarge</span>
      </button>
      <div className="merch-card-body">
        {product.category && <p className="merch-eyebrow">{product.category}</p>}
        <h3 className="merch-card-title">{product.title}</h3>
        {product.description && <p className="merch-card-desc">{product.description}</p>}
        <div className="merch-card-foot">
          {priced ? (
            <span className="merch-price">{formatPence(product.pricePence as number, product.currency)}</span>
          ) : (
            <span className="merch-price-request">Price on request</span>
          )}
          <button
            type="button"
            className={`btn ${selected ? 'btn-primary' : 'btn-secondary'} merch-card-action`}
            aria-pressed={selected}
            onClick={() => onSelect(product)}
          >
            {selected ? 'Selected' : priced ? 'Buy' : 'Ask for a price'}
          </button>
        </div>
      </div>
    </article>
  );
};
