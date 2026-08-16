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
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header Banner */}
      <section style={{ textAlign: 'center', padding: '2.5rem 1rem 2rem 1rem' }}>
        <div className="badge badge-settled" style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
          NFTYLOGS INSIGHTS & UPDATES
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem', color: 'var(--text-main)' }}>
          Read Our Latest Blogs & Climate Insights
        </h1>
        <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
          Perspectives on global decarbonisation, green hydrogen innovations, Paris Agreement alignment, and automated financial split transparency.
        </p>
      </section>

      {/* Blog Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
        {BLOG_POSTS.map((post) => (
          <article className="card" key={post.id} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="badge badge-settled">{post.category}</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {post.date} • {post.readTime}
              </span>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              {post.title}
            </h2>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              {post.summary}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                By {post.author}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                Read Article →
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
