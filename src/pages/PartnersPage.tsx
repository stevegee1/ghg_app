import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DeliveryPartnerForm } from '../components/partners/DeliveryPartnerForm';
import { CharityPartnerForm } from '../components/partners/CharityPartnerForm';

interface Slots {
  maxCapacity: number;
  availableSlots: number;
  registrationOpen: boolean;
  slots: { id: string; name: string; status: string }[];
}

/**
 * Our two partner programmes: local delivery and production partners for merch orders, and up to
 * three charity partners who receive a share of every payment.
 */
export const PartnersPage: React.FC = () => {
  const location = useLocation();
  const [slots, setSlots] = useState<Slots | null>(null);
  const [share, setShare] = useState<string | null>(null);

  const loadSlots = useCallback(() => {
    fetch('/api/charities/slots')
      .then((r) => (r.ok ? r.json() : null))
      .then(setSlots)
      .catch(() => setSlots(null));
  }, []);

  useEffect(() => {
    loadSlots();
    fetch('/api/public/charity-share')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setShare(d?.percent ?? null))
      .catch(() => setShare(null));
  }, [loadSlots]);

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  const activeCharities = slots?.slots.filter((s) => s.status === 'ACTIVE') ?? [];

  return (
    <main className="partners-page">
      <header className="partners-hero container-x">
        <p className="partners-eyebrow">Partner programmes</p>
        <h1>Partners who make our impact local</h1>
        <p>
          We arrange merch delivery with partners as close to each customer as possible, to keep delivery emissions low. A share of
          every payment on the platform goes to our charity partners.
        </p>
      </header>

      <section className="partners-section container-x" aria-labelledby="delivery-title">
        <div className="partners-intro">
          <h2 id="delivery-title">Local delivery and production partners</h2>
          <p>
            We look for partners near our customers to deliver merch orders. Tell us the area you cover and how you deliver: cargo
            bikes and electric vans are preferred.
          </p>
          <ul className="partners-points">
            <li>Deliveries in the area you cover</li>
            <li>Customers can follow their order on our tracking page</li>
            <li>We review every application and reply by email</li>
          </ul>
        </div>
        <div className="partners-card">
          <DeliveryPartnerForm />
        </div>
      </section>

      <section id="charities" className="partners-section container-x" aria-labelledby="charity-title">
        <div className="partners-intro">
          <h2 id="charity-title">Charity partners</h2>
          <p>
            We support up to three charities at a time, each for a one-year partnership.
            {share ? ` ${share}% of every payment on the platform is shared between them.` : ' A share of every payment on the platform is shared between them.'}
          </p>
          {slots && (
            <p className="partners-slots" aria-live="polite">
              <strong>
                {slots.availableSlots} of {slots.maxCapacity}
              </strong>{' '}
              {slots.availableSlots === 1 ? 'place' : 'places'} open
            </p>
          )}
          {activeCharities.length > 0 && (
            <ul className="partners-points">
              {activeCharities.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="partners-card">
          <CharityPartnerForm open={slots ? slots.registrationOpen : true} onApplied={loadSlots} />
        </div>
      </section>
    </main>
  );
};
