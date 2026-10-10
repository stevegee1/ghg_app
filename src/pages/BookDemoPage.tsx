import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookDemoCard } from '../components/BookDemoCard';

export const BookDemoPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Schedule an Enterprise Assurance Demo - NFTYLOGS';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="book-demo-page-container">
      {/* Background ambient lighting */}
      <div className="book-demo-ambient-glow" aria-hidden="true" />

      <div className="book-demo-page-content">
        {/* Navigation Breadcrumb */}
        <div className="book-demo-breadcrumb">
          <Link to="/" className="breadcrumb-link">
            &larr; Back to Overview
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Schedule Enterprise Demo</span>
        </div>

        {/* Persefoni-style Split Bento Layout */}
        <div className="book-demo-standalone-wrapper">
          <BookDemoCard isModal={false} />
        </div>

        {/* Enterprise statutory assurance trust footer */}
        <div className="book-demo-trust-footer">
          <div className="trust-item">
            <span className="trust-dot">&bull;</span>
            <span>UK CMA Green Claims Code Conforming</span>
          </div>
          <div className="trust-item">
            <span className="trust-dot">&bull;</span>
            <span>ISO 14064-3 &amp; ISO 50001 Verified Ledger</span>
          </div>
          <div className="trust-item">
            <span className="trust-dot">&bull;</span>
            <span>Strict Pre-Audit Mutual NDA Protection</span>
          </div>
          <div className="trust-item">
            <span className="trust-dot">&bull;</span>
            <span>Publicly Verifiable Dual-Logo Credentials</span>
          </div>
        </div>
      </div>
    </div>
  );
};
