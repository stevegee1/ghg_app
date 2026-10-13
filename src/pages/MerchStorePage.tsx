import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMerchProducts } from '../components/merch/useMerchProducts';
import { useSiteFacts } from '../components/landing/useSiteFacts';
import { MerchCatalog } from '../components/merch/MerchCatalog';
import { MerchStudio } from '../components/merch/MerchStudio';

type StoreTab = 'catalog' | 'studio';

/** The merch shop: the catalogue, priced from the database, and Frenzy Studio, for custom merch. */
export const MerchStorePage: React.FC = () => {
  useEffect(() => {
    document.title = 'Support Extreme Weather Survivor - NFTYLOGS';
  }, []);

  const [tab, setTab] = useState<StoreTab>('catalog');
  const catalogue = useMerchProducts();
  const { charityShare } = useSiteFacts();

  const products = catalogue.status === 'ready' ? catalogue.products : [];
  const catalogItems = products.filter((p) => p.kind === 'CATALOGUE' && p.imageUrl);
  // Garments without a price are sold by enquiry (contact for order) inside Frenzy Studio.
  const garments = products.filter((p) => p.kind === 'CUSTOM_GARMENT');

  return (
    <main className="merch-page">
      <nav className="merch-crumbs container-x" aria-label="Breadcrumb">
        <Link to="/">NFTYLOGS</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Merch</span>
      </nav>

      <div className="container-x merch-container">
        <header className="merch-header">
          <p className="merch-eyebrow">Extreme weather survivor relief</p>
          <h1>Support Extreme Weather Survivor</h1>
          <p className="merch-lead">Bespoke apparel and extreme weather survivor support. A share of every purchase goes to our charity partners.</p>
        </header>

        <div className="merch-tabs" role="tablist" aria-label="Shop sections">
          <button type="button" role="tab" aria-selected={tab === 'catalog'} className={`merch-tab${tab === 'catalog' ? ' is-active' : ''}`} onClick={() => setTab('catalog')}>
            Apparel
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'studio'}
            className={`merch-tab${tab === 'studio' ? ' is-active' : ''}`}
            onClick={() => setTab('studio')}
            disabled={catalogue.status === 'ready' && garments.length === 0}
          >
            Frenzy Studio
          </button>
        </div>

        {catalogue.status === 'loading' && <p className="merch-state">Loading the shop...</p>}
        {catalogue.status === 'error' && (
          <p className="merch-state merch-error" role="alert">
            The shop could not be loaded. Please refresh the page.
          </p>
        )}
        {catalogue.status === 'ready' && tab === 'catalog' && catalogItems.length === 0 && <p className="merch-state">No products are available right now.</p>}
        {catalogue.status === 'ready' && tab === 'catalog' && catalogItems.length > 0 && <MerchCatalog products={catalogItems} charityShare={charityShare} />}
        {catalogue.status === 'ready' && tab === 'studio' && garments.length > 0 && <MerchStudio garments={garments} charityShare={charityShare} />}
      </div>
    </main>
  );
};
