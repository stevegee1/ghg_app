import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EcosystemAnimation } from '../components/landing/EcosystemAnimation';
import { SolutionsSection } from '../components/landing/SolutionsSection';
import { HowItWorks } from '../components/landing/HowItWorks';
import { PartnersBand } from '../components/landing/PartnersBand';
import { useSiteFacts } from '../components/landing/useSiteFacts';
import { FleetCalculator } from '../components/fleet/FleetCalculator';

const FRAMEWORKS = ['SECR', 'ISO 14064-1', 'ISO 50001', 'PPN 006', 'Green Claims Code', 'Section 106', 'Social Value', 'ISO 15143-3'];

const openDemo = () => window.dispatchEvent(new CustomEvent('open-book-demo-modal'));

/** Sections fade up as they scroll into view. Skipped when the visitor prefers reduced motion. */
function useRevealOnScroll() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.landing-reveal'));
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export const LandingPage: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const facts = useSiteFacts();
  // The calculator only shows once emission factors are published; until then the section stays hidden.
  const [calculatorAvailable, setCalculatorAvailable] = useState(false);
  useRevealOnScroll();

  return (
    <div className="landing">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="container-x landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Emissions · Fleet · Workforce · Merch</p>
            <h1 id="hero-title">
              Measure, prove and report your impact. <span>In one place.</span>
            </h1>
            <p className="landing-hero-lead">
              GHG and carbon reporting, fleet emissions from your machines&apos; own data, and social value evidence, reviewed by a Lead
              Auditor and backed by credentials anyone can verify. Plus merch with a smaller footprint, supporting our charity partners.
            </p>
            <div className="landing-hero-actions">
              {isAuthenticated ? (
                <Link to={isAdmin ? '/admin' : '/portal'} className="btn btn-primary landing-btn">
                  {isAdmin ? 'Open the admin console' : 'Go to your dashboard'}
                </Link>
              ) : (
                <>
                  <Link to="/create-account" className="btn btn-primary landing-btn">
                    Get started
                  </Link>
                  <button type="button" className="btn btn-secondary landing-btn" onClick={openDemo}>
                    Book a demo
                  </button>
                </>
              )}
            </div>
            <div className="landing-frameworks">
              <span>Standards covered</span>
              <ul>
                {FRAMEWORKS.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="landing-hero-visual">
            <EcosystemAnimation />
          </div>
        </div>
      </section>

      <div className="landing-reveal">
        <SolutionsSection charityShare={facts.charityShare} />
      </div>

      <div className="landing-reveal">
        <HowItWorks />
      </div>

      <section className="landing-section landing-reveal" aria-labelledby="calculator-title" hidden={!calculatorAvailable}>
        <div className="container-x landing-demo">
          <div className="landing-demo-copy">
            <p className="landing-eyebrow">Try it</p>
            <h2 id="calculator-title">Estimate your fleet&apos;s CO2e</h2>
            <p>
              Enter fuel used and see the emissions, calculated with the same published conversion factors the Fleet dashboard uses. No
              account needed.
            </p>
          </div>
          <img
            className="landing-demo-photo"
            src="/images/landing/fleet-plant-700.jpg"
            srcSet="/images/landing/fleet-plant-700.jpg 700w, /images/landing/fleet-plant-1400.jpg 1400w"
            sizes="(min-width: 900px) 40vw, 100vw"
            width={700}
            height={1050}
            loading="lazy"
            decoding="async"
            alt="A road roller, excavator and dump truck working on an earthworks site"
          />
          <div className="landing-demo-card">
            <FleetCalculator compact onAvailabilityChange={setCalculatorAvailable} />
          </div>
        </div>
      </section>

      <div className="landing-reveal">
        <PartnersBand facts={facts} />
      </div>

      <section className="landing-cta landing-reveal" aria-labelledby="cta-title">
        <div className="container-x">
          <h2 id="cta-title">See it working for your organisation</h2>
          <p>A short demo covers the services you need and how your data gets in.</p>
          <div className="landing-hero-actions">
            <button type="button" className="btn btn-primary landing-btn" onClick={openDemo}>
              Book a demo
            </button>
            {!isAuthenticated && (
              <Link to="/create-account" className="btn btn-secondary landing-btn">
                Create an account
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
