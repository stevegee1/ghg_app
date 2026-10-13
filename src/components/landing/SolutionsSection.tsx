import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { ClientService } from '../onboarding/onboardingServices';

interface Solution {
  id: string;
  tone: string;
  name: string;
  promise: string;
  points: string[];
  cta: { label: string; to: string };
}

/**
 * Where a service's button leads. Visitors create an account; signed-in clients go to onboarding's
 * add-service step, which sends them straight to the service when they already hold it.
 */
function useServiceEntry(): (service: ClientService) => string {
  const { isAuthenticated, isAdmin } = useAuth();
  return (service) => {
    if (!isAuthenticated) return '/create-account';
    if (isAdmin) return '/admin';
    return `/onboarding?add=${service}`;
  };
}

/** The four solutions. Every point here describes something the product does today. */
export const SolutionsSection: React.FC<{ charityShare: string | null }> = ({ charityShare }) => {
  const entryFor = useServiceEntry();
  const solutions: Solution[] = [
    {
      id: 'ghg',
      tone: 'ghg',
      name: 'GHG & Carbon Emissions',
      promise: 'Report Scope 1, 2 and 3 emissions to the standard you are held to.',
      points: [
        'Guided questionnaires for SECR, ISO 14064-1, ISO 50001, PPN 006 and the Green Claims Code',
        'Evidence stored privately, each file fingerprinted so changes are detectable',
        'Lead Auditor review, then a credential anyone can verify online',
      ],
      cta: { label: 'Start with GHG', to: entryFor('GHG') },
    },
    {
      id: 'fleet',
      tone: 'fleet',
      name: 'Fleet Emissions & Telematics',
      promise: 'One dashboard for every machine and vehicle, built on their own data.',
      points: [
        'Data from connected machines, fitted trackers, fuel cards or uploads, in the ISO 15143-3 format',
        'Fuel, engine hours, idle time and CO2e by asset, site and month',
        'Download reports, or pull your data into your own systems by API',
      ],
      cta: { label: 'Start with Fleet', to: entryFor('FLEET') },
    },
    {
      id: 'workforce',
      tone: 'workforce',
      name: 'Social & Workforce',
      promise: 'Evidence your Section 106 and social value commitments with confidence.',
      points: [
        'Local hiring, apprenticeship and Real Living Wage evidence in one place',
        'Each assessment records the version of the standard it was assessed against',
        'Lead Auditor review, then a credential you can share with councils and buyers',
      ],
      cta: { label: 'Start with Workforce', to: entryFor('WORKFORCE') },
    },
    {
      id: 'merch',
      tone: 'merch',
      name: 'Merch & Frenzy Studio',
      promise: 'Printed merchandise with a smaller delivery footprint.',
      points: [
        'Branded merch, and custom pieces from Frenzy Studio for teams, events and campaigns',
        'Delivery arranged with partners as close to your customers as possible',
        charityShare ? `${charityShare}% of every payment shared between our charity partners` : 'A share of every payment goes to our charity partners',
      ],
      cta: { label: 'Visit the shop', to: '/merch' },
    },
  ];

  return (
    <section className="landing-section" aria-labelledby="solutions-title">
      <div className="container-x">
        <header className="landing-section-head">
          <p className="landing-eyebrow">What we do</p>
          <h2 id="solutions-title">Different solutions, one platform</h2>
          <p>Start with the one you need now. Each runs on its own, and you can add the others when you are ready.</p>
        </header>
        <div className="landing-solutions">
          {solutions.map((s) => (
            <article key={s.id} id={s.id} className={`landing-solution tone-${s.tone}`}>
              <span className="landing-solution-mark" aria-hidden="true" />
              <h3>{s.name}</h3>
              <p className="landing-solution-promise">{s.promise}</p>
              <ul>
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Link to={s.cta.to} className="landing-solution-cta">
                {s.cta.label} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
