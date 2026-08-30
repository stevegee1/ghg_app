import React from 'react';
import { Link } from 'react-router-dom';

interface BlogPost {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  summary: string;
  readTime: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 'blog_1',
    title: 'Transforming Carbon-Footprint Culture Through Digital Provenance',
    category: 'Climate Action & Intervention',
    date: 'August 14, 2026',
    author: 'Nftylogs Secretariat',
    summary: 'While we engage in daily activities, climate crisis impacts unfold across different geographical locations. Exploring how digital technology and trademark optics bridge awareness into direct disaster relief.',
    readTime: '4 min read',
  },
  {
    id: 'blog_2',
    title: 'Green Hydrogen vs. Grey Hydrogen: Electrolyser Licensing Standards',
    category: 'Energy Transition',
    date: 'August 02, 2026',
    author: 'Technical Standards Team',
    summary: 'A deep dive into corporate value chain innovations. How certifying electrolyser technology replaces hydrocarbon-derived hydrogen and authenticates Scope 1-3 decarbonisation pathways.',
    readTime: '6 min read',
  },
  {
    id: 'blog_3',
    title: 'The 85/15 Financial Split: Automated Charity Routing in Practice',
    category: 'Financial Compliance & Governance',
    date: 'July 28, 2026',
    author: 'Platform Audit Desk',
    summary: 'How Stripe Connect and Web3 smart contracts enforce a published 15% charity gift split from every licensed Logo Drop straight to climate survivor relief funds.',
    readTime: '5 min read',
  },
  {
    id: 'blog_4',
    title: 'Sports Events & Celebration Souvenirs: Whatever We Do Matters',
    category: 'Event Drops & Souvenirs',
    date: 'July 15, 2026',
    author: 'Community Relations',
    summary: 'From euphoric athletic moments to wedding souvenirs and birthday gifts: turning everyday merchandise into a continuous force for environmental aid.',
    readTime: '3 min read',
  },
];

export const BlogPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1.5rem 0 4rem 0' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--accent-light)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            padding: '0.4rem 0.9rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-sky)',
            letterSpacing: '0.04em',
            marginBottom: '1rem',
          }}
        >
          <span className="radar-pulse" />
          <span>RESEARCH, STANDARDS & PLATFORM DISPATCHES</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 2.75rem)', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.75rem 0', letterSpacing: '-0.03em' }}>
          Continuous Assurance Insights
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '650px', margin: '0 auto', lineHeight: 1.6 }}>
          Articles, regulatory briefs, and field dispatches from the GHG continuous assurance and green job creation team.
        </p>
      </div>

      {/* Blog Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {BLOG_POSTS.map((post) => (
          <article
            key={post.id}
            className="persefoni-card"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.75rem' }}>
                <span style={{ backgroundColor: 'var(--accent-light)', color: 'var(--color-sky)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
                  {post.category}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{post.readTime}</span>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.75rem 0', lineHeight: 1.35 }}>
                {post.title}
              </h2>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
                {post.summary}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>By <strong>{post.author}</strong></span>
              <span>{post.date}</span>
            </div>
          </article>
        ))}
      </div>

      {/* Newsletter Box */}
      <div className="persefoni-card" style={{ marginTop: '4rem', padding: '2.5rem', textAlign: 'center', backgroundColor: 'var(--bg-subtle)' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Subscribe to Our Regulatory & Tech Bulletins
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '550px', margin: '0 auto 1.5rem auto' }}>
          Get notified when new ISO methodologies, UK CMA guidance updates, or case studies are published.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', maxWidth: '420px', margin: '0 auto', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="Enter work email"
            className="form-input"
            style={{ flex: 1, minWidth: '200px' }}
          />
          <button className="btn btn-primary">
            Subscribe →
          </button>
        </div>
      </div>

    </div>
  );
};
