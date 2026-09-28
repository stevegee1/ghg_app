import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const PartnerLicensingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleOpenDemo = (tier: string) => {
    window.dispatchEvent(
      new CustomEvent('open-book-demo-modal', {
        detail: { tier, source: `pricing-${tier.toLowerCase()}` },
      })
    );
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <section style={{ padding: '5rem 0', width: '100%' }}>
        <div className="container-x" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2.5rem',
              alignItems: 'stretch',
            }}
          >
            {/* Left Column: Heading & Description */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '1rem' }}>
              <div
                style={{
                  color: '#e06d53',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  letterSpacing: '0.02em',
                }}
              >
                Packages and Pricing
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
                  fontWeight: 800,
                  color: '#090d1a',
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  margin: '0 0 1.5rem 0',
                }}
              >
                Solutions that<br />grow with you
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: '#475569',
                  lineHeight: 1.65,
                  margin: 0,
                  maxWidth: '420px',
                }}
              >
                Discover a range of powerful features to help you track, report on, and reduce carbon emissions. Get compliant and find your path to net zero.
              </p>
            </div>

            {/* Middle Card: Essential (White Card) */}
            <div
              onClick={() => handleOpenDemo('Essential')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenDemo('Essential');
                }
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(15, 23, 42, 0.12)',
                borderRadius: '12px',
                padding: '2.75rem 2.25rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 36px -10px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.12)';
              }}
            >
              {/* Lightbulb Icon */}
              <div style={{ marginBottom: '1.25rem', color: '#090d1a' }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                </svg>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 700,
                  color: '#090d1a',
                  letterSpacing: '-0.02em',
                  margin: '0 0 0.75rem 0',
                }}
              >
                Essential
              </h2>

              {/* Subtitle */}
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: '#475569',
                  lineHeight: 1.55,
                  margin: '0 0 2.25rem 0',
                  minHeight: '44px',
                }}
              >
                Provides rigorously accurate carbon calculations including:
              </p>

              {/* Features List */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 3rem 0', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {[
                  'Data & calculation tools with AI validation',
                  'Carbon reporting & compliance',
                  'Insightful dashboards & visualizations',
                  'Robust support & guidance',
                ].map((feature, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#090d1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ fontSize: '0.9375rem', color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Bottom CTA Section */}
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#090d1a',
                    fontWeight: 700,
                    fontSize: '1rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  <span>Get a quote</span>
                  <span style={{ fontSize: '1.15rem' }}>→</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 500 }}>
                  30 min · No obligation · On us
                </div>
              </div>
            </div>

            {/* Right Card: Premium (Black Card) */}
            <div
              onClick={() => handleOpenDemo('Premium')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenDemo('Premium');
                }
              }}
              style={{
                backgroundColor: '#090d1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '2.75rem 2.25rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 16px 36px -10px rgba(0, 0, 0, 0.35)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 24px 48px -10px rgba(0, 0, 0, 0.45)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 16px 36px -10px rgba(0, 0, 0, 0.35)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {/* Rocket/Premium Icon */}
              <div style={{ marginBottom: '1.25rem', color: '#ffffff' }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  margin: '0 0 0.75rem 0',
                }}
              >
                Premium
              </h2>

              {/* Subtitle */}
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: '#94a3b8',
                  lineHeight: 1.55,
                  margin: '0 0 2.25rem 0',
                  minHeight: '44px',
                }}
              >
                Includes everything in the Essential Package, plus:
              </p>

              {/* Features List */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 3rem 0', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {[
                  'Enhanced data management',
                  'Value chain engagement',
                  'Strategic reduction planning',
                  'Exclusive support services',
                ].map((feature, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ fontSize: '0.9375rem', color: '#f1f5f9', fontWeight: 500, lineHeight: 1.4 }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Bottom CTA Section */}
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  <span>Get a quote</span>
                  <span style={{ fontSize: '1.15rem' }}>→</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem', fontWeight: 500 }}>
                  30 min · No obligation · On us
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
};
