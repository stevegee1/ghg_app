import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '2.5rem 1rem 2rem 1rem' }}>
        <div className="badge badge-settled" style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
          CLIMATE ACTION INTERVENTION & TRADEMARK AUTHENTICATION
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem', color: 'var(--text-main)' }}>
          About Nftylogs & The GHG Logo Drop
        </h1>
        <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', maxWidth: '720px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
          Leveraging digital technology, trademark optics, and blockchain provenance to amplify climate actions, reduce greenhouse gas emissions, and trigger direct aid for climate survivors worldwide.
        </p>
      </section>

      {/* Official Corporate Registration Card */}
      <section className="card" style={{ marginBottom: '2rem', padding: '1.75rem 2rem', borderLeft: '4px solid var(--accent-primary)', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              UNITED KINGDOM CORPORATE REGISTRATION
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              NFTYLOGS LTD
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Company Number: <strong>15230476</strong> • Incorporated on <strong>24 October 2023</strong>
            </p>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#475569', backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <strong>Registered Office Address:</strong><br />
            20 Wenlock Road, London, England, N1 7GU
          </div>
        </div>
      </section>

      {/* The Core Climate Challenge & Digital Perspective */}
      <section className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--accent-primary)' }}>
          Our Perspective on Climate Action
        </h2>
        <div style={{ fontSize: '0.9375rem', color: 'var(--text-main)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>
            The issue of climate change is intensified by the unpredictable nature of greenhouse gas (GHG) emissions, which are evident in climate disasters worldwide.
          </p>
          <p>
            It draws our attention to the impacts of destruction on different locations while we go about our daily activities at the same <strong>TIME</strong>. Achieving decarbonisation requires multifaceted approaches, and we carefully offer a perspective by leveraging digital technology. Climate change remains the greatest challenge of our era.
          </p>
          <p>
            We are exploring the digital capabilities of non-fungible tokens (NFTs) to raise awareness and deepen concern for climate change and victims of the climate crisis worldwide.
          </p>
        </div>
      </section>

      {/* Trademark Logo Visual Symbol Explanation */}
      <section className="card" style={{ marginBottom: '2.5rem', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/images/nfty-logs-logo.png"
              alt="NFTY LOGS Official Trademark Logo"
              style={{ width: '160px', height: '160px', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }}
            />
          </div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            TRADEMARK IDENTITY
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#ffffff' }}>
            The Story Behind Our Trademark Logo
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            A visual symbol of ancient Earth resilience and modern energy transition
          </p>
        </div>

        <div className="responsive-grid-2" style={{ gap: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginBottom: '0.5rem' }}>
              The Green Pole
            </div>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              A straight green pole representing a pristine, ancient Earth dating back billions of years. The piercing pole illustrates human activities devastating the environment.
            </p>
          </div>

          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>
              The Paris Agreement Pathway
            </div>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              The Paris Agreement introduced the pathway towards an energy transition to curb GHG emissions. The world needs to be prompted to develop a culture focused on reducing our carbon footprint.
            </p>
          </div>
        </div>
      </section>

      {/* What We Offer — Climate Actions in 4 Key Areas */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>What We Offer — Climate Actions</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            At Nftylogs, we aim to amplify all climate actions to reduce GHG emissions across four core sectors:
          </p>
        </div>

        <div className="responsive-grid-2" style={{ gap: '1.5rem' }}>
          {/* Pillar 1: Energy Transition & Corporate Innovations */}
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>PILLAR 01</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                1. Energy Transition & Corporate Innovations
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Every industry within the value chain of the energy transition. Corporate innovations under licensing authentication with our GHG logo digital and physical optics—such as electrolyser technologies producing green hydrogen to move away from hydrocarbon-derived grey hydrogen worldwide.
              </p>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/licensing" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Explore Annual B2B Licensing →
              </Link>
            </div>
          </div>

          {/* Pillar 2: Government Policies */}
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>PILLAR 02</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                2. Government Policies & Decarbonisation
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Logging and authenticating government policies, regional initiatives, and public sector development processes to deliver lower costs and fail-safe outcomes that engender greenhouse gas reductions worldwide.
              </p>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/transparency" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                View Transparency Registry →
              </Link>
            </div>
          </div>

          {/* Pillar 3: Sports Events & Achievements */}
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>PILLAR 03</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                3. ALL Sports & Euphoric Moments
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Sports events and athletic competitions where euphoric moments are celebrated. Authenticated as digital collectibles and physical drops to engage fans and drive environmental relief.
              </p>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/souvenirs" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Order Custom Event Souvenirs →
              </Link>
            </div>
          </div>

          {/* Pillar 4: Individual Celebrations & Gifts */}
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>PILLAR 04</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                4. Individual Celebrations ("Whatever We Do")
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Extending to encompass "Whatever We Do" to reduce GHG emissions. Birthday gifts, wedding souvenirs, or celebratory items carrying a succinct message with our GHG Logo Drop on any merchandise—triggering direct aid to Climate Survivors worldwide.
              </p>
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <Link to="/merch" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Visit Official Merch Store →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The "While Prompt..." Intervention Callout */}
      <section className="disclaimer-box" style={{ marginBottom: '2.5rem', backgroundColor: 'var(--bg-card)', borderLeftColor: 'var(--accent-primary)', borderLeftWidth: '4px', padding: '1.5rem' }}>
        <div className="disclaimer-title" style={{ color: 'var(--accent-primary)', fontSize: '0.875rem' }}>
          THE "WHILE PROMPT..." DIGITAL INTERVENTION
        </div>
        <blockquote style={{ fontSize: '0.9375rem', color: 'var(--text-main)', fontStyle: 'italic', margin: '0.75rem 0', lineHeight: 1.6 }}>
          "While engaged… at the TIME in different geographical locations… some are experiencing the devastating impacts of greenhouse gas emissions… flash floods, heat waves, extreme weather, etc… caused by the prolonged retention of carbon dioxide in the atmosphere."
        </blockquote>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          This acts as a warning, contributing to the trajectory needed for global decarbonisation. In this context, feelings of deep concern are transformed into a tangible carbon-footprint culture—encouraging climate change mitigation and providing support for climate crisis victims worldwide.
        </p>
      </section>

      {/* Third-Party Digital Collectibles Platforms */}
      <section className="card" style={{ marginBottom: '2.5rem', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Third-Party Digital Collectibles & Provenance</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Innovations and "Whatever We Do" logged and authenticated as collectibles available directly on our platform and third-party Web3 marketplaces:
          </p>
        </div>

        <div className="responsive-grid-2" style={{ gap: '1.5rem' }}>
          <a
            href="https://www.opensea.io"
            target="_blank"
            rel="noopener noreferrer"
            className="card"
            style={{ textDecoration: 'none', color: 'inherit', marginBottom: 0, textAlign: 'center', transition: 'transform 0.15s', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--opensea-blue)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>WEB3 MARKETPLACE</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--opensea-blue)' }}>OpenSea.io</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
              View and trade GHG Logo Drop verified digital provenance badges and climate certificates on OpenSea.
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--opensea-blue)' }}>
              Visit www.opensea.io ↗
            </div>
          </a>

          <a
            href="https://www.rarible.com"
            target="_blank"
            rel="noopener noreferrer"
            className="card"
            style={{ textDecoration: 'none', color: 'inherit', marginBottom: 0, textAlign: 'center', transition: 'transform 0.15s', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f43f5e', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>WEB3 MARKETPLACE</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f43f5e' }}>Rarible.com</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
              Explore official Nftylogs climate collectibles, authenticated artwork, and event mark drops on Rarible.
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: '#f43f5e' }}>
              Visit www.rarible.com ↗
            </div>
          </a>
        </div>
      </section>

      {/* What's Next Section */}
      <section style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>What's Next?</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 1.25rem auto', lineHeight: 1.5 }}>
          We have introduced a new approach to mitigating climate change—providing support for climate victims and creating optics that become visible merchandise in public view to boost climate actions by Governments, Corporates, and individuals worldwide.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/licensing" className="btn btn-primary">
            Get Started with Corporate Licensing
          </Link>
          <Link to="/checkout" className="btn btn-secondary">
            Try Checkout Demo
          </Link>
        </div>
      </section>
    </div>
  );
};
