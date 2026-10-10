import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Ledger {
  totalSettledTransactions: number;
  totalCharityGiftCents: number;
  charityPercentage: number | null;
  dataDisclaimer: string;
  publicPartners: {
    licenseeId: string;
    name: string;
    totalSettledTransactions: number;
    totalCharityGiftCents: number;
    jobsCreated: number | null;
  }[];
}

interface ActiveCharity {
  id: string;
  name: string;
  partnershipStart: string | null;
  partnershipEnd: string | null;
  totalDisbursedCents: number;
}

type Load<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: T };

const pounds = (cents: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100);
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Public record of settled payments, the share passed to charities and the companies that chose to be listed. */
export const TransparencyPage: React.FC = () => {
  const [ledger, setLedger] = useState<Load<Ledger>>({ status: 'loading' });
  const [charities, setCharities] = useState<Load<ActiveCharity[]>>({ status: 'loading' });

  useEffect(() => {
    document.title = 'Transparency - NFTYLOGS';
    let cancelled = false;
    api
      .getTransparencyLedger()
      .then((value: Ledger) => !cancelled && setLedger({ status: 'ready', value }))
      .catch(() => !cancelled && setLedger({ status: 'error' }));
    api
      .getActiveCharities()
      .then((res: { charities: ActiveCharity[] }) => !cancelled && setCharities({ status: 'ready', value: res.charities }))
      .catch(() => !cancelled && setCharities({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, []);

  const stat = (value: (l: Ledger) => string) =>
    ledger.status === 'ready' ? value(ledger.value) : ledger.status === 'loading' ? '...' : 'Unavailable';

  return (
    <main className="transparency-page container-x">
      <header className="transparency-hero">
        <p className="partners-eyebrow">Transparency</p>
        <h1>Where the money goes</h1>
        <p>
          Every figure on this page is read live from our payment records. Companies appear only if they choose to be listed.
        </p>
      </header>

      <section className="transparency-stats" aria-label="Platform totals">
        <div className="transparency-stat">
          <span className="transparency-stat-label">Settled payments</span>
          <span className="transparency-stat-value">{stat((l) => l.totalSettledTransactions.toLocaleString('en-GB'))}</span>
        </div>
        <div className="transparency-stat">
          <span className="transparency-stat-label">Charity share recorded</span>
          <span className="transparency-stat-value">{stat((l) => pounds(l.totalCharityGiftCents))}</span>
        </div>
        <div className="transparency-stat">
          <span className="transparency-stat-label">Charity share of each payment</span>
          <span className="transparency-stat-value">{stat((l) => (l.charityPercentage === null ? 'Not set' : `${l.charityPercentage}%`))}</span>
        </div>
      </section>
      {ledger.status === 'error' && (
        <p className="transparency-note" role="alert">
          The figures could not be loaded. Please refresh the page.
        </p>
      )}

      <section className="transparency-section" aria-labelledby="transparency-charities">
        <div className="transparency-section-head">
          <h2 id="transparency-charities">Charity partners</h2>
          <Link to="/partners/charities">About the programme</Link>
        </div>
        {charities.status === 'loading' && <p className="transparency-note">Loading charity partners...</p>}
        {charities.status === 'error' && <p className="transparency-note" role="alert">Charity partners could not be loaded.</p>}
        {charities.status === 'ready' && charities.value.length === 0 && (
          <p className="transparency-note">
            No charity partnerships are active right now. The charity share of each payment is recorded and held until partners are
            approved.
          </p>
        )}
        {charities.status === 'ready' && charities.value.length > 0 && (
          <div className="transparency-cards">
            {charities.value.map((c) => (
              <article key={c.id} className="transparency-card">
                <h3>{c.name}</h3>
                <p className="transparency-card-amount">{pounds(c.totalDisbursedCents)} received</p>
                <p className="transparency-note">
                  {c.partnershipStart && c.partnershipEnd
                    ? `Partnership ${day(c.partnershipStart)} to ${day(c.partnershipEnd)}`
                    : 'Partnership dates are confirmed when payouts are set up.'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="transparency-section" aria-labelledby="transparency-companies">
        <div className="transparency-section-head">
          <h2 id="transparency-companies">Listed companies</h2>
        </div>
        {ledger.status === 'ready' && ledger.value.publicPartners.length === 0 && (
          <p className="transparency-note">No companies have chosen to be listed yet.</p>
        )}
        {ledger.status === 'ready' && ledger.value.publicPartners.length > 0 && (
          <div className="transparency-table-wrap">
            <table className="transparency-table">
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Settled payments</th>
                  <th scope="col">Charity share recorded</th>
                  <th scope="col">Jobs reported</th>
                </tr>
              </thead>
              <tbody>
                {ledger.value.publicPartners.map((p) => (
                  <tr key={p.licenseeId}>
                    <td>{p.name}</td>
                    <td>{p.totalSettledTransactions.toLocaleString('en-GB')}</td>
                    <td>{pounds(p.totalCharityGiftCents)}</td>
                    <td>{p.jobsCreated === null ? '-' : p.jobsCreated.toLocaleString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ledger.status === 'ready' && <p className="transparency-note transparency-disclaimer">{ledger.value.dataDisclaimer}</p>}
      </section>
    </main>
  );
};
