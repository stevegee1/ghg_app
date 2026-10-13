import React from 'react';
import { useSiteFacts } from '../landing/useSiteFacts';
import { REVIEW_METHOD_STATEMENT, REVIEW_SCOPE_STATEMENT } from '../../utils/reviewScope';

/** How NFTYLOGS reviews work, what a credential means, and what it does not mean. */
export const PortalLegalView: React.FC = () => {
  const { charityShare } = useSiteFacts();

  return (
    <div className="review-terms">
      <header className="review-terms-head">
        <h2>How we review</h2>
        <p>What happens to your submission, the standards it is judged against, and what your credential does and does not mean.</p>
      </header>

      <div className="review-terms-grid">
        <section className="review-terms-card">
          <h3>A structured readiness review</h3>
          <p>
            You answer the questions for your chosen framework and attach evidence. The NFTYLOGS audit engine reads your answers and evidence files, flags gaps and advises only. A named Lead
            Auditor reviews every answer and makes the decision. If something needs work, you see the reason against each question.
          </p>
        </section>

        <section className="review-terms-card">
          <h3>Carried out remotely</h3>
          <p>
            {REVIEW_METHOD_STATEMENT} We review documents and evidence you upload, sample records, and ask questions where something is unclear. Each
            file is stored privately with a SHA-256 fingerprint that is checked again whenever the file is opened, so a changed file is never
            mistaken for the original.
          </p>
        </section>

        <section className="review-terms-card">
          <h3>Judged against the framework you choose</h3>
          <p>
            For example ISO 14064-1:2018 for greenhouse gas inventories, UK SECR, Carbon Reduction Plans, or the CMA Green Claims Code. Each
            credential records the framework and the version it was reviewed against.
          </p>
        </section>

        <section className="review-terms-card review-terms-card-notice">
          <h3>What a credential is not</h3>
          <p>{REVIEW_SCOPE_STATEMENT}</p>
          <p>
            NFTYLOGS is not an accredited certification or verification body. Verification of greenhouse gas statements (ISO 14064-3) and
            certification of management systems are carried out by bodies accredited for that work, in the UK by UKAS. Our review prepares you for
            that audit; it does not replace it.
          </p>
        </section>

        <section className="review-terms-card">
          <h3>Checking a credential</h3>
          <p>
            Every credential shows its validity date and links to a public page where anyone can confirm who it was issued to, what was reviewed and
            whether it is still valid.
          </p>
        </section>

        <section className="review-terms-card">
          <h3>Charity share</h3>
          <p>
            {charityShare
              ? `${charityShare}% of each payment goes to our charity partners, recorded against each transaction.`
              : 'A share of each payment goes to our charity partners, recorded against each transaction.'}
          </p>
        </section>
      </div>
    </div>
  );
};
