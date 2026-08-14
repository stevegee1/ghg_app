import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Typewriter } from '../components/Typewriter';

interface LandingPageProps {
  verificationLive?: boolean;
  jobReportingLive?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  verificationLive = false,
  jobReportingLive = false,
}) => {
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchLedger() {
      try {
        const res = await api.getTransparencyLedger();
        if (isMounted) setLedgerData(res);
      } catch (err) {
        if (isMounted) setLedgerData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLedger();
    return () => { isMounted = false; };
  }, []);

  const charityPercentage = ledgerData?.charityPercentage ?? 15;
  const disclaimerText = ledgerData?.dataDisclaimer ||
    'Figures reflect settled licensing transactions and charitable routing only. Partner environmental claims are not independently verified by this platform.';

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '3.5rem 1rem 2.5rem 1rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          While you're here...
        </div>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '1.25rem', minHeight: '3em' }}>
          <Typewriter
            phrases={['while others experience extreme weather elsewhere']}
            typeSpeedMs={60}
            deleteSpeedMs={40}
            holdMs={3000}
            loop={true}
            style={{ color: 'var(--text-main)' }}
          />
        </h1>

        <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 2rem auto', lineHeight: 1.5 }}>
          Every licensed Logo Drop routes a fixed, published {charityPercentage}% straight to disaster relief and environmental charity partners.
        </p>

        <div>
          <Link
            to="/checkout"
            className="btn btn-primary"
            style={{
              fontSize: '1rem',
              padding: '0.875rem 2rem',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Explore Checkout Demo →
          </Link>
        </div>
      </section>

      {/* "What we offer" Section — 3 Cards with Honest Framing */}
      <section style={{ marginTop: '2.5rem', marginBottom: '3.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>What We Offer</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Transparent trademark licensing and financial compliance infrastructure
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Card 1 — Logo Drop Licensing (Physical & Digital) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Logo Drop Licensing</h3>
                <span className="badge badge-settled">LIVE TODAY</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Partners license the mark for physical use (jerseys, machinery, event goods) or digital use (dashboards, certificates).
              </p>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              {loading ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading live data...</div>
              ) : ledgerData?.totalSettledTransactions !== undefined ? (
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {ledgerData.totalSettledTransactions} settled transactions recorded
                </div>
              ) : null}
            </div>
          </div>

          {/* Card 2 — Verified Emissions Licensing (Honest Framing) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Emissions Licensing</h3>
                <span className="badge badge-pending">IN PROGRESS</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Partner emissions data is recorded and transparently routed. Independent physical and third-party verification is being rolled out.
              </p>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              {verificationLive ? (
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  Active physical inspections
                </div>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Inspection engine rollout in progress
                </div>
              )}
            </div>
          </div>

          {/* Card 3 — Job Creation Licensing (Honest Framing, Self-Reported Tag) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Job Creation Licensing</h3>
                <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-medium)' }}>
                  SELF-REPORTED
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Partners report jobs created annually, either via self-submitted forms or a direct API connection. Reporting is self-attested and not independently verified.
              </p>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              {jobReportingLive ? (
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  Job reporting active
                </div>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Self-reporting mechanism unscoped
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Below the Fold Section */}
      <section style={{ borderTop: '1px solid var(--border-light)', paddingTop: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>How It Works</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Three simple steps powering financial compliance and environmental gift routing
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>1️⃣</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem' }}>License Mark</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              Partners or consumers license official Logo Drops for physical products, digital software, or custom event goods.
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>2️⃣</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem' }}>Automated Split</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              Every transaction automatically routes a fixed, published percentage directly to environmental charity partners via Stripe.
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>3️⃣</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.375rem' }}>Disaster Relief</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>
              Funds support verified disaster relief and clean ocean initiatives backed by Web3 digital provenance on OpenSea.
            </p>
          </div>
        </div>

        {/* Live Disclaimer Box */}
        <div className="disclaimer-box" style={{ marginBottom: '2rem' }}>
          <div className="disclaimer-title">Platform Verification Disclaimer</div>
          <div className="disclaimer-text">{disclaimerText}</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link
            to="/transparency"
            className="btn btn-secondary"
            style={{ fontSize: '0.9375rem', padding: '0.625rem 1.25rem' }}
          >
            See exactly where the money goes →
          </Link>
        </div>
      </section>
    </div>
  );
};
