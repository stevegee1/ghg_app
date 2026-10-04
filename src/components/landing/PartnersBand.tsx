import React from 'react';
import { Link } from 'react-router-dom';
import type { SiteFacts } from './useSiteFacts';

export const PartnersBand: React.FC<{ facts: SiteFacts }> = ({ facts }) => (
  <section className="landing-section" aria-labelledby="partners-title">
    <div className="container-x">
      <header className="landing-section-head">
        <p className="landing-eyebrow">Partners</p>
        <h2 id="partners-title">Impact that stays local</h2>
      </header>
      <div className="landing-partners">
        <article className="landing-partner tone-charity">
          <h3>Charity partners</h3>
          <p>
            We support up to three charities at a time, each for a one-year partnership.
            {facts.charityShare ? ` ${facts.charityShare}% of every payment is shared between them.` : ' A share of every payment is shared between them.'}
          </p>
          {facts.charityPlacesOpen !== null && facts.charityPlacesTotal !== null && (
            <p className="landing-partner-stat">
              <strong>
                {facts.charityPlacesOpen} of {facts.charityPlacesTotal}
              </strong>{' '}
              {facts.charityPlacesOpen === 1 ? 'place' : 'places'} open
            </p>
          )}
          <Link to="/partners#charities" className="landing-solution-cta">
            Apply as a charity <span aria-hidden="true">→</span>
          </Link>
        </article>
        <article className="landing-partner tone-merch">
          <h3>Local delivery partners</h3>
          <p>
            We arrange merch delivery with partners as close to each customer as possible, preferring cargo bikes and electric vans,
            to keep delivery emissions low.
          </p>
          <Link to="/partners" className="landing-solution-cta">
            Become a delivery partner <span aria-hidden="true">→</span>
          </Link>
        </article>
      </div>
    </div>
  </section>
);
