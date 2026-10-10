import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CharityPartnerForm } from '../components/partners/CharityPartnerForm';

interface Slots {
  maxCapacity: number;
  availableSlots: number;
  registrationOpen: boolean;
  slots: { id: string; name: string; status: string }[];
}

/** The charity partner programme: current partners, open places and the application form. */
export const CharityPartnersPage: React.FC = () => {
  const [slots, setSlots] = useState<Slots | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [share, setShare] = useState<string | null>(null);

  const loadSlots = useCallback(() => {
    fetch('/api/charities/slots')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Slots) => {
        setSlots(data);
        setSlotsError(false);
      })
      .catch(() => setSlotsError(true));
  }, []);

  useEffect(() => {
    document.title = 'Charity partners - NFTYLOGS';
    loadSlots();
    fetch('/api/public/charity-share')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setShare(d?.percent ?? null))
      .catch(() => setShare(null));
  }, [loadSlots]);

  const activeCharities = slots?.slots.filter((s) => s.status === 'ACTIVE') ?? [];

  return (
    <main className="partners-page">
      <header className="partners-hero container-x">
        <p className="partners-eyebrow">
          <Link to="/partners">Partners</Link> / Charities
        </p>
        <h1>Charity partners</h1>
        <p>
          {share ? `${share}% of every payment on the platform` : 'A share of every payment on the platform'} is passed to our charity
          partners.
          {slots ? ` We work with up to ${slots.maxCapacity} charities at a time, each for one year.` : ''}
        </p>
      </header>

      <section className="partners-section container-x" aria-labelledby="charity-status-title">
        <div className="partners-intro">
          <h2 id="charity-status-title">Places</h2>
          {slotsError && <p role="alert">Place availability could not be loaded. Please refresh the page.</p>}
          {!slots && !slotsError && <p>Loading places...</p>}
          {slots && (
            <p className="partners-slots" aria-live="polite">
              {slots.availableSlots > 0
                ? `${slots.availableSlots} of ${slots.maxCapacity} ${slots.maxCapacity === 1 ? 'place' : 'places'} open`
                : `All ${slots.maxCapacity} places are taken`}
            </p>
          )}
          {activeCharities.length > 0 && (
            <>
              <h3 className="partners-subtitle">Current partners</h3>
              <ul className="partners-points">
                {activeCharities.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </>
          )}
          <h3 className="partners-subtitle">How it works</h3>
          <ol className="partners-points">
            <li>Apply with your charity's work email.</li>
            <li>Confirm the email from the link we send you.</li>
            <li>We check your registration and reply by email.</li>
            <li>If approved, you set up payouts with Stripe and the one-year partnership starts.</li>
          </ol>
        </div>
        <div className="partners-card">
          <CharityPartnerForm
            open={slots ? slots.registrationOpen : !slotsError}
            maxCapacity={slots?.maxCapacity ?? null}
            onApplied={loadSlots}
          />
        </div>
      </section>
    </main>
  );
};
