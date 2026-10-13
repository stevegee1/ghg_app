import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DeliveryPartnerForm } from '../components/partners/DeliveryPartnerForm';

/** The local delivery and production partner programme for merch orders. */
export const DeliveryPartnersPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Delivery partners - NFTYLOGS';
  }, []);

  return (
    <main className="partners-page">
      <header className="partners-hero container-x">
        <p className="partners-eyebrow">
          <Link to="/partners">Partners</Link> / Delivery
        </p>
        <h1>Local delivery and production partners</h1>
        <p>
          We deliver merch orders with partners as close to each customer as possible, to keep delivery emissions low. Cargo bikes and
          electric vans are preferred.
        </p>
      </header>

      <section className="partners-section container-x" aria-labelledby="delivery-how-title">
        <div className="partners-intro">
          <h2 id="delivery-how-title">How it works</h2>
          <ol className="partners-points">
            <li>Apply with your company work email and the area you cover.</li>
            <li>Confirm the email from the link we send you.</li>
            <li>We review the application and reply by email.</li>
            <li>Once approved, we contact you with the details of orders in your area; customers follow each order on our tracking page.</li>
          </ol>
        </div>
        <div className="partners-card">
          <DeliveryPartnerForm />
        </div>
      </section>
    </main>
  );
};
