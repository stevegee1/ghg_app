import React from 'react';
import { Link } from 'react-router-dom';

interface BlogPost {
  id: string;
  title: string;
  category: string;
  summary: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 'blog_low_latency',
    title: 'A Low-Latency Architecture for Continuous OT Telemetry with Real-Time ISO Audit Verification',
    category: 'ISO 14064 & 50001',
    summary: 'How industrial operators stream calibrated OT meter data into cryptographically sealed audit logs, eliminating annual reporting scrambles and audit non-conformances.',
  },
  {
    id: 'blog_s106_guide',
    title: '2026 Section 106 Statutory Workforce Covenant & Local Wage Compliance Guide',
    category: 'Statutory Workforce',
    summary: 'Structuring municipal planning employment dossiers under the Town and Country Planning Act 1990 with live payroll proof, apprenticeships, and Real Living Wage guarantees.',
  },
  {
    id: 'blog_anomaly_lock',
    title: 'GHGEmissionLogs Deploys Real-Time Anomaly Lock: Enforcing 15% Baseline Drift Freeze',
    category: 'ISO Clause 10.2',
    summary: 'Autonomous ledger safeguards that freeze statutory exports (HTTP 423) whenever facility consumption drifts more than 15% from calibrated ISO baselines.',
  },
  {
    id: 'blog_1',
    title: 'Transforming Carbon-Footprint Culture Through Digital Provenance',
    category: 'Climate Action & Provenance',
    summary: 'While we engage in daily activities, climate crisis impacts unfold across different geographical locations. Exploring how digital technology and trademark optics bridge awareness into direct disaster relief.',
  },
  {
    id: 'blog_2',
    title: 'Green Hydrogen vs. Grey Hydrogen: Electrolyser Licensing Standards',
    category: 'Energy Transition',
    summary: 'A deep dive into corporate value chain innovations. How certifying electrolyser technology replaces hydrocarbon-derived hydrogen and authenticates Scope 1-3 decarbonisation pathways.',
  },
  {
    id: 'blog_3',
    title: 'The 85/15 Financial Split: Automated Charity Routing in Practice',
    category: 'Financial Governance',
    summary: 'How Stripe Connect payment splits enforce a published 15% charity gift split from every licensed Logo Drop straight to climate survivor relief funds.',
  },
  {
    id: 'blog_4',
    title: 'Sports Events & Celebration Souvenirs: Whatever We Do Matters',
    category: 'Event Drops & Souvenirs',
    summary: 'From athletic moments to event souvenirs and corporate gifts: turning everyday merchandise into a continuous force for environmental aid.',
  },
];

export const BlogPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
      {/* Clean Breadcrumb Bar */}
      <div
        className="container-x frame-bordered"
        style={{
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: '#64748b',
        }}
      >
        <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>
          GHGEmissionLogs
        </Link>
        <span>/</span>
        <span>Resources</span>
        <span>/</span>
        <span style={{ color: '#090d1a', fontWeight: 600 }}>Blog</span>
      </div>

      <div className="container-x frame-bordered" style={{ padding: '3.5rem 1.5rem 5rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Header matching Pricing Page typography and color system */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div
            style={{
              color: '#e06d53',
              fontSize: '0.95rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              letterSpacing: '0.02em',
            }}
          >
            Articles &amp; Dispatches
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.25rem, 4vw, 3rem)',
              fontWeight: 800,
              color: '#090d1a',
              margin: '0 0 1rem 0',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            Continuous Assurance Insights
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              color: '#475569',
              maxWidth: '680px',
              margin: '0 auto',
              lineHeight: 1.65,
            }}
          >
            Articles, regulatory briefs, and field dispatches from the GHG continuous assurance and green job creation team.
          </p>
        </div>

        {/* Blog Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '2rem',
          }}
        >
          {BLOG_POSTS.map((post) => (
            <article
              key={post.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                borderRadius: '12px',
                padding: '2.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 36px -10px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.1)';
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.25rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      border: '1px solid #e2e8f0',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {post.category}
                  </span>

                  <span
                    style={{
                      color: '#e06d53',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      letterSpacing: '0.01em',
                    }}
                  >
                    To be published soon
                  </span>
                </div>

                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#090d1a',
                    margin: '0 0 0.85rem 0',
                    lineHeight: 1.4,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {post.title}
                </h2>

                <p
                  style={{
                    fontSize: '0.9375rem',
                    color: '#475569',
                    lineHeight: 1.6,
                    margin: '0 0 1.75rem 0',
                  }}
                >
                  {post.summary}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid rgba(15, 23, 42, 0.08)',
                  paddingTop: '1.15rem',
                  fontSize: '0.825rem',
                }}
              >
                <span style={{ color: '#64748b' }}>
                  By: <strong style={{ color: '#090d1a', fontWeight: 700 }}>GHGEmissionLogs</strong>
                </span>

                <span
                  style={{
                    color: '#e06d53',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  To be published soon
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter Box matching Google B2B styling */}
        <div
          style={{
            marginTop: '4.5rem',
            padding: '3rem 2rem',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '12px',
          }}
        >
          <h3
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#090d1a',
              margin: '0 0 0.6rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Subscribe to Our Regulatory &amp; Tech Bulletins
          </h3>

          <p
            style={{
              fontSize: '0.95rem',
              color: '#475569',
              maxWidth: '560px',
              margin: '0 auto 1.75rem auto',
              lineHeight: 1.6,
            }}
          >
            Get notified when new ISO methodologies, UK CMA guidance updates, or case studies are published.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Thank you for subscribing.');
            }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem',
              maxWidth: '460px',
              margin: '0 auto',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="email"
              required
              placeholder="Enter official work email"
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(15, 23, 42, 0.15)',
                backgroundColor: '#ffffff',
                color: '#090d1a',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }}
            >
              Subscribe →
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
