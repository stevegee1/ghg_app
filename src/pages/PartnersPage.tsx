import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

/** Our two partner programmes, each on its own page. */
export const PartnersPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Partners - NFTYLOGS';
  }, []);

  return (
    <main className="partners-page">
      <header className="partners-hero container-x">
        <p className="partners-eyebrow">Partner programmes</p>
        <h1>Partners who make our impact local</h1>
        <p>Choose the programme that fits your organisation. Each application needs a confirmed work email.</p>
      </header>

      <section className="partners-hub container-x" aria-label="Partner programmes">
        <Link to="/partners/charities" className="partners-hub-card">
          <h2>Charity partners</h2>
          <p>Registered charities receive a share of every payment on the platform, in one-year partnerships.</p>
          <span className="partners-hub-cta">See places and apply</span>
        </Link>
        <Link to="/partners/delivery" className="partners-hub-card">
          <h2>Delivery and production partners</h2>
          <p>Local businesses that deliver or produce merch orders close to our customers.</p>
          <span className="partners-hub-cta">Apply as a delivery partner</span>
        </Link>
      </section>
    </main>
  );
};
